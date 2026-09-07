//! Supervision of the one Node runtime that owns Curator's application logic
//! and data store. The host spawns it, relays correlated requests over stdin
//! and stdout, forwards its ordered events, and reports a lost runtime instead
//! of restarting work on its own.

use std::collections::HashMap;
use std::env;
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::mpsc::{channel, Sender};
use std::sync::{Arc, Mutex, RwLock};
use std::thread;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Emitter};

/// The Node major version this build is written against. The exact pin lives in
/// `.node-version` and the root `package.json`.
const REQUIRED_NODE_MAJOR: u32 = 24;
const PINNED_NODE_VERSION: &str = "24.20.0";

const RUNTIME_EVENT_CHANNEL: &str = "curator://runtime-event";
const RUNTIME_STATUS_CHANNEL: &str = "curator://runtime-status";

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ApplicationError {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
}

impl ApplicationError {
    /// A prerequisite or the runtime itself could not be started.
    pub fn runtime_unavailable(message: impl Into<String>, detail: Option<String>) -> Self {
        Self::with_code("runtime_unavailable", message, detail)
    }

    /// The runtime stopped. Everything it was running stopped with it.
    pub fn runtime_lost(detail: Option<String>) -> Self {
        Self::with_code(
            "runtime_lost",
            "Curator's application runtime stopped. Restart Curator to continue; work it was running did not continue in the background.",
            detail,
        )
    }

    pub fn internal(message: impl Into<String>, detail: Option<String>) -> Self {
        Self::with_code("internal", message, detail)
    }

    fn with_code(code: &str, message: impl Into<String>, detail: Option<String>) -> Self {
        Self {
            code: code.to_owned(),
            message: message.into(),
            detail,
        }
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "state", rename_all = "lowercase")]
pub enum RuntimeStatus {
    Starting,
    Ready { description: Value },
    Unavailable { error: ApplicationError },
}

#[derive(Deserialize)]
#[serde(tag = "kind")]
enum RuntimeMessage {
    #[serde(rename = "response")]
    Response {
        id: String,
        ok: bool,
        #[serde(default)]
        result: Option<Value>,
        #[serde(default)]
        error: Option<ApplicationError>,
    },
    #[serde(rename = "event")]
    Event {
        seq: u64,
        name: String,
        payload: Value,
    },
}

#[derive(Clone, Serialize)]
struct EventEnvelope {
    kind: &'static str,
    seq: u64,
    name: String,
    payload: Value,
}

type PendingReply = Sender<Result<Value, ApplicationError>>;

pub struct NodeRuntime {
    child: Mutex<Option<Child>>,
    stdin: Mutex<Option<ChildStdin>>,
    pending: Mutex<HashMap<String, PendingReply>>,
    status: RwLock<RuntimeStatus>,
    next_request: AtomicU64,
    stopping: AtomicBool,
}

impl NodeRuntime {
    /// Starts the runtime for this checkout. A prerequisite that is missing or
    /// a runtime that will not start leaves the window open reporting why,
    /// because stored data and the rest of the interface remain useful.
    pub fn start(app: &AppHandle, data_directory: &Path) -> Arc<Self> {
        let runtime = Arc::new(Self {
            child: Mutex::new(None),
            stdin: Mutex::new(None),
            pending: Mutex::new(HashMap::new()),
            status: RwLock::new(RuntimeStatus::Starting),
            next_request: AtomicU64::new(1),
            stopping: AtomicBool::new(false),
        });

        match spawn_node(data_directory) {
            Ok(mut child) => {
                let stdout = child.stdout.take().expect("piped runtime stdout");
                let stderr = child.stderr.take().expect("piped runtime stderr");
                *runtime.stdin.lock().unwrap() = child.stdin.take();
                *runtime.child.lock().unwrap() = Some(child);

                let reader_app = app.clone();
                let reader_runtime = Arc::clone(&runtime);
                thread::spawn(move || {
                    read_messages(&reader_app, &reader_runtime, BufReader::new(stdout));
                    reader_runtime.handle_runtime_exit(&reader_app);
                });

                thread::spawn(move || {
                    for line in BufReader::new(stderr).lines().map_while(Result::ok) {
                        eprintln!("{line}");
                    }
                });
            }
            Err(error) => {
                eprintln!("[curator] runtime could not start: {}", error.message);
                runtime.set_status(app, RuntimeStatus::Unavailable { error });
            }
        }

        runtime
    }

    pub fn status(&self) -> RuntimeStatus {
        self.status.read().unwrap().clone()
    }

    /// Sends one command and waits for its correlated reply. A runtime that
    /// stops while the request is outstanding fails it rather than hanging.
    pub fn request(&self, command: &str, payload: Value) -> Result<Value, ApplicationError> {
        let id = self.next_request.fetch_add(1, Ordering::SeqCst).to_string();
        let (reply, wait_for_reply) = channel();

        {
            let mut stdin_guard = self.stdin.lock().unwrap();
            let Some(stdin) = stdin_guard.as_mut() else {
                return Err(self.unavailable_error());
            };
            self.pending.lock().unwrap().insert(id.clone(), reply);
            let request = serde_json::json!({
                "kind": "request",
                "id": id,
                "command": command,
                "payload": payload,
            });
            if let Err(cause) = writeln!(stdin, "{request}").and_then(|()| stdin.flush()) {
                self.pending.lock().unwrap().remove(&id);
                return Err(ApplicationError::runtime_lost(Some(cause.to_string())));
            }
        }

        wait_for_reply.recv().unwrap_or_else(|_| Err(self.unavailable_error()))
    }

    /// Ends the runtime with the host. Closing its input asks it to stop; a
    /// runtime that does not settle is terminated so no owned work continues.
    pub fn shutdown(&self) {
        self.stopping.store(true, Ordering::SeqCst);
        drop(self.stdin.lock().unwrap().take());

        let Some(mut child) = self.child.lock().unwrap().take() else {
            return;
        };
        let deadline = Instant::now() + Duration::from_secs(5);
        loop {
            match child.try_wait() {
                Ok(Some(_)) => return,
                Ok(None) if Instant::now() < deadline => thread::sleep(Duration::from_millis(50)),
                _ => break,
            }
        }
        let _ = child.kill();
        let _ = child.wait();
    }

    fn set_status(&self, app: &AppHandle, status: RuntimeStatus) {
        *self.status.write().unwrap() = status.clone();
        let _ = app.emit(RUNTIME_STATUS_CHANNEL, status);
    }

    fn resolve_reply(&self, id: &str, reply: Result<Value, ApplicationError>) {
        if let Some(sender) = self.pending.lock().unwrap().remove(id) {
            let _ = sender.send(reply);
        }
    }

    /// The runtime stopped. Every execution it owned stopped with it, so the
    /// application reports one failure and asks for a restart instead of
    /// silently starting another runtime.
    fn handle_runtime_exit(&self, app: &AppHandle) {
        let error = ApplicationError::runtime_lost(None);
        // A runtime that stopped because the host is quitting is not a failure
        // to report; the window is going away with it.
        if !self.stopping.load(Ordering::SeqCst) {
            self.set_status(
                app,
                RuntimeStatus::Unavailable {
                    error: error.clone(),
                },
            );
        }
        drop(self.stdin.lock().unwrap().take());
        let pending: Vec<PendingReply> = self.pending.lock().unwrap().drain().map(|(_, sender)| sender).collect();
        for sender in pending {
            let _ = sender.send(Err(error.clone()));
        }
    }

    fn unavailable_error(&self) -> ApplicationError {
        match self.status() {
            RuntimeStatus::Unavailable { error } => error,
            _ => ApplicationError::runtime_unavailable(
                "Curator's application runtime is not available.",
                None,
            ),
        }
    }
}

fn read_messages(app: &AppHandle, runtime: &NodeRuntime, output: impl BufRead) {
    for line in output.lines().map_while(Result::ok) {
        if line.trim().is_empty() {
            continue;
        }
        match serde_json::from_str::<RuntimeMessage>(&line) {
            Ok(RuntimeMessage::Response {
                id,
                ok,
                result,
                error,
            }) => {
                let reply = if ok {
                    Ok(result.unwrap_or(Value::Null))
                } else {
                    Err(error.unwrap_or_else(|| {
                        ApplicationError::internal(
                            "Curator received a failure without an explanation.",
                            None,
                        )
                    }))
                };
                runtime.resolve_reply(&id, reply);
            }
            Ok(RuntimeMessage::Event { seq, name, payload }) => {
                match name.as_str() {
                    "runtime.ready" => runtime.set_status(
                        app,
                        RuntimeStatus::Ready {
                            description: payload.clone(),
                        },
                    ),
                    "runtime.failed" => {
                        if let Ok(error) =
                            serde_json::from_value::<ApplicationError>(payload["error"].clone())
                        {
                            runtime.set_status(app, RuntimeStatus::Unavailable { error });
                        }
                    }
                    _ => {}
                }
                let _ = app.emit(
                    RUNTIME_EVENT_CHANNEL,
                    EventEnvelope {
                        kind: "event",
                        seq,
                        name,
                        payload,
                    },
                );
            }
            Err(cause) => eprintln!("[curator] unreadable runtime message: {cause}"),
        }
    }
}

fn spawn_node(data_directory: &Path) -> Result<Child, ApplicationError> {
    let node = resolve_node_executable()?;
    let entry = runtime_entry();
    if !entry.exists() {
        return Err(ApplicationError::runtime_unavailable(
            "Curator could not find its compiled application runtime.",
            Some(format!(
                "{} does not exist. Run pnpm build, or pnpm dev, from the checkout root.",
                entry.display()
            )),
        ));
    }

    Command::new(&node)
        .arg(&entry)
        .arg("--data-dir")
        .arg(data_directory)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|cause| {
            ApplicationError::runtime_unavailable(
                "Curator could not start its application runtime.",
                Some(format!("{} {}: {cause}", node.display(), entry.display())),
            )
        })
}

/// Resources and the application runtime come from this checkout, never from a
/// selected Repository or a tool's working directory. The path is fixed when
/// the host is compiled, which suits the accepted checkout-based launch and
/// makes the built application specific to the machine that built it.
fn checkout_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .ancestors()
        .nth(3)
        .expect("the crate lives at <checkout>/apps/desktop/src-tauri")
        .to_path_buf()
}

fn runtime_entry() -> PathBuf {
    checkout_root().join("packages/runtime/dist/main.js")
}

/// Finds the installed Node the host should supervise. `CURATOR_NODE` wins so a
/// specific installation can be named; otherwise the one on PATH is used, and
/// finally the Homebrew keg for the pinned major version.
fn resolve_node_executable() -> Result<PathBuf, ApplicationError> {
    let mut attempts = Vec::new();
    for candidate in node_candidates() {
        match node_major_version(&candidate) {
            Some(REQUIRED_NODE_MAJOR) => return Ok(candidate),
            Some(found) => attempts.push(format!("{} is Node {found}", candidate.display())),
            None => attempts.push(format!("{} did not report a version", candidate.display())),
        }
    }

    Err(ApplicationError::runtime_unavailable(
        format!("Curator needs Node {PINNED_NODE_VERSION} to run its application runtime."),
        Some(format!(
            "Tried: {}. Put the pinned Node on PATH, or set CURATOR_NODE to its executable.",
            if attempts.is_empty() {
                "no Node executable was found".to_owned()
            } else {
                attempts.join("; ")
            }
        )),
    ))
}

fn node_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    if let Some(named) = env::var_os("CURATOR_NODE") {
        candidates.push(PathBuf::from(named));
    }
    if let Some(path) = env::var_os("PATH") {
        for directory in env::split_paths(&path) {
            let executable = directory.join("node");
            if executable.is_file() {
                candidates.push(executable);
            }
        }
    }
    candidates.push(PathBuf::from("/opt/homebrew/opt/node@24/bin/node"));
    candidates.dedup();
    candidates
}

fn node_major_version(executable: &Path) -> Option<u32> {
    let output = Command::new(executable).arg("--version").output().ok()?;
    if !output.status.success() {
        return None;
    }
    String::from_utf8(output.stdout)
        .ok()?
        .trim()
        .trim_start_matches('v')
        .split('.')
        .next()?
        .parse()
        .ok()
}

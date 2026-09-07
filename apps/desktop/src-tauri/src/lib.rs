//! The desktop host. It owns native directory selection, single-instance
//! behavior, and supervision of the Node runtime; the interface reaches
//! application state only through the commands below.

mod runtime;

use std::sync::Arc;

use serde_json::Value;
use tauri::{AppHandle, Manager, RunEvent};
use tauri_plugin_dialog::DialogExt;

use runtime::{ApplicationError, NodeRuntime, RuntimeStatus};

/// What the host knows about its runtime. The interface reads this on load so a
/// reloaded window recovers the current state rather than assuming it observed
/// the startup events.
#[tauri::command]
fn runtime_status(app: AppHandle) -> RuntimeStatus {
    app.state::<Arc<NodeRuntime>>().status()
}

/// Relays one typed command to the runtime and returns its correlated reply.
#[tauri::command]
async fn runtime_request(
    app: AppHandle,
    command: String,
    payload: Value,
) -> Result<Value, ApplicationError> {
    let runtime = Arc::clone(&app.state::<Arc<NodeRuntime>>());
    tauri::async_runtime::spawn_blocking(move || runtime.request(&command, payload))
        .await
        .unwrap_or_else(|cause| {
            Err(ApplicationError::internal(
                "Curator could not complete that request.",
                Some(cause.to_string()),
            ))
        })
}

/// Opens the native folder chooser. `None` means the user cancelled, which is
/// kept distinct from the chooser failing so a failure is never mistaken for a
/// deliberate cancellation.
#[tauri::command]
async fn select_repository_directory(app: AppHandle) -> Result<Option<String>, ApplicationError> {
    let (chosen, wait_for_choice) = std::sync::mpsc::channel();
    app.dialog()
        .file()
        .set_title("Choose a Repository")
        .pick_folder(move |folder| {
            let _ = chosen.send(folder);
        });

    let folder = tauri::async_runtime::spawn_blocking(move || wait_for_choice.recv())
        .await
        .map_err(|cause| {
            ApplicationError::internal(
                "Curator could not open the folder chooser.",
                Some(cause.to_string()),
            )
        })?
        .map_err(|cause| {
            ApplicationError::internal(
                "Curator did not receive a choice from the folder chooser.",
                Some(cause.to_string()),
            )
        })?;

    match folder {
        None => Ok(None),
        Some(folder) => folder
            .into_path()
            .map(|path| Some(path.to_string_lossy().into_owned()))
            .map_err(|cause| {
                ApplicationError::internal(
                    "Curator could not read the chosen folder's location.",
                    Some(cause.to_string()),
                )
            }),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        // One Curator instance owns one runtime, so a second launch brings the
        // existing window forward instead of starting another.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            runtime_status,
            runtime_request,
            select_repository_directory
        ])
        .setup(|app| {
            // Development and the compiled application share one identifier, so
            // both read and write the same app-private store outside any
            // analyzed Repository.
            let data_directory = app.path().app_data_dir()?;
            let runtime = NodeRuntime::start(&app.handle().clone(), &data_directory);
            app.manage(runtime);
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("Curator could not start its desktop host");

    app.run(|app, event| {
        if let RunEvent::Exit = event {
            app.state::<Arc<NodeRuntime>>().shutdown();
        }
    });
}

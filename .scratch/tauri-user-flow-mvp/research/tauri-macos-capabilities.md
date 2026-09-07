# Tauri macOS capability research

Research snapshot: 2026-09-02. This note targets Tauri 2 and a locally run macOS development build. It distinguishes what the cited first-party sources establish from architecture recommendations for this MVP.

## Executive conclusion

The MVP is feasible as a single Tauri process with a web frontend and a Rust core. The Rust core can hold the OpenRouter credential, traverse a user-selected repository without writing to it, persist workspace records in an app-specific data directory, run scans away from the UI thread, stream progress, and cooperatively cancel work.

There are three decision-relevant constraints:

1. Apple's preferred data-protection keychain requires signing entitlements and, for some uses, a provisioning profile. That conflicts with the MVP's no-signing local-development contract. The still-supported file-based macOS Keychain works without that provisioning step, but Apple describes it as being on the road to deprecation.
2. Tauri capabilities constrain interfaces exposed to the WebView; they do not constrain trusted Rust code. Repository read-only and root confinement therefore have to be enforced inside the Rust scan module.
3. Async work is cancellable only at points where it cooperates with cancellation. Once `spawn_blocking` work has begun, aborting its task does not stop it. Filesystem/CPU loops must explicitly check a cancellation signal and return.

## Facts established by official sources

### macOS credential storage

- Apple describes Keychain Services as storage for small pieces of sensitive data in an encrypted keychain. `SecItemAdd` encrypts secret password/private-key data and blocks its calling thread, so it should not be invoked from the UI/main thread ([Keychain Services](https://developer.apple.com/documentation/security/keychain-services), [`SecItemAdd`](https://developer.apple.com/documentation/security/secitemadd(_:_:))).
- On macOS, the modern `SecItem` API can target either the older file-based keychain or the data-protection keychain. By default it targets the file-based keychain; `kSecUseDataProtectionKeychain = true` targets the data-protection keychain. Apple recommends `SecItem` and recommends the data-protection implementation for new work, while noting that the file-based implementation is not officially deprecated but is on the road to deprecation ([TN3137: On Mac keychains](https://developer.apple.com/documentation/technotes/tn3137-on-mac-keychains), [`kSecUseDataProtectionKeychain`](https://developer.apple.com/documentation/security/ksecusedataprotectionkeychain)).
- Data-protection keychain access groups are derived from code-signing entitlements and those entitlements must be authorized by a provisioning profile. This is the material difference for an unsigned/unprovisioned development build ([TN3137](https://developer.apple.com/documentation/technotes/tn3137-on-mac-keychains)).
- The current Rust `apple-native-keyring-store` library exposes separate `keychain` and `protected` stores. Its own documentation says clients without a provisioning-profile signature should use `keychain`; using `protected` without the required entitlement fails with platform error `-34018`. The protected store requires macOS 10.15 or later and can optionally support iCloud synchronization or biometric access when the relevant signing capabilities are present ([crate overview](https://docs.rs/apple-native-keyring-store/latest/apple_native_keyring_store/), [package documentation](https://docs.rs/crate/apple-native-keyring-store/latest)).
- The `security-framework` Rust library also exposes generic-password get/set/delete operations backed by Apple's Security framework ([`security_framework::passwords`](https://docs.rs/security-framework/latest/security_framework/passwords/index.html)).
- Tauri's official Stronghold plugin is an encrypted database whose vault is loaded with a password; it is not the native macOS Keychain ([Tauri Stronghold](https://v2.tauri.app/plugin/stronghold/)). Tauri's Store plugin persists ordinary values to an app-data path and should not be confused with secret storage ([Tauri Store reference](https://v2.tauri.app/reference/javascript/store/)).

### App-specific local persistence

- Tauri's `appDataDir()` resolves to the platform data directory plus the bundle identifier. On macOS, the base data/local-data directory resolves under `$HOME/Library/Application Support`; the bundle identifier is the `identifier` configured in `tauri.conf.json` ([Tauri path API](https://v2.tauri.app/reference/javascript/api/namespacepath/), [`BaseDirectory`](https://docs.rs/tauri/latest/tauri/path/enum.BaseDirectory.html)).
- Tauri's Store plugin saves its store under `app_data_dir`, supports explicit save, and by default auto-saves after a debounce. The guide also says dirty state is saved on graceful exit; an abrupt process termination is therefore not a persistence guarantee ([Store guide](https://v2.tauri.app/plugin/store/), [Store reference](https://v2.tauri.app/reference/javascript/store/)).
- Tauri's official SQL plugin supports SQLite, with its SQLite path relative to the application's config directory ([Tauri SQL](https://v2.tauri.app/plugin/sql/)).
- “App-specific directory” is a path convention, not an OS sandbox claim. Tauri explicitly says its capability boundary does not protect against malicious/insecure Rust code, lax scopes, or incorrect checks in custom commands ([Tauri capabilities](https://v2.tauri.app/security/capabilities/)).

### Repository filesystem scope and symlinks

- Tauri plugin commands and filesystem paths are denied by default until appropriate capabilities and scopes are granted. A filesystem permission alone does not grant path scope; explicit allow paths are required. Deny rules override allow rules ([Tauri filesystem plugin](https://v2.tauri.app/plugin/file-system/)).
- The Tauri filesystem plugin rejects parent-directory traversal. Its `stat` follows symlinks and returns an error when the resolved target is outside the allowed scope; `lstat` inspects the symlink itself without following it ([Tauri filesystem plugin](https://v2.tauri.app/plugin/file-system/)).
- Selecting a directory through Tauri's dialog plugin adds it to filesystem and asset-protocol scopes for that process, including recursive scope when requested. The dialog documentation warns that this runtime scope is not persisted across application restarts and recommends a dedicated command when security matters more than convenience ([Tauri dialog `open`](https://v2.tauri.app/reference/javascript/dialog/)).
- Those plugin scopes do not automatically confine `std::fs` or `tokio::fs` calls made in custom Rust code; the capability documentation specifically excludes incorrect or intentional Rust-side bypasses from its protection ([Tauri capabilities](https://v2.tauri.app/security/capabilities/)).
- Rust's `std::fs::canonicalize` produces an absolute path with symlinks resolved, but a check followed later by a pathname-based open is still a separate operation ([Rust `canonicalize`](https://doc.rust-lang.org/std/fs/fn.canonicalize.html)).
- The `ignore` crate's `WalkBuilder` respects `.ignore`, `.gitignore`, `.git/info/exclude`, and global Git ignore rules by default; following symlinks is disabled by default. These defaults are useful mechanics, but whether all of those exclusions match this product's scan-effort promise remains a product decision ([`ignore::WalkBuilder`](https://docs.rs/ignore/latest/ignore/struct.WalkBuilder.html)).
- The Bytecode Alliance's `cap-std` provides an open-directory capability whose relative filesystem operations prevent `..`, absolute-path, and symlink escapes from that directory, including on macOS ([cap-std capability model](https://github.com/bytecodealliance/cap-std/blob/main/README.md), [`cap_std::fs::Dir`](https://docs.rs/cap-std/latest/cap_std/fs/struct.Dir.html)).

### Long-running work, progress, and cancellation

- Tauri recommends async commands for heavy work so the UI does not freeze. Async commands run in a separate task via `tauri::async_runtime::spawn`; synchronous commands otherwise run on the main thread unless explicitly marked async ([Calling Rust from the frontend](https://v2.tauri.app/develop/calling-rust/)).
- Tauri channels are its recommended IPC mechanism for streaming ordered data such as progress from Rust to the frontend ([Tauri channels](https://v2.tauri.app/develop/calling-rust/#channels)).
- Tauri exposes `async_runtime::spawn_blocking` for operations that must run on a blocking executor rather than the async scheduler ([Tauri `spawn_blocking`](https://docs.rs/tauri/latest/tauri/async_runtime/fn.spawn_blocking.html)).
- Tokio documents that ordinary async tasks can be aborted when they next yield, but a `spawn_blocking` task cannot be aborted after it has started. Runtime shutdown drops outstanding async tasks and does not guarantee they finish. Tokio recommends dedicated threads, rather than occupying the blocking pool indefinitely, for persistent or very long-lived blocking workers ([Tokio task cancellation](https://docs.rs/tokio/latest/tokio/task/index.html#cancellation), [`spawn_blocking`](https://docs.rs/tokio/latest/tokio/task/fn.spawn_blocking.html), [`spawn`](https://docs.rs/tokio/latest/tokio/task/fn.spawn.html)).
- `tokio_util::sync::CancellationToken` is an official cooperative primitive: `cancel()` signals clones/children and `cancelled()` yields a future that resolves when cancellation is requested ([`CancellationToken`](https://docs.rs/tokio-util/latest/tokio_util/sync/struct.CancellationToken.html)).

### Locally runnable macOS development build

- Tauri's current prerequisites list macOS Catalina 10.15 or later for development. Desktop-only development may use Xcode Command Line Tools (`xcode-select --install`) instead of the full Xcode application. Rust is required; Node.js LTS is required only for a JavaScript/TypeScript frontend ([Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)).
- A generated project can be run with the package-manager-specific `tauri dev` command; the CLI compiles the Rust code, starts the configured frontend development server, and opens the application window. `tauri dev` supports Rust hot reload ([Create a project](https://v2.tauri.app/start/create-project/), [Tauri CLI `dev`](https://v2.tauri.app/reference/cli/#dev)).
- Apple says signing is not required to run a macOS app on the same Mac unless the app uses a capability that requires provisioning. Signing and notarization are requirements for distribution, not for this local development milestone ([Apple: building and running an app](https://developer.apple.com/documentation/xcode/building-and-running-an-app), [Tauri distribution](https://v2.tauri.app/distribute/)).
- A Tauri macOS bundle defaults to a macOS 10.13 minimum deployment target, but this does not lower the current 10.15 development-host prerequisite, and dependencies can require a higher deployment target ([Tauri macOS application bundle](https://v2.tauri.app/distribute/macos-application-bundle/)).

## Architectural recommendations for the MVP

These are recommendations derived from the facts above, not claims made by Tauri or Apple.

### Credential boundary

1. Keep all OpenRouter key operations in Rust. Expose narrow commands such as `set_openrouter_key`, `has_openrouter_key`, and `delete_openrouter_key`; never return the key to the WebView and never place it in logs, scan records, frontend state, or the ordinary app database.
2. For the locally runnable, unprovisioned MVP, use the native file-based macOS Keychain through `apple-native-keyring-store`'s `keychain` feature (or a similarly narrow `security-framework` wrapper). Identify the item with a stable service name derived from the stable bundle identifier and a fixed account such as `openrouter`.
3. Record migration to the data-protection keychain as a distribution-phase requirement. Re-evaluate it when signing/provisioning enters scope. Stronghold is a possible cross-platform encrypted-vault design later, but it does not meet the explicit “macOS Keychain” contract and introduces a vault-key/password lifecycle of its own.
4. Run synchronous Keychain calls on the blocking executor and surface locked/denied/not-found failures as distinct configuration states.

### Workspace persistence

1. Put non-secret workspace state under Tauri's app-specific data/config path, keyed by a stable bundle identifier. Persist repository location, scan settings, scan lifecycle/usage, generated results, manual edits, deletions, and Outdated state there; write nothing into the selected repository.
2. Prefer one SQLite database managed behind Rust commands over a collection of frontend Store files. The domain contains durable relationships and state transitions, and scan results should be transactionally committed. Keep transient caches and incomplete request payloads in a separate cache area so they can be removed without losing curated flows.
3. Commit a scan record before work starts, persist progress at coarse checkpoints, commit every valid partial result in a transaction, and mark an interrupted process as interrupted on next startup. Do not rely on graceful-exit auto-save as the only durability mechanism.

### Read-only repository capability

1. Use the dialog only to obtain explicit user intent and a starting directory. Pass that directory to one dedicated Rust workspace command; do not expose general-purpose filesystem write commands or broad `$HOME/**/*` scopes to the WebView.
2. Canonicalize the chosen root once, open it as a directory capability, and make scanner code accept that handle plus relative paths rather than arbitrary absolute paths. `cap-std::fs::Dir` is the strongest portable option found in the primary-source review because it prevents symlink/path escape during the open operation, not just in an earlier string check.
3. Do not follow repository symlinks in the MVP. Report skipped symlinks in the considered/excluded counts. If following in-root symlinks becomes a product requirement, use capability-relative opens that reject out-of-root targets rather than `canonicalize` plus `starts_with` alone.
4. Model read-only as an invariant of the Rust repository port: offer list/stat/open-read operations only. Keep app-data writes in a separate persistence module whose interface cannot receive repository-relative paths.
5. Treat ignore-file behavior, hidden files, dependency/build directories, binary detection, size limits, and secret-file exclusions as an explicit scan-policy decision. Do not inherit the `ignore` crate defaults invisibly, especially because “maximum effort” may intentionally differ from ordinary source-search defaults.

### Scan execution and cancellation

1. Represent each scan with an application-assigned scan ID, persisted lifecycle state, a `CancellationToken`, and a task handle held in Rust-managed state. Return the scan ID immediately rather than keeping a single frontend invocation open for the whole scan.
2. Use async work for OpenRouter requests and orchestration. Use bounded `spawn_blocking` sections for synchronous Keychain work and any blocking parsing/traversal. Every directory loop, file-read batch, model-request boundary, and result-commit boundary should observe cancellation.
3. Stream structured progress over a Tauri channel: stage, considered/excluded counts, completed model work, usage/cost when OpenRouter returns it, partial-result availability, and terminal status. Persist results in Rust before announcing them to the UI.
4. Cancellation is a request, not an instantaneous kill. Stop scheduling new work, cancel/drop outstanding async network work, have blocking loops return at their next checkpoint, save valid completed results, and finish in a `cancelled` state. The UI should communicate that cancellation may take a short time.
5. Keep the MVP worker in the application process. On application exit, request cancellation and persist interruption state; do not promise scanning after the process closes. A durable helper/daemon or `launchd` service would be a separate architecture and distribution/signing decision.

### Development contract

1. Document macOS 10.15+, Xcode Command Line Tools, Rust stable, Node.js LTS, and the chosen JavaScript package manager as development prerequisites. Include one verified `tauri dev` command as the acceptance path.
2. Do not require an Apple Developer account, provisioning profile, notarization, or distribution certificate for the MVP acceptance build. This is why the protected-data Keychain implementation cannot be an MVP dependency.
3. Fix the bundle identifier before creating persisted workspaces or Keychain items: it is part of the app-data path and should also anchor the Keychain service name. Changing it later otherwise creates an apparent loss of local data/credentials.

## Caveats to carry into later decisions

- “App-private” here means app-specific storage, not an App Sandbox guarantee. Sandboxing, signing, notarization, hardened runtime, and distribution remain out of scope.
- The file-based macOS Keychain satisfies the local Keychain requirement today, but its migration is known technical debt because Apple prefers the data-protection implementation.
- The exact scan exclusion policy is not settled by these platform facts. It must reconcile repository privacy, cost/size bounds, and the promise of higher scanning effort.
- A path-selection dialog plus a saved path does not itself guarantee that the repository still exists or refers to the same checkout at the next launch. Workspace-open and rescan flows must handle moved, deleted, inaccessible, or replaced roots.
- Any later requirement to continue scans after the application process exits would invalidate the in-process worker recommendation and needs a new security/lifecycle decision.

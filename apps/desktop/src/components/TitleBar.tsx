/** The window's own draggable strip. macOS draws its controls over the left. */
export function TitleBar({ title }: { title: string }) {
  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="wordmark label" data-tauri-drag-region>
        {title}
      </div>
    </div>
  );
}

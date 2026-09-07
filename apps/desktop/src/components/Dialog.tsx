import { useEffect, useRef, type ReactNode } from "react";

/** A modal that closes on Escape and on the backdrop, like the rest of macOS. */
export function Dialog({
  title,
  subtitle,
  open,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const element = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = element.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={element}
      className="modal"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === element.current) {
          onClose();
        }
      }}
    >
      <header className="modal-header">
        <h2>{title}</h2>
        {subtitle !== undefined && <p>{subtitle}</p>}
      </header>
      <div className="modal-body">{children}</div>
      <footer className="modal-footer">
        {footer ?? (
          <button className="primary" onClick={onClose}>
            Close
          </button>
        )}
      </footer>
    </dialog>
  );
}

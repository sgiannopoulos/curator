import { useEffect, useRef, useState, type ReactNode } from "react";

export interface MenuItem {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}

/** A small popover of actions for the thing currently being read. */
export function Menu({ label, items }: { label: ReactNode; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ top: 0, right: 0 });
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const close = (event: Event) => {
      if (!container.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    const dismiss = () => setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    document.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
      document.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [open]);

  return (
    <div className="menu" ref={container}>
      <button
        ref={trigger}
        className="plain"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="User Flow options"
        onClick={() => {
          // The reading pane scrolls, so the popover is positioned against the
          // window instead of being clipped inside it.
          const bounds = trigger.current?.getBoundingClientRect();
          if (bounds) {
            setAnchor({ top: bounds.bottom + 4, right: window.innerWidth - bounds.right });
          }
          setOpen((current) => !current);
        }}
      >
        {label}
      </button>
      {open && (
        <div className="menu-items" role="menu" style={{ top: anchor.top, right: anchor.right }}>
          {items.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              className={item.destructive ? "danger" : ""}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

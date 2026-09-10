import { useCallback, useEffect, useRef, useState } from "preact/hooks";

const openPopups = new Set<() => void>();

/** Escape and outside pointer-down close an open popup. */
function usePopupDismiss(
  containerRef: { current: HTMLDivElement | null },
  open: boolean,
  close: () => void,
): void {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [containerRef, open, close]);
}

/**
 * Toggle-popup behavior for the transport bar popups (ui-shell spec): the
 * button toggles, `aria-expanded` reports state, Escape and outside
 * pointer-down close, and opening one popup closes the others. The button
 * and the popup panel must share the container element the ref points at.
 */
export function usePopup() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  usePopupDismiss(containerRef, open, close);

  useEffect(() => {
    openPopups.add(close);
    return () => {
      openPopups.delete(close);
    };
  }, [close]);

  const toggle = useCallback(() => {
    setOpen((next) => {
      if (!next) {
        for (const closeOther of openPopups) {
          closeOther();
        }
      }
      return !next;
    });
  }, []);

  const openPopup = useCallback(() => {
    for (const closeOther of openPopups) {
      closeOther();
    }
    setOpen(true);
  }, []);

  return { containerRef, open, toggle, openPopup, close };
}

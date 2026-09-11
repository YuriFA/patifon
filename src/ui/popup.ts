import { useCallback, useEffect, useRef, useState } from "preact/hooks";

const openPopups = new Set<() => void>();

/** Escape and outside pointer-down close an open popup. */
function usePopupDismiss(
  containerRef: { current: HTMLDivElement | null },
  openRef: { current: boolean },
  close: () => void,
): void {
  // The listeners attach once at mount and read the open state through the
  // ref at event time: attaching them in an [open] effect left a
  // post-paint window where an outside pointer-down or Escape arrived
  // before the listener existed and was silently dropped.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && openRef.current) {
        close();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (openRef.current && !containerRef.current?.contains(event.target as Node)) {
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [containerRef, openRef, close]);
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
  // Mirrors the state during render so the mount-attached dismiss listeners
  // always observe the current value without an effect-timing gap.
  const openRef = useRef(false);
  openRef.current = open;
  const close = useCallback(() => setOpen(false), []);
  usePopupDismiss(containerRef, openRef, close);

  useEffect(() => {
    openPopups.add(close);
    return () => {
      openPopups.delete(close);
    };
  }, [close]);

  const toggle = useCallback(() => {
    setOpen((next) => {
      if (!next) {
        // close every OTHER open popup - calling own close from inside the
        // own updater would race the value this updater returns
        for (const closeOther of openPopups) {
          if (closeOther !== close) {
            closeOther();
          }
        }
      }
      return !next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [close]);

  const openPopup = useCallback(() => {
    for (const closeOther of openPopups) {
      if (closeOther !== close) {
        closeOther();
      }
    }
    setOpen(true);
  }, [close]);

  return { containerRef, open, toggle, openPopup, close };
}

/**
 * Wires the window-wide drag-n-drop zone: audio files dropped anywhere on the
 * page go to the given handler.
 */
export function initDropzone(onFiles: (files: File[]) => void): void {
  let dragDepth = 0;
  window.addEventListener("dragenter", (event) => {
    event.preventDefault();
    dragDepth += 1;
    document.body.classList.add("drop-hover");
  });
  window.addEventListener("dragleave", () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) {
      document.body.classList.remove("drop-hover");
    }
  });
  window.addEventListener("dragover", (event) => {
    event.preventDefault();
  });
  window.addEventListener("drop", (event) => {
    event.preventDefault();
    dragDepth = 0;
    document.body.classList.remove("drop-hover");
    if (event.dataTransfer) {
      onFiles([...event.dataTransfer.files]);
    }
  });
}

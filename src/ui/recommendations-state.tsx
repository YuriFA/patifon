import { recommendationsState, runStateAction } from "../recommendations/ui";

/**
 * The recommendations state line (Warm Earth): loading, connect prompt,
 * error with retry. Rendered inside the section's state element; the empty
 * state collapses via the :empty rule.
 */
export function RecommendationsState() {
  const view = recommendationsState.value;
  if (!view.text) {
    return null;
  }
  return (
    <>
      <span>{view.text}</span>
      {view.actionLabel !== null && (
        <button type="button" class="recommendations__connect" onClick={() => runStateAction()}>
          {view.actionLabel}
        </button>
      )}
    </>
  );
}

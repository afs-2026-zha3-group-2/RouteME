/**
 * The RouteMe brand mark, used by the shell header and the identity gate.
 * Two assets so the travellers' navy silhouette can turn light in dark mode;
 * styles.css shows exactly one of them based on [data-theme].
 */
export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <img className="mark-light" src="/brand-mark.png" alt="" />
      <img className="mark-dark" src="/brand-mark-dark.png" alt="" />
    </span>
  );
}
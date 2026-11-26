export function formatExcerptLocationLabel(startLine: number, endLine: number): string {
  if (startLine <= 0) return "Selection";
  return startLine === endLine ? `L${startLine}` : `L${startLine}-${endLine}`;
}

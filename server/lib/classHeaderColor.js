const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** @param {unknown} value @returns {string | null} */
export function normalizeHeaderColor(value) {
  if (value === null || value === undefined || value === '') return null;
  const v = String(value).trim();
  if (!HEX_COLOR.test(v)) return null;
  if (v.length === 4) {
    const r = v[1];
    const g = v[2];
    const b = v[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return v.toLowerCase();
}

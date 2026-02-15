export function teamKeyFromIds(ids) {
  return [...ids].sort().join("|");
}

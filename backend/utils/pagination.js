export function parsePagination(query) {
  const limit = Math.min(Number(query.limit || 20), 200);
  const offset = Math.max(Number(query.offset || 0), 0);
  return { limit, offset };
}

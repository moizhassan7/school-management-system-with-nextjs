export function parsePagination(
  searchParams: URLSearchParams,
  options?: { defaultPageSize?: number; maxPageSize?: number; minPageSize?: number }
) {
  const defaultPageSize = options?.defaultPageSize ?? 25;
  const maxPageSize = options?.maxPageSize ?? 100;
  const minPageSize = options?.minPageSize ?? 1;

  const pageRaw = Number(searchParams.get('page') || 1);
  const sizeRaw = Number(searchParams.get('pageSize') || defaultPageSize);

  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const pageSize = Number.isFinite(sizeRaw)
    ? Math.min(maxPageSize, Math.max(minPageSize, Math.floor(sizeRaw)))
    : defaultPageSize;

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
  };
}

export function pageMeta(page: number, pageSize: number, total: number) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize) || 1),
  };
}

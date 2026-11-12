"use client";

export function TableToolbar({ search, onSearch, placeholder, countLabel }: {
  search: string;
  onSearch: (_value: string) => void;
  placeholder: string;
  countLabel: string;
}) {
  return <div className="table-toolbar">
    <label className="admin-search">⌕ <span className="sr-only">Search table</span><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder={placeholder} /></label>
    <span className="admin-filter" aria-live="polite">{countLabel}</span>
  </div>;
}

export function TablePagination({ page, pageCount, total, onPage }: {
  page: number;
  pageCount: number;
  total: number;
  onPage: (_page: number) => void;
}) {
  if (total <= 10) return null;
  const first = (page - 1) * 10 + 1;
  const last = Math.min(page * 10, total);
  return <nav className="table-pagination" aria-label="Table pagination">
    <span>Showing {first}–{last} of {total}</span>
    <div>
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
      <span aria-current="page">Page {page} of {pageCount}</span>
      <button type="button" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>Next</button>
    </div>
  </nav>;
}

export function SortableHeading({ label, column, activeColumn, direction, onSort }: {
  label: string;
  column: string;
  activeColumn: string;
  direction: "asc" | "desc";
  onSort: (_column: string) => void;
}) {
  const active = activeColumn === column;
  return <button type="button" className="table-sort-button" aria-label={`Sort by ${label}${active ? direction === "asc" ? " ascending" : " descending" : ""}`} aria-pressed={active} onClick={() => onSort(column)}>
    {label}{active ? direction === "asc" ? " ↑" : " ↓" : ""}
  </button>;
}

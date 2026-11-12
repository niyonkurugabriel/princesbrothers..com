"use client";

import { useMemo, useState } from "react";

export type AdminTableValue = string | number | null;

export function useAdminTable<T>(
  items: readonly T[],
  searchText: (_item: T) => string,
  sortValue: (_item: T, _key: string) => AdminTableValue,
  initialSort: string,
  pageSize = 10,
) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState(initialSort);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const filteredItems = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return items.filter((item) => !term || searchText(item).toLocaleLowerCase().includes(term));
  }, [items, search, searchText]);
  const sortedItems = useMemo(() => [...filteredItems].sort((first, second) => {
    const a = sortValue(first, sortKey);
    const b = sortValue(second, sortKey);
    const comparison = typeof a === "number" && typeof b === "number"
      ? a - b
      : String(a ?? "").localeCompare(String(b ?? ""), undefined, { numeric: true, sensitivity: "base" });
    return sortDirection === "asc" ? comparison : -comparison;
  }), [filteredItems, sortDirection, sortKey, sortValue]);
  const pageCount = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const currentPage = Math.min(page, pageCount);

  function toggleSort(key: string) {
    setPage(1);
    if (sortKey === key) setSortDirection((direction) => direction === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  return {
    search,
    setSearch: (value: string) => { setSearch(value); setPage(1); },
    sortKey,
    sortDirection,
    toggleSort,
    page: currentPage,
    pageCount,
    total: sortedItems.length,
    items: sortedItems.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    setPage: (value: number) => setPage(Math.max(1, Math.min(value, pageCount))),
  };
}

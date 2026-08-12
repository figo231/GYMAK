import { ChevronRight, ChevronLeft } from "lucide-react";

interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, totalCount, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="flex items-center justify-between border-t border-gray-200 px-1 pt-3 text-sm dark:border-gray-800">
      <span className="text-gray-500 dark:text-gray-400">
        {totalCount === 0 ? "لا نتائج" : `صفحة ${page} من ${totalPages} — إجمالي ${totalCount}`}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 disabled:opacity-40 dark:border-gray-700"
        >
          <ChevronRight size={16} />
          السابق
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 disabled:opacity-40 dark:border-gray-700"
        >
          التالي
          <ChevronLeft size={16} />
        </button>
      </div>
    </div>
  );
}

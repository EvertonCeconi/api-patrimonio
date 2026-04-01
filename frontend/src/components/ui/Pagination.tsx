import type { PaginationMeta } from '@/types';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function Pagination({ meta, onPageChange }: PaginationProps) {
  const { page, totalPages, hasPreviousPage, hasNextPage, total, limit } = meta;

  if (totalPages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between px-1">
      <p className="text-sm text-surface-600">
        Mostrando <span className="font-medium text-surface-900">{from}–{to}</span>{' '}
        de <span className="font-medium text-surface-900">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPreviousPage}
          className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
        >
          Anterior
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce<(number | '...')[]>((acc, p, idx, arr) => {
            if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
            acc.push(p);
            return acc;
          }, [])
          .map((p, idx) =>
            p === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-surface-400 text-sm">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                  p === page
                    ? 'bg-brand-600 text-white'
                    : 'text-surface-600 hover:bg-surface-100'
                }`}
              >
                {p}
              </button>
            ),
          )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
          className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}

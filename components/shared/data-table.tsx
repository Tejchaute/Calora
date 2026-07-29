'use client';

import { ReactNode, useState, useMemo } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from './empty-state';
import { TableSkeleton } from './loading-states';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKey?: (row: T) => string;
  pageSize?: number;
  className?: string;
}

export function DataTable<T extends { id?: string }>({
  columns,
  data,
  loading,
  emptyTitle = 'No results found',
  emptyDescription = 'Try adjusting your search or filters.',
  emptyAction,
  searchable = false,
  searchPlaceholder = 'Search...',
  searchKey,
  pageSize = 10,
  className,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!search || !searchKey) return data;
    return data.filter((row) =>
      searchKey(row).toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search, searchKey]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));
  const pagedData = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  if (loading) {
    return <TableSkeleton rows={Math.min(pageSize, 5)} columns={columns.length} />;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {searchable && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
      )}

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                  {emptyAction && <div className="pb-6">{emptyAction}</div>}
                </TableCell>
              </TableRow>
            ) : (
              pagedData.map((row, index) => (
                <TableRow key={row.id ?? index}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {totalPages > 1 && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function TablePagination({
  currentPage,
  totalPages,
  onPageChange,
}: TablePaginationProps) {
  const canPrev = currentPage > 0;
  const canNext = currentPage < totalPages - 1;

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Page {currentPage + 1} of {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" disabled={!canPrev} onClick={() => onPageChange(0)} aria-label="First page">
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" disabled={!canPrev} onClick={() => onPageChange(currentPage - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" disabled={!canNext} onClick={() => onPageChange(currentPage + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" disabled={!canNext} onClick={() => onPageChange(totalPages - 1)} aria-label="Last page">
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

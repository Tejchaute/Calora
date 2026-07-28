export interface SelectOption {
  value: string;
  label: string;
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  error: string | null;
}

export interface MutationResult {
  error: string | null;
}

export type SortDirection = 'asc' | 'desc';

export interface TableSort {
  column: string;
  direction: SortDirection;
}

export interface PageParams {
  page: number;
  pageSize?: number;
  search?: string;
  sort?: TableSort;
}

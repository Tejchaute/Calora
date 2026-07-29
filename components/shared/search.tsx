'use client';

import { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from './empty-state';
import { Spinner } from './loading-states';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Search...', className }: SearchInputProps) {
  return (
    <div className={cn('relative max-w-sm', className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
        aria-label="Search"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  actions?: ReactNode;
  className?: string;
}

export function SearchBar({ value, onChange, placeholder, actions, className }: SearchBarProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <SearchInput value={value} onChange={onChange} placeholder={placeholder} />
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SearchEmptyState({ query }: { query: string }) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={query ? `No matches for "${query}".` : 'Try searching for something else.'}
    />
  );
}

export function SearchLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <Spinner className="h-6 w-6 text-muted-foreground" />
    </div>
  );
}

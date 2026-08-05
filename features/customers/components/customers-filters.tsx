'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface CustomersFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export function CustomersFilters({ search, onSearchChange }: CustomersFiltersProps) {
  return (
    <div className="relative max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search customers..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-10"
      />
    </div>
  );
}

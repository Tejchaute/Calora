'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface StaffFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export function StaffFilters({ search, onSearchChange }: StaffFiltersProps) {
  return (
    <div className="relative max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search staff..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-10"
      />
    </div>
  );
}

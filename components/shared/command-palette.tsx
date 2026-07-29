'use client';

import { useEffect, useState, useCallback, ComponentType, ReactNode } from 'react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { LucideIcon } from 'lucide-react';

export interface CommandEntry {
  id: string;
  label: string;
  onSelect: () => void;
  icon?: LucideIcon;
  shortcut?: string;
  keywords?: string;
  disabled?: boolean;
}

export interface CommandGroup {
  heading: string;
  commands: CommandEntry[];
}

interface CommandPaletteProps {
  groups: CommandGroup[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeholder?: string;
  emptyMessage?: string;
}

export function CommandPalette({
  groups,
  open,
  onOpenChange,
  placeholder = 'Type a command or search...',
  emptyMessage = 'No results found.',
}: CommandPaletteProps) {
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={placeholder} />
      <CommandList>
        <CommandEmpty>{emptyMessage}</CommandEmpty>
        {groups.map((group, gi) => (
          <div key={group.heading}>
            {gi > 0 && <CommandSeparator />}
            <CommandGroup heading={group.heading}>
              {group.commands.map((cmd) => {
                const Icon = cmd.icon;
                return (
                  <CommandItem
                    key={cmd.id}
                    value={`${cmd.label} ${cmd.keywords ?? ''}`}
                    onSelect={() => {
                      cmd.onSelect();
                      onOpenChange(false);
                    }}
                    disabled={cmd.disabled}
                  >
                    {Icon && <Icon className="mr-2 h-4 w-4" />}
                    <span>{cmd.label}</span>
                    {cmd.shortcut && <CommandShortcut>{cmd.shortcut}</CommandShortcut>}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

interface UseCommandPaletteOptions {
  key?: string;
  onOpen?: () => void;
}

export function useCommandPalette({ key = 'k', onOpen }: UseCommandPaletteOptions = {}) {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => {
    setOpen((v) => {
      const next = !v;
      if (next) onOpen?.();
      return next;
    });
  }, [onOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === key) {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [key, toggle]);

  return { open, setOpen, toggle };
}

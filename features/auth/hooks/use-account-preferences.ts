'use client';

import { useCallback, useEffect, useState } from 'react';

export type TimeFormat = '12h' | '24h';
export type WeekStart = 'sunday' | 'monday';

export interface AccountPreferences {
  timeFormat: TimeFormat;
  weekStart: WeekStart;
}

const STORAGE_KEY = 'calora:account-preferences';

const DEFAULTS: AccountPreferences = {
  timeFormat: '12h',
  weekStart: 'sunday',
};

function readStored(): AccountPreferences {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<AccountPreferences>;
    return {
      timeFormat: parsed.timeFormat === '24h' ? '24h' : '12h',
      weekStart: parsed.weekStart === 'monday' ? 'monday' : 'sunday',
    };
  } catch {
    return DEFAULTS;
  }
}

export function useAccountPreferences() {
  const [preferences, setPreferences] = useState<AccountPreferences>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPreferences(readStored());
    setLoading(false);
  }, []);

  const save = useCallback(async (next: AccountPreferences) => {
    setPreferences(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }, []);

  return { preferences, loading, save };
}

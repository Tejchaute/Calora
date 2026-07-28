export const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', label: 'Chinese Yuan' },
  { code: 'BRL', symbol: 'R$', label: 'Brazilian Real' },
  { code: 'MXN', symbol: '$', label: 'Mexican Peso' },
  { code: 'ZAR', symbol: 'R', label: 'South African Rand' },
  { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar' },
  { code: 'NZD', symbol: 'NZ$', label: 'New Zealand Dollar' },
];

export const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Dublin',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Australia/Sydney',
  'Pacific/Auckland',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Africa/Cairo',
];

export function getCurrencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol || '$';
}

export const APPOINTMENT_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

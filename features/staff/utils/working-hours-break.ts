export function breakPairError(start: string | null, end: string | null): string | null {
  if (Boolean(start) !== Boolean(end)) {
    return 'Enter both a break start and end, or clear both.';
  }
  const seconds = (value: string) => {
    const [hours, minutes, remainder] = value.split(':');
    return Number(hours) * 3600 + Number(minutes) * 60 + Number(remainder ?? 0);
  };
  if (start && end && seconds(start) >= seconds(end)) {
    return 'Break end must be later than break start.';
  }
  return null;
}

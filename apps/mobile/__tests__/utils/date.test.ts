import { formatTime, formatDayLabel, isTonight } from '../../utils/date';

function makeDate(offsetDays: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d;
}

describe('formatTime', () => {
  it('formats midnight as 12:00 AM', () => {
    const d = new Date(2024, 0, 1, 0, 0, 0);
    expect(formatTime(d)).toMatch(/12:00\s*AM/i);
  });

  it('formats noon as 12:00 PM', () => {
    const d = new Date(2024, 0, 1, 12, 0, 0);
    expect(formatTime(d)).toMatch(/12:00\s*PM/i);
  });

  it('formats 8:30 PM correctly', () => {
    const d = new Date(2024, 0, 1, 20, 30, 0);
    expect(formatTime(d)).toMatch(/8:30\s*PM/i);
  });

  it('formats 9:05 AM correctly', () => {
    const d = new Date(2024, 0, 1, 9, 5, 0);
    expect(formatTime(d)).toMatch(/9:05\s*AM/i);
  });
});

describe('isTonight', () => {
  it('returns true for a date today', () => {
    const todayEvening = makeDate(0, 20);
    expect(isTonight(todayEvening)).toBe(true);
  });

  it('returns false for yesterday', () => {
    const yesterday = makeDate(-1, 20);
    expect(isTonight(yesterday)).toBe(false);
  });

  it('returns false for tomorrow', () => {
    const tomorrow = makeDate(1, 20);
    expect(isTonight(tomorrow)).toBe(false);
  });
});

describe('formatDayLabel', () => {
  it('returns "Tonight" for a date today', () => {
    const todayEvening = makeDate(0, 20);
    expect(formatDayLabel(todayEvening)).toBe('Tonight');
  });

  it('returns "Tomorrow" for a date tomorrow', () => {
    const tomorrowEvening = makeDate(1, 20);
    expect(formatDayLabel(tomorrowEvening)).toBe('Tomorrow');
  });

  it('returns a formatted date string for dates further out', () => {
    const future = makeDate(3, 20);
    const label = formatDayLabel(future);
    // Should contain day abbreviation and month
    expect(label).toMatch(/\w{3},?\s+\w{3}\s+\d+/);
  });
});

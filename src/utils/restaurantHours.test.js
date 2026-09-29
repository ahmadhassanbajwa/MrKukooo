import { describe, it, expect } from 'vitest';
import { isRestaurantOpen } from './restaurantHours';

describe('restaurantHours', () => {
  const mockHours = {
    Monday: { open: true, start: '15:00', end: '22:00' }, // Normal hours
    Tuesday: { open: true, start: '15:00', end: '01:00' }, // Overnight
    Wednesday: { open: false, start: '15:00', end: '22:00' }, // Closed
    Thursday: { open: true, start: '15:00', end: '01:00' },
    Friday: { open: true, start: '15:00', end: '01:00' },
    Saturday: { open: true, start: '15:00', end: '01:00' },
    Sunday: { open: true, start: '15:00', end: '01:00' }
  };

  it('should show closed when checking a day marked closed', () => {
    // Wednesday 4:00 PM
    const now = new Date('2023-11-08T16:00:00'); // Note: 2023-11-08 was a Wednesday
    const result = isRestaurantOpen(mockHours, now);
    expect(result.open).toBe(false);
    expect(result.reason).toContain('closed on Wednesdays');
  });

  it('should show open during normal window', () => {
    // Monday 4:00 PM
    const now = new Date('2023-11-06T16:00:00'); // Monday
    const result = isRestaurantOpen(mockHours, now);
    expect(result.open).toBe(true);
  });

  it('should show closed outside normal window', () => {
    // Monday 1:00 PM (starts at 3 PM)
    const now = new Date('2023-11-06T13:00:00'); 
    const result = isRestaurantOpen(mockHours, now);
    expect(result.open).toBe(false);
    expect(result.reason).toContain('3:00 PM – 10:00 PM');
  });

  it('should handle overnight hours (before midnight)', () => {
    // Tuesday 11:00 PM
    const now = new Date('2023-11-07T23:00:00'); // Tuesday
    const result = isRestaurantOpen(mockHours, now);
    expect(result.open).toBe(true);
  });

  it('should handle overnight hours (after midnight next day)', () => {
    // Wednesday 12:30 AM (Tuesday night)
    const now = new Date('2023-11-08T00:30:00'); // Wednesday
    const result = isRestaurantOpen(mockHours, now);
    expect(result.open).toBe(true);
  });
});

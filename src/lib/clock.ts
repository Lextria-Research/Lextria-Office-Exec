// src/lib/clock.ts
// Single source of truth for time in the application.
// No business logic calls `new Date()` directly.

const TIMEZONE = 'Asia/Kolkata';

export const clock = {
  /**
   * Returns current Date object in Asia/Kolkata context
   */
  now(): Date {
    return new Date();
  },

  /**
   * Returns today's ISO date string 'YYYY-MM-DD'
   */
  todayISO(): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(this.now());
    return parts; // en-CA outputs YYYY-MM-DD
  },

  /**
   * Returns today formatted as DD-MM-YYYY
   */
  todayDisplay(): string {
    return this.formatDisplay(this.todayISO());
  },

  /**
   * Returns current full timestamp in ISO 8601 format
   */
  nowISO(): string {
    return this.now().toISOString();
  },

  /**
   * Converts ISO 'YYYY-MM-DD' or timestamp to 'DD-MM-YYYY'
   */
  formatDisplay(isoDateString?: string | null): string {
    if (!isoDateString) return '--';
    try {
      const date = new Date(isoDateString);
      if (isNaN(date.getTime())) return isoDateString;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return isoDateString;
    }
  },

  /**
   * Converts 'DD-MM-YYYY' to ISO 'YYYY-MM-DD'
   */
  parseDisplayToISO(displayDate: string): string | null {
    if (!displayDate) return null;
    const parts = displayDate.trim().split(/[-/]/);
    if (parts.length === 3) {
      const [d, m, y] = parts;
      if (d.length <= 2 && m.length <= 2 && y.length === 4) {
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
    }
    return null;
  },

  /**
   * Returns current YYYY-MM for folder naming
   */
  currentYearMonth(): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
    }).format(this.now());
    return parts.slice(0, 7); // YYYY-MM
  },

  /**
   * Calculates difference in calendar days between date and today
   */
  daysAgo(isoDateString: string): number {
    const today = new Date(this.todayISO());
    const target = new Date(isoDateString.slice(0, 10));
    const diffMs = today.getTime() - target.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }
};

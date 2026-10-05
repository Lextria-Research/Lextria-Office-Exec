// src/lib/currency.ts
// Handles Indian Rupee (INR) formatting and parsing with standard Indian numbering grouping.

export function formatINR(amount: number | string | null | undefined, showDecimals = true): string {
  if (amount === null || amount === undefined || amount === '') return '₹0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0';

  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals && num % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  });

  return formatter.format(num);
}

export function parseINR(input: string | number | null | undefined): number {
  if (input === null || input === undefined) return 0;
  if (typeof input === 'number') return isNaN(input) ? 0 : input;

  // Clean strings like "1000/-", " ₹ 1,500.50 ", "500/- "
  const cleaned = input
    .replace(/[₹,]/g, '')
    .replace(/\/-$/, '')
    .replace(/\s+/g, '')
    .trim();

  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

export const currency = {
  formatINR,
  parseINR,
};

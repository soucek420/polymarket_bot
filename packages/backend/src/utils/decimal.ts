import Decimal from 'decimal.js';

Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

export const D = (value: Decimal.Value): Decimal => new Decimal(value);

export const ZERO = D(0);
export const ONE = D(1);
export const HUNDRED = D(100);

export const max = (...values: Decimal[]): Decimal => {
  if (values.length === 0) return ZERO;
  return values.reduce((a, b) => (a.greaterThan(b) ? a : b));
};

export const min = (...values: Decimal[]): Decimal => {
  if (values.length === 0) return ZERO;
  return values.reduce((a, b) => (a.lessThan(b) ? a : b));
};

export const sum = (values: Decimal[]): Decimal => {
  return values.reduce((acc, val) => acc.plus(val), ZERO);
};

export const isPositive = (value: Decimal): boolean => value.greaterThan(ZERO);

export const isZero = (value: Decimal): boolean => value.equals(ZERO);

export const clamp = (value: Decimal, lower: Decimal, upper: Decimal): Decimal => {
  return max(lower, min(upper, value));
};

export const percentage = (value: Decimal, total: Decimal): Decimal => {
  if (isZero(total)) return ZERO;
  return value.dividedBy(total).times(HUNDRED);
};

export const toNumber = (value: Decimal): number => value.toNumber();

export const toString = (value: Decimal, decimalPlaces: number = 6): string => {
  return value.toFixed(decimalPlaces);
};

export const toJSON = (value: Decimal): string => value.toString();

export const fromJSON = (value: string): Decimal => D(value);

export const abs = (value: Decimal): Decimal => value.abs();

export const sqrt = (value: Decimal): Decimal => value.sqrt();

export const pow = (base: Decimal, exponent: number): Decimal => base.pow(exponent);

export const divide = (a: Decimal, b: Decimal): Decimal => {
  if (isZero(b)) return ZERO;
  return a.dividedBy(b);
};

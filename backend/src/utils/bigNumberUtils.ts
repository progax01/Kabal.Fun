import { BigNumber } from "bignumber.js";

export const addBigNumbers = (a: string, b: string): string => {
  const aBN = new BigNumber(a);
  const bBN = new BigNumber(b);
  return aBN.plus(bBN).toString();
};

export const subtractBigNumbers = (a: string, b: string): string => {
  const aBN = new BigNumber(a);
  const bBN = new BigNumber(b);
  return aBN.minus(bBN).toString();
};

export const validateBigNumberString = (value: string): boolean => {
  try {
    const bn = new BigNumber(value);
    return !bn.isNaN();
  } catch {
    return false;
  }
};

export const getPercentage = (amount: string, percentage: string): string => {
  const amountBN = new BigNumber(amount);
  const percentageBN = new BigNumber(percentage);
  return amountBN.times(percentageBN).div(100).toString();
};

/**
 * Safely compares two decimal strings
 * @returns true if a is greater than or equal to b
 */
export function isGreaterOrEqual(a: string, b: string): boolean {
  const aBN = new BigNumber(a);
  const bBN = new BigNumber(b);
  return aBN.isGreaterThanOrEqualTo(bBN);
}

/**
 * Safely compares two decimal strings
 * @returns true if a is less than b
 */
export function isLessThan(a: string, b: string): boolean {
  const aBN = new BigNumber(a);
  const bBN = new BigNumber(b);
  return aBN.isLessThan(bBN);
}

/**
 * Safely formats a number to a fixed number of decimal places
 */
export function formatDecimal(value: string | number, decimals: number = 6): string {
  const valueBN = new BigNumber(value);
  return valueBN.toFixed(decimals);
}

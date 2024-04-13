// Util tests. Compile and run with the following commands:
// repository_root$ yarn
// repository_root$ yarn test:jest test/jest/util.test.ts
import { getSteak, isDailyRaffleConsumed } from '../../src/utils';

describe('isDailyRaffleConsumed', () => {
  it('should return false when dailyRafflesConsumed is 0 within 120 days.', () => {
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 3, 20)));
    expect(isDailyRaffleConsumed(0)).toBe(false);
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 6, 20)));
    expect(isDailyRaffleConsumed(0)).toBe(false);
  });

  it('should return true after 120 days.', () => {
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 10))); // 2024 September
    expect(isDailyRaffleConsumed(0)).toBe(true);
  });

  it("should return true when dailyRafflesConsumed's binary representation is 1", () => {
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 3, 12, 6))); // 2024 Apr 12th 6AM UTC.
    // April 12th maps to the rightmost bit, so any odd number should return true.
    expect(isDailyRaffleConsumed(1)).toBe(true);
    expect(isDailyRaffleConsumed(5)).toBe(true);
    expect(isDailyRaffleConsumed(7)).toBe(true);
    expect(isDailyRaffleConsumed(13)).toBe(true);
    expect(isDailyRaffleConsumed(265)).toBe(true);
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 3, 20, 6))); // 2024 Apr 20th 6AM UTC.
    // April 20th maps to the 9th rightmost bit (surrounded by underscores), so any number with 9th bit set to 1 should return true.
    expect(isDailyRaffleConsumed(0b0_1_00000000)).toBe(true);
    expect(isDailyRaffleConsumed(256)).toBe(true); // decimal 256 == 0b0_1_00000000
    expect(isDailyRaffleConsumed(0b0_1_00110110)).toBe(true);
    expect(isDailyRaffleConsumed(310)).toBe(true); // decimal 310 == 0b0_1_00110110
    expect(isDailyRaffleConsumed(0b0_1_11110101)).toBe(true);
    expect(isDailyRaffleConsumed(501)).toBe(true); // decimal 501 == 0b0_1_11110101
    expect(isDailyRaffleConsumed(0b1_1_11110101)).toBe(true);
    expect(isDailyRaffleConsumed(1013)).toBe(true); // decimal 1013 == 0b1_1_11110101
  });

  it("should return false when dailyRafflesConsumed's binary representation is 0", () => {
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 3, 12, 6))); // 2024 Apr 12th 6AM UTC.
    // April 12th maps to the rightmost bit, so any even number should return false.
    expect(isDailyRaffleConsumed(2)).toBe(false);
    expect(isDailyRaffleConsumed(4)).toBe(false);
    expect(isDailyRaffleConsumed(6)).toBe(false);
    expect(isDailyRaffleConsumed(8)).toBe(false);
    expect(isDailyRaffleConsumed(284)).toBe(false);
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 3, 20, 6))); // 2024 Apr 20th 6AM UTC.
    // April 20th maps to the 9th rightmost bit (surrounded by underscores), so any number with 9th bit set to 1 should return true.
    expect(isDailyRaffleConsumed(0b0_0_00000000)).toBe(false);
    expect(isDailyRaffleConsumed(0)).toBe(false); // decimal 0 == 0b0_0_00000000
    expect(isDailyRaffleConsumed(0b0_0_00110110)).toBe(false);
    expect(isDailyRaffleConsumed(54)).toBe(false); // decimal 54 == 0b0_0_00110110
    expect(isDailyRaffleConsumed(0b0_0_11110101)).toBe(false);
    expect(isDailyRaffleConsumed(245)).toBe(false); // decimal 245 == 0b0_0_11110101
    expect(isDailyRaffleConsumed(0b1_0_11110101)).toBe(false);
    expect(isDailyRaffleConsumed(757)).toBe(false); // decimal 757 == 0b1_0_11110101
  });
});

describe('getSteak', () => {
  it('should return 1 when datesActive is 0 within 120 days.', () => {
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 3, 20)));
    expect(getSteak(/*datesActive=*/ 0)).toBe(1);
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 6, 20)));
    expect(getSteak(/*datesActive=*/ 0)).toBe(1);
  });

  it('should return 1 after 120 days.', () => {
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 10))); // 2024 September
    expect(getSteak(/*datesActive=*/ 255)).toBe(1);
  });

  it("should return > 1 when datesActive's binary representation right of today is 1", () => {
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 3, 13, 6))); // 2024 Apr 13th 6AM UTC.
    // April 13th maps to the 2nd rightmost bit, so any odd number should return 2.
    expect(getSteak(/*datesActive=*/ 1)).toBe(2);
    expect(getSteak(/*datesActive=*/ 5)).toBe(2);
    expect(getSteak(/*datesActive=*/ 7)).toBe(2);
    expect(getSteak(/*datesActive=*/ 13)).toBe(2);
    expect(getSteak(/*datesActive=*/ 265)).toBe(2);
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 3, 20, 6))); // 2024 Apr 20th 6AM UTC.
    // April 20th maps to the 9th rightmost bit (surrounded by underscores).
    // getSteak should return 1 + the number of consecutive 1s after the 9th rightmost bit.
    expect(getSteak(0b0_0_11010101)).toBe(3);
    expect(getSteak(213)).toBe(3); // decimal 213 == 0b0_0_11010101
    expect(getSteak(0b1_0_11110101)).toBe(5);
    expect(getSteak(757)).toBe(5); // decimal 757 == 0b1_0_11110101
    expect(getSteak(0b0_1_11010101)).toBe(3);
    expect(getSteak(469)).toBe(3); // decimal 501 == 0b0_1_11010101
    expect(getSteak(0b1_1_11110101)).toBe(5);
    expect(getSteak(1013)).toBe(5); // decimal 1013 == 0b1_1_11110101
  });

  it("should return false when dailyRafflesConsumed's binary representation is 0", () => {
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 3, 12, 6))); // 2024 Apr 12th 6AM UTC.
    // April 12th maps to the rightmost bit, so any even number should return 1.
    expect(getSteak(2)).toBe(1);
    expect(getSteak(4)).toBe(1);
    expect(getSteak(6)).toBe(1);
    expect(getSteak(8)).toBe(1);
    expect(getSteak(284)).toBe(1);
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 3, 20, 6))); // 2024 Apr 20th 6AM UTC.
    // April 20th maps to the 9th rightmost bit (surrounded by underscores).
    // getSteak should return the 1 + number of consecutive 1s after the 9th rightmost bit.
    expect(getSteak(0b0_0_00000000)).toBe(1);
    expect(getSteak(0)).toBe(1); // decimal 0 == 0b0_0_00000000
    expect(getSteak(0b0_0_00110110)).toBe(1);
    expect(getSteak(54)).toBe(1); // decimal 54 == 0b0_0_00110110
    expect(getSteak(0b0_1_00000000)).toBe(1);
    expect(getSteak(256)).toBe(1); // decimal 256 == 0b0_1_00000000
    expect(getSteak(0b0_1_00110110)).toBe(1);
    expect(getSteak(310)).toBe(1); // decimal 310 == 0b0_1_00110110
  });
});

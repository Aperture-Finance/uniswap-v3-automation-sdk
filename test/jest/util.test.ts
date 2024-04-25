// Util tests. Compile and run with the following commands:
// repository_root$ yarn
// repository_root$ yarn test:jest test/jest/util.test.ts
import { getStreak, isDailyRaffleConsumed } from '../../src/utils';

describe('isDailyRaffleConsumed', () => {
  it('should return false when dailyRafflesConsumed is 0 within 120 days.', () => {
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 4, 1))); // 2024 May 1.
    expect(isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 0n)).toBe(false);
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 7, 29))); // 2024 Aug 29.
    expect(isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 0n)).toBe(false);
  });

  it('should return true after 120 days.', () => {
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 7, 30))); // 2024 Aug 30.
    expect(isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 0n)).toBe(true);
  });

  it('should return true when dailyRafflesConsumed binary representation is 1', () => {
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 4, 1, 6))); // 2024 May 1st 6AM UTC.
    // May 1st maps to the rightmost bit, so any odd number should return true.
    expect(isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 1n)).toBe(true);
    expect(isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 5n)).toBe(true);
    expect(isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 7n)).toBe(true);
    expect(isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 13n)).toBe(true);
    expect(isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 265n)).toBe(true);
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 4, 9, 6))); // 2024 May 9th 6AM UTC.
    // May 1st maps to the 9th rightmost bit (surrounded by underscores), so any number with 9th bit set to 1 should return true.
    expect(
      isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 0b0_1_00000000n),
    ).toBe(true);
    expect(isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 256n)).toBe(true); // decimal 256 == 0b0_1_00000000
    expect(
      isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 0b0_1_00110110n),
    ).toBe(true);
    expect(isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 310n)).toBe(true); // decimal 310 == 0b0_1_00110110
    expect(
      isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 0b0_1_11110101n),
    ).toBe(true);
    expect(isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 501n)).toBe(true); // decimal 501 == 0b0_1_11110101
    expect(
      isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 0b1_1_11110101n),
    ).toBe(true);
    expect(isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 1013n)).toBe(true); // decimal 1013 == 0b1_1_11110101
  });

  it('should return false when dailyRafflesConsumed binary representation is 0', () => {
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 4, 1, 6))); // 2024 May 1st 6AM UTC.
    // May 1st maps to the rightmost bit, so any even number should return false.
    expect(isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 2n)).toBe(false);
    expect(isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 4n)).toBe(false);
    expect(isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 6n)).toBe(false);
    expect(isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 8n)).toBe(false);
    expect(isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 284n)).toBe(false);
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 4, 9, 6))); // 2024 Apr 20th 6AM UTC.
    // May 1st maps to the 9th rightmost bit (surrounded by underscores), so any number with 9th bit set to 1 should return true.
    expect(
      isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 0b0_0_00000000n),
    ).toBe(false);
    expect(isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 0n)).toBe(false); // decimal 0 == 0b0_0_00000000
    expect(
      isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 0b0_0_00110110n),
    ).toBe(false);
    expect(isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 54n)).toBe(false); // decimal 54 == 0b0_0_00110110
    expect(
      isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 0b0_0_11110101n),
    ).toBe(false);
    expect(isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 245n)).toBe(false); // decimal 245 == 0b0_0_11110101
    expect(
      isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 0b1_0_11110101n),
    ).toBe(false);
    expect(isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 757n)).toBe(false); // decimal 757 == 0b1_0_11110101
  });

  it('should work for 120 days', () => {
    const campaignPhase3StartDate = new Date(Date.UTC(2024, 4, 1, 6)); // 2024 May 1st 6AM UTC.

    // Raffle should be consumed on day 119 if dailyRafflesConsumed == 1 << 119.
    let testDate = new Date(campaignPhase3StartDate);
    testDate.setDate(campaignPhase3StartDate.getDate() + 119);
    jest.useFakeTimers().setSystemTime(testDate);
    expect(isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 1n << 119n)).toBe(
      true,
    );

    // Raffle should be available on day 120 if dailyRafflesConsumed == 1 << 119.
    testDate = new Date(campaignPhase3StartDate);
    testDate.setDate(campaignPhase3StartDate.getDate() + 120);
    jest.useFakeTimers().setSystemTime(testDate);
    expect(isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 1n << 119n)).toBe(
      false,
    );

    // Raffle should be consumed on day 120 if dailyRafflesConsumed == 1 << 120.
    testDate = new Date(campaignPhase3StartDate);
    testDate.setDate(campaignPhase3StartDate.getDate() + 120);
    jest.useFakeTimers().setSystemTime(testDate);
    expect(isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 1n << 120n)).toBe(
      true,
    );

    // After 120 days, campaign should be over and users should not be allowed to draw daily raffles anymore.
    // Returning true that the daily raffles was consumed should disallow users from drawing daily raffles.
    testDate = new Date(campaignPhase3StartDate);
    testDate.setDate(campaignPhase3StartDate.getDate() + 121);
    jest.useFakeTimers().setSystemTime(testDate);
    expect(isDailyRaffleConsumed(/*dailyRafflesConsumed=*/ 1n << 120n)).toBe(
      true,
    );
  });
});

describe('getStreak', () => {
  it('should return 1 when datesActive is 0 within 120 days.', () => {
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 4, 1)));
    expect(getStreak(/*datesActive=*/ 0n)).toBe(1);
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 4, 8)));
    expect(getStreak(/*datesActive=*/ 0n)).toBe(1);
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 7, 29)));
    expect(getStreak(/*datesActive=*/ 0n)).toBe(1);
  });

  it('should return 1 after 120 days.', () => {
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 10))); // 2024 September
    expect(getStreak(/*datesActive=*/ 255n)).toBe(1);
  });

  it('should return > 1 when datesActive binary representation right of today is 1', () => {
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 4, 2, 6))); // 2024 May 2nd 6AM UTC.
    // May 1st maps to the 2nd rightmost bit, so any odd number should return 2.
    expect(getStreak(/*datesActive=*/ 1n)).toBe(2);
    expect(getStreak(/*datesActive=*/ 5n)).toBe(2);
    expect(getStreak(/*datesActive=*/ 7n)).toBe(2);
    expect(getStreak(/*datesActive=*/ 13n)).toBe(2);
    expect(getStreak(/*datesActive=*/ 265n)).toBe(2);
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 4, 9, 6))); // 2024 May 9th 6AM UTC.
    // May 9th maps to the 9th rightmost bit (surrounded by underscores).
    // getStreak should return 1 + the number of consecutive 1s after the 9th rightmost bit.
    expect(getStreak(/*datesActive=*/ 0b0_0_11010101n)).toBe(3);
    expect(getStreak(/*datesActive=*/ 213n)).toBe(3); // decimal 213 == 0b0_0_11010101
    expect(getStreak(/*datesActive=*/ 0b1_0_11110101n)).toBe(5);
    expect(getStreak(/*datesActive=*/ 757n)).toBe(5); // decimal 757 == 0b1_0_11110101
    expect(getStreak(/*datesActive=*/ 0b0_1_11010101n)).toBe(3);
    expect(getStreak(/*datesActive=*/ 469n)).toBe(3); // decimal 501 == 0b0_1_11010101
    expect(getStreak(/*datesActive=*/ 0b1_1_11110101n)).toBe(5);
    expect(getStreak(/*datesActive=*/ 1013n)).toBe(5); // decimal 1013 == 0b1_1_11110101
  });

  it('should return 1 when dailyRafflesConsumed binary representation right of today is 0', () => {
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 4, 1, 6))); // 2024 May 1st 6AM UTC.
    // May 1st maps to the rightmost bit, so any even number should return 1.
    expect(getStreak(/*datesActive=*/ 2n)).toBe(1);
    expect(getStreak(/*datesActive=*/ 4n)).toBe(1);
    expect(getStreak(/*datesActive=*/ 6n)).toBe(1);
    expect(getStreak(/*datesActive=*/ 8n)).toBe(1);
    expect(getStreak(/*datesActive=*/ 284n)).toBe(1);
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 4, 9, 6))); // 2024 May 9th 6AM UTC.
    // May 9th maps to the 9th rightmost bit (surrounded by underscores).
    // getStreak should return the 1 + number of consecutive 1s after the 9th rightmost bit.
    expect(getStreak(/*datesActive=*/ 0b0_0_00000000n)).toBe(1);
    expect(getStreak(/*datesActive=*/ 0n)).toBe(1); // decimal 0 == 0b0_0_00000000
    expect(getStreak(/*datesActive=*/ 0b0_0_00110110n)).toBe(1);
    expect(getStreak(/*datesActive=*/ 54n)).toBe(1); // decimal 54 == 0b0_0_00110110
    expect(getStreak(/*datesActive=*/ 0b0_1_00000000n)).toBe(1);
    expect(getStreak(/*datesActive=*/ 256n)).toBe(1); // decimal 256 == 0b0_1_00000000
    expect(getStreak(/*datesActive=*/ 0b0_1_00110110n)).toBe(1);
    expect(getStreak(/*datesActive=*/ 310n)).toBe(1); // decimal 310 == 0b0_1_00110110
  });
});

export const HOUR_IN_SECS = 60 * 60; // 60 minutes of 60 seconds each.
export const DAY_IN_SECS = 24 * HOUR_IN_SECS;
export const AUTOMATION_EXPIRATION_IN_DAYS = 90; // For frontend.
export const AUTOMATION_EXPIRATION_IN_SECS = // For backend.
  AUTOMATION_EXPIRATION_IN_DAYS * DAY_IN_SECS;

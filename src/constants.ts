export const HOUR_IN_SECONDS = 60 * 60; // 60 minutes of 60 seconds each.
export const DAY_IN_SECONDS = 24 * HOUR_IN_SECONDS;
export const AUTOMATION_EXPIRATION_IN_DAYS = 60; // For frontend.
export const AUTOMATION_EXPIRATION_IN_SECONDS = AUTOMATION_EXPIRATION_IN_DAYS * DAY_IN_SECONDS; // For backend.
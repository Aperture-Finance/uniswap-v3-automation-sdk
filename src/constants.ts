export const HOUR_IN_SECS = 60 * 60; // 60 minutes of 60 seconds each.
export const DAY_IN_SECS = 24 * HOUR_IN_SECS;
export const AUTOMATION_EXPIRATION_IN_DAYS = 90; // For frontend.
// Allow some slack time because frontend users' clock might not be synced.
export const AUTOMATION_SLACK_IN_SECS = Number(process.env.AUTOMATION_SLACK_IN_SECS || 1 * DAY_IN_SECS);
export const AUTOMATION_EXPIRATION_IN_SECS = // For backend.
  AUTOMATION_EXPIRATION_IN_DAYS * DAY_IN_SECS + AUTOMATION_SLACK_IN_SECS;

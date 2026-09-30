/**
 * CodeTrail High-Precision Time & Duration Utilities
 * Supports CT-164 (Timestamp Recording) & CT-167 (Socket Telemetry Sync)
 */

/**
 * Returns a high-precision ISO-8601 UTC timestamp string with milliseconds.
 * E.g., "2026-09-28T17:07:21.456Z"
 */
export const getHighPrecisionISO = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
};

/**
 * Formats seconds into a standard HH:MM:SS or MM:SS clock timer format.
 * Examples: 75 -> "01:15", 3665 -> "01:01:05"
 */
export const formatClockDuration = (totalSeconds = 0) => {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  const pad = (n) => String(n).padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
};

/**
 * Formats total seconds into human-readable compact format like "1h 24m 10s" or "45s".
 */
export const formatActiveDuration = (totalSeconds = 0) => {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m ${seconds}s` : `${hours}h ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

/**
 * Formats total seconds into standard "1h 24m" or "45m" format for workspace summary.
 */
export const formatTimeSpent = (totalSeconds = 0) => {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

/**
 * Formats a date timestamp into a human-readable relative time string.
 * Examples: "just now", "1 minute ago", "2 minutes ago", "5 hours ago", etc.
 */
export const getRelativeTime = (timestamp) => {
  if (!timestamp) return 'just now';

  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'just now';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 45) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return diffInMinutes === 1 ? '1 minute ago' : `${diffInMinutes} minutes ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return diffInDays === 1 ? 'Yesterday' : `${diffInDays} days ago`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * Formats full date time string for tooltip or detail display.
 */
export const formatFullDateTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

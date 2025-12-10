/**
 * Date/Time Formatting Utilities for KPL
 *
 * All match dates are stored in UTC in the database.
 * These utilities format dates and times for display in KST (Korea Standard Time).
 *
 * This fixes the issue where dates were showing one day earlier due to timezone conversion.
 */

/**
 * Format match time in KST
 * @param dateString ISO date string from database
 * @returns Time in "HH:mm" format (24-hour, KST)
 * @example formatMatchTimeKST("2025-12-10T13:20:00Z") => "22:20"
 */
export function formatMatchTimeKST(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/**
 * Format match date in KST
 * @param dateString ISO date string from database
 * @returns Date in "MM-DD" format (KST)
 * @example formatMatchDateKST("2025-12-10T13:20:00Z") => "12-10"
 */
export function formatMatchDateKST(dateString: string): string {
  const date = new Date(dateString);
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  // Convert "12/10/2025" to "12-10"
  const [month, day] = formatted.split("/");
  return `${month}-${day}`;
}

/**
 * Format match date and time in KST
 * @param dateString ISO date string from database
 * @returns DateTime in "MM-DD HH:mm" format (KST)
 * @example formatMatchDateTimeKST("2025-12-10T13:20:00Z") => "12-10 22:20"
 */
export function formatMatchDateTimeKST(dateString: string): string {
  const dateStr = formatMatchDateKST(dateString);
  const timeStr = formatMatchTimeKST(dateString);
  return `${dateStr} ${timeStr}`;
}

/**
 * Format match date in long format (KST)
 * @param dateString ISO date string from database
 * @returns Date in "Month Day, Weekday" format (KST)
 * @example formatMatchDateLongKST("2025-12-10T13:20:00Z") => "December 10, Wed"
 */
export function formatMatchDateLongKST(dateString: string): string {
  const date = new Date(dateString);
  const month = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    month: "long",
  }).format(date);

  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    day: "numeric",
  }).format(date);

  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
  }).format(date);

  return `${month} ${day}, ${weekday}`;
}

/**
 * Format match date in Korean format (KST)
 * @param dateString ISO date string from database
 * @returns Date in Korean format "YYYY년 MM월 DD일 (요일)"
 * @example formatMatchDateKoreanKST("2025-12-10T13:20:00Z") => "2025년 12월 10일 (수)"
 */
export function formatMatchDateKoreanKST(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

/**
 * Get date string for queries (YYYY-MM-DD in KST)
 * Useful for filtering matches by date
 * @param dateString ISO date string
 * @returns Date in "YYYY-MM-DD" format (KST)
 */
export function getDateStringKST(dateString: string): string {
  const date = new Date(dateString);
  const year = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).format(date);

  const month = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
  }).format(date);

  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    day: "2-digit",
  }).format(date);

  return `${year}-${month}-${day}`;
}

/**
 * Convert 24-hour time to 12-hour format with AM/PM
 * @param time24 - Time in 24-hour format (e.g., "08:00", "13:30")
 * @returns Time in 12-hour format with AM/PM (e.g., "8:00 AM", "1:30 PM")
 */
export function format12Hour(time24: string): string {
  try {
    const [hours, minutes] = time24.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes)) {
      return time24; // Return original if invalid
    }
    
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12; // Convert 0 to 12 for midnight
    
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  } catch {
    return time24;
  }
}

/**
 * Convert time range from 24-hour to 12-hour format
 * @param timeRange - Time range in 24-hour format (e.g., "08:00-09:00")
 * @returns Time range in 12-hour format (e.g., "8:00 AM - 9:00 AM")
 */
export function formatTimeRange(timeRange: string): string {
  try {
    const match = timeRange.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
    
    if (!match) {
      return timeRange; // Return original if invalid format
    }
    
    const [, startTime, endTime] = match;
    const formattedStart = format12Hour(startTime);
    const formattedEnd = format12Hour(endTime);
    
    return `${formattedStart} - ${formattedEnd}`;
  } catch {
    return timeRange;
  }
}

/**
 * Format time range with optional short format (no ending AM/PM if same period)
 * @param timeRange - Time range in 24-hour format (e.g., "08:00-09:00")
 * @returns Time range formatted (e.g., "8:00 - 9:00 AM")
 */
export function formatTimeRangeShort(timeRange: string): string {
  try {
    const match = timeRange.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
    
    if (!match) {
      return timeRange;
    }
    
    const [, startHour, startMin, endHour, endMin] = match.map(Number);
    
    const startPeriod = startHour >= 12 ? 'PM' : 'AM';
    const endPeriod = endHour >= 12 ? 'PM' : 'AM';
    
    const startHour12 = startHour % 12 || 12;
    const endHour12 = endHour % 12 || 12;
    
    const startTimeStr = `${startHour12}:${startMin.toString().padStart(2, '0')}`;
    const endTimeStr = `${endHour12}:${endMin.toString().padStart(2, '0')}`;
    
    // If same period, only show AM/PM once at the end
    if (startPeriod === endPeriod) {
      return `${startTimeStr} - ${endTimeStr} ${endPeriod}`;
    }
    
    return `${startTimeStr} ${startPeriod} - ${endTimeStr} ${endPeriod}`;
  } catch {
    return timeRange;
  }
}

/**
 * Parse a time range string into start and end minutes
 * @param timeRange - Time range in format "HH:MM-HH:MM" (e.g., "08:00-09:00")
 * @returns Object with startMinutes and endMinutes, or null if invalid
 */
export function parseTimeRange(timeRange: string): { startMinutes: number; endMinutes: number } | null {
  try {
    const match = timeRange.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
    if (!match) return null;

    const [, startHour, startMin, endHour, endMin] = match.map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes >= endMinutes) return null; // Invalid range

    return { startMinutes, endMinutes };
  } catch {
    return null;
  }
}

/**
 * Check if two time ranges overlap
 * @param timeRange1 - First time range (e.g., "08:00-09:00")
 * @param timeRange2 - Second time range (e.g., "08:30-09:30")
 * @returns true if the time ranges overlap, false otherwise
 */
export function timeRangesOverlap(timeRange1: string, timeRange2: string): boolean {
  const range1 = parseTimeRange(timeRange1);
  const range2 = parseTimeRange(timeRange2);

  if (!range1 || !range2) return false;

  // Two ranges overlap if: range1.start < range2.end AND range2.start < range1.end
  return range1.startMinutes < range2.endMinutes && range2.startMinutes < range1.endMinutes;
}
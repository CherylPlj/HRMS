import { AttendanceRecord, AttendanceSummary, Schedule } from '../types/attendance';

class AttendanceService {
  private baseUrl = '/api';

  async markTimeIn(employeeId: string): Promise<AttendanceRecord> {
    try {
      const response = await fetch(`${this.baseUrl}/attendance/time-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ employeeId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark time in');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error marking time in:', error);
      throw error;
    }
  }

  async markTimeOut(employeeId: string): Promise<AttendanceRecord> {
    try {
      const response = await fetch(`${this.baseUrl}/attendance/time-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ employeeId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark time out');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error marking time out:', error);
      throw error;
    }
  }

  async getAttendanceSummary(employeeId: string): Promise<AttendanceSummary> {
    try {
      const response = await fetch(`${this.baseUrl}/attendance/summary/${employeeId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch attendance summary');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching attendance summary:', error);
      throw error;
    }
  }

  async getSchedule(employeeId: string): Promise<Schedule[]> {
    try {
      const response = await fetch(`${this.baseUrl}/schedule/${employeeId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch schedule');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching schedule:', error);
      throw error;
    }
  }

  async getAttendanceHistory(employeeId: string, startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/attendance/history/${employeeId}?startDate=${startDate}&endDate=${endDate}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch attendance history');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      throw error;
    }
  }
}

export const attendanceService = new AttendanceService(); 
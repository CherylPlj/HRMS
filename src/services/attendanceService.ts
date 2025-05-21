import { AttendanceRecord, AttendanceSummary, Schedule } from '../types/attendance';

class AttendanceService {
  private baseUrl = '/api';

  async markTimeIn(employeeId: string): Promise<AttendanceRecord> {
    try {
      console.log('Sending time-in request for employee:', employeeId);
      const response = await fetch(`${this.baseUrl}/attendance/time-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ employeeId }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Time-in request failed:', data);
        throw new Error(data.error || 'Failed to mark time in');
      }
      
      console.log('Time-in request successful:', data);
      return data;
    } catch (error) {
      console.error('Error marking time in:', error);
      throw error;
    }
  }

  async markTimeOut(employeeId: string): Promise<AttendanceRecord> {
    try {
      console.log('Sending time-out request for employee:', employeeId);
      const response = await fetch(`${this.baseUrl}/attendance/time-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ employeeId }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Time-out request failed:', data);
        throw new Error(data.error || 'Failed to mark time out');
      }
      
      console.log('Time-out request successful:', data);
      return data;
    } catch (error) {
      console.error('Error marking time out:', error);
      throw error;
    }
  }

  async getAttendanceSummary(employeeId: string): Promise<AttendanceSummary> {
    try {
      console.log('Fetching attendance summary for employee:', employeeId);
      const response = await fetch(`${this.baseUrl}/attendance/summary/${employeeId}`);
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Failed to fetch attendance summary:', data);
        throw new Error(data.error || 'Failed to fetch attendance summary');
      }
      
      console.log('Attendance summary fetched successfully:', data);
      return data;
    } catch (error) {
      console.error('Error fetching attendance summary:', error);
      throw error;
    }
  }

  async getSchedule(employeeId: string): Promise<Schedule[]> {
    try {
      console.log('Fetching schedule for employee:', employeeId);
      const response = await fetch(`${this.baseUrl}/schedule/${employeeId}`);
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Failed to fetch schedule:', data);
        throw new Error(data.error || 'Failed to fetch schedule');
      }
      
      console.log('Schedule fetched successfully:', data);
      return data;
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
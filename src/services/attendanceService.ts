import { AttendanceRecord, AttendanceSummary, Schedule } from '../types/attendance';

class AttendanceService {
  private baseUrl = '/api';

  private async handleResponse<T>(response: Response, errorMessage: string): Promise<T> {
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Non-JSON response:', await response.text());
      throw new Error('Server returned non-JSON response');
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error(errorMessage, data);
      if (response.status === 404) {
        console.log('No data found');
        return null as T;
      }
      throw new Error(data.error || errorMessage);
    }
    
    console.log('Request successful:', data);
    return data;
  }

  async markTimeIn(facultyId: string, email: string, timeIn: string, date: string): Promise<AttendanceRecord> {
    try {
      console.log('Sending time-in request for faculty:', facultyId);
      const response = await fetch(`${this.baseUrl}/attendance/time-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ facultyId, email, timeIn, date }),
      });
      
      return this.handleResponse<AttendanceRecord>(response, 'Failed to mark time in');
    } catch (error) {
      console.error('Error marking time in:', error);
      throw error;
    }
  }

  async markTimeOut(facultyId: string, email: string, timeOut: string, date: string): Promise<AttendanceRecord> {
    try {
      console.log('Sending time-out request for faculty:', facultyId);
      const response = await fetch(`${this.baseUrl}/attendance/time-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ facultyId, email, timeOut, date }),
      });
      
      return this.handleResponse<AttendanceRecord>(response, 'Failed to mark time out');
    } catch (error) {
      console.error('Error marking time out:', error);
      throw error;
    }
  }

  async getAttendanceSummary(FacultyID: string, email: string): Promise<AttendanceSummary> {
    try {
      console.log('Fetching attendance summary for faculty:', FacultyID);
      const response = await fetch(`${this.baseUrl}/attendance/summary/${FacultyID}?email=${encodeURIComponent(email)}`);
      
      return this.handleResponse<AttendanceSummary>(response, 'Failed to fetch attendance summary');
    } catch (error) {
      console.error('Error fetching attendance summary:', error);
      throw error;
    }
  }

  async getSchedule(FacultyID: string, email: string): Promise<Schedule[]> {
    try {
      console.log('Fetching schedule for faculty:', FacultyID);
      const response = await fetch(`${this.baseUrl}/schedule/${FacultyID}?email=${encodeURIComponent(email)}`);
      
      const data = await this.handleResponse<Schedule[]>(response, 'Failed to fetch schedule');
      return data || [];
    } catch (error) {
      console.error('Error fetching schedule:', error);
      throw error;
    }
  }

  async getAttendanceHistory(facultyId: string, startDate: string, endDate: string, email: string): Promise<AttendanceRecord[]> {
    try {
      console.log('Fetching attendance history for faculty:', facultyId);
      const response = await fetch(
        `${this.baseUrl}/attendance/history/${facultyId}?startDate=${startDate}&endDate=${endDate}&email=${encodeURIComponent(email)}`
      );
      
      return this.handleResponse<AttendanceRecord[]>(response, 'Failed to fetch attendance history');
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      throw error;
    }
  }

  async getTodayRecord(facultyId: string, email: string): Promise<AttendanceRecord | null> {
    try {
      console.log('Fetching today\'s record for faculty:', facultyId);
      const response = await fetch(`${this.baseUrl}/attendance/today/${facultyId}?email=${encodeURIComponent(email)}`);
      
      return this.handleResponse<AttendanceRecord | null>(response, 'Failed to fetch today\'s record');
    } catch (error) {
      console.error('Error fetching today\'s record:', error);
      throw error;
    }
  }
}

export const attendanceService = new AttendanceService(); 
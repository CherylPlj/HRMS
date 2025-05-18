export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  timeIn: string | null;
  timeOut: string | null;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_RECORDED';
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  total: number;
}

export interface Schedule {
  id: string;
  name: string;
  subject: string;
  classSection: string;
  day: string;
  time: string;
}

export interface Employee {
  id: string;
  name: string;
  department: string;
  role: string;
} 
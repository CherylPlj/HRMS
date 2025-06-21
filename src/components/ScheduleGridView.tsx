import React from 'react';
import Image from 'next/image';
import { Edit2 } from 'lucide-react';

// Keep in sync with AttendanceContent.tsx
interface ScheduleRecord {
  id: string;
  facultyId: number;
  subjectId: number;
  classSectionId: number;
  day: string;
  time: string;
  duration: number; // in minutes
  subject?: { name: string };
  classSection?: { name: string };
}

interface Faculty {
  FacultyID: number;
  User: {
    FirstName: string;
    LastName: string;
  }
}

interface ProfilePhotos {
  [key: number]: string;
}

interface ScheduleGridViewProps {
  schedules: ScheduleRecord[];
  facultyList: Faculty[];
  profilePhotos: ProfilePhotos;
  scheduleSearch: string;
  selectedDay: string;
  onEdit: (schedule: ScheduleRecord) => void;
  onAdd: (day: string, time: string) => void;
}

const formatTime = (timeString: string | null): string => {
  if (!timeString) return '-';
  try {
    const date = new Date(`1970-01-01T${timeString}`);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch (error) {
    console.error('Error formatting time:', error);
    return '-';
  }
};

const getEndTime = (startTime: string, duration: number): string => {
  if (!startTime || duration === undefined) return '-';
  try {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = new Date(startDate.getTime() + duration * 60000);
    return endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch (error) {
    console.error('Error calculating end time:', error);
    return '-';
  }
};

const ScheduleGridView: React.FC<ScheduleGridViewProps> = ({
  schedules,
  facultyList,
  profilePhotos,
  scheduleSearch,
  selectedDay,
  onEdit,
  onAdd,
}) => {
  const timeSlots = React.useMemo(() => 
    Array.from({ length: 17 }, (_, i) => {
      const date = new Date(2024, 1, 1, 7, 0);
      date.setMinutes(date.getMinutes() + i * 30);
      return date;
    }), []);

  const schedulesByFacultyAndDay = React.useMemo(() => 
    schedules.reduce((acc, sched) => {
      const key = `${sched.facultyId}-${sched.day}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(sched);
      return acc;
    }, {} as Record<string, ScheduleRecord[]>), [schedules]);

  const filteredFaculty = React.useMemo(() =>
    facultyList.filter(faculty => {
      if (!scheduleSearch) return true;
      const facultyName = `${faculty.User?.FirstName} ${faculty.User?.LastName}`;
      return facultyName.toLowerCase().includes(scheduleSearch.toLowerCase());
    }), [facultyList, scheduleSearch]);


  return (
    <div className="overflow-x-auto flex-1 rounded-lg border border-gray-100 p-4 bg-white">
      <table className="w-full text-sm border-collapse">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-600 w-48 sticky left-0 bg-gray-50 z-10">Faculty</th>
            {timeSlots.map(slot => {
              const isLunch = slot.getHours() === 12 && slot.getMinutes() === 0;
              return (
                <th 
                  key={slot.toISOString()} 
                  className={`px-2 py-3 text-center font-semibold text-gray-600 border-l ${isLunch ? 'bg-yellow-100 text-yellow-800' : ''}`}
                >
                  {isLunch ? 'LUNCH' : formatTime(slot.toTimeString().substring(0, 5))}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {filteredFaculty.map(faculty => {
            const facultyDaySchedules = schedulesByFacultyAndDay[`${faculty.FacultyID}-${selectedDay}`] || [];
            let renderedSlots = 0;

            return (
              <tr key={faculty.FacultyID} className="hover:bg-gray-50 transition-colors duration-200 h-20">
                <td className="px-4 py-3 sticky left-0 bg-white hover:bg-gray-50 z-10 flex items-center gap-3">
                   <Image
                    src={profilePhotos[faculty.FacultyID] || '/manprofileavatar.png'}
                    alt={`${faculty.User?.FirstName} ${faculty.User?.LastName} profile`}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                  <span className="font-medium">{faculty.User?.FirstName} {faculty.User?.LastName}</span>
                </td>
                {timeSlots.map((slot) => {
                  if (renderedSlots > 0) {
                    renderedSlots--;
                    return null;
                  }
                  
                  const isLunch = slot.getHours() === 12 && slot.getMinutes() === 0;
                  if (isLunch) {
                    return <td key={slot.toISOString()} className="border-l bg-yellow-50"></td>;
                  }

                  const schedule = facultyDaySchedules.find(s => {
                    const [h, m] = s.time.split(':').map(Number);
                    return h === slot.getHours() && m === slot.getMinutes();
                  });

                  if (schedule) {
                    const colSpan = Math.ceil(schedule.duration / 30);
                    renderedSlots = colSpan - 1;
                    return (
                      <td 
                        key={schedule.id} 
                        colSpan={colSpan} 
                        className="border-l p-1 align-top bg-red-50 text-red-900 hover:bg-red-100 cursor-pointer"
                        onClick={() => onEdit(schedule)}
                      >
                        <div className="font-bold text-xs">{schedule.subject?.name}</div>
                        <div className="text-xs">{schedule.classSection?.name}</div>
                        <div className="text-xs mt-1">{formatTime(schedule.time)} - {getEndTime(schedule.time, schedule.duration)}</div>
                      </td>
                    );
                  }

                  return (
                    <td 
                      key={slot.toISOString()} 
                      className="border-l hover:bg-gray-100 cursor-pointer"
                      onClick={() => onAdd(selectedDay, slot.toTimeString().substring(0, 5))}
                    ></td>
                  );
                })}
              </tr>
            );
        })}
        </tbody>
      </table>
    </div>
  );
};

export default ScheduleGridView; 
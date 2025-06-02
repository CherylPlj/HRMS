import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type NotificationType = 
  | 'ATTENDANCE_CHECK_IN'
  | 'ATTENDANCE_CHECK_OUT'
  | 'LEAVE_REQUEST'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED'
  | 'DOCUMENT_SUBMITTED'
  | 'DOCUMENT_APPROVED'
  | 'DOCUMENT_REJECTED';

export async function createNotification({
  targetUserId,
  message,
  type,
}: {
  targetUserId: string;
  message: string;
  type: NotificationType;
}) {
  try {
    const notification = await prisma.notification.create({
      data: {
        UserID: targetUserId,
        Message: message,
        Type: type,
        IsRead: false,
      },
    });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

// Helper function to create attendance notifications
export async function createAttendanceNotification({
  employeeId,
  type,
  adminId,
}: {
  employeeId: string;
  type: 'CHECK_IN' | 'CHECK_OUT';
  adminId: string;
}) {
  const employee = await prisma.user.findUnique({
    where: { UserID: employeeId },
    select: { FirstName: true, LastName: true },
  });

  if (!employee) {
    throw new Error('Employee not found');
  }

  const message = `${employee.FirstName} ${employee.LastName} has ${type === 'CHECK_IN' ? 'checked in' : 'checked out'} for the day.`;
  
  return createNotification({
    targetUserId: adminId,
    message,
    type: type === 'CHECK_IN' ? 'ATTENDANCE_CHECK_IN' : 'ATTENDANCE_CHECK_OUT',
  });
}

// Helper function to create leave request notifications
export async function createLeaveRequestNotification({
  facultyId,
  adminId,
  status,
}: {
  facultyId: string;
  adminId: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED';
}) {
  const faculty = await prisma.faculty.findUnique({
    where: { FacultyID: facultyId },
    include: {
      User: {
        select: { FirstName: true, LastName: true },
      },
    },
  });

  if (!faculty) {
    throw new Error('Faculty not found');
  }

  let message = '';
  let type: NotificationType;

  switch (status) {
    case 'REQUESTED':
      message = `${faculty.User.FirstName} ${faculty.User.LastName} has submitted a leave request.`;
      type = 'LEAVE_REQUEST';
      break;
    case 'APPROVED':
      message = `Your leave request has been approved.`;
      type = 'LEAVE_APPROVED';
      break;
    case 'REJECTED':
      message = `Your leave request has been rejected.`;
      type = 'LEAVE_REJECTED';
      break;
  }

  const targetUserId = status === 'REQUESTED' ? adminId : faculty.UserID;

  return createNotification({
    targetUserId,
    message,
    type,
  });
}

// Helper function to create document submission notifications
export async function createDocumentNotification({
  facultyId,
  adminId,
  status,
}: {
  facultyId: string;
  adminId: string;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
}) {
  const faculty = await prisma.faculty.findUnique({
    where: { FacultyID: facultyId },
    include: {
      User: {
        select: { FirstName: true, LastName: true },
      },
    },
  });

  if (!faculty) {
    throw new Error('Faculty not found');
  }

  let message = '';
  let type: NotificationType;

  switch (status) {
    case 'SUBMITTED':
      message = `${faculty.User.FirstName} ${faculty.User.LastName} has submitted a new document.`;
      type = 'DOCUMENT_SUBMITTED';
      break;
    case 'APPROVED':
      message = `Your document has been approved.`;
      type = 'DOCUMENT_APPROVED';
      break;
    case 'REJECTED':
      message = `Your document has been rejected.`;
      type = 'DOCUMENT_REJECTED';
      break;
  }

  const targetUserId = status === 'SUBMITTED' ? adminId : faculty.UserID;

  return createNotification({
    targetUserId,
    message,
    type,
  });
} 
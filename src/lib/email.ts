import nodemailer from 'nodemailer';

// Create a transporter using Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  console.log('Attempting to send email:', { to, subject });
  console.log('Using email configuration:', {
    fromEmail: process.env.GMAIL_USER,
    hasPassword: !!process.env.GMAIL_APP_PASSWORD
  });

  try {
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to,
      subject,
      html,
    };

    console.log('Sending email with options:', { ...mailOptions, html: '(content omitted)' });
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}

export function generateApplicationConfirmationEmail(applicantName: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #800000; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Application Received</h1>
      </div>
      
      <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
        <p>Dear ${applicantName},</p>
        
        <p>Thank you for submitting your application to Saint Joseph School of Fairview Inc. This email confirms that we have received your application.</p>
        
        <p>What happens next?</p>
        <ul>
          <li>Our HR team will review your application</li>
          <li>If your qualifications match our requirements, we will contact you via email or phone for the next steps</li>
          <li>The review process typically takes 5-7 business days</li>
        </ul>
        
        <p>If you have any questions or need to update your application, please contact us at:</p>
        <p style="margin-left: 20px;">
          Email: sjsfihrms@gmail.com<br>
          Phone: (02) 8-693-5661
        </p>
        
        <p>Please save this email for your records.</p>
        
        <p>Best regards,<br>
        HR Department<br>
        Saint Joseph School of Fairview Inc.</p>
      </div>
      
      <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px;">
        <p>This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  `;
}

export function generateInterviewScheduleEmail(candidateName: string, vacancyName: string, interviewDate: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #800000; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Interview Schedule</h1>
      </div>
      
      <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
        <p>Dear ${candidateName},</p>
        
        <p>We are pleased to inform you that your application for the <strong>${vacancyName}</strong> position has progressed to the next stage.</p>
        
        <p>Your interview has been scheduled for:</p>
        <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; text-align: center;">
          <h2 style="margin: 0; color: #800000;">${interviewDate}</h2>
        </div>
        
        <p><strong>Important Notes:</strong></p>
        <ul>
          <li>Please arrive 15 minutes before your scheduled time</li>
          <li>Bring a valid ID and a copy of your resume</li>
          <li>Dress appropriately for a professional interview</li>
          <li>Be prepared to discuss your qualifications and experience</li>
        </ul>
        
        <p>Location: Saint Joseph School of Fairview Inc.</p>
        
        <p>If you need to reschedule or have any questions, please contact us at:</p>
        <p style="margin-left: 20px;">
          Email: sjsfihrms@gmail.com<br>
          Phone: (02) 8-693-5661
        </p>
        
        <p>Best regards,<br>
        HR Department<br>
        Saint Joseph School of Fairview Inc.</p>
      </div>
      
      <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px;">
        <p>This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  `;
}

export function generateStatusUpdateEmail(candidateName: string, vacancyName: string, newStatus: string) {
  let statusMessage = '';
  
  switch(newStatus) {
    case 'Shortlisted':
      statusMessage = 'Your application has been shortlisted. We will contact you soon with further details about the next steps.';
      break;
    case 'InterviewCompleted':
      statusMessage = 'Thank you for attending the interview. Our team is currently reviewing your application and we will get back to you with our decision soon.';
      break;
    case 'Offered':
      statusMessage = 'Congratulations! We would like to offer you the position. You will receive a formal offer letter shortly with more details.';
      break;
    case 'Hired':
      statusMessage = 'Welcome to Saint Joseph School of Fairview Inc.! You will receive additional information about your onboarding process soon.';
      break;
    case 'Returned':
      statusMessage = 'After careful consideration, we regret to inform you that we have decided to move forward with other candidates. We appreciate your interest in joining our team and wish you the best in your job search.';
      break;
    case 'Withdrawn':
      statusMessage = 'We acknowledge that you have withdrawn your application. Thank you for your interest in Saint Joseph School of Fairview Inc.';
      break;
    default:
      statusMessage = 'Your application status has been updated. Our HR team will contact you if any action is required from your side.';
  }

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #800000; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Application Status Update</h1>
      </div>
      
      <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
        <p>Dear ${candidateName},</p>
        
        <p>This email is regarding your application for the <strong>${vacancyName}</strong> position.</p>
        
        <p>${statusMessage}</p>
        
        <p>If you have any questions, please contact us at:</p>
        <p style="margin-left: 20px;">
          Email: sjsfihrms@gmail.com<br>
          Phone: (02) 8-693-5661
        </p>
        
        <p>Best regards,<br>
        HR Department<br>
        Saint Joseph School of Fairview Inc.</p>
      </div>
      
      <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px;">
        <p>This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  `;
}

export function generatePositionFilledEmail(candidateName: string, vacancyName: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #800000; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Position Update</h1>
      </div>
      
      <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
        <p>Dear ${candidateName},</p>
        
        <p>We want to inform you that the position of <strong>${vacancyName}</strong> has been filled. While we were impressed with your qualifications, we have decided to move forward with another candidate who closely matched our current requirements.</p>
        
        <p>We sincerely appreciate your interest in joining Saint Joseph School of Fairview Inc. and the time you invested in applying for this position. We encourage you to apply for future positions that match your qualifications.</p>
        
        <p>We wish you the best in your career endeavors.</p>
        
        <p>Best regards,<br>
        HR Department<br>
        Saint Joseph School of Fairview Inc.</p>
      </div>
      
      <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px;">
        <p>This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  `;
}

export function generateLeaveRequestAdminNotificationEmail(
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  timeIn: string | null,
  timeOut: string | null,
  status: string,
  reason: string,
  hasEmployeeSignature: boolean,
  hasDepartmentHeadSignature: boolean
) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #800000; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">New Leave Request Submitted</h1>
      </div>
      
      <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
        <p>Dear HR Administrator,</p>
        
        <p>A new leave request has been submitted and requires your review.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-left: 4px solid #800000;">
          <h2 style="margin-top: 0; color: #800000;">Request Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 40%;">Employee Name:</td>
              <td style="padding: 8px 0;">${employeeName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Leave Type:</td>
              <td style="padding: 8px 0;">${leaveType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Start Date:</td>
              <td style="padding: 8px 0;">${formatDate(startDate)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">End Date:</td>
              <td style="padding: 8px 0;">${formatDate(endDate)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Time In:</td>
              <td style="padding: 8px 0;">${formatTime(timeIn)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Time Out:</td>
              <td style="padding: 8px 0;">${formatTime(timeOut)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Status:</td>
              <td style="padding: 8px 0;">
                <span style="background-color: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; font-weight: bold;">
                  ${status}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Employee Signature:</td>
              <td style="padding: 8px 0;">${hasEmployeeSignature ? '✓ Provided' : '✗ Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Department Head Signature:</td>
              <td style="padding: 8px 0;">${hasDepartmentHeadSignature ? '✓ Provided' : '✗ Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Reason:</td>
              <td style="padding: 8px 0;">${reason}</td>
            </tr>
          </table>
        </div>
        
        <p>Please log in to the HRMS system to review and process this leave request.</p>
        
        <p>Best regards,<br>
        HRMS System<br>
        Saint Joseph School of Fairview Inc.</p>
      </div>
      
      <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px;">
        <p>This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  `;
}

export function generateLeaveUpdateAdminNotificationEmail(
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  timeIn: string | null,
  timeOut: string | null,
  reason: string,
  hasEmployeeSignature: boolean,
  hasDepartmentHeadSignature: boolean
) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #800000; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Leave Request Updated</h1>
      </div>
      
      <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
        <p>Dear HR Administrator,</p>
        
        <p>A pending leave request has been updated by the employee. Please review the updated details below.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-left: 4px solid #800000;">
          <h2 style="margin-top: 0; color: #800000;">Updated Request Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 40%;">Employee Name:</td>
              <td style="padding: 8px 0;">${employeeName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Leave Type:</td>
              <td style="padding: 8px 0;">${leaveType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Start Date:</td>
              <td style="padding: 8px 0;">${formatDate(startDate)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">End Date:</td>
              <td style="padding: 8px 0;">${formatDate(endDate)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Time In:</td>
              <td style="padding: 8px 0;">${formatTime(timeIn)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Time Out:</td>
              <td style="padding: 8px 0;">${formatTime(timeOut)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Status:</td>
              <td style="padding: 8px 0;">
                <span style="background-color: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; font-weight: bold;">
                  Pending
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Employee Signature:</td>
              <td style="padding: 8px 0;">${hasEmployeeSignature ? '✓ Provided' : '✗ Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Department Head Signature:</td>
              <td style="padding: 8px 0;">${hasDepartmentHeadSignature ? '✓ Provided' : '✗ Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Reason:</td>
              <td style="padding: 8px 0;">${reason}</td>
            </tr>
          </table>
        </div>
        
        <p>Please log in to the HRMS system to review and process this updated leave request.</p>
        
        <p>Best regards,<br>
        HRMS System<br>
        Saint Joseph School of Fairview Inc.</p>
      </div>
      
      <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px;">
        <p>This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  `;
}

export function generateNewApplicationNotificationEmail(
  applicantName: string,
  applicantEmail: string,
  contactNumber: string | null,
  messengerName: string | null,
  fbLink: string | null,
  vacancyName: string,
  dateApplied: string
) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #800000; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">New Job Application Received</h1>
      </div>
      
      <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
        <p>Dear HR Team,</p>
        
        <p>A new job application has been submitted through the public application form.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-left: 4px solid #800000;">
          <h2 style="margin-top: 0; color: #800000;">Applicant Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 40%;">Full Name:</td>
              <td style="padding: 8px 0;">${applicantName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Email:</td>
              <td style="padding: 8px 0;"><a href="mailto:${applicantEmail}">${applicantEmail}</a></td>
            </tr>
            ${contactNumber ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Contact Number:</td>
              <td style="padding: 8px 0;">${contactNumber}</td>
            </tr>
            ` : ''}
            ${messengerName ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Messenger Name:</td>
              <td style="padding: 8px 0;">${messengerName}</td>
            </tr>
            ` : ''}
            ${fbLink ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Facebook Link:</td>
              <td style="padding: 8px 0;"><a href="${fbLink}" target="_blank">${fbLink}</a></td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Position Applied For:</td>
              <td style="padding: 8px 0;"><strong>${vacancyName}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Date Applied:</td>
              <td style="padding: 8px 0;">${formatDate(dateApplied)}</td>
            </tr>
          </table>
        </div>
        
        <p>Please log in to the HRMS system to review this application and proceed with the recruitment process.</p>
        
        <p>Best regards,<br>
        HRMS System<br>
        Saint Joseph School of Fairview Inc.</p>
      </div>
      
      <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px;">
        <p>This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  `;
}

export function generateLeaveStatusUpdateEmail(
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  status: string
) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  let statusMessage = '';
  let statusColor = '';
  
  if (status === 'Approved') {
    statusMessage = 'Your leave request has been <strong>approved</strong>. Please make sure to complete any pending tasks before your leave period begins.';
    statusColor = '#10b981'; // green
  } else if (status === 'Returned') {
    statusMessage = 'We regret to inform you that your leave request has been <strong>returned</strong>. If you have any questions or concerns, please contact the HR department.';
    statusColor = '#ef4444'; // red
  } else {
    statusMessage = 'Your leave request status has been updated.';
    statusColor = '#f59e0b'; // yellow
  }

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #800000; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Leave Request Status Update</h1>
      </div>
      
      <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
        <p>Dear ${employeeName},</p>
        
        <p>${statusMessage}</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-left: 4px solid ${statusColor};">
          <h2 style="margin-top: 0; color: #800000;">Request Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 40%;">Leave Type:</td>
              <td style="padding: 8px 0;">${leaveType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Start Date:</td>
              <td style="padding: 8px 0;">${formatDate(startDate)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">End Date:</td>
              <td style="padding: 8px 0;">${formatDate(endDate)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Status:</td>
              <td style="padding: 8px 0;">
                <span style="background-color: ${status === 'Approved' ? '#d1fae5' : status === 'Returned' ? '#fee2e2' : '#fef3c7'}; 
                           color: ${status === 'Approved' ? '#065f46' : status === 'Returned' ? '#991b1b' : '#92400e'}; 
                           padding: 4px 8px; border-radius: 4px; font-weight: bold;">
                  ${status}
                </span>
              </td>
            </tr>
          </table>
        </div>
        
        <p>If you have any questions or need to make changes to your leave request, please contact the HR department.</p>
        
        <p style="margin-left: 20px;">
          Email: sjsfihrms@gmail.com<br>
          Phone: (02) 8-693-5661
        </p>
        
        <p>Best regards,<br>
        HR Department<br>
        Saint Joseph School of Fairview Inc.</p>
      </div>
      
      <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px;">
        <p>This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  `;
} 
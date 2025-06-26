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
    case 'Rejected':
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
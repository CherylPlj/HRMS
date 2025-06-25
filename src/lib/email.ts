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
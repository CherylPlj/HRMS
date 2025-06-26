import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, generateInterviewScheduleEmail, generateStatusUpdateEmail, generatePositionFilledEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, candidateEmail, candidateName, vacancyName, interviewDate, newStatus } = body;

    if (!type || !candidateEmail || !candidateName || !vacancyName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let emailContent;
    let subject;

    if (type === 'interview') {
      if (!interviewDate) {
        return NextResponse.json(
          { error: 'Interview date is required for interview emails' },
          { status: 400 }
        );
      }
      subject = 'Interview Schedule - Saint Joseph School of Fairview Inc.';
      emailContent = generateInterviewScheduleEmail(candidateName, vacancyName, interviewDate);
    } else if (type === 'status') {
      if (!newStatus) {
        return NextResponse.json(
          { error: 'New status is required for status update emails' },
          { status: 400 }
        );
      }
      subject = 'Application Status Update - Saint Joseph School of Fairview Inc.';
      emailContent = generateStatusUpdateEmail(candidateName, vacancyName, newStatus);
    } else if (type === 'position_filled') {
      subject = 'Position Update - Saint Joseph School of Fairview Inc.';
      emailContent = generatePositionFilledEmail(candidateName, vacancyName);
    } else {
      return NextResponse.json(
        { error: 'Invalid email type' },
        { status: 400 }
      );
    }

    const emailResult = await sendEmail({
      to: candidateEmail,
      subject,
      html: emailContent
    });

    if (!emailResult.success) {
      throw new Error('Failed to send email');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending email to candidate:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
} 
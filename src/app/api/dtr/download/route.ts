import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facultyId = searchParams.get('facultyId');
  const startDate = searchParams.get('startDate'); // e.g. '2024-05-01'
  // We'll always use the month of startDate

  if (!facultyId || !startDate) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  // Get faculty info
  const { data: faculty, error: facultyError } = await supabaseAdmin
    .from('Faculty')
    .select('*, User:UserID (FirstName, LastName)')
    .eq('FacultyID', facultyId)
    .single();

  if (facultyError || !faculty) {
    return NextResponse.json({ error: 'Faculty not found' }, { status: 404 });
  }

  // Get attendance for the month
  const month = new Date(startDate).getMonth();
  const year = new Date(startDate).getFullYear();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const { data: attendance, error: attError } = await supabaseAdmin
    .from('Attendance')
    .select('*')
    .eq('facultyId', facultyId)
    .gte('date', firstDay.toISOString().slice(0, 10))
    .lte('date', lastDay.toISOString().slice(0, 10));

  // Start PDF
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  let buffers: Buffer[] = [];
  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {});

  // Header
  doc.fontSize(12).text('Republic of the Philippines', { align: 'center' });
  doc.text('PAJO NIGHT HIGH SCHOOL', { align: 'center' });
  doc.moveDown();
  doc.fontSize(14).text('DAILY TIME RECORD', { align: 'center', underline: true });
  doc.moveDown();
  doc.fontSize(12).text(`Name: ${faculty.User.FirstName} ${faculty.User.LastName}`);
  doc.text(`Month: ${firstDay.toLocaleString('default', { month: 'long' })} ${year}`);
  doc.moveDown();

  // Table header
  doc.font('Helvetica-Bold').text('Day', 40, doc.y, { continued: true })
    .text('AM Arrival', 80, doc.y, { continued: true })
    .text('AM Departure', 150, doc.y, { continued: true })
    .text('PM Arrival', 240, doc.y, { continued: true })
    .text('PM Departure', 320, doc.y, { continued: true })
    .text('Status', 410, doc.y);
  doc.moveDown(0.5);
  doc.font('Helvetica');

  // Table rows
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const rec = attendance?.find((a: any) => a.date.startsWith(dateStr));
    const dayOfWeek = new Date(year, month, d).toLocaleDateString('en-US', { weekday: 'short' });
    doc.text(`${d} (${dayOfWeek})`, 40, doc.y, { continued: true })
      .text(rec?.timeIn || '-', 80, doc.y, { continued: true })
      .text(rec?.timeOut || '-', 150, doc.y, { continued: true })
      .text('-', 240, doc.y, { continued: true }) // PM Arrival (if you have it)
      .text('-', 320, doc.y, { continued: true }) // PM Departure (if you have it)
      .text(rec?.status || (dayOfWeek === 'Sun' ? 'SUNDAY' : ''), 410, doc.y);
    doc.moveDown(0.2);
  }

  doc.moveDown();
  doc.text('I CERTIFY on my honor that the above is a true and correct report of the hours of work performed...', { align: 'left' });
  doc.moveDown(2);
  doc.text('EVELIO S. GARCIA', { align: 'right' });
  doc.text('School Head', { align: 'right' });

  doc.end();

  const pdfBuffer = await new Promise<Buffer>((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
  });

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=\"DTR_${faculty.User.LastName}_${firstDay.toLocaleString('default', { month: 'long' })}_${year}.pdf\"`
    }
  });
}

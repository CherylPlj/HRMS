import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFileSync } from 'fs';
import path from 'path';
import { Parser } from 'json2csv';
// For PDF, you can use 'pdfkit' or 'puppeteer' (not included here)

// POST: Export performance report as Excel (CSV) or PDF
export async function POST(req: NextRequest) {
    const { type, reportId } = await req.json();
    const report = await prisma.performanceReport.findUnique({
        where: { id: reportId },
        include: { employee: true },
    });
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

    if (type === 'excel') {
        // Export as CSV
        const fields = ['employeeId', 'periodStart', 'periodEnd', 'summary'];
        const parser = new Parser({ fields });
        const csv = parser.parse(report);
        const filePath = path.join(process.cwd(), 'public', `performance_report_${reportId}.csv`);
        writeFileSync(filePath, csv);
        return NextResponse.json({ url: `/performance_report_${reportId}.csv` });
    }
    if (type === 'pdf') {
        // PDF export logic placeholder
        // You can use pdfkit or puppeteer to generate PDF
        return NextResponse.json({ error: 'PDF export not implemented' }, { status: 501 });
    }
    return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
}

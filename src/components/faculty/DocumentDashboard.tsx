import React, { useMemo } from 'react';
import { Pie, Line, Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import { 
  FileText, 
  CheckCircle, 
  XCircle,
  Clock,
  TrendingUp,
  Users,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import { DocumentFacultyRow, DocumentType, Faculty } from './types';

interface DocumentDashboardProps {
  documents: DocumentFacultyRow[];
  documentTypes: DocumentType[];
  facultyList: Faculty[];
}

const DocumentDashboard: React.FC<DocumentDashboardProps> = ({ 
  documents, 
  documentTypes,
  facultyList 
}) => {
  const stats = useMemo(() => {
    const total = documents.length;
    const submitted = documents.filter(d => d.SubmissionStatus === 'Submitted').length;
    const approved = documents.filter(d => d.SubmissionStatus === 'Approved').length;
    const returned = documents.filter(d => d.SubmissionStatus === 'Returned').length;
    const pending = documentTypes.length * facultyList.length - total; // Documents not yet submitted

    // Calculate completion rate
    const totalRequired = documentTypes.length * facultyList.length;
    const completionRate = totalRequired > 0 ? (approved / totalRequired) * 100 : 0;

    // Document type distribution
    const docTypeCounts: Record<string, number> = {};
    documentTypes.forEach(dt => {
      docTypeCounts[dt.DocumentTypeName] = documents.filter(d => d.DocumentTypeID === dt.DocumentTypeID).length;
    });

    // Faculty completion status
    const facultyCompletion: Array<{
      name: string;
      submitted: number;
      approved: number;
      total: number;
      completionRate: number;
    }> = facultyList.map(faculty => {
      const facultyDocs = documents.filter(d => d.FacultyID === faculty.FacultyID);
      const submittedCount = facultyDocs.filter(d => 
        d.SubmissionStatus === 'Submitted' || d.SubmissionStatus === 'Approved'
      ).length;
      const approvedCount = facultyDocs.filter(d => d.SubmissionStatus === 'Approved').length;
      return {
        name: `${faculty.User?.FirstName || ''} ${faculty.User?.LastName || ''}`.trim() || 'Unknown',
        submitted: submittedCount,
        approved: approvedCount,
        total: documentTypes.length,
        completionRate: documentTypes.length > 0 ? (approvedCount / documentTypes.length) * 100 : 0
      };
    });

    // Top faculty by completion
    const topFaculty = [...facultyCompletion]
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 5);

    // Faculty needing attention (low completion)
    const needsAttention = [...facultyCompletion]
      .filter(f => f.completionRate < 50)
      .sort((a, b) => a.completionRate - b.completionRate)
      .slice(0, 5);

    // Monthly trends (last 6 months)
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    
    const monthlyDocs: Record<string, number> = {};
    const monthlyApproved: Record<string, number> = {};
    const monthlyReturned: Record<string, number> = {};
    
    documents
      .filter(d => new Date(d.UploadDate) >= sixMonthsAgo)
      .forEach(doc => {
        const date = new Date(doc.UploadDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyDocs[monthKey] = (monthlyDocs[monthKey] || 0) + 1;
        
        if (doc.SubmissionStatus === 'Approved') {
          monthlyApproved[monthKey] = (monthlyApproved[monthKey] || 0) + 1;
        } else if (doc.SubmissionStatus === 'Returned') {
          monthlyReturned[monthKey] = (monthlyReturned[monthKey] || 0) + 1;
        }
      });

    // Recent documents (last 10)
    const recentDocs = [...documents]
      .sort((a, b) => new Date(b.UploadDate).getTime() - new Date(a.UploadDate).getTime())
      .slice(0, 10);

    // Status distribution by document type
    const statusByType: Record<string, { submitted: number; approved: number; returned: number }> = {};
    documentTypes.forEach(dt => {
      const typeDocs = documents.filter(d => d.DocumentTypeID === dt.DocumentTypeID);
      statusByType[dt.DocumentTypeName] = {
        submitted: typeDocs.filter(d => d.SubmissionStatus === 'Submitted').length,
        approved: typeDocs.filter(d => d.SubmissionStatus === 'Approved').length,
        returned: typeDocs.filter(d => d.SubmissionStatus === 'Returned').length
      };
    });

    return {
      total,
      submitted,
      approved,
      returned,
      pending,
      completionRate: Math.round(completionRate * 10) / 10,
      docTypeCounts,
      facultyCompletion,
      topFaculty,
      needsAttention,
      monthlyDocs,
      monthlyApproved,
      monthlyReturned,
      recentDocs,
      statusByType
    };
  }, [documents, documentTypes, facultyList]);

  // Status distribution chart data
  const statusChartData = {
    labels: ['Submitted', 'Approved', 'Returned', 'Pending'],
    datasets: [
      {
        data: [stats.submitted, stats.approved, stats.returned, stats.pending],
        backgroundColor: ['#3b82f6', '#22c55e', '#ef4444', '#fbbf24'],
        borderWidth: 1,
      },
    ],
  };

  // Document type distribution chart data
  const docTypeLabels = Object.keys(stats.docTypeCounts);
  const docTypeChartData = {
    labels: docTypeLabels,
    datasets: [
      {
        data: Object.values(stats.docTypeCounts),
        backgroundColor: [
          '#800000',
          '#dc2626',
          '#f97316',
          '#eab308',
          '#22c55e',
          '#3b82f6',
          '#8b5cf6',
          '#ec4899',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Monthly trends chart data
  const monthlyLabels = Object.keys(stats.monthlyDocs).sort();
  const timelineChartData = {
    labels: monthlyLabels.map(label => {
      const [year, month] = label.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }),
    datasets: [
      {
        label: 'Total Uploads',
        data: monthlyLabels.map(label => stats.monthlyDocs[label] || 0),
        borderColor: '#800000',
        backgroundColor: 'rgba(128, 0, 0, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Approved',
        data: monthlyLabels.map(label => stats.monthlyApproved[label] || 0),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Returned',
        data: monthlyLabels.map(label => stats.monthlyReturned[label] || 0),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Documents</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Submitted</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.submitted}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.approved}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Returned</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.returned}</p>
            </div>
            <div className="bg-red-100 rounded-full p-3">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.completionRate}%</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Submissions</p>
              <p className="text-2xl font-bold text-yellow-600 mt-2">{stats.pending}</p>
            </div>
            <div className="bg-yellow-100 rounded-full p-3">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Document Types</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{documentTypes.length}</p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <FileCheck className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
          <div className="h-[250px] flex items-center justify-center">
            <Pie 
              data={statusChartData} 
              options={{ 
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                  legend: { 
                    display: true, 
                    position: 'bottom',
                    labels: {
                      boxWidth: 15,
                      padding: 15,
                      usePointStyle: true
                    }
                  } 
                } 
              }} 
            />
          </div>
        </div>

        {/* Document Type Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Type Distribution</h3>
          <div className="h-[250px] flex items-center justify-center">
            {docTypeLabels.length > 0 ? (
              <Pie 
                data={docTypeChartData} 
                options={{ 
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { 
                    legend: { 
                      display: true, 
                      position: 'bottom',
                      labels: {
                        boxWidth: 15,
                        padding: 15,
                        usePointStyle: true
                      }
                    } 
                  } 
                }} 
              />
            ) : (
              <p className="text-gray-500">No document type data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trends (Last 6 Months)</h3>
        <div className="h-[300px]">
          {monthlyLabels.length > 0 ? (
            <Line 
              data={timelineChartData} 
              options={{ 
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                  legend: { 
                    display: true, 
                    position: 'top',
                  } 
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1
                    }
                  }
                }
              }} 
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-500">No data available for the last 6 months</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Top Faculty and Recent Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Faculty by Completion */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-[#800000]" />
            Top Faculty by Completion
          </h3>
          <div className="space-y-3">
            {stats.topFaculty.length > 0 ? (
              stats.topFaculty.map((faculty, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#800000] text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{faculty.name}</p>
                      <p className="text-sm text-gray-500">{faculty.approved}/{faculty.total} approved</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#800000]">{Math.round(faculty.completionRate)}%</p>
                    <p className="text-xs text-gray-500">complete</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No faculty data available</p>
            )}
          </div>
        </div>

        {/* Recent Documents */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#800000]" />
            Recent Document Submissions
          </h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {stats.recentDocs.length > 0 ? (
              stats.recentDocs.map((doc) => (
                <div key={doc.DocumentID} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{doc.facultyName || 'Unknown'}</p>
                    <p className="text-sm text-gray-500">
                      {doc.documentTypeName} • {new Date(doc.UploadDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    doc.SubmissionStatus === 'Approved' 
                      ? 'bg-green-100 text-green-800'
                      : doc.SubmissionStatus === 'Returned'
                      ? 'bg-red-100 text-red-800'
                      : doc.SubmissionStatus === 'Submitted'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {doc.SubmissionStatus}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent documents</p>
            )}
          </div>
        </div>
      </div>

      {/* Faculty Needing Attention */}
      {stats.needsAttention.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            Faculty Needing Attention
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.needsAttention.map((faculty, index) => (
              <div key={index} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="font-medium text-gray-900">{faculty.name}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {faculty.approved}/{faculty.total} documents approved
                </p>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-600 h-2 rounded-full" 
                      style={{ width: `${faculty.completionRate}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{Math.round(faculty.completionRate)}% complete</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentDashboard;


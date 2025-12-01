'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FaEye, FaChartLine } from 'react-icons/fa';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PerformanceReview } from '@/types/performance';
import { mockPerformanceReviews } from '@/components/performance/mockData';
import ScoreBadge from '@/components/performance/ScoreBadge';
import Pagination from '@/components/disciplinary/Pagination';

interface PerformanceHistoryTabProps {
  employeeId: string;
}

const PerformanceHistoryTab: React.FC<PerformanceHistoryTabProps> = ({ employeeId }) => {
  const router = useRouter();
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    if (employeeId) {
      fetchPerformanceHistory();
    }
  }, [employeeId]);

  const fetchPerformanceHistory = async () => {
    try {
      setLoading(true);
      
      // In a real app, this would fetch from an API endpoint like:
      // const response = await fetch(`/api/employees/${employeeId}/performance-history`);
      // For now, we'll use mock data and filter by employeeId
      
      // Filter mock reviews by employeeId (matching pattern from mock data)
      // Since mock data uses EMP001, EMP002, etc., we'll try to match
      // Handle both EmployeeID and employeeId formats
      const normalizedEmployeeId = employeeId?.toUpperCase() || '';
      const employeeReviews = mockPerformanceReviews.filter(
        (review) => review.employeeId?.toUpperCase() === normalizedEmployeeId
      );
      
      setReviews(employeeReviews);
    } catch (error) {
      console.error('Error fetching performance history:', error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(reviews.length / itemsPerPage);
  const paginatedReviews = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return reviews.slice(startIndex, endIndex);
  }, [reviews, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const getStatusBadge = (status: PerformanceReview['status']) => {
    const variants = {
      draft: 'bg-gray-500 text-white',
      pending: 'bg-yellow-500 text-white',
      completed: 'bg-blue-500 text-white',
      approved: 'bg-green-500 text-white',
    };

    return (
      <Badge className={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleViewReview = (review: PerformanceReview) => {
    router.push(`/dashboard/admin/performance/reviews/${review.id}`);
  };

  // Calculate summary statistics
  const averageScore = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.totalScore, 0) / reviews.length
    : 0;
  const totalReviews = reviews.length;
  const completedReviews = reviews.filter((r) => r.status === 'completed' || r.status === 'approved').length;

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#800000]"></div>
        <p className="mt-2 text-gray-600">Loading performance history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-center">{totalReviews}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-center">{completedReviews}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-center">
              {averageScore > 0 ? averageScore.toFixed(1) : 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FaChartLine className="text-[#800000]" />
            Performance Review History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <div className="text-center py-12">
              <FaChartLine className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Performance Reviews</h3>
              <p className="text-gray-600">This employee has no performance reviews yet.</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Reviewer</TableHead>
                      <TableHead>KPI Score</TableHead>
                      <TableHead>Behavior Score</TableHead>
                      <TableHead>Attendance Score</TableHead>
                      <TableHead>Total Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Review Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedReviews.map((review) => (
                      <TableRow key={review.id}>
                        <TableCell className="font-medium">{review.period}</TableCell>
                        <TableCell>{review.reviewerName}</TableCell>
                        <TableCell>
                          <ScoreBadge score={review.kpiScore} />
                        </TableCell>
                        <TableCell>
                          <ScoreBadge score={review.behaviorScore} />
                        </TableCell>
                        <TableCell>
                          <ScoreBadge score={review.attendanceScore} />
                        </TableCell>
                        <TableCell>
                          <ScoreBadge score={review.totalScore} />
                        </TableCell>
                        <TableCell>{getStatusBadge(review.status)}</TableCell>
                        <TableCell>{formatDate(review.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewReview(review)}
                          >
                            <FaEye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {reviews.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={reviews.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={handlePageChange}
                  onItemsPerPageChange={handleItemsPerPageChange}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceHistoryTab;


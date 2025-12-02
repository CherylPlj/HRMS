'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Eye, TrendingUp, Award, Target, Loader2 } from 'lucide-react'
import PerformanceSummaryCard from './PerformanceSummaryCard'
import ScoreBadge from './ScoreBadge'
import Pagination from '@/components/disciplinary/Pagination'
import ReviewViewModal from './ReviewViewModal'
import { PerformanceReview } from '@/types/performance'

interface MyPerformanceReviewsProps {
  userRole?: 'employee' | 'faculty'
  employeeId?: string
}

interface PerformanceData {
  employeeId: string
  reviews: any[]
  metrics: any[]
  summary: {
    totalReviews: number
    completedReviews: number
    pendingReviews: number
    averageScore: number
    averageKpiScore: number
    totalMetrics: number
  }
}

const MyPerformanceReviews: React.FC<MyPerformanceReviewsProps> = ({
  userRole = 'employee',
  employeeId,
}) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Transform and sort reviews - must be before conditional returns (Rules of Hooks)
  const transformedReviews: PerformanceReview[] = useMemo(() => {
    if (!performanceData?.reviews) return []
    
    return (performanceData.reviews || [])
      .map((review: any) => ({
        id: review.id,
        employeeId: review.employeeId,
        employeeName: review.employeeName || '',
        reviewerId: '', // Excluded for employee/faculty
        reviewerName: '', // Excluded for employee/faculty
        period: review.period || '',
        startDate: review.startDate || '',
        endDate: review.endDate || '',
        kpiScore: review.kpiScore || 0,
        behaviorScore: review.behaviorScore || 0,
        attendanceScore: review.attendanceScore || 0,
        totalScore: review.totalScore || review.overallScore || 0,
        status: review.status || 'draft',
        remarks: review.remarks || '',
        createdAt: review.createdAt || '',
        updatedAt: review.updatedAt || '',
      }))
      .sort((a, b) => {
        // Sort by updatedAt (most recent first), fallback to createdAt if updatedAt is not available
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0)
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0)
        return dateB - dateA // Descending order (latest first)
      })
  }, [performanceData?.reviews])

  // Calculate pagination - must be before conditional returns (Rules of Hooks)
  const totalPages = useMemo(() => {
    return Math.ceil(transformedReviews.length / itemsPerPage)
  }, [transformedReviews.length, itemsPerPage])
  
  const paginatedReviews = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return transformedReviews.slice(startIndex, endIndex)
  }, [transformedReviews, currentPage, itemsPerPage])

  // Define fetchPerformanceData before useEffect
  const fetchPerformanceData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/performance/my-performance')
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch performance data' }))
        const errorMessage = errorData.error || 'Failed to fetch performance data'
        
        // Hide technical database errors from user
        const errorString = String(errorMessage || '');
        const isTechnicalError = 
          errorMessage.includes('prepared statement') ||
          errorMessage.includes('already exists') ||
          errorMessage.includes('ConnectorError') ||
          errorMessage.includes('QueryError') ||
          errorMessage.includes('PostgresError') ||
          errorMessage.includes('Prisma') ||
          errorMessage.includes('connection pool') ||
          errorMessage.includes('connection pool timeout') ||
          errorMessage.includes('Timed out fetching') ||
          errorString.includes('connection pool') ||
          errorString.includes('connection pool timeout') ||
          errorString.includes('Timed out fetching') ||
          errorString.includes('prepared statement') ||
          errorString.includes('already exists') ||
          errorString.includes('42P05') ||
          errorMessage.includes('P1001') ||
          errorMessage.includes('P1017') ||
          errorMessage.includes('prisma.user.findUnique');
        
        throw new Error(
          isTechnicalError 
            ? 'Failed to load performance data. Please try again later.'
            : errorMessage
        )
      }

      const data = await response.json()
      setPerformanceData(data)
      setCurrentPage(1) // Reset to first page when data changes
    } catch (err) {
      console.error('Error fetching performance data:', err)
      
      // Additional safety check to hide any technical errors that might slip through
      const errorMessage = err instanceof Error ? err.message : String(err || '');
      const errorString = String(err || '');
      const isTechnicalError = 
        errorMessage.includes('prepared statement') ||
        errorMessage.includes('already exists') ||
        errorMessage.includes('ConnectorError') ||
        errorMessage.includes('QueryError') ||
        errorMessage.includes('PostgresError') ||
        errorMessage.includes('Prisma') ||
        errorMessage.includes('connection pool') ||
        errorMessage.includes('connection pool timeout') ||
        errorMessage.includes('Timed out fetching') ||
        errorString.includes('connection pool') ||
        errorString.includes('connection pool timeout') ||
        errorString.includes('Timed out fetching') ||
        errorString.includes('prepared statement') ||
        errorString.includes('already exists') ||
        errorString.includes('42P05') ||
        errorMessage.includes('prisma.user.findUnique');
      
      const userFacingError = isTechnicalError
        ? 'Failed to load performance data. Please try again later.'
        : (errorMessage || 'Failed to load performance data');
      
      setError(userFacingError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPerformanceData()
  }, [])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading performance data...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2 text-destructive">Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchPerformanceData}>Try Again</Button>
        </div>
      </div>
    )
  }

  if (!performanceData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Performance Data</h2>
          <p className="text-muted-foreground">
            Unable to load performance data.
          </p>
        </div>
      </div>
    )
  }

  const summary = performanceData?.summary
  const myReviews = performanceData?.reviews || []

  // Use summary statistics from backend
  const averageScore = summary?.averageScore || 0
  const totalReviews = summary?.totalReviews || 0
  const completedReviews = summary?.completedReviews || 0
  const averageKpiScore = summary?.averageKpiScore || 0

  const getStatusBadge = (status: PerformanceReview['status']) => {
    const variants = {
      draft: 'bg-gray-500 text-white',
      pending: 'bg-yellow-500 text-white',
      completed: 'bg-blue-500 text-white',
      approved: 'bg-green-500 text-white',
    }

    return (
      <Badge className={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const handleViewReview = (review: PerformanceReview) => {
    setSelectedReview(review)
    setIsModalOpen(true)
  }

  const handleModalClose = (open: boolean) => {
    setIsModalOpen(open)
    if (!open) {
      // Clear selected review when modal closes
      setSelectedReview(null)
    }
  }

  if (transformedReviews.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Performance Reviews</h2>
          <p className="text-muted-foreground">
            You don't have any performance reviews yet.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* <div className="mb-8">
        <h1 className="text-3xl font-bold">My Performance Reviews</h1>
        <p className="text-muted-foreground mt-2">
          View your performance reviews and track your progress
        </p>
      </div> */}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <PerformanceSummaryCard
          title="Average Score"
          value={averageScore.toFixed(1)}
          icon={<TrendingUp className="h-4 w-4" />}
          description="Across all reviews"
        />
        <PerformanceSummaryCard
          title="Total Reviews"
          value={totalReviews}
          icon={<Award className="h-4 w-4" />}
          description="All time"
        />
        <PerformanceSummaryCard
          title="Completed Reviews"
          value={completedReviews}
          icon={<Target className="h-4 w-4" />}
          description="Finalized reviews"
        />
        <PerformanceSummaryCard
          title="Average KPI Score"
          value={averageKpiScore.toFixed(1)}
          icon={<TrendingUp className="h-4 w-4" />}
          description="KPI performance"
        />
      </div>

      {/* Reviews Table */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>KPI Score</TableHead>
                  <TableHead>Behavior Score</TableHead>
                  <TableHead>Attendance Score</TableHead>
                  <TableHead>Total Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell className="font-medium">{review.period || 'N/A'}</TableCell>
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
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewReview(review)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {transformedReviews.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={transformedReviews.length}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          )}
        </CardContent>
      </Card>

      {/* Review View Modal */}
      <ReviewViewModal
        open={isModalOpen}
        onOpenChange={handleModalClose}
        review={selectedReview}
        allReviews={transformedReviews}
      />
    </div>
  )
}

export default MyPerformanceReviews


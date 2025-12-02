'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Loader2 } from 'lucide-react'
import ScoreBadge from '@/components/performance/ScoreBadge'
import { PerformanceReview } from '@/types/performance'

export default function EmployeeReviewDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const reviewId = params?.id as string
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [review, setReview] = useState<PerformanceReview | null>(null)

  useEffect(() => {
    if (reviewId) {
      fetchReview()
    }
  }, [reviewId])

  const fetchReview = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/performance/reviews/${reviewId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Review not found')
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Failed to fetch review' }))
          const errorMessage = errorData.error || 'Failed to fetch review'
          
          // Hide technical database errors
          const isTechnicalError = 
            errorMessage.includes('prepared statement') ||
            errorMessage.includes('ConnectorError') ||
            errorMessage.includes('QueryError') ||
            errorMessage.includes('PostgresError') ||
            errorMessage.includes('Prisma');
          
          throw new Error(
            isTechnicalError 
              ? 'Failed to load review. Please try again later.'
              : errorMessage
          )
        }
        return
      }

      const data = await response.json()
      
      // Transform backend response to frontend format
      // Note: Reviewer information is excluded for employee/faculty views
      const transformedReview: PerformanceReview = {
        id: data.id,
        employeeId: data.employeeId,
        employeeName: data.employeeName || '',
        reviewerId: '', // Excluded for employee/faculty
        reviewerName: '', // Excluded for employee/faculty
        period: data.period || '',
        startDate: data.startDate || '',
        endDate: data.endDate || '',
        kpiScore: data.kpiScore || 0,
        behaviorScore: data.behaviorScore || 0,
        attendanceScore: data.attendanceScore || 0,
        totalScore: data.totalScore || data.overallScore || 0,
        status: data.status || 'draft',
        remarks: data.remarks || '',
        createdAt: data.createdAt || '',
        updatedAt: data.updatedAt || '',
      }

      setReview(transformedReview)
    } catch (err) {
      console.error('Error fetching review:', err)
      setError(err instanceof Error ? err.message : 'Failed to load review')
    } finally {
      setLoading(false)
    }
  }

  if (!params || !reviewId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Review ID</h1>
          <p className="text-muted-foreground mb-4">
            The review ID is missing or invalid.
          </p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading review...</span>
        </div>
      </div>
    )
  }

  if (error || !review) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Review Not Found</h1>
          <p className="text-muted-foreground mb-4">
            {error || 'This review doesn\'t exist or you don\'t have access to it.'}
          </p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Performance Review Details</h1>
          <p className="text-muted-foreground mt-2">
            Review period: {review.period}
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Review Information */}
        <Card>
          <CardHeader>
            <CardTitle>Review Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Period</p>
                <p className="font-medium">{review.period}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1">{getStatusBadge(review.status)}</div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Review Date</p>
                <p className="font-medium">{formatDate(review.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scores Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Scores Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">KPI Score</p>
                <ScoreBadge score={review.kpiScore} />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Behavior Score</p>
                <ScoreBadge score={review.behaviorScore} />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Attendance Score</p>
                <ScoreBadge score={review.attendanceScore} />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Score</p>
                <ScoreBadge score={review.totalScore} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Remarks */}
        <Card>
          <CardHeader>
            <CardTitle>Reviewer Remarks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">
              {review.remarks || 'No remarks provided.'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


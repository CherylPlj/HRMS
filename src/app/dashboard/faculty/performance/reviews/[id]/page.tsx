'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import ScoreBadge from '@/components/performance/ScoreBadge'
import { mockPerformanceReviews } from '@/components/performance/mockData'
import { PerformanceReview } from '@/types/performance'

export default function FacultyReviewDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const reviewId = params?.id as string

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

  // Find the review (in a real app, this would be fetched from API)
  // For static UI, we'll filter to only show reviews for the current employee
  const review: PerformanceReview | undefined = mockPerformanceReviews
    .filter((r) => r.employeeId === 'EMP001')
    .find((r) => r.id === reviewId)

  if (!review) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Review Not Found</h1>
          <p className="text-muted-foreground mb-4">
            This review doesn't exist or you don't have access to it.
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
                <p className="text-sm text-muted-foreground">Reviewer</p>
                <p className="font-medium text-lg">{review.reviewerName}</p>
              </div>
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


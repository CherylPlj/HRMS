'use client'

import React, { useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft, Edit, Eye, History } from 'lucide-react'
import ScoreBadge from '@/components/performance/ScoreBadge'
import { mockPerformanceReviews } from '@/components/performance/mockData'
import { PerformanceReview } from '@/types/performance'

export default function ReviewDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const reviewId = (params?.id as string) || ''

  // Find the review (in a real app, this would be fetched from API)
  const review: PerformanceReview | undefined = mockPerformanceReviews.find(
    (r) => r.id === reviewId
  )

  // Get previous reviews for the same employee (excluding current review)
  // Previous reviews are those with an earlier end date than the current review
  const previousReviews = useMemo(() => {
    if (!review) return []
    
    return mockPerformanceReviews
      .filter(
        (r) =>
          r.employeeId === review.employeeId &&
          r.id !== review.id &&
          new Date(r.endDate) < new Date(review.endDate)
      )
      .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
  }, [review])

  if (!review) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Review Not Found</h1>
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
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Review Details</h1>
            <p className="text-muted-foreground mt-2">
              Performance review for {review.period}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => console.log('Edit clicked (static)')}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Employee Information */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Employee Name</p>
                <p className="font-medium text-lg">{review.employeeName}</p>
              </div>
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
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">{formatDate(review.startDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">End Date</p>
                <p className="font-medium">{formatDate(review.endDate)}</p>
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
            <CardTitle>Remarks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{review.remarks || 'No remarks provided.'}</p>
          </CardContent>
        </Card>

        {/* Review Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Review Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Created At</p>
                <p className="font-medium">{formatDate(review.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="font-medium">{formatDate(review.updatedAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Previous Reviews Section */}
        {previousReviews.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Previous Performance Reviews
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Historical reviews for {review.employeeName} (sorted by date, newest first)
              </p>
            </CardHeader>
            <CardContent>
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
                    {previousReviews.map((prevReview) => (
                      <TableRow key={prevReview.id}>
                        <TableCell className="font-medium">
                          {prevReview.period}
                        </TableCell>
                        <TableCell>{prevReview.reviewerName}</TableCell>
                        <TableCell>
                          <ScoreBadge score={prevReview.kpiScore} />
                        </TableCell>
                        <TableCell>
                          <ScoreBadge score={prevReview.behaviorScore} />
                        </TableCell>
                        <TableCell>
                          <ScoreBadge score={prevReview.attendanceScore} />
                        </TableCell>
                        <TableCell>
                          <ScoreBadge score={prevReview.totalScore} />
                        </TableCell>
                        <TableCell>{getStatusBadge(prevReview.status)}</TableCell>
                        <TableCell>
                          {formatDate(prevReview.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(
                                `/dashboard/admin/performance/reviews/${prevReview.id}`
                              )
                            }
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
            </CardContent>
          </Card>
        )}

        {/* No Previous Reviews Message */}
        {previousReviews.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Previous Performance Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <History className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No previous performance reviews found for this employee.</p>
                <p className="text-sm mt-1">This appears to be their first review.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}


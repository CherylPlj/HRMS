'use client'

import React, { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChevronDown, ChevronUp, Eye, History } from 'lucide-react'
import ScoreBadge from './ScoreBadge'
import { PerformanceReview } from '@/types/performance'
import { mockPerformanceReviews } from './mockData'

interface ReviewViewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  review: PerformanceReview | null
}

const ReviewViewModal: React.FC<ReviewViewModalProps> = ({
  open,
  onOpenChange,
  review,
}) => {
  const [showPreviousReviews, setShowPreviousReviews] = useState(false)

  // Get previous reviews for the same employee (excluding current review)
  // Must call all hooks before any conditional returns
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
      .slice(0, 5) // Limit to 5 most recent previous reviews in modal
  }, [review])

  if (!review) return null

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

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Performance Review Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Employee Information */}
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

          {/* Scores Breakdown */}
          <div>
            <p className="text-sm font-medium mb-3">Scores Breakdown</p>
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
          </div>

          {/* Remarks */}
          <div>
            <p className="text-sm font-medium mb-2">Remarks</p>
            <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-md">
              {review.remarks || 'No remarks provided.'}
            </p>
          </div>

          {/* Review Metadata */}
          <div className="pt-4 border-t">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Created At</p>
                <p className="font-medium">{formatDate(review.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="font-medium">{formatDate(review.updatedAt)}</p>
              </div>
            </div>

            {/* Previous Reviews Section - Expandable below Created At */}
            {previousReviews.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="ghost"
                  onClick={() => setShowPreviousReviews(!showPreviousReviews)}
                  className="w-full justify-between p-0 h-auto font-medium"
                >
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    <span>Previous Performance Reviews ({previousReviews.length})</span>
                  </div>
                  {showPreviousReviews ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
                
                {showPreviousReviews && (
                  <div className="mt-4 rounded-md border max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Period</TableHead>
                          <TableHead>Total Score</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previousReviews.map((prevReview) => (
                          <TableRow key={prevReview.id}>
                            <TableCell className="font-medium">
                              {prevReview.period}
                            </TableCell>
                            <TableCell>
                              <ScoreBadge score={prevReview.totalScore} />
                            </TableCell>
                            <TableCell>{getStatusBadge(prevReview.status)}</TableCell>
                            <TableCell className="text-xs">
                              {formatDateShort(prevReview.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {/* Show message if no previous reviews */}
            {previousReviews.length === 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <History className="h-4 w-4" />
                  <span>No previous performance reviews for this employee</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ReviewViewModal


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
import { ChevronDown, ChevronUp, Eye, History, X, Send, CheckCircle, CheckCheck } from 'lucide-react'
import ScoreBadge from './ScoreBadge'
import { PerformanceReview } from '@/types/performance'
import { mockPerformanceReviews } from './mockData'

interface ReviewViewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  review: PerformanceReview | null
  allReviews?: PerformanceReview[] // Optional: all reviews to find previous ones
  userRole?: 'employee' | 'faculty' | 'admin' // Optional: user role to determine view behavior
  onStatusChange?: (reviewId: string, newStatus: 'draft' | 'pending' | 'completed' | 'approved') => void
}

const ReviewViewModal: React.FC<ReviewViewModalProps> = ({
  open,
  onOpenChange,
  review,
  allReviews = [],
  userRole = 'employee',
  onStatusChange,
}) => {
  const [showPreviousReviews, setShowPreviousReviews] = useState(false)

  // Get previous reviews for the same employee (excluding current review)
  // Must call all hooks before any conditional returns
  const previousReviews = useMemo(() => {
    if (!review) return []
    
    // Use allReviews if provided, otherwise fall back to mock data (for backward compatibility)
    const reviewsToSearch = allReviews.length > 0 ? allReviews : mockPerformanceReviews
    
    return reviewsToSearch
      .filter(
        (r) =>
          r.employeeId === review.employeeId &&
          r.id !== review.id &&
          new Date(r.endDate || r.createdAt) < new Date(review.endDate || review.createdAt)
      )
      .sort((a, b) => {
        const dateA = new Date(a.endDate || a.createdAt).getTime()
        const dateB = new Date(b.endDate || b.createdAt).getTime()
        return dateB - dateA
      })
      .slice(0, 5) // Limit to 5 most recent previous reviews in modal
  }, [review, allReviews])

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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="relative mb-4">
          <div className="flex justify-between items-center">
            <DialogTitle>Performance Review Details</DialogTitle>
            <div className="flex gap-2">
              {/* Status Action Buttons - Only show for admin users */}
              {userRole === 'admin' && onStatusChange && (
                <>
                  {review.status === 'draft' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onStatusChange(review.id, 'pending')
                        onOpenChange(false)
                      }}
                      className="text-xs"
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Submit for Review
                    </Button>
                  )}
                  {review.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onStatusChange(review.id, 'completed')
                        onOpenChange(false)
                      }}
                      className="text-xs"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Mark as Completed
                    </Button>
                  )}
                  {review.status === 'completed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onStatusChange(review.id, 'approved')
                        onOpenChange(false)
                      }}
                      className="text-xs"
                    >
                      <CheckCheck className="h-3 w-3 mr-1" />
                      Approve Review
                    </Button>
                  )}
                </>
              )}
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Review Information */}
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

            {/* Show message if no previous reviews - hide in faculty view */}
            {previousReviews.length === 0 && userRole !== 'faculty' && (
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


'use client'

import React from 'react'
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
import { Eye, Edit, Send, CheckCircle, CheckCheck } from 'lucide-react'
import { PerformanceReview } from '@/types/performance'
import ScoreBadge from './ScoreBadge'

interface ReviewTableProps {
  reviews: PerformanceReview[]
  onView?: (review: PerformanceReview) => void
  onEdit?: (review: PerformanceReview) => void
  onStatusChange?: (reviewId: string, newStatus: 'draft' | 'pending' | 'completed' | 'approved') => void
}

const ReviewTable: React.FC<ReviewTableProps> = ({ reviews, onView, onEdit, onStatusChange }) => {
  
  const getStatusActions = (review: PerformanceReview) => {
    const actions = []
    
    if (review.status === 'draft' && onStatusChange) {
      actions.push(
        <Button
          key="submit"
          variant="outline"
          size="sm"
          onClick={() => onStatusChange(review.id, 'pending')}
          className="text-xs"
          title="Submit for Review"
        >
          <Send className="h-3 w-3 mr-1" />
          Submit
        </Button>
      )
    }
    
    if (review.status === 'pending' && onStatusChange) {
      actions.push(
        <Button
          key="complete"
          variant="outline"
          size="sm"
          onClick={() => onStatusChange(review.id, 'completed')}
          className="text-xs"
          title="Mark as Completed"
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          Complete
        </Button>
      )
    }
    
    if (review.status === 'completed' && onStatusChange) {
      actions.push(
        <Button
          key="approve"
          variant="outline"
          size="sm"
          onClick={() => onStatusChange(review.id, 'approved')}
          className="text-xs"
          title="Approve Review"
        >
          <CheckCheck className="h-3 w-3 mr-1" />
          Approve
        </Button>
      )
    }
    
    return actions
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
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee Name</TableHead>
            <TableHead>Reviewer</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Total Score</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reviews.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No reviews found
              </TableCell>
            </TableRow>
          ) : (
            reviews.map((review) => (
              <TableRow key={review.id}>
                <TableCell className="font-medium">
                  {review.employeeName}
                </TableCell>
                <TableCell>{review.reviewerName}</TableCell>
                <TableCell>{review.period}</TableCell>
                <TableCell>
                  <ScoreBadge score={review.totalScore} />
                </TableCell>
                <TableCell>{getStatusBadge(review.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2 flex-wrap">
                    {getStatusActions(review)}
                    {onView && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(review)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    )}
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(review)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default ReviewTable


'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { Eye, TrendingUp, Award, Target } from 'lucide-react'
import PerformanceSummaryCard from './PerformanceSummaryCard'
import ScoreBadge from './ScoreBadge'
import { PerformanceReview } from '@/types/performance'
import { mockPerformanceReviews } from './mockData'

interface MyPerformanceReviewsProps {
  userRole?: 'employee' | 'faculty'
  employeeId?: string
}

const MyPerformanceReviews: React.FC<MyPerformanceReviewsProps> = ({
  userRole = 'employee',
  employeeId,
}) => {
  const router = useRouter()
  const [reviews] = useState<PerformanceReview[]>(mockPerformanceReviews)

  // Filter reviews for the current user (in real app, this would be based on employeeId)
  // For static UI, we'll show the first employee's reviews as an example
  const myReviews = reviews.filter((review) => review.employeeId === 'EMP001')

  // Calculate summary statistics
  const averageScore =
    myReviews.length > 0
      ? myReviews.reduce((sum, r) => sum + r.totalScore, 0) / myReviews.length
      : 0
  const totalReviews = myReviews.length
  const completedReviews = myReviews.filter((r) => r.status === 'completed').length
  const averageKpiScore =
    myReviews.length > 0
      ? myReviews.reduce((sum, r) => sum + r.kpiScore, 0) / myReviews.length
      : 0

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
    router.push(`/dashboard/${userRole}/performance/reviews/${review.id}`)
  }

  if (myReviews.length === 0) {
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Performance Reviews</h1>
        <p className="text-muted-foreground mt-2">
          View your performance reviews and track your progress
        </p>
      </div>

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
                  <TableHead>Reviewer</TableHead>
                  <TableHead>KPI Score</TableHead>
                  <TableHead>Behavior Score</TableHead>
                  <TableHead>Attendance Score</TableHead>
                  <TableHead>Total Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myReviews.map((review) => (
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
        </CardContent>
      </Card>
    </div>
  )
}

export default MyPerformanceReviews


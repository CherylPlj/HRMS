'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Employee, PerformanceReview } from '@/types/performance'

interface ReviewFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ReviewFormData) => void
  employees: Employee[]
  reviewers: Employee[]
  review?: PerformanceReview | null
}

export interface ReviewFormData {
  employeeId: string
  reviewerId: string
  startDate: string
  endDate: string
  kpiScore: number
  behaviorScore: number
  attendanceScore: number
  remarks: string
  totalScore: number
}

const ReviewFormModal: React.FC<ReviewFormModalProps> = ({
  open,
  onOpenChange,
  onSubmit,
  employees,
  reviewers,
  review,
}) => {
  const isEditMode = !!review

  const [formData, setFormData] = useState<ReviewFormData>({
    employeeId: review?.employeeId || '',
    reviewerId: review?.reviewerId || '',
    startDate: review?.startDate || '',
    endDate: review?.endDate || '',
    kpiScore: review?.kpiScore || 0,
    behaviorScore: review?.behaviorScore || 0,
    attendanceScore: review?.attendanceScore || 0,
    remarks: review?.remarks || '',
    totalScore: 0,
  })

  const [totalScore, setTotalScore] = useState(0)

  useEffect(() => {
    if (review) {
      setFormData({
        employeeId: review.employeeId,
        reviewerId: review.reviewerId,
        startDate: review.startDate,
        endDate: review.endDate,
        kpiScore: review.kpiScore,
        behaviorScore: review.behaviorScore,
        attendanceScore: review.attendanceScore,
        remarks: review.remarks,
        totalScore: review.totalScore,
      })
      setTotalScore(review.totalScore)
    } else {
      setFormData({
        employeeId: '',
        reviewerId: '',
        startDate: '',
        endDate: '',
        kpiScore: 0,
        behaviorScore: 0,
        attendanceScore: 0,
        remarks: '',
        totalScore: 0,
      })
      setTotalScore(0)
    }
  }, [review, open])

  useEffect(() => {
    const total =
      (formData.kpiScore + formData.behaviorScore + formData.attendanceScore) /
      3
    setTotalScore(total)
  }, [formData.kpiScore, formData.behaviorScore, formData.attendanceScore])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'kpiScore' ||
        name === 'behaviorScore' ||
        name === 'attendanceScore'
          ? parseFloat(value) || 0
          : value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ ...formData, totalScore })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Performance Review' : 'Create New Performance Review'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee *</Label>
              <Select
                id="employeeId"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                required
              >
                <option value="">Select employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} - {emp.position}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reviewerId">Reviewer *</Label>
              <Select
                id="reviewerId"
                name="reviewerId"
                value={formData.reviewerId}
                onChange={handleChange}
                required
              >
                <option value="">Select reviewer</option>
                {reviewers.map((rev) => (
                  <option key={rev.id} value={rev.id}>
                    {rev.name} - {rev.position}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                value={formData.endDate}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="kpiScore">KPI Score (0-100) *</Label>
              <Input
                id="kpiScore"
                name="kpiScore"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.kpiScore}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="behaviorScore">Behavior Score (0-100) *</Label>
              <Input
                id="behaviorScore"
                name="behaviorScore"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.behaviorScore}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="attendanceScore">Attendance Score (0-100) *</Label>
              <Input
                id="attendanceScore"
                name="attendanceScore"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.attendanceScore}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalScore">Total Score (Auto-calculated)</Label>
            <Input
              id="totalScore"
              type="text"
              value={totalScore.toFixed(2)}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              rows={4}
              placeholder="Enter review remarks..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {isEditMode ? 'Update Review' : 'Submit Review'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ReviewFormModal


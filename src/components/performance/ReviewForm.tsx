'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Employee } from '@/types/performance'
import SearchableEmployeeSelect from '@/components/disciplinary/SearchableEmployeeSelect'

interface ReviewFormProps {
  employees: Employee[]
  reviewers: Employee[]
  onSubmit?: (data: ReviewFormData) => void
  initialData?: Partial<ReviewFormData>
}

export interface ReviewFormData {
  employeeId: string
  reviewerId: string
  startDate: string
  endDate: string
  kpiScore: number
  behaviorScore: number
  attendanceScore: number
  totalScore: number
  remarks: string
}

const ReviewForm: React.FC<ReviewFormProps> = ({
  employees,
  reviewers,
  onSubmit,
  initialData,
}) => {
  const [formData, setFormData] = useState<ReviewFormData>({
    employeeId: initialData?.employeeId || '',
    reviewerId: initialData?.reviewerId || '',
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
    kpiScore: initialData?.kpiScore || 0,
    behaviorScore: initialData?.behaviorScore || 0,
    attendanceScore: initialData?.attendanceScore || 0,
    totalScore: initialData?.totalScore || 0,
    remarks: initialData?.remarks || '',
  })

  useEffect(() => {
    const total =
      (formData.kpiScore + formData.behaviorScore + formData.attendanceScore) /
      3
    setFormData((prev) => ({ ...prev, totalScore: total }))
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
    if (onSubmit) {
      onSubmit(formData)
    } else {
      console.log('Form submitted (static):', formData)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Performance Review</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee <span className="text-[#800000]">*</span></Label>
              <SearchableEmployeeSelect
                employees={employees.map(emp => ({ id: emp.id, name: `${emp.name} - ${emp.position}` }))}
                value={formData.employeeId}
                onChange={(employeeId, employeeName) => {
                  setFormData(prev => ({
                    ...prev,
                    employeeId,
                  }))
                }}
                required
                placeholder="Search or select employee..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reviewerId">Reviewer</Label>
              <Select
                id="reviewerId"
                name="reviewerId"
                value={formData.reviewerId}
                onChange={handleChange}
              >
                <option value="">Use current user (you)</option>
                {reviewers.map((rev) => (
                  <option key={rev.id} value={rev.id}>
                    {rev.name} - {rev.position}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">If left blank, you will be set as the reviewer automatically</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date <span className="text-[#800000]">*</span></Label>
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
              <Label htmlFor="endDate">End Date <span className="text-[#800000]">*</span></Label>
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
              <Label htmlFor="kpiScore">KPI Score (0-100) <span className="text-[#800000]">*</span></Label>
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
              <Label htmlFor="behaviorScore">Behavior Score (0-100) <span className="text-[#800000]">*</span></Label>
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
              <Label htmlFor="attendanceScore">Attendance Score (0-100) <span className="text-[#800000]">*</span></Label>
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
              value={formData.totalScore.toFixed(2)}
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

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline">
              Cancel
            </Button>
            <Button type="submit">Submit Review</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default ReviewForm


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
import SearchableEmployeeSelect from '@/components/disciplinary/SearchableEmployeeSelect'

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
  const [calculatedScores, setCalculatedScores] = useState<{
    kpiScore: number | null;
    behaviorScore: number | null;
    attendanceScore: number | null;
    breakdown: any[];
  } | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [useCalculatedScores, setUseCalculatedScores] = useState(true)

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
      setUseCalculatedScores(false) // Don't auto-calculate for existing reviews
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
      setUseCalculatedScores(true)
    }
    setCalculatedScores(null)
  }, [review, open])

  // Calculate scores from metrics when employee and dates are selected
  useEffect(() => {
    const calculateScores = async () => {
      if (!formData.employeeId || !formData.startDate || !formData.endDate || !useCalculatedScores) {
        return
      }

      setIsCalculating(true)
      try {
        const response = await fetch('/api/performance/reviews/calculate-scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: formData.employeeId,
            startDate: formData.startDate,
            endDate: formData.endDate,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setCalculatedScores(data)
          
          // Auto-populate scores if calculated
          if (data.kpiScore !== null || data.behaviorScore !== null || data.attendanceScore !== null) {
            setFormData(prev => ({
              ...prev,
              kpiScore: data.kpiScore ?? prev.kpiScore,
              behaviorScore: data.behaviorScore ?? prev.behaviorScore,
              attendanceScore: data.attendanceScore ?? prev.attendanceScore,
            }))
          }
        }
      } catch (error) {
        console.error('Error calculating scores:', error)
      } finally {
        setIsCalculating(false)
      }
    }

    // Debounce calculation
    const timeoutId = setTimeout(calculateScores, 500)
    return () => clearTimeout(timeoutId)
  }, [formData.employeeId, formData.startDate, formData.endDate, useCalculatedScores])

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
      <DialogContent 
        className="max-w-[90vw] sm:max-w-[80vw] md:max-w-[700px] lg:max-w-[800px] w-full p-6 sm:p-8 flex flex-col"
        onClose={() => onOpenChange(false)}
        style={{ 
          maxHeight: 'calc(100vh - 4rem)'
        }}
      >
        <DialogHeader className="mb-6 flex-shrink-0">
          <DialogTitle className="text-2xl">
            {isEditMode ? 'Edit Performance Review' : 'Create New Performance Review'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8 flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="employeeId" className="text-base font-medium">Employee <span className="text-[#800000]">*</span></Label>
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

            <div className="space-y-3">
              <Label htmlFor="reviewerId" className="text-base font-medium">Reviewer</Label>
              <Select
                id="reviewerId"
                name="reviewerId"
                value={formData.reviewerId}
                onChange={handleChange}
                className="w-full h-10"
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

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="startDate" className="text-base font-medium">Start Date <span className="text-[#800000]">*</span></Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleChange}
                required
                className="h-10"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="endDate" className="text-base font-medium">End Date <span className="text-[#800000]">*</span></Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                value={formData.endDate}
                onChange={handleChange}
                required
                className="h-10"
              />
            </div>
          </div>

          {/* Score Calculation Section */}
          {calculatedScores && calculatedScores.breakdown.length > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-medium text-blue-900">
                    Calculated from Metrics
                  </Label>
                  {isCalculating && (
                    <span className="text-sm text-blue-600">Calculating...</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setUseCalculatedScores(!useCalculatedScores)}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  {useCalculatedScores ? 'Use Manual Entry' : 'Use Calculated Scores'}
                </button>
              </div>
              
              {calculatedScores.breakdown.map((category: any) => (
                category.metrics.length > 0 && (
                  <div key={category.category} className="text-sm">
                    <div className="font-medium text-blue-800 mb-1">
                      {category.category}: {category.calculatedScore !== null 
                        ? category.calculatedScore.toFixed(2) 
                        : 'No metrics found'}
                    </div>
                    <div className="text-blue-700 ml-4 space-y-1">
                      {category.metrics.map((metric: any, idx: number) => (
                        <div key={idx} className="text-xs">
                          • {metric.metricName}: {Number(metric.value).toFixed(2)}
                          {metric.unit && ` ${metric.unit}`}
                          {metric.target && ` / ${Number(metric.target).toFixed(2)} target`}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="kpiScore" className="text-base font-medium">
                  KPI Score (0-100) <span className="text-[#800000]">*</span>
                </Label>
                {calculatedScores && calculatedScores.kpiScore !== null && useCalculatedScores && (
                  <span className="text-xs text-muted-foreground">
                    Calculated: {calculatedScores.kpiScore.toFixed(2)}
                  </span>
                )}
              </div>
              <Input
                id="kpiScore"
                name="kpiScore"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.kpiScore}
                onChange={(e) => {
                  handleChange(e)
                  setUseCalculatedScores(false) // Switch to manual when user edits
                }}
                required
                className="h-10"
                disabled={isCalculating}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="behaviorScore" className="text-base font-medium">
                  Behavior Score (0-100) <span className="text-[#800000]">*</span>
                </Label>
                {calculatedScores && calculatedScores.behaviorScore !== null && useCalculatedScores && (
                  <span className="text-xs text-muted-foreground">
                    Calculated: {calculatedScores.behaviorScore.toFixed(2)}
                  </span>
                )}
              </div>
              <Input
                id="behaviorScore"
                name="behaviorScore"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.behaviorScore}
                onChange={(e) => {
                  handleChange(e)
                  setUseCalculatedScores(false) // Switch to manual when user edits
                }}
                required
                className="h-10"
                disabled={isCalculating}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="attendanceScore" className="text-base font-medium">
                  Attendance Score (0-100) <span className="text-[#800000]">*</span>
                </Label>
                {calculatedScores && calculatedScores.attendanceScore !== null && useCalculatedScores && (
                  <span className="text-xs text-muted-foreground">
                    Calculated: {calculatedScores.attendanceScore.toFixed(2)}
                  </span>
                )}
              </div>
              <Input
                id="attendanceScore"
                name="attendanceScore"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.attendanceScore}
                onChange={(e) => {
                  handleChange(e)
                  setUseCalculatedScores(false) // Switch to manual when user edits
                }}
                required
                className="h-10"
                disabled={isCalculating}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="totalScore" className="text-base font-medium">Total Score (Auto-calculated)</Label>
            <Input
              id="totalScore"
              type="text"
              value={totalScore.toFixed(2)}
              disabled
              className="bg-muted h-10"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="remarks" className="text-base font-medium">Remarks</Label>
            <Textarea
              id="remarks"
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              rows={6}
              placeholder="Enter review remarks..."
              className="min-h-[120px]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="px-6">
              Cancel
            </Button>
            <Button type="submit" className="px-6">
              {isEditMode ? 'Update Review' : 'Submit Review'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ReviewFormModal


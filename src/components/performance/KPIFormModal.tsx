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
import { KPI } from '@/types/performance'

interface KPIFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: KPIFormData) => void
  kpi?: KPI | null
}

export interface KPIFormData {
  name: string
  description: string
  category: 'kpi' | 'behavior' | 'attendance' | 'other'
  weight: number
  maxScore: number
  minScore: number
  isActive: boolean
}

const KPIFormModal: React.FC<KPIFormModalProps> = ({
  open,
  onOpenChange,
  onSubmit,
  kpi,
}) => {
  const isEditMode = !!kpi

  const [formData, setFormData] = useState<KPIFormData>({
    name: '',
    description: '',
    category: 'kpi',
    weight: 0,
    maxScore: 100,
    minScore: 0,
    isActive: true,
  })

  useEffect(() => {
    if (kpi) {
      setFormData({
        name: kpi.name,
        description: kpi.description,
        category: kpi.category,
        weight: kpi.weight,
        maxScore: kpi.maxScore,
        minScore: kpi.minScore,
        isActive: kpi.isActive,
      })
    } else {
      setFormData({
        name: '',
        description: '',
        category: 'kpi',
        weight: 0,
        maxScore: 100,
        minScore: 0,
        isActive: true,
      })
    }
  }, [kpi, open])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? checked
          : type === 'number'
          ? parseFloat(value) || 0
          : value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit KPI/Metric' : 'Add New KPI/Metric'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">KPI/Metric Name *</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., KPI Score, Behavior Score"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={3}
              placeholder="Describe what this KPI/metric measures"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="kpi">KPI</option>
                <option value="behavior">Behavior</option>
                <option value="attendance">Attendance</option>
                <option value="other">Other</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Weight (%) *</Label>
              <Input
                id="weight"
                name="weight"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.weight}
                onChange={handleChange}
                required
                placeholder="e.g., 40"
              />
              <p className="text-xs text-muted-foreground">
                Percentage weight in total score calculation
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minScore">Minimum Score *</Label>
              <Input
                id="minScore"
                name="minScore"
                type="number"
                value={formData.minScore}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxScore">Maximum Score *</Label>
              <Input
                id="maxScore"
                name="maxScore"
                type="number"
                value={formData.maxScore}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="rounded border-gray-300"
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Active (Include in performance calculations)
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {isEditMode ? 'Update KPI' : 'Add KPI'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default KPIFormModal


'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { TrainingRecommendation } from '@/types/performance'

interface TrainingDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  training: TrainingRecommendation | null
}

const TrainingDetailsModal: React.FC<TrainingDetailsModalProps> = ({
  open,
  onOpenChange,
  training,
}) => {
  if (!training) return null

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-500 text-white'
      case 'medium':
        return 'bg-yellow-500 text-white'
      case 'low':
        return 'bg-blue-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="relative mb-4">
          <DialogTitle>Training Recommendation Details</DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-0 top-0 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>
        </DialogHeader>

        <div className="space-y-6">
          {/* Employee Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Employee Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Employee Name</p>
                <p className="font-medium">{training.employeeName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Department</p>
                <p className="font-medium">{training.department}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Position</p>
                <p className="font-medium">{training.position || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Priority</p>
                <div className="mt-1">
                  <Badge className={getPriorityColor(training.priority)}>
                    {training.priority.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Training Information */}
          <div className="pt-4 border-t">
            <h3 className="text-lg font-semibold mb-4">Training Information</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Recommended Training</p>
                <p className="font-medium text-lg">{training.recommendedTraining}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estimated Duration</p>
                <p className="font-medium">{training.estimatedDuration}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Reason for Recommendation</p>
                <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-md">
                  {training.reason || 'No reason provided.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default TrainingDetailsModal


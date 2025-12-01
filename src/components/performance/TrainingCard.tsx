'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye } from 'lucide-react'
import { TrainingRecommendation } from '@/types/performance'

interface TrainingCardProps {
  training: TrainingRecommendation
  onViewDetails?: (training: TrainingRecommendation) => void
}

const TrainingCard: React.FC<TrainingCardProps> = ({
  training,
  onViewDetails,
}) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{training.employeeName}</CardTitle>
          <Badge className={getPriorityColor(training.priority)}>
            {training.priority.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Department</p>
            <p className="font-medium">{training.department}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Position</p>
            <p className="font-medium">{training.position}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Recommended Training</p>
            <p className="font-medium">{training.recommendedTraining}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Reason</p>
            <p className="text-sm">{training.reason}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Estimated Duration</p>
            <p className="font-medium">{training.estimatedDuration}</p>
          </div>
          {onViewDetails && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onViewDetails(training)}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default TrainingCard


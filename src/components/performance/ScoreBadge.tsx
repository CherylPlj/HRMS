'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'

interface ScoreBadgeProps {
  score: number
  maxScore?: number
  className?: string
}

const ScoreBadge: React.FC<ScoreBadgeProps> = ({
  score,
  maxScore = 100,
  className,
}) => {
  const percentage = (score / maxScore) * 100

  const getVariant = () => {
    if (percentage >= 90) return 'default'
    if (percentage >= 75) return 'secondary'
    if (percentage >= 60) return 'outline'
    return 'destructive'
  }

  const getColorClass = () => {
    if (percentage >= 90) return 'bg-green-500 hover:bg-green-600 text-white'
    if (percentage >= 75) return 'bg-blue-500 hover:bg-blue-600 text-white'
    if (percentage >= 60) return 'bg-yellow-500 hover:bg-yellow-600 text-white'
    return 'bg-red-500 hover:bg-red-600 text-white'
  }

  return (
    <Badge
      variant={getVariant()}
      className={`${getColorClass()} ${className || ''}`}
    >
      {score.toFixed(1)} / {maxScore}
    </Badge>
  )
}

export default ScoreBadge


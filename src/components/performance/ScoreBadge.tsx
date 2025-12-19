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

  const getColorClass = () => {
    if (percentage >= 90) return 'border-transparent bg-green-500 hover:bg-green-600 text-white'
    if (percentage >= 75) return 'border-transparent bg-blue-600 hover:bg-blue-700 text-white'
    if (percentage >= 60) return 'border-transparent bg-yellow-500 hover:bg-yellow-600 text-white'
    return 'border-transparent bg-red-500 hover:bg-red-600 text-white'
  }

  return (
    <Badge
      variant="outline"
      className={`${getColorClass()} ${className || ''}`}
    >
      {score.toFixed(1)} / {maxScore}
    </Badge>
  )
}

export default ScoreBadge


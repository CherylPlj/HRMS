'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Users, BookOpen, FileText } from 'lucide-react'

interface PerformanceSummaryCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
}

const PerformanceSummaryCard: React.FC<PerformanceSummaryCardProps> = ({
  title,
  value,
  icon,
  description,
  trend,
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-center">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1 text-center">{description}</p>
        )}
        {trend && (
          <div className="flex items-center justify-center mt-2 text-xs">
            <TrendingUp
              className={`h-3 w-3 mr-1 ${
                trend.isPositive ? 'text-green-500' : 'text-red-500'
              }`}
            />
            <span
              className={
                trend.isPositive ? 'text-green-500' : 'text-red-500'
              }
            >
              {trend.isPositive ? '+' : ''}
              {trend.value}% from last quarter
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default PerformanceSummaryCard


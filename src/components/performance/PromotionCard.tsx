'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TrendingUp } from 'lucide-react'
import { PromotionRecommendation } from '@/types/performance'
import ScoreBadge from './ScoreBadge'

interface PromotionCardProps {
  promotion: PromotionRecommendation
  onApprove?: (promotion: PromotionRecommendation) => void
}

const PromotionCard: React.FC<PromotionCardProps> = ({
  promotion,
  onApprove,
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{promotion.employeeName}</CardTitle>
          <ScoreBadge score={promotion.performanceScore} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Department</p>
            <p className="font-medium">{promotion.department}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Current Position</p>
              <p className="font-medium">{promotion.currentPosition}</p>
              <Badge variant="outline" className="mt-1">
                {promotion.currentSalaryGrade}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Proposed Position</p>
              <p className="font-medium">{promotion.proposedPosition}</p>
              <Badge className="mt-1 bg-green-500 text-white">
                {promotion.proposedSalaryGrade}
              </Badge>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Promotion Reason</p>
            <p className="text-sm">{promotion.promotionReason}</p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm text-muted-foreground">
              <p>Years in Position: {promotion.yearsInPosition}</p>
              <p>Performance Score: {promotion.performanceScore.toFixed(1)}</p>
            </div>
            {onApprove && (
              <Button
                onClick={() => onApprove(promotion)}
                className="bg-green-600 hover:bg-green-700"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Approve Promotion
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default PromotionCard


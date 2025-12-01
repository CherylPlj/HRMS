'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TrendingUp } from 'lucide-react'
import Pagination from '@/components/disciplinary/Pagination'
import { mockPromotionRecommendations } from '@/components/performance/mockData'
import ScoreBadge from '@/components/performance/ScoreBadge'

export default function PromotionRecommendationsPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const handleApprovePromotion = (promotion: any) => {
    console.log('Approve promotion clicked (static):', promotion)
    // In a real app, this would trigger an approval workflow
  }

  // Calculate pagination
  const totalPages = Math.ceil(mockPromotionRecommendations.length / itemsPerPage)
  const paginatedPromotionRecommendations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return mockPromotionRecommendations.slice(startIndex, endIndex)
  }, [currentPage, itemsPerPage])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // Reset to first page when changing items per page
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* <div className="mb-8">
        <h1 className="text-3xl font-bold">Promotion Recommendations</h1>
        <p className="text-muted-foreground mt-2">
          Employees recommended for promotion based on performance
        </p>
      </div> */}

      <Card>
        <CardHeader>
          <CardTitle>Promotion Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Current Position</TableHead>
                  <TableHead>Current Grade</TableHead>
                  <TableHead>Proposed Position</TableHead>
                  <TableHead>Proposed Grade</TableHead>
                  <TableHead>Performance Score</TableHead>
                  <TableHead>Years in Position</TableHead>
                  <TableHead>Promotion Reason</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPromotionRecommendations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground">
                      No promotion recommendations found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPromotionRecommendations.map((promotion) => (
                    <TableRow key={promotion.id}>
                      <TableCell className="font-medium">
                        {promotion.employeeName}
                      </TableCell>
                      <TableCell>{promotion.department}</TableCell>
                      <TableCell>{promotion.currentPosition}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {promotion.currentSalaryGrade}
                        </Badge>
                      </TableCell>
                      <TableCell>{promotion.proposedPosition}</TableCell>
                      <TableCell>
                        <Badge className="bg-green-500 text-white">
                          {promotion.proposedSalaryGrade}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ScoreBadge score={promotion.performanceScore} />
                      </TableCell>
                      <TableCell>{promotion.yearsInPosition} years</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {promotion.promotionReason}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => handleApprovePromotion(promotion)}
                          className="bg-green-600 hover:bg-green-700"
                          size="sm"
                        >
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Approve Promotion
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {mockPromotionRecommendations.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={mockPromotionRecommendations.length}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}
    </div>
  )
}


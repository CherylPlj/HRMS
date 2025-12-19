'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
import { Eye } from 'lucide-react'
import Pagination from '@/components/disciplinary/Pagination'
import { mockTrainingRecommendations } from '@/components/performance/mockData'
import TrainingDetailsModal from '@/components/performance/TrainingDetailsModal'
import { TrainingRecommendation } from '@/types/performance'

export default function TrainingRecommendationsPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [selectedTraining, setSelectedTraining] = useState<TrainingRecommendation | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleViewDetails = (training: TrainingRecommendation) => {
    setSelectedTraining(training)
    setIsModalOpen(true)
  }

  // Calculate pagination
  const totalPages = Math.ceil(mockTrainingRecommendations.length / itemsPerPage)
  const paginatedTrainingRecommendations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return mockTrainingRecommendations.slice(startIndex, endIndex)
  }, [currentPage, itemsPerPage])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // Reset to first page when changing items per page
  }

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
    <div className="container mx-auto px-4 py-8">
      {/* <div className="mb-8">
        <h1 className="text-3xl font-bold">Training Recommendations</h1>
        <p className="text-muted-foreground mt-2">
          Employees recommended for training and skill development
        </p>
      </div> */}

      <Card>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Recommended Training</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTrainingRecommendations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No training recommendations found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTrainingRecommendations.map((training) => (
                    <TableRow key={training.id}>
                      <TableCell className="font-medium">
                        {training.employeeName}
                      </TableCell>
                      <TableCell>{training.department}</TableCell>
                      <TableCell>{training.position}</TableCell>
                      <TableCell>{training.recommendedTraining}</TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(training.priority)}>
                          {training.priority.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {training.reason}
                      </TableCell>
                      <TableCell>{training.estimatedDuration}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(training)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
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
      {mockTrainingRecommendations.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={mockTrainingRecommendations.length}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}

      <TrainingDetailsModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        training={selectedTraining}
      />
    </div>
  )
}


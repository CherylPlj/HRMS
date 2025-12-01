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
import PerformanceSummaryCard from '@/components/performance/PerformanceSummaryCard'
import ScoreBadge from '@/components/performance/ScoreBadge'
import ReviewTable from '@/components/performance/ReviewTable'
import ReviewViewModal from '@/components/performance/ReviewViewModal'
import ReviewFormModal, { ReviewFormData } from '@/components/performance/ReviewFormModal'
import KPIManagement from '@/components/performance/KPIManagement'
import KPIFormModal, { KPIFormData } from '@/components/performance/KPIFormModal'
import Pagination from '@/components/disciplinary/Pagination'
import { TrendingUp, Users, BookOpen, FileText, ClipboardList, GraduationCap, TrendingUp as TrendingUpIcon, Plus, Eye, Target } from 'lucide-react'
import {
  mockPerformanceSummary,
  mockTopPerformers,
  mockEmployeesNeedingImprovement,
  mockPerformanceReviews,
  mockTrainingRecommendations,
  mockPromotionRecommendations,
  mockEmployees,
  mockReviewers,
  mockKPIs,
} from '@/components/performance/mockData'
import { PerformanceReview, KPI } from '@/types/performance'

export default function PerformanceDashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [reviews, setReviews] = useState<PerformanceReview[]>(mockPerformanceReviews)
  const [kpis, setKPIs] = useState<KPI[]>(mockKPIs)
  
  // Pagination states for Reviews tab
  const [reviewsCurrentPage, setReviewsCurrentPage] = useState(1)
  const [reviewsItemsPerPage, setReviewsItemsPerPage] = useState(10)
  
  // Pagination states for Training tab
  const [trainingCurrentPage, setTrainingCurrentPage] = useState(1)
  const [trainingItemsPerPage, setTrainingItemsPerPage] = useState(10)
  
  // Pagination states for Promotions tab
  const [promotionsCurrentPage, setPromotionsCurrentPage] = useState(1)
  const [promotionsItemsPerPage, setPromotionsItemsPerPage] = useState(10)
  
  // Pagination states for KPIs tab
  const [kpisCurrentPage, setKpisCurrentPage] = useState(1)
  const [kpisItemsPerPage, setKpisItemsPerPage] = useState(10)
  
  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  
  // KPI Modal states
  const [kpiFormModalOpen, setKpiFormModalOpen] = useState(false)
  const [selectedKPI, setSelectedKPI] = useState<KPI | null>(null)
  const [isKPIEditMode, setIsKPIEditMode] = useState(false)

  const tabs = [
    {
      id: 'dashboard',
      label: 'Dashboard',
    },
    {
      id: 'reviews',
      label: 'Reviews',
    },
    {
      id: 'training',
      label: 'Training',
    },
    {
      id: 'promotions',
      label: 'Promotions',
    },
    {
      id: 'kpis',
      label: 'KPIs/Metrics',
    },
  ]

  const handleViewReview = (review: PerformanceReview) => {
    setSelectedReview(review)
    setViewModalOpen(true)
  }

  const handleEditReview = (review: PerformanceReview) => {
    setSelectedReview(review)
    setIsEditMode(true)
    setFormModalOpen(true)
  }

  const handleAddReview = () => {
    setSelectedReview(null)
    setIsEditMode(false)
    setFormModalOpen(true)
  }

  const handleSubmitReview = (data: ReviewFormData) => {
    console.log('Review submitted (static):', data)
    // In a real app, this would save to the backend
    // For now, just update the local state if editing
    if (isEditMode && selectedReview) {
      const updatedReviews = reviews.map((r) =>
        r.id === selectedReview.id
          ? {
              ...r,
              ...data,
              employeeName: mockEmployees.find((e) => e.id === data.employeeId)?.name || r.employeeName,
              reviewerName: mockReviewers.find((e) => e.id === data.reviewerId)?.name || r.reviewerName,
            }
          : r
      )
      setReviews(updatedReviews)
    } else {
      // Add new review
      const newReview: PerformanceReview = {
        id: `REV${Date.now()}`,
        employeeId: data.employeeId,
        employeeName: mockEmployees.find((e) => e.id === data.employeeId)?.name || '',
        reviewerId: data.reviewerId,
        reviewerName: mockReviewers.find((e) => e.id === data.reviewerId)?.name || '',
        period: `Q${Math.floor(new Date(data.startDate).getMonth() / 3) + 1} ${new Date(data.startDate).getFullYear()}`,
        startDate: data.startDate,
        endDate: data.endDate,
        kpiScore: data.kpiScore,
        behaviorScore: data.behaviorScore,
        attendanceScore: data.attendanceScore,
        totalScore: data.totalScore,
        status: 'draft',
        remarks: data.remarks,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setReviews([...reviews, newReview])
    }
  }

  const handleAddKPI = () => {
    setSelectedKPI(null)
    setIsKPIEditMode(false)
    setKpiFormModalOpen(true)
  }

  const handleEditKPI = (kpi: KPI) => {
    setSelectedKPI(kpi)
    setIsKPIEditMode(true)
    setKpiFormModalOpen(true)
  }

  const handleDeleteKPI = (kpiId: string) => {
    if (confirm('Are you sure you want to delete this KPI/metric? This action cannot be undone.')) {
      setKPIs(kpis.filter((k) => k.id !== kpiId))
    }
  }

  const handleSubmitKPI = (data: KPIFormData) => {
    console.log('KPI submitted (static):', data)
    if (isKPIEditMode && selectedKPI) {
      const updatedKPIs = kpis.map((k) =>
        k.id === selectedKPI.id
          ? {
              ...k,
              ...data,
              updatedAt: new Date().toISOString(),
            }
          : k
      )
      setKPIs(updatedKPIs)
    } else {
      const newKPI: KPI = {
        id: `KPI${Date.now()}`,
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setKPIs([...kpis, newKPI])
    }
  }

  const handleViewTrainingDetails = (training: any) => {
    console.log('View details clicked (static):', training)
  }

  const handleApprovePromotion = (promotion: any) => {
    console.log('Approve promotion clicked (static):', promotion)
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

  // Pagination calculations for Reviews tab
  const reviewsTotalPages = Math.ceil(reviews.length / reviewsItemsPerPage)
  const paginatedReviews = useMemo(() => {
    const startIndex = (reviewsCurrentPage - 1) * reviewsItemsPerPage
    const endIndex = startIndex + reviewsItemsPerPage
    return reviews.slice(startIndex, endIndex)
  }, [reviews, reviewsCurrentPage, reviewsItemsPerPage])

  // Pagination calculations for Training tab
  const trainingTotalPages = Math.ceil(mockTrainingRecommendations.length / trainingItemsPerPage)
  const paginatedTrainingRecommendations = useMemo(() => {
    const startIndex = (trainingCurrentPage - 1) * trainingItemsPerPage
    const endIndex = startIndex + trainingItemsPerPage
    return mockTrainingRecommendations.slice(startIndex, endIndex)
  }, [trainingCurrentPage, trainingItemsPerPage])

  // Pagination calculations for Promotions tab
  const promotionsTotalPages = Math.ceil(mockPromotionRecommendations.length / promotionsItemsPerPage)
  const paginatedPromotionRecommendations = useMemo(() => {
    const startIndex = (promotionsCurrentPage - 1) * promotionsItemsPerPage
    const endIndex = startIndex + promotionsItemsPerPage
    return mockPromotionRecommendations.slice(startIndex, endIndex)
  }, [promotionsCurrentPage, promotionsItemsPerPage])

  // Pagination calculations for KPIs tab
  const kpisTotalPages = Math.ceil(kpis.length / kpisItemsPerPage)
  const paginatedKPIs = useMemo(() => {
    const startIndex = (kpisCurrentPage - 1) * kpisItemsPerPage
    const endIndex = startIndex + kpisItemsPerPage
    return kpis.slice(startIndex, endIndex)
  }, [kpis, kpisCurrentPage, kpisItemsPerPage])

  return (
    <div className="container mx-auto px-4 py-8">
      {/* <div className="mb-8">
        <h1 className="text-3xl font-bold">Performance Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of employee performance metrics and insights
        </p>
      </div> */}

      {/* Sub Navigation Tabs */}
      <div className="mb-8 border-b">
        <nav className="flex space-x-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-4 flex items-center gap-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-[#800000] text-[#800000] font-semibold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.id === 'reviews' && <ClipboardList className="w-4 h-4" />}
              {tab.id === 'training' && <GraduationCap className="w-4 h-4" />}
              {tab.id === 'promotions' && <TrendingUpIcon className="w-4 h-4" />}
              {tab.id === 'kpis' && <Target className="w-4 h-4" />}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <>
          {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <PerformanceSummaryCard
          title="Average KPI Score"
          value={mockPerformanceSummary.averageKpiScore.toFixed(1)}
          icon={<TrendingUp className="h-4 w-4" />}
          description="Across all employees"
          trend={{ value: 5.2, isPositive: true }}
        />
        <PerformanceSummaryCard
          title="Employees Up for Promotion"
          value={mockPerformanceSummary.employeesUpForPromotion}
          icon={<Users className="h-4 w-4" />}
          description="Ready for advancement"
        />
        <PerformanceSummaryCard
          title="Employees Needing Training"
          value={mockPerformanceSummary.employeesNeedingTraining}
          icon={<BookOpen className="h-4 w-4" />}
          description="Require skill development"
        />
        <PerformanceSummaryCard
          title="Total Reviews This Quarter"
          value={mockPerformanceSummary.totalReviewsThisQuarter}
          icon={<FileText className="h-4 w-4" />}
          description="Q1 2024"
        />
      </div>

      {/* Top Performers Table */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>KPI Score</TableHead>
                    <TableHead>Behavior Score</TableHead>
                    <TableHead>Attendance Score</TableHead>
                    <TableHead>Total Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockTopPerformers.map((performer) => (
                    <TableRow key={performer.id}>
                      <TableCell className="font-medium">
                        {performer.employeeName}
                      </TableCell>
                      <TableCell>{performer.department}</TableCell>
                      <TableCell>{performer.position}</TableCell>
                      <TableCell>
                        <ScoreBadge score={performer.kpiScore} />
                      </TableCell>
                      <TableCell>
                        <ScoreBadge score={performer.behaviorScore} />
                      </TableCell>
                      <TableCell>
                        <ScoreBadge score={performer.attendanceScore} />
                      </TableCell>
                      <TableCell>
                        <ScoreBadge score={performer.totalScore} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employees Needing Improvement Table */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Employees Needing Improvement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>KPI Score</TableHead>
                    <TableHead>Behavior Score</TableHead>
                    <TableHead>Attendance Score</TableHead>
                    <TableHead>Total Score</TableHead>
                    <TableHead>Improvement Areas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockEmployeesNeedingImprovement.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        {employee.employeeName}
                      </TableCell>
                      <TableCell>{employee.department}</TableCell>
                      <TableCell>{employee.position}</TableCell>
                      <TableCell>
                        <ScoreBadge score={employee.kpiScore} />
                      </TableCell>
                      <TableCell>
                        <ScoreBadge score={employee.behaviorScore} />
                      </TableCell>
                      <TableCell>
                        <ScoreBadge score={employee.attendanceScore} />
                      </TableCell>
                      <TableCell>
                        <ScoreBadge score={employee.totalScore} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {employee.improvementAreas.map((area, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded"
                            >
                              {area}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
        </>
      )}

      {activeTab === 'reviews' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold">Performance Reviews</h2>
              {/* <p className="text-muted-foreground mt-1">
                Manage and view all performance reviews
              </p> */}
            </div>
            <Button onClick={handleAddReview}>
              <Plus className="h-4 w-4 mr-2" />
              New Review
            </Button>
          </div>
          <ReviewTable reviews={paginatedReviews} onView={handleViewReview} onEdit={handleEditReview} />
          {reviews.length > 0 && (
            <Pagination
              currentPage={reviewsCurrentPage}
              totalPages={reviewsTotalPages}
              totalItems={reviews.length}
              itemsPerPage={reviewsItemsPerPage}
              onPageChange={(page) => setReviewsCurrentPage(page)}
              onItemsPerPageChange={(newItemsPerPage) => {
                setReviewsItemsPerPage(newItemsPerPage)
                setReviewsCurrentPage(1)
              }}
            />
          )}
        </div>
      )}

      {activeTab === 'training' && (
        <div>
          {/* <div className="mb-6">
            <h2 className="text-2xl font-bold">Training Recommendations</h2>
            <p className="text-muted-foreground mt-1">
              Employees recommended for training and skill development
            </p>
          </div> */}
          <Card>
            <CardHeader>
              <CardTitle>Training Recommendations</CardTitle>
            </CardHeader>
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
                              onClick={() => handleViewTrainingDetails(training)}
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
              currentPage={trainingCurrentPage}
              totalPages={trainingTotalPages}
              totalItems={mockTrainingRecommendations.length}
              itemsPerPage={trainingItemsPerPage}
              onPageChange={(page) => setTrainingCurrentPage(page)}
              onItemsPerPageChange={(newItemsPerPage) => {
                setTrainingItemsPerPage(newItemsPerPage)
                setTrainingCurrentPage(1)
              }}
            />
          )}
        </div>
      )}

      {activeTab === 'promotions' && (
        <div>
          {/* <div className="mb-6">
            <h2 className="text-2xl font-bold">Promotion Recommendations</h2>
            <p className="text-muted-foreground mt-1">
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
                              <TrendingUpIcon className="h-4 w-4 mr-2" />
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
              currentPage={promotionsCurrentPage}
              totalPages={promotionsTotalPages}
              totalItems={mockPromotionRecommendations.length}
              itemsPerPage={promotionsItemsPerPage}
              onPageChange={(page) => setPromotionsCurrentPage(page)}
              onItemsPerPageChange={(newItemsPerPage) => {
                setPromotionsItemsPerPage(newItemsPerPage)
                setPromotionsCurrentPage(1)
              }}
            />
          )}
        </div>
      )}

      {activeTab === 'kpis' && (
        <>
          <KPIManagement
            kpis={paginatedKPIs}
            onAdd={handleAddKPI}
            onEdit={handleEditKPI}
            onDelete={handleDeleteKPI}
          />
          {kpis.length > 0 && (
            <Pagination
              currentPage={kpisCurrentPage}
              totalPages={kpisTotalPages}
              totalItems={kpis.length}
              itemsPerPage={kpisItemsPerPage}
              onPageChange={(page) => setKpisCurrentPage(page)}
              onItemsPerPageChange={(newItemsPerPage) => {
                setKpisItemsPerPage(newItemsPerPage)
                setKpisCurrentPage(1)
              }}
            />
          )}
        </>
      )}

      {/* Modals */}
      <ReviewViewModal
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
        review={selectedReview}
      />

      <ReviewFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        onSubmit={handleSubmitReview}
        employees={mockEmployees}
        reviewers={mockReviewers}
        review={isEditMode ? selectedReview : null}
      />

      <KPIFormModal
        open={kpiFormModalOpen}
        onOpenChange={setKpiFormModalOpen}
        onSubmit={handleSubmitKPI}
        kpi={isKPIEditMode ? selectedKPI : null}
      />
    </div>
  )
}


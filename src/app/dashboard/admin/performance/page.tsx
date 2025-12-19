'use client'

import React, { useState, useMemo, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'react-hot-toast'
import PerformanceSummaryCard from '@/components/performance/PerformanceSummaryCard'
import ScoreBadge from '@/components/performance/ScoreBadge'
import ReviewTable from '@/components/performance/ReviewTable'
import ReviewViewModal from '@/components/performance/ReviewViewModal'
import ReviewFormModal, { ReviewFormData } from '@/components/performance/ReviewFormModal'
import KPIManagement from '@/components/performance/KPIManagement'
import KPIFormModal, { KPIFormData } from '@/components/performance/KPIFormModal'
import TrainingDetailsModal from '@/components/performance/TrainingDetailsModal'
import Pagination from '@/components/disciplinary/Pagination'
import { TrendingUp, Users, BookOpen, FileText, ClipboardList, GraduationCap, TrendingUp as TrendingUpIcon, Plus, Eye, Target, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import {
  mockEmployees,
  mockReviewers,
} from '@/components/performance/mockData'
import { PerformanceReview, KPI, Employee, TrainingRecommendation, PromotionRecommendation } from '@/types/performance'
import {
  fetchPerformanceReviews,
  fetchKPIs,
  fetchDashboardSummary,
  createPerformanceReview,
  updatePerformanceReview,
  createKPI,
  updateKPI,
  deleteKPI,
  transformPerformanceReview,
  transformKPI,
} from '@/lib/performanceApi'

function PerformanceDashboardPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get initial tab from URL query parameter, default to 'dashboard'
  const urlTab = searchParams.get('view')
  const validTabs = ['dashboard', 'reviews', 'training', 'promotions', 'kpis']
  const initialTab = urlTab && validTabs.includes(urlTab) ? urlTab : 'dashboard'
  const [activeTab, setActiveTab] = useState(initialTab)
  
  // Set initial URL if no view parameter exists
  useEffect(() => {
    const currentView = searchParams.get('view')
    if (!currentView) {
      router.replace(`/dashboard/admin/performance?view=dashboard`, { scroll: false })
    }
  }, [router, searchParams])
  
  // Sync activeTab with URL parameter changes (e.g., back button)
  useEffect(() => {
    const currentView = searchParams.get('view')
    if (currentView && validTabs.includes(currentView)) {
      setActiveTab(currentView)
    } else if (!currentView) {
      setActiveTab('dashboard')
    }
  }, [searchParams])
  
  // Handler to change tab and update URL
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    router.push(`/dashboard/admin/performance?view=${tabId}`, { scroll: false })
  }
  const [reviews, setReviews] = useState<PerformanceReview[]>([])
  const [kpis, setKPIs] = useState<KPI[]>([])
  const [dashboardSummary, setDashboardSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [kpisLoading, setKpisLoading] = useState(true)
  
  // Pagination states for Reviews tab
  const [reviewsCurrentPage, setReviewsCurrentPage] = useState(1)
  const [reviewsItemsPerPage, setReviewsItemsPerPage] = useState(10)
  
  // Pagination states for Training tab
  const [trainingCurrentPage, setTrainingCurrentPage] = useState(1)
  const [trainingItemsPerPage, setTrainingItemsPerPage] = useState(10)
  const [trainingRecommendations, setTrainingRecommendations] = useState<TrainingRecommendation[]>([])
  const [trainingLoading, setTrainingLoading] = useState(false)
  const [trainingTotalPages, setTrainingTotalPages] = useState(1)
  const [trainingTotalItems, setTrainingTotalItems] = useState(0)
  // Filter states for Training tab
  const [trainingDepartmentFilter, setTrainingDepartmentFilter] = useState<string>('')
  const [trainingPositionFilter, setTrainingPositionFilter] = useState<string>('')
  const [trainingPriorityFilter, setTrainingPriorityFilter] = useState<string>('')
  const [trainingFilterOptions, setTrainingFilterOptions] = useState<{
    departments: string[]
    positions: string[]
  }>({ departments: [], positions: [] })
  
  // Pagination states for Promotions tab
  const [promotionsCurrentPage, setPromotionsCurrentPage] = useState(1)
  const [promotionsItemsPerPage, setPromotionsItemsPerPage] = useState(10)
  const [promotionRecommendations, setPromotionRecommendations] = useState<PromotionRecommendation[]>([])
  const [promotionsLoading, setPromotionsLoading] = useState(false)
  const [promotionsTotalPages, setPromotionsTotalPages] = useState(1)
  const [promotionsTotalItems, setPromotionsTotalItems] = useState(0)
  const [analyzingPromotions, setAnalyzingPromotions] = useState(false)
  const [analysisResultModalOpen, setAnalysisResultModalOpen] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<{
    success: boolean
    message: string
    analyzed?: number
    skippedRecent?: number
    skipped?: number
    recommendations?: number
    errors?: string[]
  } | null>(null)
  
  // Pagination states for KPIs tab
  const [kpisCurrentPage, setKpisCurrentPage] = useState(1)
  const [kpisItemsPerPage, setKpisItemsPerPage] = useState(10)
  const [kpisTotalPages, setKpisTotalPages] = useState(1)
  const [kpisTotalItems, setKpisTotalItems] = useState(0)
  
  // Employee and reviewer lists
  const [employees, setEmployees] = useState<Employee[]>([])
  const [reviewers, setReviewers] = useState<Employee[]>([])
  
  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  
  // KPI Modal states
  const [kpiFormModalOpen, setKpiFormModalOpen] = useState(false)
  const [selectedKPI, setSelectedKPI] = useState<KPI | null>(null)
  const [isKPIEditMode, setIsKPIEditMode] = useState(false)
  const [trainingModalOpen, setTrainingModalOpen] = useState(false)
  const [selectedTraining, setSelectedTraining] = useState<TrainingRecommendation | null>(null)

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

  const handleSubmitReview = async (data: ReviewFormData) => {
    try {
      if (isEditMode && selectedReview) {
        const updated = await updatePerformanceReview(selectedReview.id, {
          ...data,
          period: `Q${Math.floor(new Date(data.startDate).getMonth() / 3) + 1} ${new Date(data.startDate).getFullYear()}`,
          status: data.status || selectedReview.status,
        })
        setReviews(reviews.map((r) => (r.id === selectedReview.id ? updated : r)))
        toast.success('Performance review updated successfully!', {
          duration: 4000,
          icon: '✅',
        })
      } else {
        const newReview = await createPerformanceReview({
          ...data,
          period: `Q${Math.floor(new Date(data.startDate).getMonth() / 3) + 1} ${new Date(data.startDate).getFullYear()}`,
          status: data.status || 'draft',
        })
        setReviews([...reviews, newReview])
        toast.success('Performance review created successfully!', {
          duration: 4000,
          icon: '✅',
        })
      }
      setFormModalOpen(false)
      fetchReviews()
      fetchDashboard()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save review'
      toast.error(errorMessage)
    }
  }

  const handleStatusChange = async (reviewId: string, newStatus: 'draft' | 'pending' | 'completed' | 'approved') => {
    try {
      const updated = await updatePerformanceReview(reviewId, {
        status: newStatus,
      })
      setReviews(reviews.map((r) => (r.id === reviewId ? updated : r)))
      
      const statusMessages = {
        draft: 'Review set to draft',
        pending: 'Review submitted for review',
        completed: 'Review marked as completed',
        approved: 'Review approved',
      }
      
      toast.success(statusMessages[newStatus], {
        duration: 4000,
        icon: '✅',
      })
      fetchReviews()
      fetchDashboard()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update status'
      toast.error(errorMessage)
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

  const handleDeleteKPI = async (kpiId: string) => {
    if (confirm('Are you sure you want to delete this KPI/metric? This action cannot be undone.')) {
      try {
        await deleteKPI(kpiId)
        setKPIs(kpis.filter((k) => k.id !== kpiId))
        toast.success('KPI deleted successfully')
        fetchKPIsData()
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete KPI'
        toast.error(errorMessage)
      }
    }
  }

  const handleSubmitKPI = async (data: KPIFormData) => {
    try {
      if (isKPIEditMode && selectedKPI) {
        const updated = await updateKPI(selectedKPI.id, data)
        setKPIs(kpis.map((k) => (k.id === selectedKPI.id ? updated : k)))
        toast.success('KPI updated successfully')
      } else {
        const newKPI = await createKPI(data)
        setKPIs([...kpis, newKPI])
        toast.success('KPI created successfully')
      }
      setKpiFormModalOpen(false)
      fetchKPIsData()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save KPI'
      toast.error(errorMessage)
    }
  }

  const handleViewTrainingDetails = (training: TrainingRecommendation) => {
    setSelectedTraining(training)
    setTrainingModalOpen(true)
  }

  const handleApprovePromotion = (promotion: any) => {
    console.log('Approve promotion clicked (static):', promotion)
  }

  const handleAnalyzePromotions = async () => {
    try {
      // Show confirmation for large batches
      const confirmMessage = 'This will analyze employees using AI. To avoid exceeding quota, only 50 employees will be analyzed per run, and employees analyzed in the last 7 days will be skipped. Continue?'
      if (!confirm(confirmMessage)) return

      setAnalyzingPromotions(true)
      
      const response = await fetch('/api/performance/analyze-promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxEmployees: 50, // Limit to 50 per request
          skipRecent: true, // Skip recently analyzed
        }),
      })
      const data = await response.json()
      
      if (!response.ok) {
        // Sanitize error message - show user-friendly message instead of technical details
        let errorMessage = data.error || 'Failed to analyze promotions'
        
        // Filter out long technical error messages
        if (errorMessage.length > 200 || 
            errorMessage.includes('Backtrace') || 
            errorMessage.includes('napi_register_module') ||
            errorMessage.includes('at async') ||
            errorMessage.includes('Engine is not yet connected')) {
          // Replace with user-friendly message
          if (errorMessage.includes('Engine is not yet connected') || errorMessage.includes('not yet connected')) {
            errorMessage = 'Database connection error. Please try again.'
          } else {
            errorMessage = 'An error occurred during the analysis. Please try again or contact support if the problem persists.'
          }
        }
        
        throw new Error(errorMessage)
      }
      
      // Set success result
      setAnalysisResult({
        success: true,
        message: data.message || 'Promotion analysis completed successfully',
        analyzed: data.analyzed,
        skippedRecent: data.skippedRecent,
        skipped: data.skipped,
        recommendations: data.recommendations,
        errors: data.errors,
      })
      setAnalysisResultModalOpen(true)
      
      // Reset to first page and refresh promotion recommendations
      // Always refresh, even if not on promotions tab (user might switch to it)
      setPromotionsCurrentPage(1)
      // Force refresh by calling fetch directly with page 1
      try {
        setPromotionsLoading(true)
        const fetchResponse = await fetch(
          `/api/performance/promotion-recommendations?page=1&limit=${promotionsItemsPerPage}`
        )
        if (!fetchResponse.ok) throw new Error('Failed to fetch promotion recommendations')
        const fetchData = await fetchResponse.json()
        setPromotionRecommendations(fetchData.recommendations || [])
        setPromotionsTotalPages(fetchData.pagination?.totalPages || 1)
        setPromotionsTotalItems(fetchData.pagination?.total || 0)
      } catch (error) {
        console.error('Error fetching promotion recommendations:', error)
        // Don't show error toast here as the analysis succeeded
        // Just log it - user can manually refresh if needed
      } finally {
        setPromotionsLoading(false)
      }
    } catch (error) {
      // Set error result with sanitized message
      let errorMessage = 'Failed to analyze promotions'
      
      if (error instanceof Error) {
        errorMessage = error.message
        
        // Additional sanitization for any remaining technical details
        if (errorMessage.length > 200 || 
            errorMessage.includes('Backtrace') || 
            errorMessage.includes('napi_register_module') ||
            errorMessage.includes('at async') ||
            errorMessage.includes('Engine is not yet connected')) {
          if (errorMessage.includes('Engine is not yet connected') || errorMessage.includes('not yet connected')) {
            errorMessage = 'Database connection error. Please try again.'
          } else {
            errorMessage = 'An error occurred during the analysis. Please try again or contact support if the problem persists.'
          }
        }
      }
      
      setAnalysisResult({
        success: false,
        message: errorMessage,
      })
      setAnalysisResultModalOpen(true)
    } finally {
      setAnalyzingPromotions(false)
    }
  }

  const handleAnalyzeTraining = async () => {
    try {
      // Show confirmation for large batches
      const confirmMessage = 'This will analyze employees using AI. To avoid exceeding quota, only 50 employees will be analyzed per run, and employees analyzed in the last 7 days will be skipped. Continue?'
      if (!confirm(confirmMessage)) return

      toast.loading('Starting training analysis... This may take several minutes.', { id: 'analyze-training' })
      
      const response = await fetch('/api/performance/analyze-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxEmployees: 50, // Limit to 50 per request
          skipRecent: true, // Skip recently analyzed
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to analyze')
      
      toast.success(data.message || 'Training analysis completed', { id: 'analyze-training' })
      // Refresh training recommendations
      if (activeTab === 'training') {
        fetchTrainingRecommendations()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to analyze training needs', { id: 'analyze-training' })
    }
  }

  const fetchReviews = useCallback(async () => {
    try {
      const response = await fetchPerformanceReviews({
        page: reviewsCurrentPage,
        limit: reviewsItemsPerPage,
      })
      const transformedReviews = response.reviews.map(transformPerformanceReview)
      setReviews(transformedReviews)
    } catch (error) {
      console.error('Error fetching reviews:', error)
      toast.error('Failed to fetch reviews')
    }
  }, [reviewsCurrentPage, reviewsItemsPerPage])

  const fetchKPIsData = useCallback(async () => {
    try {
      setKpisLoading(true)
      const response = await fetchKPIs({
        page: kpisCurrentPage,
        limit: kpisItemsPerPage,
      })
      const transformedKPIs = response.kpis.map(transformKPI)
      setKPIs(transformedKPIs)
      setKpisTotalPages(response.pagination.totalPages)
      setKpisTotalItems(response.pagination.total)
    } catch (error) {
      console.error('Error fetching KPIs:', error)
      toast.error('Failed to fetch KPIs')
    } finally {
      setKpisLoading(false)
    }
  }, [kpisCurrentPage, kpisItemsPerPage])

  const fetchDashboard = useCallback(async () => {
    try {
      const summary = await fetchDashboardSummary()
      setDashboardSummary(summary)
    } catch (error) {
      console.error('Error fetching dashboard summary:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await fetch('/api/employees?all=true')
      if (!response.ok) throw new Error('Failed to fetch employees')
      const data = await response.json()
      
      const employeesList = (data.employees || data).map((emp: any) => ({
        id: emp.EmployeeID,
        name: `${emp.FirstName} ${emp.MiddleName || ''} ${emp.LastName}`.trim(),
        department: emp.Department?.DepartmentName || '',
        position: emp.EmploymentDetail?.[0]?.Position || '',
        email: emp.ContactInfo?.[0]?.Email || '',
      }))
      
      setEmployees(employeesList)
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast.error('Failed to load employees')
    }
  }, [])

  const fetchReviewers = useCallback(async () => {
    try {
      // Fetch employees from Admin department (same as disciplinary module)
      const employeesResponse = await fetch('/api/employees?all=true')
      if (!employeesResponse.ok) throw new Error('Failed to fetch employees')
      const employeesData = await employeesResponse.json()
      
      // Filter employees from Admin department
      const reviewersList = (employeesData.employees || employeesData)
        .filter((emp: any) => emp.Department?.DepartmentName === 'Admin')
        .map((emp: any) => ({
          id: emp.EmployeeID, // Use EmployeeID - backend will convert to UserID
          name: `${emp.FirstName} ${emp.MiddleName || ''} ${emp.LastName}`.trim(),
          department: emp.Department?.DepartmentName || '',
          position: emp.EmploymentDetail?.[0]?.Position || '',
          email: emp.ContactInfo?.[0]?.Email || '',
        }))
      
      setReviewers(reviewersList)
    } catch (error) {
      console.error('Error fetching reviewers:', error)
      toast.error('Failed to load reviewers')
    }
  }, [])

  const fetchTrainingRecommendations = useCallback(async () => {
    try {
      setTrainingLoading(true)
      const params = new URLSearchParams({
        page: trainingCurrentPage.toString(),
        limit: trainingItemsPerPage.toString(),
      })
      if (trainingDepartmentFilter) params.append('department', trainingDepartmentFilter)
      if (trainingPositionFilter) params.append('position', trainingPositionFilter)
      if (trainingPriorityFilter) params.append('priority', trainingPriorityFilter)
      
      const response = await fetch(
        `/api/performance/training-recommendations?${params.toString()}`
      )
      if (!response.ok) throw new Error('Failed to fetch training recommendations')
      const data = await response.json()
      setTrainingRecommendations(data.recommendations)
      setTrainingTotalPages(data.pagination.totalPages)
      setTrainingTotalItems(data.pagination.total)
      if (data.filters) {
        setTrainingFilterOptions(data.filters)
      }
    } catch (error) {
      console.error('Error fetching training recommendations:', error)
      toast.error('Failed to load training recommendations')
    } finally {
      setTrainingLoading(false)
    }
  }, [trainingCurrentPage, trainingItemsPerPage, trainingDepartmentFilter, trainingPositionFilter, trainingPriorityFilter])

  const fetchPromotionRecommendations = useCallback(async () => {
    try {
      setPromotionsLoading(true)
      const response = await fetch(
        `/api/performance/promotion-recommendations?page=${promotionsCurrentPage}&limit=${promotionsItemsPerPage}`
      )
      if (!response.ok) throw new Error('Failed to fetch promotion recommendations')
      const data = await response.json()
      setPromotionRecommendations(data.recommendations)
      setPromotionsTotalPages(data.pagination.totalPages)
      setPromotionsTotalItems(data.pagination.total)
    } catch (error) {
      console.error('Error fetching promotion recommendations:', error)
      toast.error('Failed to load promotion recommendations')
    } finally {
      setPromotionsLoading(false)
    }
  }, [promotionsCurrentPage, promotionsItemsPerPage])

  useEffect(() => {
    fetchDashboard()
    fetchReviews()
    fetchKPIsData()
    fetchEmployees()
    fetchReviewers()
  }, [fetchDashboard, fetchReviews, fetchKPIsData, fetchEmployees, fetchReviewers])

  useEffect(() => {
    if (activeTab === 'training') {
      fetchTrainingRecommendations()
    }
  }, [activeTab, fetchTrainingRecommendations])

  useEffect(() => {
    if (activeTab === 'promotions') {
      fetchPromotionRecommendations()
    }
  }, [activeTab, fetchPromotionRecommendations])

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

  // Training recommendations - already paginated by API
  const paginatedTrainingRecommendations = trainingRecommendations

  // Promotion recommendations - already paginated by API
  const paginatedPromotionRecommendations = promotionRecommendations

  // Pagination calculations for KPIs tab - using API pagination
  const paginatedKPIs = kpis // API already handles pagination

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
              onClick={() => handleTabChange(tab.id)}
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
          value={loading ? '...' : (dashboardSummary?.averageKpiScore?.toFixed(1) || '0.0')}
          icon={<TrendingUp className="h-4 w-4" />}
          description="Across all employees"
        />
        <PerformanceSummaryCard
          title="Employees Up for Promotion"
          value={loading ? '...' : (dashboardSummary?.employeesUpForPromotion || 0)}
          icon={<Users className="h-4 w-4" />}
          description="Ready for advancement"
        />
        <PerformanceSummaryCard
          title="Employees Needing Training"
          value={loading ? '...' : (dashboardSummary?.employeesNeedingTraining || 0)}
          icon={<BookOpen className="h-4 w-4" />}
          description="Require skill development"
        />
        <PerformanceSummaryCard
          title="Total Reviews"
          value={loading ? '...' : (dashboardSummary?.totalReviews || 0)}
          icon={<FileText className="h-4 w-4" />}
          description="All time"
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
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : dashboardSummary?.topPerformers?.length > 0 ? (
                    dashboardSummary.topPerformers.map((performer: any) => (
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
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No top performers found
                      </TableCell>
                    </TableRow>
                  )}
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
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : dashboardSummary?.employeesNeedingImprovement?.length > 0 ? (
                    dashboardSummary.employeesNeedingImprovement.map((employee: any) => (
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
                          {Array.isArray(employee.improvementAreas) && employee.improvementAreas.map((area: string, idx: number) => (
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
                  ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No employees needing improvement found
                      </TableCell>
                    </TableRow>
                  )}
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
          <ReviewTable 
            reviews={paginatedReviews} 
            onView={handleViewReview} 
            onEdit={handleEditReview}
            onStatusChange={handleStatusChange}
          />
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
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Training Recommendations</h2>
              <p className="text-muted-foreground mt-1">
                AI-powered training recommendations based on skill gaps and performance
              </p>
            </div>
            <Button onClick={handleAnalyzeTraining} variant="outline">
              <GraduationCap className="h-4 w-4 mr-2" />
              Run AI Analysis
            </Button>
          </div>
          
          {/* Filters */}
          <div className="mb-4 flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Department</label>
              <Select
                value={trainingDepartmentFilter}
                onChange={(e) => {
                  setTrainingDepartmentFilter(e.target.value)
                  setTrainingCurrentPage(1)
                }}
              >
                <option value="">All Departments</option>
                {trainingFilterOptions.departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Position</label>
              <Select
                value={trainingPositionFilter}
                onChange={(e) => {
                  setTrainingPositionFilter(e.target.value)
                  setTrainingCurrentPage(1)
                }}
              >
                <option value="">All Positions</option>
                {trainingFilterOptions.positions.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Priority</label>
              <Select
                value={trainingPriorityFilter}
                onChange={(e) => {
                  setTrainingPriorityFilter(e.target.value)
                  setTrainingCurrentPage(1)
                }}
              >
                <option value="">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
            </div>
            {(trainingDepartmentFilter || trainingPositionFilter || trainingPriorityFilter) && (
              <Button
                variant="outline"
                onClick={() => {
                  setTrainingDepartmentFilter('')
                  setTrainingPositionFilter('')
                  setTrainingPriorityFilter('')
                  setTrainingCurrentPage(1)
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
          
          <Card>
            <CardContent className="pt-6">
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
                    {trainingLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          Loading training recommendations...
                        </TableCell>
                      </TableRow>
                    ) : paginatedTrainingRecommendations.length === 0 ? (
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
          {trainingTotalItems > 0 && (
            <Pagination
              currentPage={trainingCurrentPage}
              totalPages={trainingTotalPages}
              totalItems={trainingTotalItems}
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
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Promotion Recommendations</h2>
              <p className="text-muted-foreground mt-1">
                AI-powered promotion recommendations based on performance and years in service
              </p>
            </div>
            <Button 
              onClick={handleAnalyzePromotions} 
              variant="outline"
              disabled={analyzingPromotions}
            >
              {analyzingPromotions ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <TrendingUpIcon className="h-4 w-4 mr-2" />
                  Run AI Analysis
                </>
              )}
            </Button>
          </div>
          <Card>
            <CardContent className="pt-6">
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
                    {promotionsLoading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground">
                          Loading promotion recommendations...
                        </TableCell>
                      </TableRow>
                    ) : paginatedPromotionRecommendations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground">
                          No promotion recommendations yet
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
          {promotionsTotalItems > 0 && (
            <Pagination
              currentPage={promotionsCurrentPage}
              totalPages={promotionsTotalPages}
              totalItems={promotionsTotalItems}
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
          {kpisTotalItems > 0 && (
            <Pagination
              currentPage={kpisCurrentPage}
              totalPages={kpisTotalPages}
              totalItems={kpisTotalItems}
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
        allReviews={reviews}
        userRole="admin"
        onStatusChange={handleStatusChange}
      />

      <ReviewFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        onSubmit={handleSubmitReview}
        employees={employees}
        reviewers={reviewers}
        review={isEditMode ? selectedReview : null}
      />

      <KPIFormModal
        open={kpiFormModalOpen}
        onOpenChange={setKpiFormModalOpen}
        onSubmit={handleSubmitKPI}
        kpi={isKPIEditMode ? selectedKPI : null}
      />

      <TrainingDetailsModal
        open={trainingModalOpen}
        onOpenChange={setTrainingModalOpen}
        training={selectedTraining}
      />

      {/* Promotion Analysis Result Modal */}
      <Dialog open={analysisResultModalOpen} onOpenChange={setAnalysisResultModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {analysisResult?.success ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Analysis Complete
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  Analysis Failed
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {analysisResult?.success 
                ? 'The promotion analysis has completed successfully.'
                : 'An error occurred during the promotion analysis.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm font-medium mb-2">Message:</p>
              <p className="text-sm">{analysisResult?.message}</p>
            </div>

            {analysisResult?.success && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border">
                    <p className="text-xs text-muted-foreground mb-1">Employees Analyzed</p>
                    <p className="text-2xl font-bold">{analysisResult.analyzed || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <p className="text-xs text-muted-foreground mb-1">Recommendations Found</p>
                    <p className="text-2xl font-bold text-green-600">{analysisResult.recommendations || 0}</p>
                  </div>
                </div>
                
                {(analysisResult.skippedRecent || analysisResult.skipped) && (
                  <div className="p-3 rounded-lg border border-yellow-200 bg-yellow-50">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-yellow-800 mb-1">Skipped Employees</p>
                        <div className="text-xs text-yellow-700 space-y-1">
                          {analysisResult.skippedRecent && (
                            <p>• {analysisResult.skippedRecent} employees skipped (analyzed in last 7 days)</p>
                          )}
                          {analysisResult.skipped && (
                            <p>• {analysisResult.skipped} employees not processed (limit reached)</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {analysisResult.errors && analysisResult.errors.length > 0 && (
                  <div className="p-3 rounded-lg border border-red-200 bg-red-50">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-red-800 mb-2">Errors Encountered</p>
                        <div className="text-xs text-red-700 space-y-1 max-h-32 overflow-y-auto">
                          {analysisResult.errors.slice(0, 5).map((error, idx) => (
                            <p key={idx}>• {error}</p>
                          ))}
                          {analysisResult.errors.length > 5 && (
                            <p className="text-muted-foreground italic">
                              ... and {analysisResult.errors.length - 5} more errors
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!analysisResult?.success && (
              <div className="p-4 rounded-lg border border-red-200 bg-red-50">
                <p className="text-sm text-red-800">
                  Please try again. If the problem persists, contact support.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setAnalysisResultModalOpen(false)}
            >
              Close
            </Button>
            {analysisResult?.success && (
              <Button
                onClick={() => {
                  setAnalysisResultModalOpen(false)
                  // Switch to promotions tab if not already there
                  if (activeTab !== 'promotions') {
                    handleTabChange('promotions')
                  }
                }}
              >
                View Recommendations
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PerformanceDashboardFallback() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading performance dashboard...</p>
        </div>
      </div>
    </div>
  );
}

export default function PerformanceDashboardPage() {
  return (
    <Suspense fallback={<PerformanceDashboardFallback />}>
      <PerformanceDashboardPageContent />
    </Suspense>
  );
}


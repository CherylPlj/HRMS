'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import ReviewTable from '@/components/performance/ReviewTable'
import Pagination from '@/components/disciplinary/Pagination'
import { PerformanceReview } from '@/types/performance'
import { fetchPerformanceReviews, transformPerformanceReview } from '@/lib/performanceApi'

export default function PerformanceReviewsPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState<PerformanceReview[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetchPerformanceReviews({
        page: currentPage,
        limit: itemsPerPage,
        status: statusFilter,
        search: searchQuery || undefined,
      })

      const transformedReviews = response.reviews.map(transformPerformanceReview)
      setReviews(transformedReviews)
      setTotalPages(response.pagination.totalPages)
      setTotalItems(response.pagination.total)
    } catch (error) {
      console.error('Error fetching reviews:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch reviews'
      toast.error(errorMessage)
      setReviews([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, itemsPerPage, statusFilter, searchQuery])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const handleView = (review: PerformanceReview) => {
    router.push(`/dashboard/admin/performance/reviews/${review.id}`)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // Reset to first page when changing items per page
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setCurrentPage(1)
  }

  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== 'all'

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        {/* <div>
          <h1 className="text-3xl font-bold">Performance Reviews</h1>
          <p className="text-muted-foreground mt-2">
            Manage and view all performance reviews
          </p>
        </div> */}
        <Button
          onClick={() => router.push('/dashboard/admin/performance/reviews/new')}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Review
        </Button>
      </div>

      {/* Search and Filter Section */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search by employee name, reviewer, or period..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1) // Reset to first page when searching
              }}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setCurrentPage(1)
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="approved">Approved</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="sm:w-auto"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>

        {/* Results Count */}
        <div className="text-sm text-gray-600">
          {loading ? (
            'Loading...'
          ) : (
            <>
              Showing {reviews.length} of {totalItems} review{totalItems !== 1 ? 's' : ''}
              {hasActiveFilters && ' (filtered)'}
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading reviews...</p>
        </div>
      ) : (
        <>
          <ReviewTable reviews={reviews} onView={handleView} />

          {/* Pagination */}
          {reviews.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          )}

          {/* No Results Message */}
          {!loading && reviews.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-600 text-lg mb-2">No reviews found</p>
              <p className="text-gray-500 text-sm">
                {hasActiveFilters
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No performance reviews available.'}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  className="mt-4"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}


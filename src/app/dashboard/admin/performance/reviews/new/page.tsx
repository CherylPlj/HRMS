'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'react-hot-toast'
import ReviewForm from '@/components/performance/ReviewForm'
import { Employee } from '@/types/performance'
import { createPerformanceReview } from '@/lib/performanceApi'
import SearchableEmployeeSelect from '@/components/disciplinary/SearchableEmployeeSelect'

export default function NewReviewPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [reviewers, setReviewers] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEmployees()
    fetchReviewers()
  }, [])

  const fetchEmployees = async () => {
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
    } finally {
      setLoading(false)
    }
  }

  const fetchReviewers = async () => {
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
  }

  const handleSubmit = async (data: any) => {
    try {
      const period = `Q${Math.floor(new Date(data.startDate).getMonth() / 3) + 1} ${new Date(data.startDate).getFullYear()}`
      
      await createPerformanceReview({
        ...data,
        period,
        status: 'draft',
      })
      
      toast.success('Performance review created successfully!', {
        duration: 4000,
        icon: '✅',
      })
      router.push('/dashboard/admin/performance/reviews')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create review'
      toast.error(errorMessage)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Create New Performance Review</h1>
        <p className="text-muted-foreground mt-2">
          Fill in the details to create a new performance review
        </p>
      </div>

      <div className="max-w-4xl">
        <ReviewForm
          employees={employees}
          reviewers={reviewers}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  )
}


'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import ReviewForm from '@/components/performance/ReviewForm'
import {
  mockEmployees,
  mockReviewers,
} from '@/components/performance/mockData'

export default function NewReviewPage() {
  const router = useRouter()

  const handleSubmit = (data: any) => {
    console.log('Review submitted (static):', data)
    // In a real app, this would navigate back or show success message
    // router.push('/dashboard/admin/performance/reviews')
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
          employees={mockEmployees}
          reviewers={mockReviewers}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  )
}


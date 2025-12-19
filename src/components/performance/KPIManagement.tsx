'use client'

import React from 'react'
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
import { Edit, Trash2, Plus } from 'lucide-react'
import { KPI } from '@/types/performance'

interface KPIManagementProps {
  kpis: KPI[]
  onAdd: () => void
  onEdit: (kpi: KPI) => void
  onDelete: (kpiId: string) => void
}

const KPIManagement: React.FC<KPIManagementProps> = ({
  kpis,
  onAdd,
  onEdit,
  onDelete,
}) => {
  const getCategoryBadge = (category: KPI['category']) => {
    const variants = {
      kpi: 'bg-blue-500 text-white',
      behavior: 'bg-green-500 text-white',
      attendance: 'bg-yellow-500 text-white',
      other: 'bg-gray-500 text-white',
    }

    return (
      <Badge className={variants[category]}>
        {category.charAt(0).toUpperCase() + category.slice(1)}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">KPIs/Metrics</h2>
          {/* <p className="text-muted-foreground mt-1">
            Manage performance scoring metrics and KPIs
          </p> */}
        </div>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add KPI/Metric
        </Button>
      </div>

      <Card>
        <CardContent  className="pt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Weight (%)</TableHead>
                  <TableHead>Score Range</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpis.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No KPIs/metrics found. Click "Add KPI/Metric" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  kpis.map((kpi) => (
                    <TableRow key={kpi.id}>
                      <TableCell className="font-medium">{kpi.name}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {kpi.description}
                      </TableCell>
                      <TableCell>{getCategoryBadge(kpi.category)}</TableCell>
                      <TableCell>{kpi.weight}%</TableCell>
                      <TableCell>
                        {kpi.minScore} - {kpi.maxScore}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            kpi.isActive
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-500 text-white'
                          }
                        >
                          {kpi.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(kpi.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(kpi)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(kpi.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default KPIManagement


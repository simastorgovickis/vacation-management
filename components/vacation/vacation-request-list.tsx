'use client'

import { VacationRequest } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'

interface VacationRequestListProps {
  vacations: (VacationRequest & { User?: { name: string; email: string } })[]
  showActions?: boolean
  showCancel?: boolean // For employees to cancel their own requests
  onStatusChange?: (id: string, status: string) => void
}

export function VacationRequestList({
  vacations,
  showActions = false,
  showCancel = false,
  onStatusChange,
}: VacationRequestListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800'
      case 'CANCELLATION_REQUESTED':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleStatusChange = async (id: string, status: string, rejectionReason?: string) => {
    try {
      const response = await fetch(`/api/vacations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejectionReason }),
      })

      const data = await response.json()

      if (response.ok) {
        onStatusChange?.(id, status)
        window.location.reload()
      } else {
        alert(data.error || 'Failed to update request')
      }
    } catch (error) {
      // Error already shown to user via alert
      // In production, you might want to log to error tracking service
      alert('An error occurred. Please try again.')
    }
  }

  if (vacations.length === 0) {
    return <p className="text-gray-500">No vacation requests found.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {vacations[0]?.user && <TableHead>Employee</TableHead>}
          <TableHead>Start Date</TableHead>
          <TableHead>End Date</TableHead>
          <TableHead>Days</TableHead>
          <TableHead>Comment</TableHead>
          <TableHead>Status</TableHead>
          {(showActions || showCancel) && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {vacations.map((vacation) => (
          <TableRow key={vacation.id}>
            {vacation.User && (
              <TableCell>
                <div>
                  <div className="font-medium">{vacation.User.name}</div>
                  <div className="text-sm text-gray-500">{vacation.User.email}</div>
                </div>
              </TableCell>
            )}
            <TableCell>{format(new Date(vacation.startDate), 'MMM d, yyyy')}</TableCell>
            <TableCell>{format(new Date(vacation.endDate), 'MMM d, yyyy')}</TableCell>
            <TableCell>{vacation.days}</TableCell>
            <TableCell>
              {vacation.comment ? (
                <span className="text-sm text-gray-700">{vacation.comment}</span>
              ) : (
                <span className="text-sm text-gray-400 italic">No comment</span>
              )}
            </TableCell>
            <TableCell>
              <Badge className={getStatusColor(vacation.status)}>{vacation.status}</Badge>
            </TableCell>
            {(showActions || showCancel) && (
              <TableCell>
                <div className="flex gap-2">
                  {/* Manager actions for pending requests */}
                  {showActions && vacation.status === 'PENDING' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(vacation.id, 'APPROVED')}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          const reason = prompt('Rejection reason:')
                          if (reason) {
                            handleStatusChange(vacation.id, 'REJECTED', reason)
                          }
                        }}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {/* Manager actions for cancellation requests */}
                  {showActions && vacation.status === 'CANCELLATION_REQUESTED' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm('Approve cancellation? The vacation days will be returned to the employee.')) {
                            handleStatusChange(vacation.id, 'CANCELLED')
                          }
                        }}
                      >
                        Approve Cancellation
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm('Reject cancellation request? The vacation will remain approved.')) {
                            handleStatusChange(vacation.id, 'APPROVED')
                          }
                        }}
                      >
                        Reject Cancellation
                      </Button>
                    </>
                  )}
                  {/* Employee actions: cancel pending or request cancellation of approved */}
                  {showCancel && vacation.status === 'PENDING' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm('Are you sure you want to cancel this vacation request?')) {
                          handleStatusChange(vacation.id, 'CANCELLED')
                        }
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                  {showCancel && vacation.status === 'APPROVED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm('Request cancellation of this approved vacation? Your manager will need to approve.')) {
                          handleStatusChange(vacation.id, 'CANCELLATION_REQUESTED')
                        }
                      }}
                    >
                      Request Cancellation
                    </Button>
                  )}
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

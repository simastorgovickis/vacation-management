'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const PAGE_SIZE = 10
const ACTIONS = [
  { value: '__all__', label: 'All actions' },
  { value: 'BALANCE_ADJUSTMENT', label: 'Balance adjustment' },
  { value: 'USER_CREATED', label: 'User created' },
  { value: 'USER_UPDATED', label: 'User updated' },
  { value: 'ROLE_CHANGED', label: 'Role changed' },
  { value: 'MANAGER_ASSIGNED', label: 'Manager assigned' },
  { value: 'HOLIDAYS_IMPORTED', label: 'Holidays imported' },
]

interface AuditLogUser {
  id: string
  name: string
  email: string
}

interface AuditLog {
  id: string
  userId: string | null
  targetUserId: string | null
  action: string
  details: Record<string, unknown>
  createdAt: string
  actor?: AuditLogUser | null
  targetUser?: AuditLogUser | null
}

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [actionFilter, setActionFilter] = useState('__all__')
  const [actorSearch, setActorSearch] = useState('')
  const [actorSearchInput, setActorSearchInput] = useState('')

  const fetchLogs = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('limit', String(PAGE_SIZE))
    params.set('offset', String(page * PAGE_SIZE))
    if (actionFilter && actionFilter !== '__all__') params.set('action', actionFilter)
    if (actorSearch) params.set('actorSearch', actorSearch)
    fetch(`/api/audit-logs?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setLogs(data.logs || [])
        setTotal(data.total ?? 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [page, actionFilter, actorSearch])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasPrev = page > 0
  const hasNext = page < totalPages - 1

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="audit-action">Action type</Label>
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0) }}>
              <SelectTrigger id="audit-action" className="w-[180px]">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                {ACTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="audit-actor">User (who triggered)</Label>
            <div className="flex gap-2">
              <Input
                id="audit-actor"
                placeholder="Name or email"
                value={actorSearchInput}
                onChange={(e) => setActorSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setActorSearch(actorSearchInput)}
                className="w-[200px]"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setActorSearch(actorSearchInput); setPage(0) }}
              >
                Search
              </Button>
            </div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>User (triggered)</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target user</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500">
                  Loading...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500">
                  No audit logs found
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {log.actor ? (
                      <span className="text-sm">{log.actor.name} ({log.actor.email})</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge>{log.action}</Badge>
                  </TableCell>
                  <TableCell>
                    {log.targetUser ? (
                      <span className="text-sm">{log.targetUser.name} ({log.targetUser.email})</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate text-sm text-gray-600">
                    {typeof log.details === 'object' && log.details !== null
                      ? JSON.stringify(log.details)
                      : String(log.details)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {total > 0 && (
          <div className="flex items-center justify-between border-t pt-3">
            <p className="text-sm text-gray-600">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!hasPrev}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

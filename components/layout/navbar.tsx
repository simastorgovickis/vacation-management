'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface NavbarProps {
  user: {
    name: string
    email: string
    role: string
  }
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter()
  const [managerPendingCount, setManagerPendingCount] = useState(0)

  const isManager = user.role === 'MANAGER'
  const isAdmin = user.role === 'ADMIN'
  const showManagerDashboard = isManager || isAdmin

  useEffect(() => {
    if (!showManagerDashboard) return
    fetch('/api/manager/pending-count')
      .then((res) => res.ok ? res.json() : { count: 0 })
      .then((data) => setManagerPendingCount(data?.count ?? 0))
      .catch(() => setManagerPendingCount(0))
  }, [showManagerDashboard])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/auth/login')
    router.refresh()
  }

  const getDashboardPath = () => {
    if (user.role === 'ADMIN') return '/admin'
    if (user.role === 'MANAGER') return '/manager'
    return '/dashboard'
  }

  return (
    <nav className="border-b bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Image
            src="/logo.png"
            alt="Rail Europe"
            width={140}
            height={40}
            className="h-10 w-auto object-contain"
            priority
          />
          <div className="h-8 w-px bg-gray-300" />
          <h1 className="text-lg font-semibold text-gray-800">Vacation Management</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => router.push(getDashboardPath())} className="text-gray-700 hover:text-[#eb0854] flex items-center gap-1.5">
            {user.role === 'ADMIN' ? 'Admin' : user.role === 'MANAGER' ? 'Manager' : 'Dashboard'}
            {isManager && managerPendingCount > 0 && (
              <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" title={`${managerPendingCount} request(s) need approval`} aria-hidden />
            )}
          </Button>
          {isAdmin && (
            <Button variant="ghost" onClick={() => router.push('/manager')} className="text-gray-700 hover:text-[#eb0854] flex items-center gap-1.5">
              Manager Dashboard
              {managerPendingCount > 0 && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" title={`${managerPendingCount} request(s) need approval`} aria-hidden />
              )}
            </Button>
          )}
          {(isManager || isAdmin) && (
            <Button variant="ghost" onClick={() => router.push('/dashboard')} className="text-gray-700 hover:text-[#eb0854]">
              My Vacations
            </Button>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <span>{user.name}</span>
              <span className="text-sm text-gray-500">({user.role})</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profile')}>My Profile</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}

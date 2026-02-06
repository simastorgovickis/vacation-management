'use client'

import { useRouter } from 'next/navigation'
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

  // Managers can access both manager dashboard and employee dashboard
  const isManager = user.role === 'MANAGER'
  
  // Admins can always access manager dashboard (manager layout allows ADMIN role)
  const isAdmin = user.role === 'ADMIN'

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
          <Button variant="ghost" onClick={() => router.push(getDashboardPath())} className="text-gray-700 hover:text-[#eb0854]">
            {user.role === 'ADMIN' ? 'Admin' : user.role === 'MANAGER' ? 'Manager' : 'Dashboard'}
          </Button>
          {isAdmin && (
            <Button variant="ghost" onClick={() => router.push('/manager')} className="text-gray-700 hover:text-[#eb0854]">
              Manager Dashboard
            </Button>
          )}
          {isManager && (
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

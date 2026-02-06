'use client'

import { useEffect, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { VacationRequest } from '@/lib/generated/prisma/client'

interface TeamVacationCalendarProps {
  vacations: (VacationRequest & { User?: { name: string; email: string; id?: string } })[]
  teamMemberIds?: string[] // Optional: pass team member IDs to fetch holidays even without vacations
}

interface PublicHoliday {
  id: string
  name: string
  date: string
  country?: {
    name: string
    code: string
  } | null
}

export function TeamVacationCalendar({ vacations, teamMemberIds }: TeamVacationCalendarProps) {
  const [holidays, setHolidays] = useState<PublicHoliday[]>([])

  // Get unique user IDs from vacations and team members
  const vacationUserIds = [...new Set(vacations.map(v => v.User?.id).filter(Boolean) as string[])]
  const userIds = teamMemberIds && teamMemberIds.length > 0 
    ? [...new Set([...vacationUserIds, ...teamMemberIds])]
    : vacationUserIds

  useEffect(() => {
    // Fetch holidays for all team members
    const fetchAllHolidays = async () => {
      const allHolidays: PublicHoliday[] = []
      for (const userId of userIds) {
        try {
          const response = await fetch(`/api/users/${userId}/holidays`)
          if (response.ok) {
            const data = await response.json()
            if (data && data.holidays) {
              allHolidays.push(...data.holidays)
            }
          }
        } catch (err) {
          // Silently handle failed holiday fetches - not critical for calendar display
          // In production, consider logging to monitoring service
        }
      }
      // Remove duplicates (same holiday on same date)
      const uniqueHolidays = allHolidays.filter((holiday, index, self) =>
        index === self.findIndex(h => h.id === holiday.id && h.date === holiday.date)
      )
      setHolidays(uniqueHolidays)
    }

    if (userIds.length > 0) {
      fetchAllHolidays()
    }
  }, [userIds.join(',')])

  const vacationEvents = vacations.map((vacation) => {
    const days = Math.round(vacation.days)
    const userName = vacation.User?.name || 'Unknown'
    const statusText = vacation.status === 'APPROVED' ? '' : vacation.status === 'CANCELLATION_REQUESTED' ? ' (Cancellation Requested)' : ` (${vacation.status})`
    const title = `${userName}: ${days}${statusText}`
    
    return {
      id: vacation.id,
      title,
      start: vacation.startDate,
      end: new Date(new Date(vacation.endDate).getTime() + 24 * 60 * 60 * 1000), // Add 1 day for inclusive end
      color:
        vacation.status === 'APPROVED'
          ? '#10b981'
          : vacation.status === 'CANCELLATION_REQUESTED'
            ? '#f97316'
          : vacation.status === 'PENDING'
            ? '#f59e0b'
            : vacation.status === 'REJECTED'
              ? '#ef4444'
              : '#6b7280',
      extendedProps: {
        days,
        userName,
        status: vacation.status,
        type: 'vacation',
      },
    }
  })

  const holidayEvents = holidays.map((holiday) => {
    // Parse date string (YYYY-MM-DD) and create date in local timezone to avoid offset issues
    const [year, month, day] = holiday.date.split('-').map(Number)
    const holidayDate = new Date(year, month - 1, day) // month is 0-indexed
    
    // Show only country code in the calendar box, full name will be in tooltip
    const displayText = holiday.country ? holiday.country.code : 'H'
    
    return {
      id: `holiday-${holiday.id}`,
      title: holiday.name + (holiday.country ? ` (${holiday.country.code})` : ''), // Full text for tooltip
      start: holidayDate,
      allDay: true,
      color: '#9333ea', // Purple/violet color for public holidays (distinct from vacation colors)
      backgroundColor: '#9333ea',
      borderColor: '#7e22ce',
      textColor: '#ffffff',
      display: 'block',
      extendedProps: {
        type: 'holiday',
        holidayName: holiday.name,
        country: holiday.country,
        displayText, // Short text to show in box
      },
    }
  })

  const events = [...vacationEvents, ...holidayEvents]

  return (
    <FullCalendar
      plugins={[dayGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      events={events}
      height="auto"
      eventDisplay="block"
      dayMaxEvents={false}
      moreLinkClick="popover"
      displayEventTime={false}
      eventTextColor="#fff"
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: '', // Removed view selector since we only have month view
      }}
      eventDidMount={(arg) => {
        // Add click handler for holidays to show full name
        if (arg.event.extendedProps.type === 'holiday') {
          arg.el.style.cursor = 'pointer'
          arg.el.addEventListener('click', () => {
            const holidayName = arg.event.extendedProps.holidayName || arg.event.title
            const country = arg.event.extendedProps.country
            const fullText = country 
              ? `${holidayName} (${country.name} - ${country.code})`
              : holidayName
            alert(fullText)
          })
        }
      }}
      eventContent={(arg) => {
        const type = arg.event.extendedProps.type
        if (type === 'holiday') {
          // Public holidays: show only country code in box, click to see full name
          const displayText = arg.event.extendedProps.displayText || 'H'
          return {
            html: `<div style="padding: 2px 4px; font-weight: 700; color: #ffffff; font-size: 0.75rem; text-align: center;">${displayText}</div>`,
          }
        }
        const days = arg.event.extendedProps.days
        const userName = arg.event.extendedProps.userName
        const status = arg.event.extendedProps.status
        const statusText = status === 'APPROVED' ? '' : status === 'CANCELLATION_REQUESTED' ? ' (Cancellation Requested)' : ` (${status})`
        return {
          html: `<div style="padding: 2px 4px; font-weight: 500;">${userName}: ${days} day${days !== 1 ? 's' : ''}${statusText}</div>`,
        }
      }}
    />
  )
}

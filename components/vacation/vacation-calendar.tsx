'use client'

import { useEffect, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { VacationRequest } from '@/lib/generated/prisma/client'

interface VacationCalendarProps {
  userId: string
  vacations?: VacationRequest[]
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

export function VacationCalendar({ userId, vacations: initialVacations }: VacationCalendarProps) {
  const [vacations, setVacations] = useState(initialVacations || [])
  const [holidays, setHolidays] = useState<PublicHoliday[]>([])

  useEffect(() => {
    if (!initialVacations) {
      fetch(`/api/vacations?userId=${userId}`)
        .then((res) => res.json())
        .then((data) => setVacations(data.vacations || []))
    }
    
    // Fetch public holidays for this user
    fetch(`/api/users/${userId}/holidays`)
      .then((res) => {
        if (!res.ok) {
          // Silently fail - holidays are optional
          return { holidays: [] }
        }
        return res.json()
      })
      .then((data) => {
        if (data && data.holidays) {
          setHolidays(data.holidays || [])
        }
      })
      .catch(() => {
        // Silently fail - holidays are optional
      })
  }, [userId, initialVacations])

  const vacationEvents = vacations.map((vacation) => {
    const days = Math.round(vacation.days)
    const statusText = vacation.status === 'APPROVED' ? '' : vacation.status === 'CANCELLATION_REQUESTED' ? ' (Cancellation Requested)' : ` (${vacation.status})`
    // Use a simple title without "day/days" to avoid FullCalendar's auto-formatting
    const title = `${days}${statusText}`
    
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
        status: vacation.status,
        type: 'vacation',
      },
    }
  })

  const holidayEvents = holidays.map((holiday) => {
    // Show only country code in the calendar box, full name will be in tooltip
    const displayText = holiday.country ? holiday.country.code : 'H'
    
    return {
      id: `holiday-${holiday.id}`,
      title: holiday.name + (holiday.country ? ` (${holiday.country.code})` : ''), // Full text for tooltip
      // Use plain YYYY-MM-DD string so FullCalendar treats it as all-day without timezone shifts
      start: holiday.date,
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
        const status = arg.event.extendedProps.status
        const statusText = status === 'APPROVED' ? '' : status === 'CANCELLATION_REQUESTED' ? ' (Cancellation Requested)' : ` (${status})`
        return {
          html: `<div style="padding: 2px 4px; font-weight: 500;">${days} day${days !== 1 ? 's' : ''}${statusText}</div>`,
        }
      }}
    />
  )
}

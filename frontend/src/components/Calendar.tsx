import { useState } from 'react'
import './Calendar.css'

interface CalendarEvent {
  id: number | string
  title: string
  scheduled_at: string
  course_offering_id: number
  course_title?: string
  type?: 'lecture' | 'deadline'
}

interface CalendarProps {
  events: CalendarEvent[]
}

export default function Calendar({ events }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const today = new Date()
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Get first day of month and last day
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDate = new Date(firstDay)
  startDate.setDate(firstDay.getDate() - firstDay.getDay()) // Start from Sunday

  const endDate = new Date(lastDay)
  endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay())) // End on Saturday

  // Generate calendar days
  const days = []
  const current = new Date(startDate)
  while (current <= endDate) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.scheduled_at)
      // Compare year, month, and day to avoid timezone issues
      return eventDate.getFullYear() === date.getFullYear() &&
             eventDate.getMonth() === date.getMonth() &&
             eventDate.getDate() === date.getDate()
    })
  }

  // Check if date has events
  const hasEvents = (date: Date) => getEventsForDate(date).length > 0

  // Check if date has deadlines
  const hasDeadlines = (date: Date) => getEventsForDate(date).some(event => event.type === 'deadline')

  // Navigation
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : []

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button className="btn btn-ghost" onClick={prevMonth}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h3 className="calendar-title">
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <button className="btn btn-ghost" onClick={nextMonth}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
        <button className="btn btn-primary" onClick={goToToday}>Today</button>
      </div>

      <div className="calendar-grid">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="calendar-day-header">{day}</div>
        ))}

        {/* Calendar days */}
        {days.map((date, index) => {
          const isCurrentMonth = date.getMonth() === month
          const isToday = date.toDateString() === today.toDateString()
          const isSelected = selectedDate?.toDateString() === date.toDateString()
          const eventsOnDay = hasEvents(date)
          const deadlinesOnDay = hasDeadlines(date)

          return (
            <button
              key={index}
              className={`calendar-day ${!isCurrentMonth ? 'calendar-day-other-month' : ''} ${isToday ? 'calendar-day-today' : ''} ${isSelected ? 'calendar-day-selected' : ''}`}
              onClick={() => setSelectedDate(date)}
            >
              <span className="calendar-day-number">{date.getDate()}</span>
              {eventsOnDay && (
                <div
                  className={`calendar-day-indicator ${deadlinesOnDay ? 'calendar-day-indicator-deadline' : 'calendar-day-indicator-lecture'}`}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Selected day details */}
      {selectedDate && (
        <div className="calendar-events">
          <h4 className="calendar-events-title">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h4>
          {selectedEvents.length === 0 ? (
            <p className="calendar-no-events">No events scheduled</p>
          ) : (
            <div className="calendar-events-list">
              {selectedEvents.map(event => (
                <div key={event.id} className={`calendar-event calendar-event-${event.type || 'lecture'}`}>
                  <div className="calendar-event-time">
                    {new Date(event.scheduled_at).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </div>
                  <div className="calendar-event-details">
                    <div className="calendar-event-title">
                      {event.type === 'deadline' && '📅 '}
                      {event.title}
                    </div>
                    {event.course_title && (
                      <div className="calendar-event-course">{event.course_title}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

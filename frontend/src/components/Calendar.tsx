import { useState } from 'react'
import './Calendar.css'

interface Lecture {
  id: number
  title: string
  scheduled_at: string
  course_offering_id: number
  course_title?: string
}

interface CalendarProps {
  lectures: Lecture[]
}

export default function Calendar({ lectures }: CalendarProps) {
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

  // Get lectures for a specific date
  const getLecturesForDate = (date: Date) => {
    return lectures.filter(lecture => {
      const lectureDate = new Date(lecture.scheduled_at)
      return lectureDate.toDateString() === date.toDateString()
    })
  }

  // Check if date has lectures
  const hasLectures = (date: Date) => getLecturesForDate(date).length > 0

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

  const selectedLectures = selectedDate ? getLecturesForDate(selectedDate) : []

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
          const lecturesOnDay = hasLectures(date)

          return (
            <button
              key={index}
              className={`calendar-day ${!isCurrentMonth ? 'calendar-day-other-month' : ''} ${isToday ? 'calendar-day-today' : ''} ${isSelected ? 'calendar-day-selected' : ''}`}
              onClick={() => setSelectedDate(date)}
            >
              <span className="calendar-day-number">{date.getDate()}</span>
              {lecturesOnDay && <div className="calendar-day-indicator" />}
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
          {selectedLectures.length === 0 ? (
            <p className="calendar-no-events">No lectures scheduled</p>
          ) : (
            <div className="calendar-events-list">
              {selectedLectures.map(lecture => (
                <div key={lecture.id} className="calendar-event">
                  <div className="calendar-event-time">
                    {new Date(lecture.scheduled_at).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </div>
                  <div className="calendar-event-details">
                    <div className="calendar-event-title">{lecture.title}</div>
                    {lecture.course_title && (
                      <div className="calendar-event-course">{lecture.course_title}</div>
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
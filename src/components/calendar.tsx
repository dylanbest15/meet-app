"use client"

import { Card } from "@/components/ui/card"

interface CalendarProps {
  eventId: string
  userId: string
}

export function Calendar({ eventId, userId }: CalendarProps) {
  const generateWeeks = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find the Sunday of the current week
    const startDate = new Date(today)
    const dayOfWeek = startDate.getDay()
    startDate.setDate(startDate.getDate() - dayOfWeek)

    const weeks = []
    let currentWeek = []

    // Generate enough days to cover 30 days from today
    for (let i = 0; i < 35; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      currentWeek.push(date)

      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    }

    return weeks
  }

  const weeks = generateWeeks()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const thirtyDaysFromNow = new Date(today)
  thirtyDaysFromNow.setDate(today.getDate() + 30)

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const monthAbbrev = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

  return (
    <div className="w-full max-w-4xl space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Select Available Dates</h2>
        <p className="text-muted-foreground">Choose the days you're available for this event</p>
      </div>

      <Card className="p-3 sm:p-6">
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
          {daysOfWeek.map((day) => (
            <div key={day} className="text-center font-semibold text-xs sm:text-sm text-muted-foreground py-1 sm:py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="space-y-1 sm:space-y-2">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-1 sm:gap-2">
              {week.map((date, dayIndex) => {
                const dateOnly = new Date(date)
                dateOnly.setHours(0, 0, 0, 0)
                const isToday = dateOnly.getTime() === today.getTime()
                const isInRange = dateOnly >= today && dateOnly <= thirtyDaysFromNow
                const isOutOfRange = !isInRange
                const isFirstOfMonth = date.getDate() === 1

                return (
                  <div key={dayIndex}>
                    <button
                      disabled={isOutOfRange}
                      className={`w-full min-h-[60px] sm:min-h-[80px] p-2 sm:p-3 rounded-lg border-2 transition-colors flex flex-col items-center justify-center ${
                        isOutOfRange
                          ? "border-transparent text-muted-foreground/30 cursor-not-allowed"
                          : isToday
                            ? "border-primary bg-primary/10 hover:bg-primary/20"
                            : "border-border hover:border-primary hover:bg-muted"
                      }`}
                    >
                      {isToday && <div className="text-[10px] sm:text-xs text-primary font-semibold mb-1">Today</div>}
                      <div className="text-xs sm:text-sm font-medium">
                        {isFirstOfMonth && (
                          <span className="text-[10px] sm:text-xs">{monthAbbrev[date.getMonth()]} </span>
                        )}
                        {date.getDate()}
                      </div>
                    </button>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

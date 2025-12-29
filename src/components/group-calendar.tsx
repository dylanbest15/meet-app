"use client"

import { useState, useEffect } from "react"
import { getEventAvailability } from "@/app/actions"
import { createClient } from "@/lib/supabase/client"
import type { Availability } from "@/types/availability"

interface GroupCalendarProps {
  eventId: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
}

interface AvailabilityCount {
  [key: string]: number
}

export function GroupCalendar({ eventId, startDate, endDate, startTime, endTime }: GroupCalendarProps) {
  const [availabilityCounts, setAvailabilityCounts] = useState<AvailabilityCount>({})
  const [totalUsers, setTotalUsers] = useState(0)

  useEffect(() => {
    async function fetchData() {
      const result = await getEventAvailability(eventId)

      if (result.availability) {
        const counts: AvailabilityCount = {}
        result.availability.forEach((item: Availability) => {
          const timeWithoutSeconds = item.time.substring(0, 5)
          const slotId = `${item.date}-${timeWithoutSeconds}`
          counts[slotId] = (counts[slotId] || 0) + 1
        })
        setAvailabilityCounts(counts)
        setTotalUsers(result.totalUsers)
      }
    }
    fetchData()

    const supabase = createClient()
    const channel = supabase
      .channel(`availability-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "availability",
          filter: `event_id=eq.${eventId}`,
        },
        (payload: any) => {
          fetchData()
        },
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  const generateDates = () => {
    const dates: Date[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d))
    }
    return dates
  }

  const generateTimeSlots = () => {
    const slots: string[] = []
    const [startHour, startMinute] = startTime.split(":").map(Number)
    const [endHour, endMinute] = endTime.split(":").map(Number)

    let currentMinutes = startHour * 60 + startMinute
    const endMinutes = endHour * 60 + endMinute

    while (currentMinutes < endMinutes) {
      const hour = Math.floor(currentMinutes / 60)
      const minute = currentMinutes % 60
      const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
      slots.push(timeString)
      currentMinutes += 30
    }

    return slots
  }

  const dates = generateDates()
  const timeSlots = generateTimeSlots()

  const formatDate = (date: Date) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return {
      day: days[date.getDay()],
      date: date.getDate(),
      month: months[date.getMonth()],
    }
  }

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(":").map(Number)
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minute.toString().padStart(2, "0")} ${ampm}`
  }

  const getBackgroundColor = (count: number) => {
    if (count === 0 || totalUsers === 0) {
      return "bg-muted/30"
    }

    const percentage = count / totalUsers

    // Different shades of green based on percentage
    if (percentage >= 0.8) return "bg-green-600"
    if (percentage >= 0.6) return "bg-green-500"
    if (percentage >= 0.4) return "bg-green-400"
    if (percentage >= 0.2) return "bg-green-300"
    return "bg-green-200"
  }

  return (
    <div className="w-full space-y-1 md:space-y-2">
      <div className="h-5" />

      <h2 className="text-lg md:text-xl font-semibold">Group Availability</h2>

      <p className="text-xs md:text-sm text-muted-foreground mb-1">
        {totalUsers} {totalUsers === 1 ? "person" : "people"} responded
      </p>

      <div className="p-1 md:p-3">
        <div className="select-none">
          <div
            className="grid gap-[1px]"
            style={{ gridTemplateColumns: `60px repeat(${dates.length}, minmax(24px, 60px))` }}
          >
            <div className="sticky left-0 bg-background z-10 px-0.5 py-0.5 font-semibold text-[8px] md:text-xs border-b">
              Time
            </div>
            {dates.map((date, idx) => {
              const formatted = formatDate(date)
              return (
                <div key={idx} className="text-center px-0.5 py-0.5 border-b">
                  <div className="text-[7px] md:text-[10px] font-medium text-muted-foreground">{formatted.day}</div>
                  <div className="text-[9px] md:text-xs font-semibold">{formatted.date}</div>
                </div>
              )
            })}
          </div>

          {timeSlots.map((time, timeIdx) => (
            <div
              key={timeIdx}
              className="grid gap-[1px]"
              style={{ gridTemplateColumns: `60px repeat(${dates.length}, minmax(24px, 60px))` }}
            >
              <div className="sticky left-0 bg-background z-10 px-0.5 py-0.5 text-[8px] md:text-xs font-medium border-r flex items-center justify-center">
                {formatTime(time)}
              </div>
              {dates.map((date, dateIdx) => {
                const dateString = date.toISOString().split("T")[0]
                const slotId = `${dateString}-${time}`
                const count = availabilityCounts[slotId] || 0
                const bgColor = getBackgroundColor(count)

                return (
                  <div
                    key={dateIdx}
                    className={`p-0 h-4 md:h-7 border flex items-center justify-center ${bgColor}`}
                    title={`${count} of ${totalUsers} available`}
                  >
                    {count > 0 && <span className="text-[8px] md:text-xs font-semibold text-white">{count}</span>}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

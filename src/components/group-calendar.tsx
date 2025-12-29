"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { getEventAvailability, getEventUsers } from "@/app/actions"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface GroupCalendarProps {
  eventId: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
}

interface AvailabilityCount {
  [key: string]: {
    count: number
    users: Array<{ id: string; name: string }>
  }
}

interface User {
  id: string
  name: string
  creator: boolean
}

export function GroupCalendar({ eventId, startDate, endDate, startTime, endTime }: GroupCalendarProps) {
  const [availabilityCounts, setAvailabilityCounts] = useState<AvailabilityCount>({})
  const [totalUsers, setTotalUsers] = useState(0)
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    async function fetchData() {
      const [availabilityResult, usersResult] = await Promise.all([
        getEventAvailability(eventId),
        getEventUsers(eventId),
      ])

      if (availabilityResult.availability) {
        const counts: AvailabilityCount = {}
        availabilityResult.availability.forEach((item: any) => {
          const timeWithoutSeconds = item.time.substring(0, 5)
          const slotId = `${item.date}-${timeWithoutSeconds}`

          if (!counts[slotId]) {
            counts[slotId] = { count: 0, users: [] }
          }

          counts[slotId].count++
          if (item.users) {
            counts[slotId].users.push({ id: item.users.id, name: item.users.name })
          }
        })
        setAvailabilityCounts(counts)
        setTotalUsers(availabilityResult.totalUsers)
      }

      if (usersResult.users) {
        setUsers(usersResult.users)
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

  const getFilteredCount = (slotId: string) => {
    const slotData = availabilityCounts[slotId]
    if (!slotData) return { count: 0, users: [] }

    if (selectedUserId) {
      const isUserAvailable = slotData.users.some((u) => u.id === selectedUserId)
      return {
        count: isUserAvailable ? 1 : 0,
        users: isUserAvailable ? slotData.users.filter((u) => u.id === selectedUserId) : [],
      }
    }

    return slotData
  }

  const getBackgroundColor = (count: number, maxCount: number) => {
    if (count === 0 || maxCount === 0) {
      return "bg-muted/50"
    }

    const percentage = count / maxCount

    if (percentage >= 0.8) return "bg-green-600"
    if (percentage >= 0.6) return "bg-green-500"
    if (percentage >= 0.4) return "bg-green-400"
    if (percentage >= 0.2) return "bg-green-300"
    return "bg-green-200"
  }

  const handleMouseMove = (e: React.MouseEvent, slotId: string) => {
    setHoveredSlot(slotId)
    setTooltipPosition({ x: e.clientX, y: e.clientY })
  }

  const handleMouseLeave = () => {
    setHoveredSlot(null)
  }

  const selectedUserName = users.find((u) => u.id === selectedUserId)?.name

  return (
    <div className="w-full space-y-1 md:space-y-2">
      <div className="h-5" />

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg md:text-xl font-semibold">
          {selectedUserName ? `${selectedUserName}'s Availability` : "Group Availability"}
        </h2>
        <div className="flex items-center gap-2">
          {selectedUserId && (
            <Button variant="outline" size="sm" onClick={() => setSelectedUserId(null)} className="h-8">
              <X className="h-4 w-4 mr-1" />
              Reset
            </Button>
          )}
          <Select value={selectedUserId || ""} onValueChange={(value: any) => setSelectedUserId(value || null)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Filter by user" />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-xs md:text-sm text-muted-foreground mb-1">
        {selectedUserId
          ? "Showing individual availability"
          : `${totalUsers} ${totalUsers === 1 ? "person" : "people"} responded`}
      </p>

      <div className="p-1 md:p-3 relative">
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
                const { count, users: slotUsers } = getFilteredCount(slotId)
                const maxCount = selectedUserId ? 1 : totalUsers
                const bgColor = getBackgroundColor(count, maxCount)

                return (
                  <div
                    key={dateIdx}
                    className={`p-0 h-4 md:h-7 border flex items-center justify-center ${bgColor} relative cursor-default`}
                    onMouseMove={(e) => handleMouseMove(e, slotId)}
                    onMouseLeave={handleMouseLeave}
                  >
                    {count > 0 && <span className="text-[8px] md:text-xs font-semibold text-white">{count}</span>}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {hoveredSlot && availabilityCounts[hoveredSlot] && (
          <div
            className="fixed z-50 bg-popover text-popover-foreground shadow-md rounded-md p-2 text-xs pointer-events-none border"
            style={{
              left: tooltipPosition.x + 10,
              top: tooltipPosition.y + 10,
            }}
          >
            {availabilityCounts[hoveredSlot].users.length > 0 ? (
              <div className="space-y-1">
                <div className="font-semibold text-muted-foreground">Available:</div>
                {availabilityCounts[hoveredSlot].users.map((user, idx) => (
                  <div key={idx}>{user.name}</div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground">No one available</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

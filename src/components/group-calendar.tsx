"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { getEventAvailability, getEventUsers } from "@/app/actions"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

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
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [filterOpen, setFilterOpen] = useState(false)

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
      full: `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`,
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

    if (selectedUserIds.length > 0) {
      const filteredUsers = slotData.users.filter((u) => selectedUserIds.includes(u.id))
      return {
        count: filteredUsers.length,
        users: filteredUsers,
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

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  const getHeaderText = () => {
    if (selectedUserIds.length === 0) return "Group Availability"
    if (selectedUserIds.length === 1) {
      const user = users.find((u) => u.id === selectedUserIds[0])
      return `${user?.name}'s Availability`
    }
    return `${selectedUserIds.length} Users' Availability`
  }

  return (
    <div className="w-full space-y-0.5 md:space-y-1">
      <div className="h-4" />

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base md:text-lg font-semibold">{getHeaderText()}</h2>
        <div className="flex items-center gap-2">
          {selectedUserIds.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setSelectedUserIds([])} className="h-8">
              <X className="h-4 w-4 mr-1" />
              Reset
            </Button>
          )}
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs bg-transparent">
                Filter by users
                {selectedUserIds.length > 0 && ` (${selectedUserIds.length})`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="end">
              <div className="space-y-2">
                <div className="font-semibold text-sm">Select users</div>
                {users.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={user.id}
                      checked={selectedUserIds.includes(user.id)}
                      onCheckedChange={() => toggleUser(user.id)}
                    />
                    <label
                      htmlFor={user.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {user.name}
                    </label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <p className="text-xs md:text-sm text-muted-foreground">
        {selectedUserIds.length > 0
          ? "Showing filtered availability"
          : `${totalUsers} ${totalUsers === 1 ? "person" : "people"} responded`}
      </p>

      <div className="p-0.5 md:p-2 relative">
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
              <div className="sticky left-0 bg-background z-10 px-0.5 text-[8px] md:text-xs font-medium flex items-start justify-center -mt-1.5">
                {formatTime(time)}
              </div>
              {dates.map((date, dateIdx) => {
                const dateString = date.toISOString().split("T")[0]
                const slotId = `${dateString}-${time}`
                const { count, users: slotUsers } = getFilteredCount(slotId)
                const maxCount = selectedUserIds.length > 0 ? selectedUserIds.length : totalUsers
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

          <div
            className="grid gap-[1px]"
            style={{ gridTemplateColumns: `60px repeat(${dates.length}, minmax(24px, 60px))` }}
          >
            <div className="sticky left-0 bg-background z-10 px-0.5 text-[8px] md:text-xs font-medium flex items-start justify-center -mt-1.5">
              {formatTime(endTime)}
            </div>
            {dates.map((_, dateIdx) => (
              <div key={dateIdx} />
            ))}
          </div>
        </div>

        {hoveredSlot && availabilityCounts[hoveredSlot] && (
          <div
            className="fixed z-50 bg-popover text-popover-foreground shadow-md rounded-md p-2 text-xs pointer-events-none border"
            style={{
              left: tooltipPosition.x + 10,
              top: tooltipPosition.y + 10,
            }}
          >
            <div className="font-semibold text-xs mb-1">
              {(() => {
                const parts = hoveredSlot.split("-")
                const dateStr = `${parts[0]}-${parts[1]}-${parts[2]}`
                const timeStr = parts[3]
                const date = new Date(dateStr)
                return `${formatDate(date).full} at ${formatTime(timeStr)}`
              })()}
            </div>
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

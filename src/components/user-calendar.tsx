"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { saveAvailability, deleteAvailability, getUserAvailability } from "@/app/actions"
import type { Availability } from "@/types/availability"

interface UserCalendarProps {
  eventId: string
  userId: string
  userName: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
}

export function UserCalendar({ eventId, userId, userName, startDate, endDate, startTime, endTime }: UserCalendarProps) {
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set())
  const [isDragging, setIsDragging] = useState(false)
  const [dragMode, setDragMode] = useState<"select" | "deselect" | null>(null)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null)

  const handleMouseUp = () => {
    setIsDragging(false)
    setDragMode(null)
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    setDragMode(null)
  }

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp)
    window.addEventListener("touchend", handleTouchEnd)
    return () => {
      window.removeEventListener("mouseup", handleMouseUp)
      window.removeEventListener("touchend", handleTouchEnd)
    }
  }, [])

  useEffect(() => {
    async function fetchData() {
      const availabilityResult = await getUserAvailability(eventId, userId)

      if (availabilityResult.availability) {
        const slots = new Set<string>()
        availabilityResult.availability.forEach((item: Availability) => {
          const timeWithoutSeconds = item.time.substring(0, 5)
          const slotKey = `${item.date}-${timeWithoutSeconds}`
          slots.add(slotKey)
        })
        setSelectedSlots(slots)
      }
    }
    fetchData()
  }, [eventId, userId])

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

  const toggleSlot = async (date: string, time: string) => {
    const slotId = `${date}-${time}`
    const newSelected = new Set(selectedSlots)
    const wasSelected = newSelected.has(slotId)

    if (wasSelected) {
      newSelected.delete(slotId)
    } else {
      newSelected.add(slotId)
    }

    // Optimistic update
    setSelectedSlots(newSelected)

    // Show saving indicator
    setSaveStatus("saving")

    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }

    try {
      // Save or delete from database
      if (wasSelected) {
        await deleteAvailability(eventId, userId, date, time)
      } else {
        await saveAvailability(eventId, userId, date, time)
      }

      // Show saved status briefly
      setSaveStatus("saved")
      const timeout = setTimeout(() => {
        setSaveStatus("idle")
      }, 1500)
      setSaveTimeout(timeout)
    } catch (error) {
      console.error("Failed to save availability:", error)
      // Revert optimistic update on error
      setSelectedSlots(
        wasSelected ? new Set([...newSelected, slotId]) : new Set([...newSelected].filter((s) => s !== slotId)),
      )
      setSaveStatus("idle")
    }
  }

  const handleMouseDown = (date: string, time: string) => {
    const slotId = `${date}-${time}`
    const isCurrentlySelected = selectedSlots.has(slotId)

    setDragMode(isCurrentlySelected ? "deselect" : "select")
    setIsDragging(true)

    toggleSlot(date, time)
  }

  const handleTouchStart = (e: React.TouchEvent, date: string, time: string) => {
    e.preventDefault()
    handleMouseDown(date, time)
  }

  const handleMouseEnter = (date: string, time: string) => {
    if (isDragging && dragMode) {
      const slotId = `${date}-${time}`
      const isCurrentlySelected = selectedSlots.has(slotId)

      if (dragMode === "select" && !isCurrentlySelected) {
        toggleSlot(date, time)
      } else if (dragMode === "deselect" && isCurrentlySelected) {
        toggleSlot(date, time)
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && dragMode) {
      e.preventDefault()
      const touch = e.touches[0]
      const element = document.elementFromPoint(touch.clientX, touch.clientY)
      if (element && element.hasAttribute("data-date") && element.hasAttribute("data-time")) {
        const date = element.getAttribute("data-date")
        const time = element.getAttribute("data-time")
        if (date && time) {
          handleMouseEnter(date, time)
        }
      }
    }
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

  return (
    <div className="w-full space-y-1 md:space-y-2">
      <div className="h-5 flex items-start">
        <div
          className={`px-3 py-1 rounded-md text-xs font-medium transition-opacity ${saveStatus === "idle" ? "opacity-0" : "opacity-100"} ${saveStatus === "saving" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200" : "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"}`}
        >
          {saveStatus === "saving" ? "Saving..." : "Saved ✓"}
        </div>
      </div>

      <h2 className="text-lg md:text-xl font-semibold">{userName}&apos;s Availability</h2>

      <p className="text-xs md:text-sm text-muted-foreground mb-1">Click and drag to select your availability</p>

      <div className="p-1 md:p-3">
        <div className="select-none touch-none" onTouchMove={handleTouchMove}>
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
                const isSelected = selectedSlots.has(slotId)

                return (
                  <button
                    key={dateIdx}
                    data-date={dateString}
                    data-time={time}
                    onMouseDown={() => handleMouseDown(dateString, time)}
                    onMouseEnter={() => handleMouseEnter(dateString, time)}
                    onTouchStart={(e) => handleTouchStart(e, dateString, time)}
                    className={`p-0 h-4 md:h-7 border transition-colors cursor-pointer ${
                      isSelected ? "bg-green-500 text-white hover:bg-green-600" : "bg-muted/30 hover:bg-muted"
                    }`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

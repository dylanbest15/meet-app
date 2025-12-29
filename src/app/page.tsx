"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { createEvent, getEvent, getUser } from "./actions"
import { Calendar } from "@/components/calendar"
import { ChevronLeft } from "lucide-react"

interface Event {
  name: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
}

const generateTimeOptions = () => {
  const times: string[] = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
      times.push(timeString)
    }
  }
  return times
}

export default function Home() {
  const searchParams = useSearchParams()
  const eventId = searchParams.get("id") || ""
  const userId = searchParams.get("user") || ""

  const [userName, setUserName] = useState("")
  const [name, setName] = useState("")
  const [requirePassword, setRequirePassword] = useState(false)
  const [password, setPassword] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const router = useRouter()

  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUserName, setCurrentUserName] = useState<string>("")

  const timeOptions = generateTimeOptions()

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0]
    setStartDate(today)

    const oneWeekLater = new Date()
    oneWeekLater.setDate(oneWeekLater.getDate() + 7)
    setEndDate(oneWeekLater.toISOString().split("T")[0])

    setStartTime("09:00")
    setEndTime("17:00")

    if (eventId && userId) {
      async function fetchData() {
        console.log("[v0] Fetching event:", eventId, "and user:", userId)
        try {
          const [eventResult, userResult] = await Promise.all([getEvent(eventId), getUser(userId)])

          console.log("[v0] Event result:", eventResult)
          console.log("[v0] User result:", userResult)

          if (eventResult.event) {
            setEvent(eventResult.event)
          } else {
            console.error("[v0] No event found in result")
          }

          if (userResult.user) {
            setCurrentUserName(userResult.user.name)
          } else {
            console.error("[v0] No user found in result")
          }
        } catch (error) {
          console.error("[v0] Error fetching data:", error)
        } finally {
          // Always set loading to false, even if there's an error
          setLoading(false)
        }
      }
      fetchData()
    } else {
      setLoading(false)
    }
  }, [eventId, userId])

  const today = new Date().toISOString().split("T")[0]
  const maxEndDate = (() => {
    if (!startDate) return ""
    const start = new Date(startDate)
    start.setDate(start.getDate() + 7)
    return start.toISOString().split("T")[0]
  })()

  const handleStartDateChange = (newStartDate: string) => {
    setStartDate(newStartDate)

    if (endDate) {
      const start = new Date(newStartDate)
      const end = new Date(endDate)
      const maxEnd = new Date(newStartDate)
      maxEnd.setDate(maxEnd.getDate() + 7)

      if (end > maxEnd) {
        setEndDate(maxEnd.toISOString().split("T")[0])
      } else if (end < start) {
        setEndDate(newStartDate)
      }
    }
  }

  const isStep1Valid = () => {
    const baseFieldsFilled = userName.trim() && name.trim()
    if (requirePassword) {
      return baseFieldsFilled && password.trim()
    }
    return baseFieldsFilled
  }

  const isFormValid = () => {
    return isStep1Valid() && startDate && endDate && startTime && endTime
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    const formData = new FormData()
    formData.append("userName", userName)
    formData.append("name", name)
    formData.append("startDate", startDate)
    formData.append("endDate", endDate)
    formData.append("startTime", startTime)
    formData.append("endTime", endTime)
    if (requirePassword) {
      formData.append("password", password)
    }

    const result = await createEvent(formData)

    setIsLoading(false)

    if (result.error) {
      setMessage({ type: "error", text: result.error })
    } else {
      setMessage({ type: "success", text: "Event created successfully!" })
      setUserName("")
      setName("")
      setPassword("")
      setRequirePassword(false)
      setStartDate("")
      setEndDate("")
      setStartTime("")
      setEndTime("")
      setCurrentStep(1)

      if (result.eventId && result.userId) {
        router.push(`/?id=${result.eventId}&user=${result.userId}`)
      }
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
        <p className="text-muted-foreground">Loading event...</p>
      </main>
    )
  }

  if (!event && eventId && userId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
        <p className="text-destructive">Event not found</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col p-4 md:p-8">
      <div className="w-full max-w-7xl mx-auto space-y-4">
        {event && (
          <div className="w-full text-center mb-4">
            <h1 className="text-2xl md:text-3xl font-bold">{event.name}</h1>
          </div>
        )}

        {event && (
          <div className="w-full md:grid md:grid-cols-2 md:gap-8 md:pt-2">
            <div className="flex justify-center">
              <Calendar
                eventId={eventId}
                userId={userId}
                userName={currentUserName}
                startDate={event.startDate}
                endDate={event.endDate}
                startTime={event.startTime}
                endTime={event.endTime}
              />
            </div>
            <div className="hidden md:block">{/* Future: Group availability calendar */}</div>
          </div>
        )}

        {!event && (
          <div className="w-full max-w-4xl space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold text-balance">Meet App</h1>
              <p className="text-muted-foreground">Create your first event</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {currentStep === 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCurrentStep(1)}
                  className="md:hidden flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`space-y-4 ${currentStep === 2 ? "hidden md:block" : ""}`}>
                  <div className="space-y-2">
                    <Label htmlFor="user-name">Your Name</Label>
                    <Input
                      id="user-name"
                      type="text"
                      placeholder="Enter your name"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="event-name">Event Name</Label>
                    <Input
                      id="event-name"
                      type="text"
                      placeholder="Enter event name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="require-password" className="text-base font-medium cursor-pointer">
                        Require Password
                      </Label>
                      <p className="text-sm text-muted-foreground">Make this event private</p>
                    </div>
                    <Switch
                      id="require-password"
                      checked={requirePassword}
                      onCheckedChange={setRequirePassword}
                      disabled={isLoading}
                    />
                  </div>

                  {requirePassword && (
                    <div className="space-y-2">
                      <Input
                        type="text"
                        placeholder="Enter event password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        required={requirePassword}
                      />
                    </div>
                  )}
                </div>

                <div className={`space-y-4 ${currentStep === 1 ? "hidden md:block" : ""}`}>
                  <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-4">
                    <Label className="text-base font-medium">Event Date Range</Label>
                    <p className="text-sm text-muted-foreground">Select the possible dates for this event</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="start-date" className="text-sm">
                          Start Date
                        </Label>
                        <Input
                          id="start-date"
                          type="date"
                          value={startDate}
                          onChange={(e) => handleStartDateChange(e.target.value)}
                          min={today}
                          disabled={isLoading}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end-date" className="text-sm">
                          End Date
                        </Label>
                        <Input
                          id="end-date"
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          min={startDate || today}
                          max={maxEndDate}
                          disabled={isLoading}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-4">
                    <Label className="text-base font-medium">Event Time Range</Label>
                    <p className="text-sm text-muted-foreground">Select the possible time window (e.g., 8am-5pm)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="start-time" className="text-sm">
                          Start Time
                        </Label>
                        <select
                          id="start-time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          disabled={isLoading}
                          required
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {timeOptions.map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end-time" className="text-sm">
                          End Time
                        </Label>
                        <select
                          id="end-time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          disabled={isLoading}
                          required
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {timeOptions.map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {currentStep === 1 && (
                <Button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="w-full md:hidden"
                  disabled={!isStep1Valid()}
                >
                  Choose Dates
                </Button>
              )}

              <div className={`space-y-4 ${currentStep === 1 ? "hidden md:block" : ""}`}>
                <div className="flex justify-center md:justify-end">
                  <Button type="submit" className="w-full md:w-auto md:px-12" disabled={isLoading || !isFormValid()}>
                    {isLoading ? "Creating..." : "Create New Event"}
                  </Button>
                </div>

                {message && (
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      message.type === "success"
                        ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200"
                        : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
                    }`}
                  >
                    {message.text}
                  </div>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  )
}

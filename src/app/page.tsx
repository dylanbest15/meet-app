"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { createEvent, getEvent, getUser, verifyEventPassword } from "./actions"
import { UserCalendar } from "@/components/user-calendar"
import { GroupCalendar } from "@/components/group-calendar"
import { UserSelection } from "@/components/user-selection"
import { PasswordPrompt } from "@/components/password-prompt"
import { ChevronLeft, Link2 } from "lucide-react"

interface Event {
  name: string
  password: string | null
  startDate: string
  endDate: string
  startTime: string
  endTime: string
}

const generateTimeOptions = () => {
  const times: { value: string; label: string }[] = []
  for (let hour = 0; hour <= 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 24 && minute > 0) break

      const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
      let displayHour: number
      let period: string

      if (hour === 0 || hour === 24) {
        displayHour = 12
        period = hour === 0 ? "AM" : "AM"
      } else if (hour < 12) {
        displayHour = hour
        period = "AM"
      } else {
        displayHour = hour > 12 ? hour - 12 : hour
        period = "PM"
      }

      const label = `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`
      times.push({ value: timeString, label })
    }
  }
  return times
}

export default function Home() {
  const searchParams = useSearchParams()
  const eventId = searchParams.get("id") || ""
  const userId = searchParams.get("user") || ""
  const justCreated = searchParams.get("created") === "true"

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
  const [isCreator, setIsCreator] = useState(false)
  const [passwordVerified, setPasswordVerified] = useState(false)
  const [needsPassword, setNeedsPassword] = useState(false)

  const timeOptions = generateTimeOptions()

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0]
    setStartDate(today)

    const oneWeekLater = new Date()
    oneWeekLater.setDate(oneWeekLater.getDate() + 7)
    setEndDate(oneWeekLater.toISOString().split("T")[0])

    setStartTime("09:00")
    setEndTime("17:00")

    if (eventId) {
      async function loadEvent() {
        try {
          const eventResult = await getEvent(eventId)

          if (eventResult.event) {
            setEvent(eventResult.event)

            if (eventResult.event.password && !justCreated) {
              const storedPassword = sessionStorage.getItem(`event-${eventId}-password`)

              if (storedPassword) {
                const { verified } = await verifyEventPassword(eventId, storedPassword)
                if (verified) {
                  setPasswordVerified(true)
                  setNeedsPassword(false)
                } else {
                  sessionStorage.removeItem(`event-${eventId}-password`)
                  setNeedsPassword(true)
                  setLoading(false)
                  return
                }
              } else {
                setNeedsPassword(true)
                setLoading(false)
                return
              }
            } else {
              setPasswordVerified(true)
            }

            if (userId) {
              const userResult = await getUser(userId)
              if (userResult.user) {
                setCurrentUserName(userResult.user.name)
                setIsCreator(userResult.user.creator || false)
              }
            }
          }
        } catch (error) {
          console.error("Error fetching data:", error)
        } finally {
          setLoading(false)
        }
      }
      loadEvent()
    } else {
      setLoading(false)
    }
  }, [eventId, userId, justCreated])

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
      setLoading(true)
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
        router.push(`/?id=${result.eventId}&user=${result.userId}&created=true`)
      }
    }
  }

  const [shareSuccess, setShareSuccess] = useState(false)

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/?id=${eventId}`

    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

      if (isMobile && navigator.share) {
        await navigator.share({
          title: event?.name || "Event",
          text: `Join my event: ${event?.name}`,
          url: shareUrl,
        })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        setShareSuccess(true)
        setTimeout(() => setShareSuccess(false), 2000)
      }
    } catch (err) {
      console.error("Error sharing:", err)
    }
  }

  const handlePasswordVerify = async (password: string): Promise<boolean> => {
    const { verified } = await verifyEventPassword(eventId, password)

    if (verified) {
      sessionStorage.setItem(`event-${eventId}-password`, password)
      setPasswordVerified(true)
      setNeedsPassword(false)
      setLoading(false)
    }

    return verified
  }

  const handleSwitchUser = () => {
    // Remove userId from URL to trigger user selection screen
    router.push(`/?id=${eventId}`)
  }

  if (loading) {
    return (
      <main className="flex flex-col items-center justify-center p-2 md:p-4 min-h-screen py-4 md:py-4">
        <p className="text-muted-foreground">Loading event...</p>
      </main>
    )
  }

  if (needsPassword && event && !justCreated) {
    return <PasswordPrompt eventName={event.name} onVerify={handlePasswordVerify} />
  }

  if (event && eventId && !userId && passwordVerified) {
    return <UserSelection eventId={eventId} eventName={event.name} />
  }

  if (!event && eventId && userId) {
    return (
      <main className="flex flex-col items-center justify-center p-2 md:p-4 py-4 md:py-4">
        <p className="text-destructive">Event not found</p>
      </main>
    )
  }

  return (
    <main className="flex flex-col items-center p-2 md:p-4 py-4 md:py-8">
      {event && (
        <div className="w-full max-w-7xl mx-auto mb-2 md:mb-4 pl-2 md:pl-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-center md:gap-4">
            <h1 className="text-xl md:text-2xl font-bold md:text-center">{event.name}</h1>
            {isCreator && (
              <Button onClick={handleShare} variant="outline" className="hidden md:flex gap-2 bg-background shadow-sm">
                <Link2 className="h-4 w-4" />
                <span>{shareSuccess ? "Copied!" : "Share Event"}</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {event && isCreator && (
        <div className="w-full md:hidden mb-4 px-2">
          <Button onClick={handleShare} variant="outline" className="w-full gap-2 bg-background shadow-sm">
            <Link2 className="h-4 w-4" />
            <span>{shareSuccess ? "Copied!" : "Share Event"}</span>
          </Button>
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto space-y-1">
        {event && (
          <div className="w-full md:grid md:grid-cols-2 md:gap-8">
            <div className="flex justify-center">
              <UserCalendar
                eventId={eventId}
                userId={userId}
                userName={currentUserName}
                startDate={event.startDate}
                endDate={event.endDate}
                startTime={event.startTime}
                endTime={event.endTime}
                onSwitchUser={handleSwitchUser} // Added switch user callback
              />
            </div>
            <div className="flex justify-center mt-8 md:mt-0">
              <GroupCalendar
                eventId={eventId}
                startDate={event.startDate}
                endDate={event.endDate}
                startTime={event.startTime}
                endTime={event.endTime}
              />
            </div>
          </div>
        )}

        {!event && (
          <div className="flex justify-center items-center min-h-[calc(100vh-8rem)] pt-8 md:pt-4">
            <div className="w-full max-w-4xl space-y-6 px-4 md:px-0">
              <div className={`text-center space-y-2 ${currentStep === 2 ? "hidden md:block" : ""}`}>
                <h1 className="text-4xl font-bold">Meet App</h1>
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
                      <p className="text-sm text-muted-foreground">Select the possible time window (e.g., 9am-5pm)</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="start-time" className="text-sm">
                            No Earlier than
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
                              <option key={time.value} value={time.value}>
                                {time.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="end-time" className="text-sm">
                            No Later than
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
                              <option key={time.value} value={time.value}>
                                {time.label}
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
                    Continue
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
          </div>
        )}
      </div>
    </main>
  )
}

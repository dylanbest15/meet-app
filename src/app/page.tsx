"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { createEvent } from "./actions"
import { Calendar } from "@/components/calendar"

export default function Home() {
  const searchParams = useSearchParams()
  const eventId = searchParams.get("id")
  const userId = searchParams.get("user")

  const [userName, setUserName] = useState("")
  const [name, setName] = useState("")
  const [requirePassword, setRequirePassword] = useState(false)
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    const formData = new FormData()
    formData.append("userName", userName)
    formData.append("name", name)
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

      if (result.eventId && result.userId) {
        router.push(`/?id=${result.eventId}&user=${result.userId}`)
      }
    }
  }

  if (eventId && userId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <Calendar eventId={eventId} userId={userId} />
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-balance">Meet App</h1>
          <p className="text-muted-foreground">Create your first event</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create New Event"}
          </Button>

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
        </form>
      </div>
    </main>
  )
}

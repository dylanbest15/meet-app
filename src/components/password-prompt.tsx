"use client"

import type React from "react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Lock } from "lucide-react"

interface PasswordPromptProps {
  eventName: string
  onVerify: (password: string) => Promise<boolean>
}

export function PasswordPrompt({ eventName, onVerify }: PasswordPromptProps) {
  const [password, setPassword] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsVerifying(true)
    setError(null)

    const verified = await onVerify(password)

    if (!verified) {
      setError("Incorrect password. Please try again.")
      setPassword("")
    }

    setIsVerifying(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-balance">{eventName}</h1>
          <p className="text-muted-foreground">This event is password protected</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Enter Password</Label>
            <Input
              id="password"
              type="text"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isVerifying}
              required
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg text-sm bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isVerifying || !password}>
            {isVerifying ? "Verifying..." : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  )
}

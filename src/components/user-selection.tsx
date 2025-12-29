"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getEventUsers, createUser } from "@/app/actions"
import type { User } from "@/types/user"
import { UserCircle } from "lucide-react"

interface UserSelectionProps {
  eventId: string
  eventName: string
}

export function UserSelection({ eventId, eventName }: UserSelectionProps) {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewUser, setShowNewUser] = useState(false)
  const [newUserName, setNewUserName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUsers() {
      const result = await getEventUsers(eventId)
      if (result.users) {
        setUsers(result.users)
      }
      setLoading(false)
    }
    fetchUsers()
  }, [eventId])

  const handleSelectUser = (userId: string) => {
    router.push(`/?id=${eventId}&user=${userId}`)
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUserName.trim()) return

    setIsCreating(true)
    setError(null)

    const result = await createUser(eventId, newUserName)

    if (result.error) {
      setError(result.error)
      setIsCreating(false)
    } else if (result.userId) {
      router.push(`/?id=${eventId}&user=${result.userId}`)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">{eventName}</h1>
          <p className="text-muted-foreground">Select your name or add yourself to continue</p>
        </div>

        {users.length > 0 && !showNewUser && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Select your name</Label>
            <div className="space-y-2">
              {users.map((user) => (
                <Button
                  key={user.id}
                  onClick={() => handleSelectUser(user.id)}
                  variant="outline"
                  className="w-full justify-start gap-3 h-auto py-3"
                >
                  <UserCircle className="h-5 w-5" />
                  <span className="text-base">{user.name}</span>
                  {user.creator && (
                    <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-1 rounded">Creator</span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        )}

        {users.length > 0 && !showNewUser && (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>
        )}

        {!showNewUser ? (
          <Button onClick={() => setShowNewUser(true)} variant="default" className="w-full">
            Add Yourself as New User
          </Button>
        ) : (
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-user-name">Your Name</Label>
              <Input
                id="new-user-name"
                type="text"
                placeholder="Enter your name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                disabled={isCreating}
                required
                autoFocus
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg text-sm bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => setShowNewUser(false)}
                variant="outline"
                className="flex-1"
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isCreating || !newUserName.trim()}>
                {isCreating ? "Adding..." : "Continue"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

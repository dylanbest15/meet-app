"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import type { CreateEventInput } from "@/types/event"
import type { CreateUserInput } from "@/types/user"

export async function createEvent(formData: FormData) {
  const userName = formData.get("userName") as string
  const name = formData.get("name") as string
  const password = formData.get("password") as string | null
  const startDate = formData.get("startDate") as string
  const endDate = formData.get("endDate") as string
  const startTime = formData.get("startTime") as string
  const endTime = formData.get("endTime") as string

  if (!userName || userName.trim() === "") {
    return { error: "Your name is required" }
  }

  if (!name || name.trim() === "") {
    return { error: "Event name is required" }
  }

  if (!startDate || !endDate) {
    return { error: "Date range is required" }
  }

  if (!startTime || !endTime) {
    return { error: "Time range is required" }
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Handle cookie setting errors
          }
        },
      },
    },
  )

  const eventInput: Omit<CreateEventInput, "id" | "created_at"> = {
    name: name.trim(),
    password: password ? password.trim() : null,
    startDate: startDate,
    endDate: endDate,
    startTime: startTime,
    endTime: endTime,
  }

  const { data: eventData, error: eventError } = await supabase.from("events").insert(eventInput).select().single()

  if (eventError) {
    return { error: eventError.message }
  }

  const userInput: Omit<CreateUserInput, "id" | "created_at"> = {
    name: userName.trim(),
    creator: true,
    event_id: eventData.id,
  }

  const { data: userData, error: userError } = await supabase.from("users").insert(userInput).select().single()

  if (userError) {
    return { error: userError.message }
  }

  revalidatePath("/")
  return { success: true, eventId: eventData.id, userId: userData.id }
}

export async function getEvent(eventId: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Handle cookie setting errors
          }
        },
      },
    },
  )

  const { data, error } = await supabase.from("events").select("*").eq("id", eventId).single()

  if (error) {
    return { error: error.message }
  }

  return { event: data }
}

export async function saveAvailability(eventId: string, userId: string, date: string, time: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Handle cookie setting errors
          }
        },
      },
    },
  )

  const { error } = await supabase.from("availability").insert({
    event_id: eventId,
    user_id: userId,
    date: date,
    time: time,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function deleteAvailability(eventId: string, userId: string, date: string, time: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Handle cookie setting errors
          }
        },
      },
    },
  )

  const { error } = await supabase
    .from("availability")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .eq("date", date)
    .eq("time", time)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function getUserAvailability(eventId: string, userId: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Handle cookie setting errors
          }
        },
      },
    },
  )

  const { data, error } = await supabase.from("availability").select("*").eq("event_id", eventId).eq("user_id", userId)

  if (error) {
    return { error: error.message, availability: [] }
  }

  return { availability: data }
}

export async function getUser(userId: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Handle cookie setting errors
          }
        },
      },
    },
  )

  const { data, error } = await supabase.from("users").select("*").eq("id", userId).single()

  if (error) {
    return { error: error.message }
  }

  return { user: data }
}

export async function getEventAvailability(eventId: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Handle cookie setting errors
          }
        },
      },
    },
  )

  // Get all availability for this event
  const { data: availabilityData, error: availabilityError } = await supabase
    .from("availability")
    .select("*")
    .eq("event_id", eventId)

  if (availabilityError) {
    return { error: availabilityError.message, availability: [], totalUsers: 0 }
  }

  // Get total number of users in this event
  const { count: totalUsers, error: countError } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)

  if (countError) {
    return { error: countError.message, availability: availabilityData, totalUsers: 0 }
  }

  return { availability: availabilityData, totalUsers: totalUsers || 0 }
}

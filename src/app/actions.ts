"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

export async function createEvent(formData: FormData) {
  const userName = formData.get("userName") as string
  const name = formData.get("name") as string
  const password = formData.get("password") as string | null

  if (!userName || userName.trim() === "") {
    return { error: "Your name is required" }
  }

  if (!name || name.trim() === "") {
    return { error: "Event name is required" }
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

  const { data: eventData, error: eventError } = await supabase
    .from("events")
    .insert({
      name: name.trim(),
      password: password ? password.trim() : null,
    })
    .select()
    .single()

  if (eventError) {
    return { error: eventError.message }
  }

  const { data: userData, error: userError } = await supabase
    .from("users")
    .insert({
      name: userName.trim(),
      creator: true,
      event: eventData.id,
    })
    .select()
    .single()

  if (userError) {
    return { error: userError.message }
  }

  revalidatePath("/")
  return { success: true, eventId: eventData.id, userId: userData.id }
}

export interface Availability {
  id: string
  event_id: string
  user_id: string
  date: string // YYYY-MM-DD format
  time: string // HH:MM format
  created_at: string
}

export interface CreateAvailabilityInput {
  event_id: string
  user_id: string
  date: string
  time: string
}

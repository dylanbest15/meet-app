export interface Event {
  id: string
  created_at: string
  name: string
  password: string | null
  startDate: string // date (YYYY-MM-DD)
  endDate: string // date (YYYY-MM-DD)
  startTime: string // time (HH:MM:SS)
  endTime: string // time (HH:MM:SS)
}

export interface CreateEventInput {
  name: string
  password?: string | null
  startDate: string
  endDate: string
  startTime: string
  endTime: string
}

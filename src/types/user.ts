export interface User {
  id: string
  created_at: string
  name: string
  creator: boolean
  event_id: string // UUID reference to events.id
}

export interface CreateUserInput {
  name: string
  creator: boolean
  event_id: string
}

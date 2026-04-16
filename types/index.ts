export type Gender = 'Male' | 'Female' | 'Other' | 'Prefer not to say'
export type Sentiment = 'positive' | 'neutral' | 'negative'
export type ReportStatus = 'draft' | 'complete'

export interface Class {
  id: string
  user_id: string
  name: string
  created_at: string
}

export interface Student {
  id: string
  user_id: string
  first_name: string
  last_name: string
  gender: Gender
  profile_notes: string
  class_id: string | null
  avatar_url?: string | null
  created_at: string
}

export interface Subject {
  id: string
  user_id: string
  name: string
  created_at: string
}

export interface Event {
  id: string
  student_id: string
  user_id: string
  subject_id: string | null
  sentiment: Sentiment
  description: string
  created_at: string
  subjects?: Subject | null
}

export interface Report {
  id: string
  student_id: string
  user_id: string
  content: string
  status: ReportStatus
  generated_at: string
  last_edited_at: string
}

export interface StudentWithStats extends Student {
  event_count: number
  last_event_date: string | null
  events: Event[]
  classes?: Class | null
}

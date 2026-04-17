export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StudentTable from '@/components/StudentTable'
import { withSentiment } from '@/lib/sentiment'
import type { StudentWithStats } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [studentsResult, subjectsResult, eventsResult, classesResult, reportsResult] = await Promise.all([
    supabase.from('students').select('*, classes(*)').order('last_name'),
    supabase.from('subjects').select('*').order('name'),
    supabase.from('events').select('*, subjects(*)').order('created_at', { ascending: false }),
    supabase.from('classes').select('*').order('name'),
    supabase.from('reports').select('student_id, is_draft').eq('user_id', user.id),
  ])

  const students = studentsResult.data ?? []
  const subjects = subjectsResult.data ?? []
  const events = (eventsResult.data ?? []).map(withSentiment)
  const classes = classesResult.data ?? []

  // Build a map of student_id → is_draft (undefined key = no report exists)
  const reportStatuses: Record<string, boolean> = {}
  for (const r of reportsResult.data ?? []) {
    reportStatuses[r.student_id] = r.is_draft
  }

  const studentsWithStats: StudentWithStats[] = students.map(student => {
    const studentEvents = events.filter(e => e.student_id === student.id)
    return {
      ...student,
      event_count: studentEvents.length,
      last_event_date: studentEvents[0]?.created_at ?? null,
      events: studentEvents,
    }
  })

  return (
    <StudentTable
      students={studentsWithStats}
      subjects={subjects}
      classes={classes}
      reportStatuses={reportStatuses}
    />
  )
}

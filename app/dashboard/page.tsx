export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Nav from '@/components/Nav'
import StudentTable from '@/components/StudentTable'
import type { StudentWithStats } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [studentsResult, subjectsResult, eventsResult, classesResult] = await Promise.all([
    supabase.from('students').select('*, classes(*)').order('last_name'),
    supabase.from('subjects').select('*').order('name'),
    supabase.from('events').select('*, subjects(*)').order('created_at', { ascending: false }),
    supabase.from('classes').select('*').order('name'),
  ])

  const students = studentsResult.data ?? []
  const subjects = subjectsResult.data ?? []
  const events = eventsResult.data ?? []
  const classes = classesResult.data ?? []

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
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        <StudentTable
          students={studentsWithStats}
          subjects={subjects}
          classes={classes}
        />
      </main>
    </>
  )
}

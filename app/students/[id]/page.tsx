export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { withSentiment } from '@/lib/sentiment'
import { withGender } from '@/lib/gender'
import ProfileNotes from '@/components/ProfileNotes'
import TrelloEventBoard from '@/components/TrelloEventBoard'
import ReportSection from '@/components/ReportSection'
import { ChevronLeft, GraduationCap, CalendarDays, Hash } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function StudentPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [studentResult, eventsResult, subjectsResult, reportResult] = await Promise.all([
    supabase.from('students').select('*, classes(*)').eq('id', id).single(),
    supabase.from('events').select('*, subjects(*)').eq('student_id', id).order('created_at', { ascending: false }),
    supabase.from('subjects').select('*').order('name'),
    supabase.from('reports').select('*').eq('student_id', id).maybeSingle(),
  ])

  if (!studentResult.data) notFound()

  const student = withGender(studentResult.data)
  const events = (eventsResult.data ?? []).map(withSentiment)
  const subjects = subjectsResult.data ?? []
  const report = reportResult.data ?? null
  const studentClass = student.classes as { id: string; name: string } | null | undefined

  const initials = `${student.first_name[0] ?? ''}${student.last_name[0] ?? ''}`.toUpperCase()
  const joinedDate = new Date(student.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        {/* Back button */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-[#42526E] hover:text-[#0052CC] transition-colors mb-5 group font-medium"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Dashboard
        </Link>

        {/* ── Profile card ───────────────────────────────── */}
        <div className="bg-white rounded-xl border border-[#DFE1E6] shadow-sm p-6 mb-6">
          <div className="flex items-start gap-5">
            {/* Avatar with initials */}
            <div className="w-16 h-16 rounded-2xl bg-[#0052CC] text-white flex items-center justify-center text-2xl font-black tracking-tight shrink-0 shadow-md">
              {initials}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-2xl font-black text-[#172B4D] leading-tight">
                    {student.first_name} {student.last_name}
                  </h1>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {studentClass && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#DEEBFF] text-[#0052CC] rounded-full text-xs font-bold border border-blue-200">
                        <GraduationCap size={11} />
                        {studentClass.name}
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 bg-slate-100 text-[#42526E] rounded-full text-xs font-semibold">
                      {student.gender}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-[#6B778C]">
                      <Hash size={11} />
                      {events.length} {events.length === 1 ? 'event' : 'events'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-[#6B778C]">
                      <CalendarDays size={11} />
                      Added {joinedDate}
                    </span>
                  </div>
                </div>
              </div>

              {/* Profile notes */}
              <div className="mt-4">
                <ProfileNotes
                  studentId={student.id}
                  initialNotes={student.profile_notes ?? ''}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Events board ───────────────────────────────── */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#172B4D]">Events</h2>
            <span className="text-sm text-[#6B778C]">
              {events.length} total · sorted by column
            </span>
          </div>
          <TrelloEventBoard
            events={events}
            subjects={subjects}
            studentId={student.id}
            studentName={`${student.first_name} ${student.last_name}`}
          />
        </section>

        {/* ── Report ─────────────────────────────────────── */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#172B4D]">Report</h2>
            {report && (
              <span className="text-xs text-[#6B778C]">
                Generated {new Date(report.generated_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </span>
            )}
          </div>
          <ReportSection
            studentId={student.id}
            studentName={`${student.first_name} ${student.last_name}`}
            report={report}
            events={events}
            subjects={subjects}
          />
        </section>

      </main>
    </>
  )
}


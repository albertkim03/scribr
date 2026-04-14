'use client'

import { useState } from 'react'
import { ChevronDown, GraduationCap, Calendar, FileText, Search } from 'lucide-react'
import ReportSection from './ReportSection'
import type { Event, Report, Subject } from '@/types'

interface StudentInfo {
  first_name: string
  last_name: string
  gender: string
  class_id: string | null
  classes: { name: string } | null
  events: Event[]
}

interface ReportWithStudent extends Report {
  students: StudentInfo | null
}

interface Props {
  reports: ReportWithStudent[]
  subjects: Subject[]
}

function getInitials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
  'bg-indigo-100 text-indigo-700',
  'bg-orange-100 text-orange-700',
]

function hashColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function ReportCard({
  report,
  subjects,
}: {
  report: ReportWithStudent
  subjects: Subject[]
}) {
  const [expanded, setExpanded] = useState(false)

  const student = report.students
  if (!student) return null

  const fullName = `${student.first_name} ${student.last_name}`
  const avatarColor = hashColor(fullName)
  // Preview: strip HTML and trim to 160 chars
  const plainPreview = report.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const preview = plainPreview.slice(0, 160) + (plainPreview.length > 160 ? '…' : '')

  return (
    <div className="bg-white rounded-xl border border-[#DFE1E6] shadow-sm overflow-hidden">
      {/* ── Card header (always visible) ────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-[#F8FAFF] transition-colors select-none"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${avatarColor}`}>
          {getInitials(student.first_name, student.last_name)}
        </div>

        {/* Student info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[#172B4D] text-sm">{fullName}</span>
            {student.classes && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#DEEBFF] text-[#0052CC] rounded-full text-xs font-bold">
                <GraduationCap size={9} />
                {student.classes.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-xs text-[#6B778C]">
            <Calendar size={10} />
            <span>{formatDate(report.last_edited_at)}</span>
            <span className="ml-2 text-[#6B778C]/60">·</span>
            <span className="ml-1 truncate max-w-[300px] text-[#6B778C]/80">{preview}</span>
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
          className="shrink-0 p-1.5 text-[#6B778C] hover:text-[#172B4D] hover:bg-[#F4F5F7] rounded-lg transition-all"
        >
          <ChevronDown size={18} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* ── Full ReportSection (editor, copy, print, regenerate) ── */}
      {expanded && (
        <div className="border-t border-[#DFE1E6] px-5 py-5 bg-[#F8FAFF]">
          <ReportSection
            studentId={report.student_id}
            studentName={fullName}
            report={report}
            events={student.events ?? []}
            subjects={subjects}
          />
        </div>
      )}
    </div>
  )
}

export default function AllReportsView({ reports, subjects }: Props) {
  const [search, setSearch] = useState('')

  const filtered = reports.filter(r => {
    if (!r.students) return false
    const name = `${r.students.first_name} ${r.students.last_name}`.toLowerCase()
    return name.includes(search.toLowerCase())
  })

  if (reports.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#DFE1E6] shadow-sm p-16 text-center">
        <div className="w-14 h-14 bg-[#DEEBFF] rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText size={24} className="text-[#0052CC]" />
        </div>
        <h3 className="text-lg font-bold text-[#172B4D] mb-1">No reports yet</h3>
        <p className="text-sm text-[#42526E] max-w-xs mx-auto">
          Generate AI reports for your students from the Students tab and they&apos;ll appear here.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2 mr-1 shrink-0">
          <span className="text-sm font-bold text-[#172B4D]">Reports</span>
          <span className="px-1.5 py-0.5 bg-[#DFE1E6] text-[#42526E] rounded-full text-xs font-semibold">
            {reports.length}
          </span>
        </div>
        <div className="relative w-48">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B778C]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full pl-7 pr-2.5 py-1.5 border border-[#DFE1E6] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent bg-white"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#DFE1E6] p-10 text-center shadow-sm">
          <p className="text-[#6B778C] text-sm">No reports match your search.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(report => (
            <ReportCard key={report.id} report={report} subjects={subjects} />
          ))}
        </div>
      )}
    </div>
  )
}

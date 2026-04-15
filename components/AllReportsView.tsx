'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, GraduationCap, Calendar, FileText, Search, AlertTriangle, Sparkles, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { markDirty } from '@/lib/route-cache'
import ReportSection from './ReportSection'
import GenerateReportModal from './GenerateReportModal'
import type { Event, Report, Subject } from '@/types'

interface StudentInfo {
  first_name: string
  last_name: string
  gender: string
  profile_notes?: string | null
  class_id: string | null
  classes: { name: string } | null
  events: Event[]
}

interface ReportWithStudent extends Report {
  students: StudentInfo | null
}

interface StudentNoReport {
  id: string
  first_name: string
  last_name: string
  profile_notes: string | null
  class_id: string | null
  // Supabase returns embedded belongs-to as array at type level; handle both at runtime
  classes: { name: string } | { name: string }[] | null
}

interface Props {
  reports: ReportWithStudent[]
  subjects: Subject[]
  studentsWithoutReport: StudentNoReport[]
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
  isExpanded,
  onToggle,
}: {
  report: ReportWithStudent
  subjects: Subject[]
  isExpanded: boolean
  onToggle: () => void
}) {
  const supabase = createClient()
  // Fetch fresh report data every time the card is opened to avoid stale content after regeneration
  const [liveReport, setLiveReport] = useState<Report | null>(null)

  useEffect(() => {
    if (!isExpanded) return
    supabase
      .from('reports')
      .select('*')
      .eq('id', report.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setLiveReport(data) })
  }, [isExpanded]) // eslint-disable-line react-hooks/exhaustive-deps

  const student = report.students
  if (!student) return null

  const fullName = `${student.first_name} ${student.last_name}`
  const avatarColor = hashColor(fullName)
  const displayReport = liveReport ?? report
  // Preview: strip HTML and trim to 160 chars
  const plainPreview = report.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const preview = plainPreview.slice(0, 160) + (plainPreview.length > 160 ? '…' : '')

  return (
    <div className="bg-white rounded-xl border border-[#DFE1E6] shadow-sm overflow-hidden">
      {/* ── Card header (always visible) ── */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-[#F8FAFF] transition-colors select-none"
        onClick={onToggle}
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
            <span>{formatDate(displayReport.last_edited_at)}</span>
            <span className="ml-2 text-[#6B778C]/60">·</span>
            <span className="ml-1 truncate max-w-[300px] text-[#6B778C]/80">{preview}</span>
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={e => { e.stopPropagation(); onToggle() }}
          className="shrink-0 p-1.5 text-[#6B778C] hover:text-[#172B4D] hover:bg-[#F4F5F7] rounded-lg transition-all"
        >
          <ChevronDown size={18} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* ── Full ReportSection (editor, copy, print, regenerate) ── */}
      {isExpanded && (
        <div className="border-t border-[#DFE1E6] px-5 py-5 bg-[#F8FAFF]">
          <ReportSection
            studentId={report.student_id}
            studentName={fullName}
            report={displayReport}
            events={student.events ?? []}
            subjects={subjects}
            profileNotes={student.profile_notes ?? ''}
          />
        </div>
      )}
    </div>
  )
}

function NoReportRow({
  student,
  onGenerateClick,
  isLoading,
}: {
  student: StudentNoReport
  onGenerateClick: () => void
  isLoading: boolean
}) {
  const fullName = `${student.first_name} ${student.last_name}`
  const avatarColor = hashColor(fullName)
  const className = Array.isArray(student.classes)
    ? student.classes[0]?.name ?? null
    : student.classes?.name ?? null
  return (
    <div className="bg-amber-50 rounded-xl border border-amber-200 shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${avatarColor}`}>
          {getInitials(student.first_name, student.last_name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[#172B4D] text-sm">{fullName}</span>
            {className && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#DEEBFF] text-[#0052CC] rounded-full text-xs font-bold">
                <GraduationCap size={9} />
                {className}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <AlertTriangle size={10} className="text-amber-600 shrink-0" />
            <span className="text-xs text-amber-700 font-semibold">No report generated yet</span>
          </div>
        </div>
        <button
          onClick={onGenerateClick}
          disabled={isLoading}
          className="shrink-0 flex items-center gap-1.5 bg-white border border-purple-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:border-purple-400 hover:shadow-sm disabled:opacity-50 transition-all btn-press"
        >
          {isLoading
            ? <Loader2 size={11} className="animate-spin text-violet-500" />
            : <Sparkles size={11} className="text-violet-500" />
          }
          <span className="bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
            {isLoading ? 'Loading…' : 'Generate'}
          </span>
        </button>
      </div>
    </div>
  )
}

export default function AllReportsView({ reports, subjects, studentsWithoutReport }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [activeClassId, setActiveClassId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [loadingEventsFor, setLoadingEventsFor] = useState<string | null>(null)
  const [pendingGenerate, setPendingGenerate] = useState<{ student: StudentNoReport; events: Event[] } | null>(null)
  const [generatingForId, setGeneratingForId] = useState<string | null>(null)

  // Derive unique classes from the embedded student data
  const uniqueClasses = useMemo(() => {
    const seen = new Map<string, string>()
    for (const r of reports) {
      if (r.students?.class_id && r.students.classes) {
        seen.set(r.students.class_id, r.students.classes.name)
      }
    }
    for (const s of studentsWithoutReport) {
      if (s.class_id && s.classes) {
        const name = Array.isArray(s.classes) ? s.classes[0]?.name : s.classes.name
        if (name) seen.set(s.class_id, name)
      }
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [reports, studentsWithoutReport])

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleGenerateClick(student: StudentNoReport) {
    setLoadingEventsFor(student.id)
    const { data: events } = await supabase
      .from('events')
      .select('*, subjects(*)')
      .eq('student_id', student.id)
      .order('created_at', { ascending: true })
    setLoadingEventsFor(null)
    setPendingGenerate({ student, events: events ?? [] })
  }

  async function handleGenerate(selectedEventIds: string[], length: string, includeProfileNotes: boolean) {
    if (!pendingGenerate) return
    const { student } = pendingGenerate
    setPendingGenerate(null)
    setGeneratingForId(student.id)
    try {
      await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: student.id, selectedEventIds, length, includeProfileNotes }),
      })
    } finally {
      setGeneratingForId(null)
      markDirty('reports')
      router.refresh()
    }
  }

  const filtered = reports.filter(r => {
    if (!r.students) return false
    const name = `${r.students.first_name} ${r.students.last_name}`.toLowerCase()
    const nameMatch = name.includes(search.toLowerCase())
    const classMatch = !activeClassId ? true
      : activeClassId === '__none__' ? !r.students.class_id
      : r.students.class_id === activeClassId
    return nameMatch && classMatch
  })

  const filteredNoReport = studentsWithoutReport.filter(s => {
    const name = `${s.first_name} ${s.last_name}`.toLowerCase()
    const nameMatch = name.includes(search.toLowerCase())
    const classMatch = !activeClassId ? true
      : activeClassId === '__none__' ? !s.class_id
      : s.class_id === activeClassId
    return nameMatch && classMatch
  })

  const allExpanded = filtered.length > 0 && filtered.every(r => expandedIds.has(r.id))
  const hasFilter = !!search || activeClassId !== null

  function toggleAllExpanded() {
    if (allExpanded) {
      setExpandedIds(new Set())
    } else {
      setExpandedIds(prev => new Set([...prev, ...filtered.map(r => r.id)]))
    }
  }

  // When viewing "All" with classes, build class groups combining reports + pending
  const showGrouped = activeClassId === null && uniqueClasses.length > 0
  interface ReportGroup {
    classId: string | null
    className: string | null
    reports: ReportWithStudent[]
    pending: StudentNoReport[]
  }
  const reportGroups: ReportGroup[] = (() => {
    if (!showGrouped) return []
    const sortedReports = [...filtered].sort((a, b) => {
      const nameA = `${a.students?.last_name ?? ''} ${a.students?.first_name ?? ''}`.toLowerCase()
      const nameB = `${b.students?.last_name ?? ''} ${b.students?.first_name ?? ''}`.toLowerCase()
      return nameA.localeCompare(nameB)
    })
    const sortedPending = [...filteredNoReport].sort((a, b) =>
      a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name)
    )
    const map = new Map<string | null, ReportGroup>()
    for (const r of sortedReports) {
      const key = r.students?.class_id ?? null
      if (!map.has(key)) map.set(key, { classId: key, className: key ? (r.students?.classes?.name ?? null) : null, reports: [], pending: [] })
      map.get(key)!.reports.push(r)
    }
    for (const s of sortedPending) {
      const key = s.class_id
      if (!map.has(key)) {
        const cls = s.classes
        const name = key ? (Array.isArray(cls) ? cls[0]?.name ?? null : cls?.name ?? null) : null
        map.set(key, { classId: key, className: name, reports: [], pending: [] })
      }
      map.get(key)!.pending.push(s)
    }
    const assigned = [...map.entries()]
      .filter(([k]) => k !== null)
      .sort(([, a], [, b]) => (a.className ?? '').localeCompare(b.className ?? ''))
      .map(([, g]) => g)
    const unassigned = map.get(null)
    if (unassigned) assigned.push(unassigned)
    return assigned
  })()

  // Truly empty — no reports and no students at all
  if (reports.length === 0 && studentsWithoutReport.length === 0) {
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

  const hasFilteredResults = filtered.length > 0 || filteredNoReport.length > 0

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2 mr-1 shrink-0">
          <span className="text-sm font-bold text-[#172B4D]">Reports</span>
          <span className="px-1.5 py-0.5 bg-[#DFE1E6] text-[#42526E] rounded-full text-xs font-semibold">
            {reports.length}
          </span>
          {studentsWithoutReport.length > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold border border-amber-200">
              <AlertTriangle size={10} />
              {studentsWithoutReport.length} pending
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative shrink-0 w-48">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B778C]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full pl-7 pr-2.5 py-1.5 border border-[#DFE1E6] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent bg-white"
          />
        </div>

        {/* Class filter pills */}
        {uniqueClasses.length > 0 && (
          <div className="flex items-center gap-1.5 flex-1 overflow-x-auto min-w-0">
            <div className="w-px h-4 bg-[#DFE1E6] shrink-0" />
            <button
              onClick={() => setActiveClassId(null)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                activeClassId === null
                  ? 'bg-[#0052CC] text-white'
                  : 'bg-white border border-[#DFE1E6] text-[#42526E] hover:border-[#0052CC] hover:text-[#0052CC]'
              }`}
            >
              All
            </button>
            {uniqueClasses.map(cls => (
              <button
                key={cls.id}
                onClick={() => setActiveClassId(cls.id)}
                className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                  activeClassId === cls.id
                    ? 'bg-[#0052CC] text-white'
                    : 'bg-white border border-[#DFE1E6] text-[#42526E] hover:border-[#0052CC] hover:text-[#0052CC]'
                }`}
              >
                <GraduationCap size={9} />
                {cls.name}
              </button>
            ))}
            <button
              onClick={() => setActiveClassId('__none__')}
              className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                activeClassId === '__none__'
                  ? 'bg-slate-700 text-white'
                  : 'bg-white border border-dashed border-[#DFE1E6] text-[#6B778C] hover:border-slate-400 hover:text-slate-700'
              }`}
            >
              Unassigned
            </button>
          </div>
        )}

        {uniqueClasses.length === 0 && <div className="flex-1" />}

        {/* Open all / Close all */}
        {filtered.length > 0 && (
          <button
            onClick={toggleAllExpanded}
            className="shrink-0 text-xs font-bold text-[#0052CC] hover:underline"
          >
            {allExpanded ? 'Close all' : 'Open all'}
          </button>
        )}
      </div>

      {/* Filter feedback */}
      {hasFilter && (
        <div className="flex items-center gap-2 bg-[#DEEBFF] border border-blue-200 rounded-lg px-3 py-2 mb-3">
          <span className="text-xs text-[#172B4D]">
            Showing <strong>{filtered.length + filteredNoReport.length}</strong> of <strong>{reports.length + studentsWithoutReport.length}</strong> students
          </span>
          <button
            onClick={() => { setSearch(''); setActiveClassId(null) }}
            className="ml-auto flex items-center gap-1 text-xs font-bold text-[#0052CC] hover:underline btn-press-subtle"
          >
            <X size={11} /> Clear
          </button>
        </div>
      )}

      {!hasFilteredResults ? (
        <div className="bg-white rounded-xl border border-[#DFE1E6] p-10 text-center shadow-sm">
          <p className="text-[#6B778C] text-sm">No results match your search.</p>
        </div>
      ) : showGrouped ? (
        /* ── Grouped by class ── */
        <div className="space-y-2">
          {reportGroups.map((group, gi) => (
            <div key={group.classId ?? '__none__'}>
              {/* Class header */}
              <div className={`flex items-center gap-2 pb-1.5 ${gi > 0 ? 'pt-3' : ''}`}>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#42526E] uppercase tracking-wide shrink-0">
                  <GraduationCap size={10} />
                  {group.className ?? 'Unassigned'}
                </span>
                <div className="flex-1 h-px bg-[#DFE1E6]" />
              </div>
              <div className="space-y-2">
                {group.reports.map(report => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    subjects={subjects}
                    isExpanded={expandedIds.has(report.id)}
                    onToggle={() => toggleExpand(report.id)}
                  />
                ))}
                {group.pending.map(student => (
                  <NoReportRow
                    key={student.id}
                    student={student}
                    onGenerateClick={() => handleGenerateClick(student)}
                    isLoading={loadingEventsFor === student.id || generatingForId === student.id}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── Flat list (specific class filter or no classes) ── */
        <div className="space-y-2">
          {filtered.map(report => (
            <ReportCard
              key={report.id}
              report={report}
              subjects={subjects}
              isExpanded={expandedIds.has(report.id)}
              onToggle={() => toggleExpand(report.id)}
            />
          ))}

          {filteredNoReport.length > 0 && (
            <>
              {filtered.length > 0 && (
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-amber-200" />
                  <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 uppercase tracking-wide shrink-0">
                    <AlertTriangle size={11} />
                    No report yet
                  </span>
                  <div className="flex-1 h-px bg-amber-200" />
                </div>
              )}
              {filteredNoReport.map(student => (
                <NoReportRow
                  key={student.id}
                  student={student}
                  onGenerateClick={() => handleGenerateClick(student)}
                  isLoading={loadingEventsFor === student.id || generatingForId === student.id}
                />
              ))}
            </>
          )}
        </div>
      )}

      {pendingGenerate && (
        <GenerateReportModal
          studentName={`${pendingGenerate.student.first_name} ${pendingGenerate.student.last_name}`}
          events={pendingGenerate.events}
          subjects={subjects}
          profileNotes={pendingGenerate.student.profile_notes ?? ''}
          onGenerate={handleGenerate}
          onClose={() => setPendingGenerate(null)}
        />
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useRef, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ChevronRight, Plus, Search,
  ThumbsUp, Minus, ThumbsDown,
  GraduationCap, X, Loader2, Sparkles, Pencil,
} from 'lucide-react'
import AddStudentModal from './AddStudentModal'
import AddEventModal from './AddEventModal'
import ReportSection from './ReportSection'
import Select from './Select'
import ConfirmModal from './ConfirmModal'
import Avatar from './Avatar'
import { markDirty } from '@/lib/route-cache'
import type { StudentWithStats, Subject, Class, Event, Sentiment, Report, Gender } from '@/types'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const SUBJECT_PALETTE = [
  { dot: 'bg-blue-600',    pill: 'bg-blue-100 text-blue-800 border border-blue-200' },
  { dot: 'bg-violet-600',  pill: 'bg-violet-100 text-violet-800 border border-violet-200' },
  { dot: 'bg-amber-500',   pill: 'bg-amber-100 text-amber-800 border border-amber-200' },
  { dot: 'bg-emerald-600', pill: 'bg-emerald-100 text-emerald-800 border border-emerald-200' },
  { dot: 'bg-rose-600',    pill: 'bg-rose-100 text-rose-800 border border-rose-200' },
  { dot: 'bg-orange-500',  pill: 'bg-orange-100 text-orange-800 border border-orange-200' },
  { dot: 'bg-teal-600',    pill: 'bg-teal-100 text-teal-800 border border-teal-200' },
  { dot: 'bg-pink-600',    pill: 'bg-pink-100 text-pink-800 border border-pink-200' },
]

const FALLBACK_COLOR = SUBJECT_PALETTE[7]

const SENTIMENT_CONFIG: Record<Sentiment, { Icon: React.ElementType; label: string; classes: string }> = {
  positive: { Icon: ThumbsUp,   label: 'Positive', classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  neutral:  { Icon: Minus,      label: 'Neutral',  classes: 'bg-amber-50 text-amber-700 border border-amber-200' },
  negative: { Icon: ThumbsDown, label: 'Negative', classes: 'bg-red-50 text-red-700 border border-red-200' },
}

const SENTIMENT_CARD: Record<Sentiment, { bg: string; border: string; iconClass: string }> = {
  positive: { bg: 'bg-emerald-50',  border: 'border-emerald-200', iconClass: 'text-emerald-500' },
  neutral:  { bg: 'bg-amber-50/80', border: 'border-amber-200',   iconClass: 'text-amber-500' },
  negative: { bg: 'bg-red-50',      border: 'border-red-200',     iconClass: 'text-red-400' },
}

type EventSortKey = 'newest' | 'oldest' | 'subject' | 'sentiment'

const EVENT_SORT_OPTIONS = [
  { value: 'newest',    label: 'Newest first' },
  { value: 'oldest',   label: 'Oldest first' },
  { value: 'subject',  label: 'By subject'   },
  { value: 'sentiment',label: 'By sentiment' },
]

interface Props {
  students: StudentWithStats[]
  subjects: Subject[]
  classes: Class[]
}

// ── Inline report panel (lazy-fetches report on mount) ──────────
function InlineReportPanel({ student, subjects, profileNotes }: { student: StudentWithStats; subjects: Subject[]; profileNotes: string }) {
  const supabase = createClient()
  const [report, setReport] = useState<Report | null | undefined>(undefined)

  useEffect(() => {
    supabase
      .from('reports')
      .select('*')
      .eq('student_id', student.id)
      .maybeSingle()
      .then(({ data }) => setReport(data ?? null))
  }, [student.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (report === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-[#0052CC]" />
      </div>
    )
  }

  return (
    <ReportSection
      studentId={student.id}
      studentName={`${student.first_name} ${student.last_name}`}
      report={report}
      events={student.events}
      subjects={subjects}
      profileNotes={profileNotes}
    />
  )
}

// ── Ghost cell for adding events ────────────────────────────────
function AddEventGhostCell({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 w-full border-2 border-dashed border-[#DFE1E6] rounded-lg text-[#6B778C] hover:border-[#0052CC] hover:text-[#0052CC] transition-all group text-xs font-medium ${
        compact ? 'py-2.5' : 'py-3'
      }`}
    >
      <Plus size={compact ? 11 : 13} className="group-hover:scale-110 transition-transform" />
      {compact ? 'Add event' : 'Log new event'}
    </button>
  )
}

// ── General comments (profile_notes) inline editor ─────────────
function ProfileNotesEditor({ studentId, initialNotes, onSave }: {
  studentId: string
  initialNotes: string
  onSave?: (notes: string) => void
}) {
  const supabase = createClient()
  const [notes, setNotes] = useState(initialNotes)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setNotes(val)
    setSaveStatus('idle')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      await supabase.from('students').update({ profile_notes: val }).eq('id', studentId)
      setSaveStatus('saved')
      onSave?.(val)
      setTimeout(() => setSaveStatus('idle'), 2000)
    }, 800)
  }

  return (
    <div className="mb-3 bg-white rounded-lg border border-[#DFE1E6] px-3 pt-2.5 pb-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-[#42526E] uppercase tracking-wide">General Comments</span>
        <span className={`text-xs font-medium transition-colors ${
          saveStatus === 'saving' ? 'text-[#0052CC]'
          : saveStatus === 'saved' ? 'text-emerald-600'
          : 'text-transparent'
        }`}>
          {saveStatus === 'saving' ? 'Saving…' : 'Saved'}
        </span>
      </div>
      <textarea
        value={notes}
        onChange={handleChange}
        rows={2}
        placeholder="Add general notes about this student…"
        className="w-full text-xs text-[#172B4D] placeholder-[#6B778C] focus:outline-none resize-none bg-transparent leading-relaxed"
      />
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────
export default function StudentTable({ students, subjects, classes }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [search, setSearch] = useState('')
  const [activeClassId, setActiveClassId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [savedNotes, setSavedNotes] = useState<Record<string, string>>({})
  const [eventSortMap, setEventSortMap] = useState<Record<string, EventSortKey>>({})
  const [reportPanelId, setReportPanelId] = useState<string | null>(null)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [addEventStudent, setAddEventStudent] = useState<StudentWithStats | null>(null)
  const [editingEvent, setEditingEvent] = useState<{ event: Event; student: StudentWithStats } | null>(null)
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null)
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{ message: string; confirmLabel?: string; onConfirm: () => void } | null>(null)

  // Local mutable copies — updated optimistically so class/subject deletions/edits reflect immediately without a full refresh
  const [localClasses, setLocalClasses] = useState<Class[]>(classes)
  const [localStudents, setLocalStudents] = useState<StudentWithStats[]>(students)
  const [localSubjects, setLocalSubjects] = useState<Subject[]>(subjects)
  useEffect(() => { setLocalClasses(classes) }, [classes])       // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setLocalStudents(students) }, [students])    // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setLocalSubjects(subjects) }, [subjects])    // eslint-disable-line react-hooks/exhaustive-deps

  const [editingStudent, setEditingStudent] = useState<StudentWithStats | null>(null)
  const [newestEventId, setNewestEventId] = useState<string | null>(null)

  function handleClassDeleted(classId: string) {
    setLocalClasses(prev => prev.filter(c => c.id !== classId))
    setLocalStudents(prev => prev.map(s => s.class_id === classId ? { ...s, class_id: null } : s))
    if (activeClassId === classId) setActiveClassId(null)
  }

  function handleStudentSaved(id: string, updates: { first_name: string; last_name: string; gender: Gender; class_id: string | null; avatar_url?: string | null }) {
    setLocalStudents(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  function handleStudentAdded(student: StudentWithStats) {
    setLocalStudents(prev => [...prev, student])
  }

  function handleSubjectDeleted(subjectId: string) {
    setLocalSubjects(prev => prev.filter(s => s.id !== subjectId))
    setLocalStudents(prev => prev.map(s => ({
      ...s,
      events: s.events.map(e =>
        e.subject_id === subjectId ? { ...e, subject_id: null, subjects: null } : e
      ),
    })))
  }

  function handleEventAdded(studentId: string, event: Event) {
    setLocalStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s
      return {
        ...s,
        events: [event, ...s.events],
        event_count: s.event_count + 1,
        last_event_date: event.created_at,
      }
    }))
    setNewestEventId(event.id)
    setTimeout(() => setNewestEventId(null), 1500)
  }

  function handleEventUpdated(studentId: string, event: Event) {
    setLocalStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s
      return { ...s, events: s.events.map(e => e.id === event.id ? event : e) }
    }))
  }

  // Subject color map
  const subjectColorMap: Record<string, typeof SUBJECT_PALETTE[0]> = {}
  subjects.forEach((s, i) => { subjectColorMap[s.id] = SUBJECT_PALETTE[i % SUBJECT_PALETTE.length] })

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleReportPanel(studentId: string) {
    if (reportPanelId === studentId) {
      // Closing: dismiss panel and re-expand events accordion
      setReportPanelId(null)
      setExpandedIds(prev => new Set([...prev, studentId]))
    } else {
      // Opening: show panel and close accordion
      setReportPanelId(studentId)
      setExpandedIds(prev => { const next = new Set(prev); next.delete(studentId); return next })
    }
  }

  function getEventSort(studentId: string): EventSortKey {
    return eventSortMap[studentId] ?? 'newest'
  }

  function setEventSort(studentId: string, sort: EventSortKey) {
    setEventSortMap(prev => ({ ...prev, [studentId]: sort }))
  }

  function sortEvents(events: Event[], sort: EventSortKey): Event[] {
    return [...events].sort((a, b) => {
      if (sort === 'newest') return b.created_at.localeCompare(a.created_at)
      if (sort === 'oldest') return a.created_at.localeCompare(b.created_at)
      if (sort === 'subject') return (a.subjects?.name ?? '').localeCompare(b.subjects?.name ?? '')
      if (sort === 'sentiment') return a.sentiment.localeCompare(b.sentiment)
      return 0
    })
  }

  function handleDeleteEvent(e: React.MouseEvent, eventId: string) {
    e.stopPropagation()
    setConfirmModal({
      message: 'Delete this event? This cannot be undone.',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setConfirmModal(null)
        setDeletingEventId(eventId)
        await supabase.from('events').delete().eq('id', eventId)
        setDeletingEventId(null)
        markDirty('dashboard')
        router.refresh()
      },
    })
  }

  function handleDeleteStudent(e: React.MouseEvent, studentId: string, name: string) {
    e.stopPropagation()
    setConfirmModal({
      message: `Delete ${name}? This will permanently remove all their events and report.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setConfirmModal(null)
        setDeletingStudentId(studentId)
        await supabase.from('students').delete().eq('id', studentId)
        setDeletingStudentId(null)
        markDirty('dashboard')
        router.refresh()
      },
    })
  }

  const filtered = localStudents.filter(s => {
    const nameMatch = `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase())
    const classMatch = activeClassId === null
      ? true
      : activeClassId === '__none__'
        ? s.class_id === null
        : s.class_id === activeClassId
    return nameMatch && classMatch
  })

  const hasFilter = !!search || activeClassId !== null

  // When viewing "All" with classes, group students by class (alphabetical within each group)
  interface StudentGroup { classId: string | null; className: string | null; students: StudentWithStats[] }
  const sortAlpha = (arr: StudentWithStats[]) =>
    [...arr].sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name))

  const studentGroups: StudentGroup[] = (() => {
    const sorted = sortAlpha(filtered)
    if (activeClassId !== null || localClasses.length === 0) {
      return [{ classId: null, className: null, students: sorted }]
    }
    const map = new Map<string | null, StudentWithStats[]>()
    for (const s of sorted) {
      const key = s.class_id
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    }
    const result: StudentGroup[] = localClasses
      .filter(c => map.has(c.id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(c => ({ classId: c.id, className: c.name, students: map.get(c.id)! }))
    const unassigned = map.get(null) ?? []
    if (unassigned.length > 0) result.push({ classId: null, className: null, students: unassigned })
    return result
  })()
  const showGroupHeaders = activeClassId === null && localClasses.length > 0 && studentGroups.length > 1

  return (
    <>
      {/* ── Top bar: title + search + class tabs + add ──────── */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {/* Title */}
        <div className="flex items-center gap-2 mr-1 shrink-0">
          <span className="text-sm font-bold text-[#172B4D]">Students</span>
          <span className="px-1.5 py-0.5 bg-[#DFE1E6] text-[#42526E] rounded-full text-xs font-semibold">
            {localStudents.length}
          </span>
        </div>

        {/* Search */}
        <div className="relative shrink-0 w-44">
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
        {localClasses.length > 0 && (
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
            {localClasses.map(cls => (
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

        {/* Spacer when no class tabs */}
        {localClasses.length === 0 && <div className="flex-1" />}

        {/* Add student */}
        <button
          onClick={() => setShowAddStudent(true)}
          className="shrink-0 flex items-center gap-1.5 bg-[#0052CC] text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#0065FF] transition-colors shadow-sm btn-press"
        >
          <Plus size={13} />
          Add student
        </button>
      </div>

      {/* ── Filter feedback ─────────────────────── */}
      {hasFilter && (
        <div className="flex items-center gap-2 bg-[#DEEBFF] border border-blue-200 rounded-lg px-3 py-2 mb-3">
          <span className="text-xs text-[#172B4D]">
            Showing <strong>{filtered.length}</strong> of <strong>{localStudents.length}</strong> students
          </span>
          <button
            onClick={() => { setSearch(''); setActiveClassId(null) }}
            className="ml-auto flex items-center gap-1 text-xs font-bold text-[#0052CC] hover:underline btn-press-subtle"
          >
            <X size={11} /> Clear
          </button>
        </div>
      )}

      {/* ── Student list ─────────────────────────── */}
      {localStudents.length === 0 ? (
        /* No students at all — big dotted clickable empty state */
        <button
          onClick={() => setShowAddStudent(true)}
          className="w-full border-2 border-dashed border-[#DFE1E6] rounded-xl p-16 text-center hover:border-[#0052CC] hover:bg-[#F8FAFF] transition-all group"
        >
          <div className="w-14 h-14 bg-[#F4F5F7] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[#DEEBFF] transition-colors">
            <Plus size={24} className="text-[#6B778C] group-hover:text-[#0052CC] transition-colors" />
          </div>
          <p className="text-base font-bold text-[#172B4D] mb-1">No students yet</p>
          <p className="text-sm text-[#6B778C]">Click here to add your first student</p>
        </button>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#DFE1E6] p-12 text-center shadow-sm">
          <p className="text-[#6B778C] text-sm">No students match your search.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {studentGroups.map(group => (
            <Fragment key={group.classId ?? '__none__'}>
              {showGroupHeaders && (
                <div className="flex items-center gap-2 pt-1 first:pt-0">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#42526E] uppercase tracking-wide shrink-0">
                    <GraduationCap size={10} />
                    {group.className ?? 'Unassigned'}
                  </span>
                  <div className="flex-1 h-px bg-[#DFE1E6]" />
                </div>
              )}
              {group.students.map(student => {
            const isExpanded = expandedIds.has(student.id)
            const isPanelOpen = reportPanelId === student.id
            const sortKey = getEventSort(student.id)
            const sortedEvents = sortEvents(student.events, sortKey)
            const effectiveClass = student.class_id ? localClasses.find(c => c.id === student.class_id) ?? null : null

            return (
              <div key={student.id} className="bg-white rounded-xl border border-[#DFE1E6] shadow-sm overflow-hidden">
                {/* ── Header ─────────────────────────────── */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#F4F5F7] transition-colors select-none group"
                  onClick={() => isPanelOpen ? setReportPanelId(null) : toggleExpand(student.id)}
                >
                  <ChevronRight
                    size={15}
                    className={`text-[#6B778C] transition-transform duration-200 shrink-0 ${
                      isExpanded || isPanelOpen ? 'rotate-90' : ''
                    }`}
                  />
                  {/* Avatar */}
                  <Avatar
                    firstName={student.first_name}
                    lastName={student.last_name}
                    avatarUrl={student.avatar_url}
                    size={32}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#172B4D] text-sm">
                        {student.first_name} {student.last_name}
                      </span>
                      {effectiveClass && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#DEEBFF] text-[#0052CC] rounded-full text-xs font-bold">
                          <GraduationCap size={9} />
                          {effectiveClass.name}
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 bg-slate-100 text-[#42526E] rounded-full text-xs font-medium">
                        {student.gender}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-[#6B778C]">
                        {student.event_count} {student.event_count === 1 ? 'event' : 'events'}
                      </span>
                      {student.last_event_date && (
                        <span className="text-xs text-[#6B778C]">
                          Last: {formatDate(student.last_event_date)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                    {/* Report panel toggle — AI rainbow style */}
                    <button
                      onClick={() => toggleReportPanel(student.id)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all btn-press-subtle ${
                        isPanelOpen
                          ? 'bg-violet-50 border border-purple-300 text-violet-600'
                          : 'bg-white border border-purple-200 hover:border-purple-400'
                      }`}
                    >
                      {isPanelOpen ? (
                        <><X size={11} /> Close</>
                      ) : (
                        <>
                          <Sparkles size={11} className="text-violet-500" />
                          <span className="bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
                            Report
                          </span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setEditingStudent(student)}
                      className="p-2 text-[#6B778C] hover:text-[#0052CC] hover:bg-blue-50 rounded-lg transition-colors btn-press-subtle"
                      title="Edit student"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={e => handleDeleteStudent(e, student.id, `${student.first_name} ${student.last_name}`)}
                      disabled={deletingStudentId === student.id}
                      className="p-2 text-[#6B778C] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors btn-press-subtle disabled:opacity-40"
                      title="Delete student"
                    >
                      {deletingStudentId === student.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <X size={14} />
                      }
                    </button>
                  </div>
                </div>

                {/* ── Events accordion ───────────────────── */}
                {isExpanded && !isPanelOpen && (
                  <div className="border-t border-[#DFE1E6] bg-[#F4F5F7]/60 px-4 py-3">
                    {/* General comments — always visible when expanded */}
                    <ProfileNotesEditor
                      studentId={student.id}
                      initialNotes={savedNotes[student.id] ?? student.profile_notes ?? ''}
                      onSave={n => setSavedNotes(prev => ({ ...prev, [student.id]: n }))}
                    />

                    {student.events.length > 1 && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs text-[#6B778C] font-medium">Sort:</span>
                        <div className="w-40">
                          <Select
                            options={EVENT_SORT_OPTIONS}
                            value={sortKey}
                            onChange={v => setEventSort(student.id, v as EventSortKey)}
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      {/* Ghost cell at top */}
                      <AddEventGhostCell onClick={() => setAddEventStudent(student)} />

                      {sortedEvents.map(event => {
                        const subColor = event.subject_id
                          ? (subjectColorMap[event.subject_id] ?? FALLBACK_COLOR)
                          : FALLBACK_COLOR
                        const { Icon: SentimentIcon } = SENTIMENT_CONFIG[event.sentiment]
                        const cardStyle = SENTIMENT_CARD[event.sentiment]
                        const isNew = event.id === newestEventId
                        return (
                          <div
                            key={event.id}
                            onClick={() => setEditingEvent({ event, student })}
                            className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer hover:shadow-sm transition-all ${cardStyle.bg} ${cardStyle.border} ${isNew ? 'event-new' : ''}`}
                          >
                            {/* Subject badge */}
                            <div className="shrink-0 pt-0.5">
                              {event.subjects ? (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${subColor.pill}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${subColor.dot}`} />
                                  {event.subjects.name}
                                </span>
                              ) : (
                                <span className="inline-block w-2" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-[#172B4D] leading-relaxed">{event.description}</p>
                              <p className="text-xs text-[#6B778C] mt-0.5">{formatDate(event.created_at)}</p>
                            </div>
                            {/* Sentiment icon + delete */}
                            <div className="flex items-center gap-0.5 shrink-0">
                              <SentimentIcon size={12} className={`${cardStyle.iconClass} opacity-60`} />
                              <button
                                onClick={e => handleDeleteEvent(e, event.id)}
                                disabled={deletingEventId === event.id}
                                className="p-2 text-[#6B778C] hover:text-red-600 hover:bg-red-50/80 rounded-lg transition-colors btn-press-subtle disabled:opacity-40"
                              >
                                {deletingEventId === event.id
                                  ? <Loader2 size={13} className="animate-spin" />
                                  : <X size={13} />
                                }
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ── Inline report panel (2-column) ──────── */}
                {isPanelOpen && (
                  <div className="border-t border-[#DFE1E6] flex divide-x divide-[#DFE1E6]">
                    {/* Left: compact events list */}
                    <div className="w-[240px] shrink-0 bg-[#F4F5F7]/60 overflow-y-auto flex flex-col" style={{ maxHeight: '520px' }}>
                      <div className="px-3 py-2 border-b border-[#DFE1E6] shrink-0">
                        <span className="text-xs font-bold text-[#42526E] uppercase tracking-wide">
                          Events · {student.events.length}
                        </span>
                      </div>
                      <div className="p-2 space-y-1.5 flex-1">
                        {/* General comments */}
                        <ProfileNotesEditor
                          studentId={student.id}
                          initialNotes={savedNotes[student.id] ?? student.profile_notes ?? ''}
                          onSave={n => setSavedNotes(prev => ({ ...prev, [student.id]: n }))}
                        />
                        {/* Ghost cell at top */}
                        <AddEventGhostCell onClick={() => setAddEventStudent(student)} compact />

                        {sortedEvents.map(event => {
                          const subColor = event.subject_id
                            ? (subjectColorMap[event.subject_id] ?? FALLBACK_COLOR)
                            : FALLBACK_COLOR
                          const { Icon: SentimentIcon } = SENTIMENT_CONFIG[event.sentiment]
                          const cardStyle = SENTIMENT_CARD[event.sentiment]
                          const isNew = event.id === newestEventId
                          return (
                            <div
                              key={event.id}
                              onClick={() => setEditingEvent({ event, student })}
                              className={`relative rounded-lg border p-2.5 cursor-pointer hover:shadow-sm transition-all ${cardStyle.bg} ${cardStyle.border} ${isNew ? 'event-new' : ''}`}
                            >
                              {/* Sentiment icon — top-right corner */}
                              <SentimentIcon size={10} className={`absolute top-2 right-2 ${cardStyle.iconClass} opacity-60`} />

                              {event.subjects && (
                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold mb-1 ${subColor.pill}`}>
                                  <span className={`w-1 h-1 rounded-full shrink-0 ${subColor.dot}`} />
                                  {event.subjects.name}
                                </span>
                              )}
                              <p className="text-xs text-[#172B4D] leading-relaxed line-clamp-2">{event.description}</p>
                              <p className="text-xs text-[#6B778C] mt-0.5">{formatDate(event.created_at)}</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Right: report editor */}
                    <div className="flex-1 overflow-y-auto p-5" style={{ maxHeight: '520px' }}>
                      <InlineReportPanel student={student} subjects={localSubjects} profileNotes={savedNotes[student.id] ?? student.profile_notes} />
                    </div>
                  </div>
                )}
              </div>
            )})}
            </Fragment>
          ))}
        </div>
      )}

      {showAddStudent && (
        <AddStudentModal
          classes={localClasses}
          onClassDeleted={handleClassDeleted}
          onCreated={handleStudentAdded}
          onClose={() => setShowAddStudent(false)}
        />
      )}
      {editingStudent && (
        <AddStudentModal
          classes={localClasses}
          existingStudent={editingStudent}
          onClassDeleted={handleClassDeleted}
          onSaved={handleStudentSaved}
          onClose={() => setEditingStudent(null)}
        />
      )}
      {addEventStudent && (
        <AddEventModal
          studentId={addEventStudent.id}
          studentName={`${addEventStudent.first_name} ${addEventStudent.last_name}`}
          subjects={localSubjects}
          onSubjectDeleted={handleSubjectDeleted}
          onSaved={event => handleEventAdded(addEventStudent.id, event)}
          onClose={() => setAddEventStudent(null)}
        />
      )}
      {editingEvent && (
        <AddEventModal
          studentId={editingEvent.student.id}
          studentName={`${editingEvent.student.first_name} ${editingEvent.student.last_name}`}
          subjects={localSubjects}
          existingEvent={editingEvent.event}
          onSubjectDeleted={handleSubjectDeleted}
          onSaved={event => handleEventUpdated(editingEvent.student.id, event)}
          onClose={() => setEditingEvent(null)}
        />
      )}
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </>
  )
}

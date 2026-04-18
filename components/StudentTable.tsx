'use client'

import { useState, useEffect, useRef, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Plus, Search,
  ThumbsUp, Minus, ThumbsDown,
  GraduationCap, X, Loader2, Sparkles, Pencil, Trash2,
  ChevronLeft, ChevronRight, ChevronDown, Clock, CheckCircle2, Ban,
  Pin, PinOff,
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

const SENTIMENT_CONFIG: Record<Sentiment, { Icon: React.ElementType }> = {
  positive: { Icon: ThumbsUp   },
  neutral:  { Icon: Minus      },
  negative: { Icon: ThumbsDown },
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

const DEFAULT_SIDEBAR_WIDTH = 280
const DEFAULT_EVENTS_WIDTH  = 300
const MIN_SIDEBAR_WIDTH     = 200
const MIN_EVENTS_WIDTH      = 200
const CLOSE_THRESHOLD       = 150

interface Props {
  students: StudentWithStats[]
  subjects: Subject[]
  classes: Class[]
  reportStatuses?: Record<string, boolean> // true = draft, false = complete, undefined = no report
}

// ── Inline report panel (lazy-fetches report on mount) ──────────
function InlineReportPanel({ student, subjects, profileNotes, onReportStatusChanged }: {
  student: StudentWithStats
  subjects: Subject[]
  profileNotes: string
  onReportStatusChanged?: (isDraft: boolean) => void
}) {
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
      <div className="flex flex-col flex-1 min-h-0 items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[#0052CC]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ReportSection
        studentId={student.id}
        studentName={`${student.first_name} ${student.last_name}`}
        report={report}
        events={student.events}
        subjects={subjects}
        profileNotes={profileNotes}
        onReportStatusChanged={onReportStatusChanged}
      />
    </div>
  )
}

// ── Ghost cell for adding events ────────────────────────────────
function AddEventGhostCell({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 w-full border-2 border-dashed border-[#DFE1E6] rounded-lg text-[#6B778C] hover:border-[#0052CC] hover:text-[#0052CC] transition-all group text-xs font-medium py-2.5"
    >
      <Plus size={11} className="group-hover:scale-110 transition-transform" />
      Add event
    </button>
  )
}

// ── Profile notes inline editor ─────────────────────────────────
function ProfileNotesEditor({ studentId, initialNotes, onSave }: {
  studentId: string
  initialNotes: string
  onSave?: (notes: string) => void
}) {
  const supabase = createClient()
  const [notes, setNotes] = useState(initialNotes)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setNotes(initialNotes) }, [initialNotes])

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
    <div className="bg-white rounded-lg border border-[#DFE1E6] px-3 pt-2.5 pb-2.5">
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
        rows={3}
        placeholder="Add general notes about this student…"
        className="w-full text-xs text-[#172B4D] placeholder-[#6B778C] focus:outline-none resize-none bg-transparent leading-relaxed"
      />
    </div>
  )
}

// ── Report status dot with portal tooltip (below icon, no overflow clipping) ──
function ReportStatusDot({ status }: { status: boolean | undefined }) {
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const label =
    status === undefined ? 'No report'
    : status === true    ? 'Draft'
    :                      'Complete'

  const icon =
    status === undefined ? (
      <Ban size={12} className="text-slate-300" />
    ) : status === true ? (
      <Clock size={12} className="text-amber-400" />
    ) : (
      <CheckCircle2 size={12} className="text-emerald-500" />
    )

  return (
    <>
      <div
        ref={ref}
        className="shrink-0"
        onMouseEnter={() => {
          if (!ref.current) return
          const rect = ref.current.getBoundingClientRect()
          setTooltipPos({ x: rect.left + rect.width / 2, y: rect.bottom + 5 })
        }}
        onMouseLeave={() => setTooltipPos(null)}
      >
        {icon}
      </div>
      {tooltipPos && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none bg-[#172B4D] text-white text-[10px] font-medium px-2 py-1 rounded whitespace-nowrap"
          style={{ left: tooltipPos.x, top: tooltipPos.y, transform: 'translateX(-50%)' }}
        >
          {label}
        </div>,
        document.body
      )}
    </>
  )
}

// ── Main component ─────────────────────────────────────────────
export default function StudentTable({ students, subjects, classes, reportStatuses = {} }: Props) {
  const router = useRouter()
  const supabase = createClient()

  // ── Search / filter ──────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [activeClassIds, setActiveClassIds] = useState<Set<string>>(new Set())

  // ── Selection ────────────────────────────────────────────────
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  // ── Editor state ─────────────────────────────────────────────
  const [savedNotes, setSavedNotes] = useState<Record<string, string>>({})
  const [eventSort, setEventSort] = useState<EventSortKey>('newest')

  // ── Modals ───────────────────────────────────────────────────
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [addEventStudent, setAddEventStudent] = useState<StudentWithStats | null>(null)
  const [editingEvent, setEditingEvent] = useState<{ event: Event; student: StudentWithStats } | null>(null)
  const [editingStudent, setEditingStudent] = useState<StudentWithStats | null>(null)
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null)
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{ message: string; confirmLabel?: string; onConfirm: () => void } | null>(null)

  // ── Local mutable copies ─────────────────────────────────────
  const [localClasses, setLocalClasses] = useState<Class[]>(classes)
  const [localStudents, setLocalStudents] = useState<StudentWithStats[]>(students)
  const [localSubjects, setLocalSubjects] = useState<Subject[]>(subjects)
  const [localReportStatuses, setLocalReportStatuses] = useState<Record<string, boolean>>(reportStatuses)
  useEffect(() => { setLocalClasses(classes) }, [classes])
  useEffect(() => { setLocalStudents(students) }, [students])
  useEffect(() => { setLocalSubjects(subjects) }, [subjects])
  useEffect(() => { setLocalReportStatuses(reportStatuses) }, [reportStatuses])

  // ── Pinned students ──────────────────────────────────────────
  const [localPinnedIds, setLocalPinnedIds] = useState<Set<string>>(
    new Set(students.filter(s => s.is_pinned).map(s => s.id))
  )

  // ── Collapsible class groups ──────────────────────────────────
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(new Set())

  // ── Animation ────────────────────────────────────────────────
  const [newestEventId, setNewestEventId] = useState<string | null>(null)
  const [newestStudentId, setNewestStudentId] = useState<string | null>(null)

  // ── Panel widths & visibility ────────────────────────────────
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH)
  const [eventsWidth, setEventsWidth] = useState(DEFAULT_EVENTS_WIDTH)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [eventsOpen, setEventsOpen] = useState(true)

  // ── Drag resize ──────────────────────────────────────────────
  const dragState = useRef<{ col: 'sidebar' | 'events' | null; startX: number; startWidth: number }>({
    col: null, startX: 0, startWidth: 0,
  })

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const { col, startX, startWidth } = dragState.current
      if (!col) return
      const newWidth = startWidth + (e.clientX - startX)
      if (col === 'sidebar') {
        if (newWidth < CLOSE_THRESHOLD) {
          setSidebarOpen(false)
          setSidebarWidth(DEFAULT_SIDEBAR_WIDTH)
          dragState.current.col = null
          document.body.style.cursor = ''
          document.body.style.userSelect = ''
        } else {
          setSidebarOpen(true)
          setSidebarWidth(Math.max(MIN_SIDEBAR_WIDTH, newWidth))
        }
      } else {
        if (newWidth < CLOSE_THRESHOLD) {
          setEventsOpen(false)
          setEventsWidth(DEFAULT_EVENTS_WIDTH)
          dragState.current.col = null
          document.body.style.cursor = ''
          document.body.style.userSelect = ''
        } else {
          setEventsOpen(true)
          setEventsWidth(Math.max(MIN_EVENTS_WIDTH, newWidth))
        }
      }
    }
    function onMouseUp() {
      if (dragState.current.col) {
        dragState.current.col = null
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  function startDrag(col: 'sidebar' | 'events', e: React.MouseEvent, startWidth: number) {
    dragState.current = { col, startX: e.clientX, startWidth }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  // ── Data mutation handlers ───────────────────────────────────
  function handleClassDeleted(classId: string) {
    setLocalClasses(prev => prev.filter(c => c.id !== classId))
    setLocalStudents(prev => prev.map(s => s.class_id === classId ? { ...s, class_id: null } : s))
    setActiveClassIds(prev => { const next = new Set(prev); next.delete(classId); return next })
  }

  function handleClassAdded(cls: Class) {
    setLocalClasses(prev => [...prev, cls])
  }

  function handleStudentSaved(id: string, updates: { first_name: string; last_name: string; gender: Gender; class_id: string | null; avatar_url?: string | null }) {
    setLocalStudents(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  function handleStudentAdded(student: StudentWithStats) {
    setLocalStudents(prev => [...prev, student])
    setSelectedStudentId(student.id)
    setNewestStudentId(student.id)
    setTimeout(() => setNewestStudentId(null), 1500)
  }

  function handleReportStatusChanged(isDraft: boolean) {
    if (!selectedStudentId) return
    setLocalReportStatuses(prev => ({ ...prev, [selectedStudentId]: isDraft }))
  }

  async function handlePinToggle(studentId: string) {
    const isPinned = localPinnedIds.has(studentId)
    setLocalPinnedIds(prev => {
      const next = new Set(prev)
      if (isPinned) next.delete(studentId)
      else next.add(studentId)
      return next
    })
    await supabase.from('students').update({ is_pinned: !isPinned }).eq('id', studentId)
  }

  function toggleGroupCollapse(groupKey: string) {
    setCollapsedGroupIds(prev => {
      const next = new Set(prev)
      if (next.has(groupKey)) next.delete(groupKey)
      else next.add(groupKey)
      return next
    })
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

  function handleDeleteStudent(studentId: string, name: string) {
    setConfirmModal({
      message: `Delete ${name}? This will permanently remove all their events and report.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setConfirmModal(null)
        setDeletingStudentId(studentId)
        await supabase.from('students').delete().eq('id', studentId)
        setDeletingStudentId(null)
        if (selectedStudentId === studentId) setSelectedStudentId(null)
        markDirty('dashboard')
        router.refresh()
      },
    })
  }

  // ── Multi-class filter ───────────────────────────────────────
  function toggleClass(id: string) {
    setActiveClassIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const hasFilter = !!search || activeClassIds.size > 0

  const filtered = localStudents.filter(s => {
    const nameMatch = `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase())
    const classMatch = activeClassIds.size === 0
      ? true
      : [...activeClassIds].some(id =>
          id === '__none__' ? s.class_id === null : s.class_id === id
        )
    return nameMatch && classMatch
  })

  // ── Grouping ─────────────────────────────────────────────────
  interface StudentGroup {
    classId: string | null
    className: string | null
    students: StudentWithStats[]
    isPinnedGroup?: boolean
  }
  const sortAlpha = (arr: StudentWithStats[]) =>
    [...arr].sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name))

  const studentGroups: StudentGroup[] = (() => {
    const sorted = sortAlpha(filtered)
    const pinned = sorted.filter(s => localPinnedIds.has(s.id))
    const unpinned = sorted.filter(s => !localPinnedIds.has(s.id))

    if (activeClassIds.size > 0 || localClasses.length === 0) {
      const groups: StudentGroup[] = []
      if (pinned.length > 0) groups.push({ classId: '__pinned__', className: 'Pinned', students: pinned, isPinnedGroup: true })
      if (unpinned.length > 0) groups.push({ classId: null, className: null, students: unpinned })
      return groups
    }
    const map = new Map<string | null, StudentWithStats[]>()
    for (const s of unpinned) {
      const key = s.class_id
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    }
    const result: StudentGroup[] = localClasses
      .filter(c => map.has(c.id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(c => ({ classId: c.id, className: c.name, students: map.get(c.id)! }))
    const unassigned = map.get(null) ?? []
    if (unassigned.length > 0) result.push({ classId: null, className: 'Unassigned', students: unassigned })
    if (pinned.length > 0) return [{ classId: '__pinned__', className: 'Pinned', students: pinned, isPinnedGroup: true }, ...result]
    return result
  })()
  const showGroupHeaders =
    localPinnedIds.size > 0 ||
    (activeClassIds.size === 0 && localClasses.length > 0 && studentGroups.length > 1)

  const selectedStudent = localStudents.find(s => s.id === selectedStudentId) ?? null
  const effectiveClass = selectedStudent?.class_id
    ? localClasses.find(c => c.id === selectedStudent.class_id) ?? null
    : null
  const sortedEvents = selectedStudent ? sortEvents(selectedStudent.events, eventSort) : []

  // ── Render ───────────────────────────────────────────────────
  return (
    <>
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">

        {/* ── Sidebar: collapsed strip ── */}
        {!sidebarOpen && (
          <div
            className="w-10 shrink-0 border-r border-[#DFE1E6] bg-white flex items-center justify-center cursor-pointer hover:bg-[#F4F5F7] transition-colors"
            onClick={() => setSidebarOpen(true)}
            onMouseDown={e => startDrag('sidebar', e, 0)}
          >
            <ChevronRight size={16} className="text-[#6B778C]" />
          </div>
        )}

        {/* ── Sidebar: student list ── */}
        {sidebarOpen && (
          <aside
            className="shrink-0 border-r border-[#DFE1E6] bg-white flex flex-col relative"
            style={{ width: sidebarWidth }}
          >
            {/* Header */}
            <div className="px-3 pt-3 pb-2.5 border-b border-[#DFE1E6] space-y-2 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-[#172B4D]">Students</span>
                  <span className="px-1.5 py-0.5 bg-[#DFE1E6] text-[#42526E] rounded-full text-xs font-semibold">
                    {localStudents.length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowAddStudent(true)}
                    className="flex items-center gap-1 bg-[#0052CC] text-white px-2 py-1 rounded-lg text-xs font-bold hover:bg-[#0065FF] transition-colors"
                  >
                    <Plus size={11} /> Add
                  </button>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-1 rounded-lg text-[#6B778C] hover:bg-[#F4F5F7] hover:text-[#172B4D] transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                </div>
              </div>
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B778C]" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full pl-7 pr-2.5 py-1.5 border border-[#DFE1E6] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent bg-[#F8FAFF]"
                />
              </div>
            </div>

            {/* Multi-class filter pills */}
            {localClasses.length > 0 && (
              <div className="px-2.5 py-2 border-b border-[#DFE1E6] flex flex-wrap gap-1 shrink-0">
                <button
                  onClick={() => setActiveClassIds(new Set())}
                  className={`px-2 py-0.5 rounded-full text-xs font-bold transition-colors ${
                    activeClassIds.size === 0
                      ? 'bg-[#0052CC] text-white'
                      : 'bg-white border border-[#DFE1E6] text-[#42526E] hover:border-[#0052CC] hover:text-[#0052CC]'
                  }`}
                >
                  All
                </button>
                {localClasses.map(cls => (
                  <button
                    key={cls.id}
                    onClick={() => toggleClass(cls.id)}
                    title={cls.name}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold transition-colors max-w-[7rem] ${
                      activeClassIds.has(cls.id)
                        ? 'bg-[#0052CC] text-white'
                        : 'bg-white border border-[#DFE1E6] text-[#42526E] hover:border-[#0052CC] hover:text-[#0052CC]'
                    }`}
                  >
                    <GraduationCap size={8} className="shrink-0" />
                    <span className="truncate">{cls.name}</span>
                  </button>
                ))}
                <button
                  onClick={() => toggleClass('__none__')}
                  className={`px-2 py-0.5 rounded-full text-xs font-bold transition-colors ${
                    activeClassIds.has('__none__')
                      ? 'bg-slate-700 text-white'
                      : 'bg-white border border-dashed border-[#DFE1E6] text-[#6B778C] hover:border-slate-400 hover:text-slate-700'
                  }`}
                >
                  Unassigned
                </button>
              </div>
            )}

            {/* Filter feedback */}
            {hasFilter && (
              <div className="px-3 py-1.5 border-b border-[#DFE1E6] flex items-center justify-between shrink-0 bg-[#DEEBFF]/50">
                <span className="text-xs text-[#172B4D]">
                  <strong>{filtered.length}</strong> of <strong>{localStudents.length}</strong>
                </span>
                <button
                  onClick={() => { setSearch(''); setActiveClassIds(new Set()) }}
                  className="flex items-center gap-0.5 text-xs font-bold text-[#0052CC] hover:underline"
                >
                  <X size={10} /> Clear
                </button>
              </div>
            )}

            {/* Student list */}
            <div className="flex-1 overflow-y-auto overflow-x-visible">
              {localStudents.length === 0 ? (
                <button
                  onClick={() => setShowAddStudent(true)}
                  className="w-full p-6 text-center text-xs text-[#6B778C] hover:bg-[#F8FAFF] transition-colors"
                >
                  No students yet. Click to add one.
                </button>
              ) : filtered.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#6B778C]">No students match.</div>
              ) : (
                <div className="p-2 space-y-0.5">
                  {studentGroups.map(group => {
                    const groupKey = group.classId ?? '__none__'
                    const isCollapsed = collapsedGroupIds.has(groupKey)
                    return (
                      <Fragment key={groupKey}>
                        {showGroupHeaders && group.className !== null && (
                          <button
                            onClick={() => toggleGroupCollapse(groupKey)}
                            className="w-full flex items-center gap-1.5 px-2 pt-2 pb-1 hover:bg-[#F4F5F7] rounded-lg transition-colors"
                          >
                            <ChevronDown
                              size={10}
                              className={`text-[#42526E] transition-transform duration-150 shrink-0 ${isCollapsed ? '-rotate-90' : ''}`}
                            />
                            {group.isPinnedGroup
                              ? <Pin size={9} className="text-[#0052CC] shrink-0" />
                              : group.classId !== null
                                ? <GraduationCap size={9} className="text-[#42526E] shrink-0" />
                                : <span className="w-2 h-2 rounded-full border border-dashed border-[#6B778C] shrink-0 inline-block" />
                            }
                            <span className={`text-xs font-bold uppercase tracking-wide truncate flex-1 text-left ${
                              group.isPinnedGroup ? 'text-[#0052CC]'
                              : group.classId === null ? 'text-[#6B778C]'
                              : 'text-[#42526E]'
                            }`}>
                              {group.className}
                            </span>
                            <span className="text-[10px] text-[#6B778C] font-medium shrink-0">{group.students.length}</span>
                          </button>
                        )}
                        {!isCollapsed && group.students.map(student => {
                          const isSelected = selectedStudentId === student.id
                          const isNewest = student.id === newestStudentId
                          const isPinned = localPinnedIds.has(student.id)
                          return (
                            <div
                              key={student.id}
                              onClick={() => setSelectedStudentId(student.id)}
                              className={`group/row flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-[#DEEBFF] border border-blue-200'
                                  : 'hover:bg-[#F4F5F7] border border-transparent'
                              } ${isNewest ? 'event-new' : ''}`}
                            >
                              <Avatar
                                firstName={student.first_name}
                                lastName={student.last_name}
                                avatarUrl={student.avatar_url}
                                size={30}
                              />
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-bold truncate ${isSelected ? 'text-[#0052CC]' : 'text-[#172B4D]'}`}>
                                  {student.first_name} {student.last_name}
                                </p>
                                <p className="text-xs text-[#6B778C]">
                                  {student.event_count} {student.event_count === 1 ? 'event' : 'events'}
                                </p>
                              </div>
                              {/* Pin button */}
                              <button
                                onClick={e => { e.stopPropagation(); handlePinToggle(student.id) }}
                                title={isPinned ? 'Unpin' : 'Pin to top'}
                                className={`shrink-0 p-0.5 rounded transition-all ${
                                  isPinned
                                    ? 'opacity-100 text-[#0052CC] hover:text-blue-700'
                                    : 'opacity-0 group-hover/row:opacity-100 text-[#6B778C] hover:text-[#0052CC]'
                                }`}
                              >
                                {isPinned ? <PinOff size={11} /> : <Pin size={11} />}
                              </button>
                              <ReportStatusDot status={localReportStatuses[student.id]} />
                            </div>
                          )
                        })}
                      </Fragment>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Drag handle */}
            <div
              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#0052CC]/25 active:bg-[#0052CC]/40 transition-colors z-10"
              onMouseDown={e => startDrag('sidebar', e, sidebarWidth)}
            />
          </aside>
        )}

        {/* ── Right section ── */}
        <main className="flex-1 overflow-hidden bg-[#F8FAFF] flex">
          {selectedStudent ? (
            <>
              {/* ── Events column: collapsed strip ── */}
              {!eventsOpen && (
                <div
                  className="w-10 shrink-0 border-r border-[#DFE1E6] bg-white flex items-center justify-center cursor-pointer hover:bg-[#F4F5F7] transition-colors"
                  onClick={() => setEventsOpen(true)}
                  onMouseDown={e => startDrag('events', e, 0)}
                >
                  <ChevronRight size={16} className="text-[#6B778C]" />
                </div>
              )}

              {/* ── Events + notes column ── */}
              {eventsOpen && (
                <div
                  className="shrink-0 bg-white border-r border-[#DFE1E6] flex flex-col overflow-hidden relative"
                  style={{ width: eventsWidth }}
                >
                  {/* Student header */}
                  <div className="px-4 py-3 border-b border-[#DFE1E6] flex items-center gap-3 shrink-0">
                    <Avatar
                      firstName={selectedStudent.first_name}
                      lastName={selectedStudent.last_name}
                      avatarUrl={selectedStudent.avatar_url}
                      size={36}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#172B4D] text-sm truncate">
                        {selectedStudent.first_name} {selectedStudent.last_name}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        {effectiveClass && (
                          <span
                            title={effectiveClass.name}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#DEEBFF] text-[#0052CC] rounded-full text-xs font-bold max-w-[8rem]"
                          >
                            <GraduationCap size={8} className="shrink-0" />
                            <span className="truncate">{effectiveClass.name}</span>
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 bg-slate-100 text-[#42526E] rounded-full text-xs font-medium">
                          {selectedStudent.gender}
                        </span>
                      </div>
                    </div>
                    {/* Edit + delete */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditingStudent(selectedStudent)}
                        title="Edit student"
                        className="p-1.5 text-[#6B778C] hover:text-[#0052CC] hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(selectedStudent.id, `${selectedStudent.first_name} ${selectedStudent.last_name}`)}
                        disabled={deletingStudentId === selectedStudent.id}
                        title="Delete student"
                        className="p-1.5 text-[#6B778C] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                      >
                        {deletingStudentId === selectedStudent.id
                          ? <Loader2 size={13} className="animate-spin" />
                          : <Trash2 size={13} />
                        }
                      </button>
                      <button
                        onClick={() => setEventsOpen(false)}
                        className="p-1.5 text-[#6B778C] hover:bg-[#F4F5F7] hover:text-[#172B4D] rounded-lg transition-colors"
                      >
                        <ChevronLeft size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Profile notes */}
                  <div className="px-3 pt-3 pb-2 shrink-0">
                    <ProfileNotesEditor
                      studentId={selectedStudent.id}
                      initialNotes={savedNotes[selectedStudent.id] ?? selectedStudent.profile_notes ?? ''}
                      onSave={n => setSavedNotes(prev => ({ ...prev, [selectedStudent.id]: n }))}
                    />
                  </div>

                  {/* Events header + sort */}
                  <div className="px-3 py-2 border-t border-[#DFE1E6] flex items-center justify-between shrink-0">
                    <span className="text-xs font-bold text-[#42526E] uppercase tracking-wide">
                      Events · {selectedStudent.events.length}
                    </span>
                    {selectedStudent.events.length > 1 && (
                      <div className="w-32">
                        <Select
                          options={EVENT_SORT_OPTIONS}
                          value={eventSort}
                          onChange={v => setEventSort(v as EventSortKey)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Add event + events list */}
                  <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
                    <AddEventGhostCell onClick={() => setAddEventStudent(selectedStudent)} />
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
                          onClick={() => setEditingEvent({ event, student: selectedStudent })}
                          className={`relative rounded-lg border p-2.5 cursor-pointer hover:shadow-sm transition-all ${cardStyle.bg} ${cardStyle.border} ${isNew ? 'event-new' : ''}`}
                        >
                          <SentimentIcon size={10} className={`absolute top-2 right-2 ${cardStyle.iconClass} opacity-60`} />
                          {event.subjects && (
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold mb-1 ${subColor.pill}`}>
                              <span className={`w-1 h-1 rounded-full shrink-0 ${subColor.dot}`} />
                              {event.subjects.name}
                            </span>
                          )}
                          <p className="text-xs text-[#172B4D] leading-relaxed line-clamp-2 pr-4">{event.description}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-[#6B778C]">{formatDate(event.created_at)}</p>
                            <button
                              onClick={e => handleDeleteEvent(e, event.id)}
                              disabled={deletingEventId === event.id}
                              className="p-1 text-[#6B778C] hover:text-red-600 hover:bg-red-50/80 rounded transition-colors disabled:opacity-40"
                            >
                              {deletingEventId === event.id
                                ? <Loader2 size={11} className="animate-spin" />
                                : <X size={11} />
                              }
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Drag handle */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#0052CC]/25 active:bg-[#0052CC]/40 transition-colors z-10"
                    onMouseDown={e => startDrag('events', e, eventsWidth)}
                  />
                </div>
              )}

              {/* ── Report column ── */}
              <div className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col">
                <InlineReportPanel
                  key={selectedStudent.id}
                  student={selectedStudent}
                  subjects={localSubjects}
                  profileNotes={savedNotes[selectedStudent.id] ?? selectedStudent.profile_notes ?? ''}
                  onReportStatusChanged={handleReportStatusChanged}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-white border border-[#DFE1E6] rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <Sparkles size={28} className="text-violet-400" />
                </div>
                <p className="font-semibold text-[#172B4D] text-sm">Select a student</p>
                <p className="text-xs text-[#6B778C] mt-1">Choose a student from the sidebar to view their profile and report</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {showAddStudent && (
        <AddStudentModal
          classes={localClasses}
          onClassDeleted={handleClassDeleted}
          onClassAdded={handleClassAdded}
          onCreated={handleStudentAdded}
          onClose={() => setShowAddStudent(false)}
        />
      )}
      {editingStudent && (
        <AddStudentModal
          classes={localClasses}
          existingStudent={editingStudent}
          onClassDeleted={handleClassDeleted}
          onClassAdded={handleClassAdded}
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

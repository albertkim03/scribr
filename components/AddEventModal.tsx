'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { X, Plus, Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import Select from './Select'
import type { Subject, Sentiment, Event } from '@/types'
import { markDirty } from '@/lib/route-cache'
import { encodeSentiment } from '@/lib/sentiment'

interface Props {
  studentId: string
  studentName: string
  subjects: Subject[]
  existingEvent?: Event
  defaultSentiment?: Sentiment
  onSubjectDeleted?: (subjectId: string) => void
  onSaved?: (event: Event) => void
  onClose: () => void
}

const SENTIMENT_OPTIONS = [
  { value: 'positive', label: 'Positive' },
  { value: 'neutral',  label: 'Neutral'  },
  { value: 'negative', label: 'Negative' },
]

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isoToLocalDate(isoString: string): string {
  const d = new Date(isoString)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Date Picker ─────────────────────────────────────────────────
function DatePicker({ value, onChange }: { value: string; onChange: (date: string) => void }) {
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(() => parseInt(value.slice(0, 4)))
  const [viewMonth, setViewMonth] = useState(() => parseInt(value.slice(5, 7)) - 1)
  const containerRef = useRef<HTMLDivElement>(null)
  const today = todayISO()

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function navigate(delta: number) {
    let m = viewMonth + delta
    let y = viewYear
    if (m > 11) { m = 0; y++ }
    if (m < 0) { m = 11; y-- }
    setViewMonth(m)
    setViewYear(y)
  }

  function selectDay(day: number) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onChange(dateStr)
    setOpen(false)
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  // Adjust first day to Monday-first (Mon=0 … Sun=6)
  const startOffset = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7

  const displayDate = new Date(value + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 border border-[#DFE1E6] rounded-lg text-sm bg-white hover:border-[#0052CC] focus:outline-none focus:ring-2 focus:ring-[#0052CC] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-[#6B778C] shrink-0" />
          <span className="text-[#172B4D] font-medium">{displayDate}</span>
          {value === today && (
            <span className="text-[10px] text-[#0052CC] font-bold bg-[#DEEBFF] px-1.5 py-0.5 rounded-full">Today</span>
          )}
        </div>
        <ChevronDown size={13} className={`text-[#6B778C] transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-[300] mt-1 left-0 bg-white rounded-xl border border-[#DFE1E6] shadow-2xl p-3 w-64">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg hover:bg-[#F4F5F7] text-[#42526E] transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-sm font-bold text-[#172B4D]">{MONTHS[viewMonth]} {viewYear}</span>
            <button
              type="button"
              onClick={() => navigate(1)}
              className="p-1.5 rounded-lg hover:bg-[#F4F5F7] text-[#42526E] transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-[#6B778C] py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {Array.from({ length: startOffset }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isSelected = dateStr === value
              const isToday = dateStr === today
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`w-full aspect-square rounded-lg text-xs font-medium flex items-center justify-center transition-colors
                    ${isSelected
                      ? 'bg-[#0052CC] text-white font-bold'
                      : isToday
                        ? 'bg-[#DEEBFF] text-[#0052CC] font-bold'
                        : 'text-[#172B4D] hover:bg-[#F4F5F7]'
                    }`}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Today shortcut */}
          {value !== today && (
            <div className="mt-2.5 pt-2 border-t border-[#DFE1E6]">
              <button
                type="button"
                onClick={() => {
                  onChange(today)
                  setOpen(false)
                  const d = new Date()
                  setViewYear(d.getFullYear())
                  setViewMonth(d.getMonth())
                }}
                className="w-full text-xs font-bold text-[#0052CC] py-1.5 rounded-lg hover:bg-[#DEEBFF] transition-colors"
              >
                Jump to today
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function sortSubjects(subjects: Subject[]): Subject[] {
  return [...subjects].sort((a, b) => {
    if (a.name === 'General') return -1
    if (b.name === 'General') return 1
    return a.name.localeCompare(b.name)
  })
}

export default function AddEventModal({
  studentId,
  studentName,
  subjects: initialSubjects,
  existingEvent,
  defaultSentiment,
  onSubjectDeleted,
  onSaved,
  onClose,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const sorted = sortSubjects(initialSubjects)
  const [subjects, setSubjects] = useState<Subject[]>(sorted)
  const [sentiment, setSentiment] = useState<Sentiment>(
    existingEvent?.sentiment ?? defaultSentiment ?? 'positive'
  )
  const [subjectId, setSubjectId] = useState<string>(
    existingEvent?.subject_id ?? (sorted[0]?.id ?? '')
  )
  const [description, setDescription] = useState(existingEvent?.description ?? '')
  const [date, setDate] = useState<string>(
    existingEvent ? isoToLocalDate(existingEvent.created_at) : todayISO()
  )
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [showAddSubject, setShowAddSubject] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [addingSubject, setAddingSubject] = useState(false)

  const subjectOptions = [
    ...subjects.map(s => ({ value: s.id, label: s.name })),
    { value: '__add__', label: '+ Add subject…', isAction: true },
  ]

  function handleSubjectChange(val: string) {
    if (val === '__add__') {
      setShowAddSubject(true)
    } else {
      setSubjectId(val)
      setShowAddSubject(false)
      setNewSubjectName('')
    }
  }

  async function handleDeleteSubject(deletedId: string) {
    supabase.from('subjects').delete().eq('id', deletedId).then(() => {})
    setSubjects(prev => prev.filter(s => s.id !== deletedId))
    if (subjectId === deletedId) setSubjectId('')
    onSubjectDeleted?.(deletedId)
  }

  async function handleAddSubject() {
    if (!newSubjectName.trim()) return
    setAddingSubject(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setAddingSubject(false); return }

    const { data, error } = await supabase
      .from('subjects')
      .insert({ user_id: session.user.id, name: newSubjectName.trim() })
      .select()
      .single()

    if (!error && data) {
      const updated = sortSubjects([...subjects, data])
      setSubjects(updated)
      setSubjectId(data.id)
      setNewSubjectName('')
      setShowAddSubject(false)
    }
    setAddingSubject(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    // Store the date at local noon to avoid timezone-crossing issues
    const created_at = new Date(date + 'T12:00:00').toISOString()

    const payload = {
      student_id: studentId,
      user_id: session.user.id,
      subject_id: subjectId || null,
      sentiment: encodeSentiment(sentiment),
      description: description.trim(),
      created_at,
    }

    if (existingEvent) {
      const { error } = await supabase.from('events').update(payload).eq('id', existingEvent.id)
      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        const updatedEvent: Event = {
          ...existingEvent,
          subject_id: subjectId || null,
          sentiment,
          description: description.trim(),
          created_at,
          subjects: subjects.find(s => s.id === subjectId) ?? null,
        }
        onSaved?.(updatedEvent)
        markDirty('dashboard')
        router.refresh()
        onClose()
      }
    } else {
      const { data: newEvent, error } = await supabase
        .from('events')
        .insert(payload)
        .select()
        .single()
      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        const eventWithSubject: Event = {
          ...newEvent,
          sentiment,
          subjects: subjects.find(s => s.id === subjectId) ?? null,
        }
        onSaved?.(eventWithSubject)
        markDirty('dashboard')
        router.refresh()
        onClose()
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl border border-[#DFE1E6] shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-[#172B4D]">
            {existingEvent ? 'Edit event' : `Log event — ${studentName}`}
          </h2>
          <button
            onClick={onClose}
            className="text-[#6B778C] hover:text-[#172B4D] transition-colors btn-press-subtle p-1 rounded"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1.5 uppercase tracking-wide">
              Date
            </label>
            <DatePicker value={date} onChange={setDate} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5 uppercase tracking-wide">
                Sentiment
              </label>
              <Select
                options={SENTIMENT_OPTIONS}
                value={sentiment}
                onChange={v => setSentiment(v as Sentiment)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5 uppercase tracking-wide">
                Subject
              </label>
              <Select
                options={subjectOptions}
                value={subjectId}
                onChange={handleSubjectChange}
                onDeleteItem={handleDeleteSubject}
              />
            </div>
          </div>

          {showAddSubject && (
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={newSubjectName}
                onChange={e => setNewSubjectName(e.target.value)}
                placeholder="New subject name"
                className="flex-1 px-3 py-2 border border-[#DFE1E6] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent"
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSubject())}
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddSubject}
                disabled={addingSubject || !newSubjectName.trim()}
                className="flex items-center gap-1 px-3 py-2 bg-[#0052CC] text-white rounded-lg text-sm font-semibold hover:bg-[#0065FF] disabled:opacity-50 transition-colors btn-press"
              >
                <Plus size={14} />
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowAddSubject(false)}
                className="px-3 py-2 border border-[#DFE1E6] rounded-lg text-sm text-[#42526E] hover:bg-[#F4F5F7] transition-colors btn-press-subtle"
              >
                Cancel
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1.5 uppercase tracking-wide">
              What happened?
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
              rows={4}
              className="w-full px-3 py-2 border border-[#DFE1E6] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent resize-none"
              placeholder="Describe the observation…"
            />
          </div>

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#DFE1E6] rounded-lg text-sm font-semibold text-[#42526E] hover:bg-[#F4F5F7] transition-colors btn-press-subtle"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#0052CC] text-white py-2 rounded-lg text-sm font-semibold hover:bg-[#0065FF] disabled:opacity-50 transition-colors btn-press"
            >
              {loading ? 'Saving…' : existingEvent ? 'Save changes' : 'Log event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

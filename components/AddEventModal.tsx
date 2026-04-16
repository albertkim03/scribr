'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { X, Plus } from 'lucide-react'
import Select from './Select'
import type { Subject, Sentiment, Event } from '@/types'
import { markDirty } from '@/lib/route-cache'

interface Props {
  studentId: string
  studentName: string
  subjects: Subject[]
  existingEvent?: Event
  defaultSentiment?: Sentiment
  onClose: () => void
}

const SENTIMENT_OPTIONS = [
  { value: 'positive', label: 'Positive' },
  { value: 'neutral',  label: 'Neutral'  },
  { value: 'negative', label: 'Negative' },
]

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
    await supabase.from('subjects').delete().eq('id', deletedId)
    setSubjects(prev => prev.filter(s => s.id !== deletedId))
    if (subjectId === deletedId) setSubjectId('')
  }

  async function handleAddSubject() {
    if (!newSubjectName.trim()) return
    setAddingSubject(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setAddingSubject(false); return }

    const { data, error } = await supabase
      .from('subjects')
      .insert({ user_id: user.id, name: newSubjectName.trim() })
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      student_id: studentId,
      user_id: user.id,
      subject_id: subjectId || null,
      sentiment,
      description: description.trim(),
    }

    const { error } = existingEvent
      ? await supabase.from('events').update(payload).eq('id', existingEvent.id)
      : await supabase.from('events').insert(payload)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      markDirty('dashboard')
      router.refresh()
      onClose()
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

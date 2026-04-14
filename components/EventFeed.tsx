'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import AddEventModal from './AddEventModal'
import type { Event, Subject, Sentiment } from '@/types'

interface Props {
  events: Event[]
  subjects: Subject[]
  studentId: string
  studentName: string
}

const SENTIMENT_STYLES: Record<Sentiment, string> = {
  positive: 'bg-green-100 text-green-800',
  neutral: 'bg-amber-100 text-amber-800',
  negative: 'bg-red-100 text-red-800',
}

type SortOption = 'newest' | 'oldest' | 'subject' | 'sentiment'

export default function EventFeed({ events: initialEvents, subjects, studentId, studentName }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [filterSubjects, setFilterSubjects] = useState<string[]>([])
  const [filterSentiments, setFilterSentiments] = useState<Sentiment[]>([])
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function toggleSubjectFilter(id: string) {
    setFilterSubjects(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  function toggleSentimentFilter(s: Sentiment) {
    setFilterSentiments(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    )
  }

  async function handleDelete(eventId: string) {
    if (!confirm('Delete this event?')) return
    setDeletingId(eventId)
    await supabase.from('events').delete().eq('id', eventId)
    setDeletingId(null)
    router.refresh()
  }

  const filtered = initialEvents
    .filter(e => {
      if (filterSubjects.length > 0 && !filterSubjects.includes(e.subject_id ?? '')) return false
      if (filterSentiments.length > 0 && !filterSentiments.includes(e.sentiment)) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return b.created_at.localeCompare(a.created_at)
      if (sortBy === 'oldest') return a.created_at.localeCompare(b.created_at)
      if (sortBy === 'subject') return (a.subjects?.name ?? '').localeCompare(b.subjects?.name ?? '')
      if (sortBy === 'sentiment') return a.sentiment.localeCompare(b.sentiment)
      return 0
    })

  const sentiments: Sentiment[] = ['positive', 'neutral', 'negative']

  return (
    <>
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <div>
          <label className="text-xs font-medium text-slate-500 mr-1.5">Sort by</label>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortOption)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="subject">Subject</option>
            <option value="sentiment">Sentiment</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-slate-500">Subject:</span>
          {subjects.map(s => (
            <button
              key={s.id}
              onClick={() => toggleSubjectFilter(s.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                filterSubjects.includes(s.id)
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-slate-500">Sentiment:</span>
          {sentiments.map(s => (
            <button
              key={s}
              onClick={() => toggleSentimentFilter(s)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                filterSentiments.includes(s)
                  ? SENTIMENT_STYLES[s]
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          No events match the current filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(event => (
            <div key={event.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-400">
                    {new Date(event.created_at).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  {event.subjects && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                      {event.subjects.name}
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${SENTIMENT_STYLES[event.sentiment]}`}
                  >
                    {event.sentiment}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditingEvent(event)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                    title="Edit event"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(event.id)}
                    disabled={deletingId === event.id}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete event"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">{event.description}</p>
            </div>
          ))}
        </div>
      )}

      {editingEvent && (
        <AddEventModal
          studentId={studentId}
          studentName={studentName}
          subjects={subjects}
          existingEvent={editingEvent}
          onClose={() => setEditingEvent(null)}
        />
      )}
    </>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, ThumbsUp, Minus, ThumbsDown } from 'lucide-react'
import AddEventModal from './AddEventModal'
import ConfirmModal from './ConfirmModal'
import type { Event, Subject, Sentiment } from '@/types'

interface Props {
  events: Event[]
  subjects: Subject[]
  studentId: string
  studentName: string
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

const COLUMNS: { sentiment: Sentiment; label: string; Icon: React.ElementType; headerClass: string; addClass: string; cardBg: string; cardBorder: string; iconClass: string }[] = [
  {
    sentiment: 'positive',
    label: 'Positive',
    Icon: ThumbsUp,
    headerClass: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    addClass: 'text-emerald-700 hover:bg-emerald-50 border-emerald-200',
    cardBg: 'bg-emerald-50',
    cardBorder: 'border-emerald-200',
    iconClass: 'text-emerald-500',
  },
  {
    sentiment: 'neutral',
    label: 'Neutral',
    Icon: Minus,
    headerClass: 'bg-amber-50 border-amber-200 text-amber-700',
    addClass: 'text-amber-700 hover:bg-amber-50 border-amber-200',
    cardBg: 'bg-amber-50/80',
    cardBorder: 'border-amber-200',
    iconClass: 'text-amber-500',
  },
  {
    sentiment: 'negative',
    label: 'Negative',
    Icon: ThumbsDown,
    headerClass: 'bg-red-50 border-red-200 text-red-700',
    addClass: 'text-red-700 hover:bg-red-50 border-red-200',
    cardBg: 'bg-red-50',
    cardBorder: 'border-red-200',
    iconClass: 'text-red-400',
  },
]

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

interface ModalState {
  defaultSentiment?: Sentiment
  existingEvent?: Event
}

export default function TrelloEventBoard({ events, subjects, studentId, studentName }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [modalState, setModalState] = useState<ModalState | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)

  const subjectColorMap: Record<string, typeof SUBJECT_PALETTE[0]> = {}
  subjects.forEach((s, i) => { subjectColorMap[s.id] = SUBJECT_PALETTE[i % SUBJECT_PALETTE.length] })

  function handleDelete(e: React.MouseEvent, eventId: string) {
    e.stopPropagation()
    setConfirmModal({
      message: 'Delete this event? This cannot be undone.',
      onConfirm: async () => {
        setConfirmModal(null)
        setDeletingId(eventId)
        await supabase.from('events').delete().eq('id', eventId)
        setDeletingId(null)
        router.refresh()
      },
    })
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {COLUMNS.map(col => {
          const ColIcon = col.Icon
          const colEvents = events.filter(e => e.sentiment === col.sentiment)
          return (
            <div key={col.sentiment} className="flex flex-col min-w-[280px] max-w-[320px] flex-shrink-0">
              {/* Column header */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-t-xl border ${col.headerClass} border-b-0`}>
                <ColIcon size={14} />
                <span className="text-sm font-bold">{col.label}</span>
                <span className="ml-auto text-xs font-medium opacity-70">{colEvents.length}</span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 p-2 bg-[#F4F5F7] rounded-b-xl min-h-[120px] flex-1">
                {colEvents.length === 0 && (
                  <p className="text-xs text-[#6B778C] text-center py-4 opacity-60">
                    No {col.label.toLowerCase()} events
                  </p>
                )}
                {colEvents.map(event => {
                  const subColor = event.subject_id
                    ? (subjectColorMap[event.subject_id] ?? SUBJECT_PALETTE[7])
                    : SUBJECT_PALETTE[7]
                  const ColIcon = col.Icon
                  return (
                    <div
                      key={event.id}
                      onClick={() => setModalState({ existingEvent: event })}
                      className={`relative rounded-lg border shadow-sm p-3 group hover:shadow-md transition-all cursor-pointer ${col.cardBg} ${col.cardBorder}`}
                    >
                      {/* Sentiment icon — top-right corner */}
                      <ColIcon size={12} className={`absolute top-2.5 right-2.5 ${col.iconClass} opacity-60`} />

                      {/* Subject pill */}
                      {event.subjects && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold mb-2 ${subColor.pill}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${subColor.dot}`} />
                          {event.subjects.name}
                        </span>
                      )}

                      {/* Description */}
                      <p className="text-xs text-[#172B4D] leading-relaxed line-clamp-4">
                        {event.description}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-2.5">
                        <span className="text-xs text-[#6B778C]">{formatDate(event.created_at)}</span>
                        <button
                          onClick={e => handleDelete(e, event.id)}
                          disabled={deletingId === event.id}
                          className="p-1.5 text-[#6B778C] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors btn-press-subtle opacity-0 group-hover:opacity-100 disabled:opacity-40"
                          title="Delete"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}

                {/* Add card button */}
                <button
                  onClick={() => setModalState({ defaultSentiment: col.sentiment })}
                  className={`flex items-center gap-1.5 w-full px-3 py-2 rounded-lg text-xs font-semibold border border-dashed transition-colors btn-press-subtle mt-1 ${col.addClass}`}
                >
                  <Plus size={12} />
                  Add {col.label.toLowerCase()} event
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {modalState && (
        <AddEventModal
          studentId={studentId}
          studentName={studentName}
          subjects={subjects}
          existingEvent={modalState.existingEvent}
          defaultSentiment={modalState.defaultSentiment}
          onClose={() => setModalState(null)}
        />
      )}
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </>
  )
}

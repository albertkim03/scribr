'use client'

import { useState } from 'react'
import { X, Sparkles, ThumbsUp, Minus, ThumbsDown, Check } from 'lucide-react'
import type { Event, Subject, Sentiment } from '@/types'

const WORD_COUNT_OPTIONS = [
  { label: 'Brief', value: 150, desc: '~150 words' },
  { label: 'Standard', value: 300, desc: '~300 words' },
  { label: 'Detailed', value: 500, desc: '~500 words' },
]

interface Props {
  studentName: string
  events: Event[]
  subjects: Subject[]
  onGenerate: (selectedEventIds: string[], wordCount: number) => void
  onClose: () => void
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

const SENTIMENT_ICONS: Record<Sentiment, { Icon: React.ElementType; classes: string }> = {
  positive: { Icon: ThumbsUp,   classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  neutral:  { Icon: Minus,      classes: 'bg-amber-50 text-amber-700 border border-amber-200' },
  negative: { Icon: ThumbsDown, classes: 'bg-red-50 text-red-700 border border-red-200' },
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function GenerateReportModal({ studentName, events, subjects, onGenerate, onClose }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(events.map(e => e.id)))
  const [wordCount, setWordCount] = useState(300)

  const subjectColorMap: Record<string, typeof SUBJECT_PALETTE[0]> = {}
  subjects.forEach((s, i) => { subjectColorMap[s.id] = SUBJECT_PALETTE[i % SUBJECT_PALETTE.length] })

  const allSelected = selectedIds.size === events.length
  const noneSelected = selectedIds.size === 0

  function toggle(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(events.map(e => e.id)))
  }

  function handleGenerate() {
    if (selectedIds.size === 0) return
    onGenerate([...selectedIds], wordCount)
    // Do NOT call onClose() — parent's phase transition dismisses this modal
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header — soft gradient */}
        <div className="bg-gradient-to-br from-violet-50 via-blue-50 to-cyan-50 border-b border-[#DFE1E6] rounded-t-2xl px-6 py-5 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles size={16} className="text-violet-500" />
                <span className="text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
                  AI Report Generation
                </span>
              </div>
              <h2 className="text-lg font-black text-[#172B4D]">
                Report for {studentName}
              </h2>
              <p className="text-sm text-[#42526E] mt-0.5">
                Select which events to include. All are selected by default.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-[#6B778C] hover:text-[#172B4D] transition-colors mt-0.5 p-1 rounded btn-press-subtle"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex items-center justify-between mt-3">
            <span className="text-sm text-[#42526E]">
              <strong className="text-[#172B4D]">{selectedIds.size}</strong> of {events.length} events selected
            </span>
            <button
              onClick={toggleAll}
              className="text-xs font-bold text-[#0052CC] hover:underline"
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          </div>
        </div>

        {/* Events list */}
        {events.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-[#6B778C] text-sm">No events logged yet for this student.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {events.map(event => {
              const isSelected = selectedIds.has(event.id)
              const subColor = event.subject_id
                ? (subjectColorMap[event.subject_id] ?? SUBJECT_PALETTE[7])
                : SUBJECT_PALETTE[7]
              const { Icon: SentimentIcon, classes: sentimentClass } = SENTIMENT_ICONS[event.sentiment]

              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => toggle(event.id)}
                  className={`w-full text-left rounded-xl border-2 p-3.5 transition-all btn-press-subtle ${
                    isSelected
                      ? 'bg-white border-[#0052CC] shadow-sm'
                      : 'bg-[#F4F5F7] border-transparent opacity-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? 'bg-[#0052CC] border-[#0052CC]' : 'bg-white border-[#DFE1E6]'
                    }`}>
                      {isSelected && <Check size={11} className="text-white" strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        {event.subjects && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${subColor.pill}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${subColor.dot}`} />
                            {event.subjects.name}
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${sentimentClass}`}>
                          <SentimentIcon size={10} />
                          {event.sentiment.charAt(0).toUpperCase() + event.sentiment.slice(1)}
                        </span>
                        <span className="text-xs text-[#6B778C] ml-auto">{formatDate(event.created_at)}</span>
                      </div>
                      <p className="text-sm text-[#172B4D] leading-relaxed line-clamp-2">
                        {event.description}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div className="shrink-0 px-4 py-4 border-t border-[#DFE1E6] bg-white rounded-b-2xl space-y-3">
          {/* Word count selector */}
          <div>
            <p className="text-xs font-bold text-[#42526E] uppercase tracking-wide mb-2">Report length</p>
            <div className="flex gap-2">
              {WORD_COUNT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setWordCount(opt.value)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all btn-press-subtle ${
                    wordCount === opt.value
                      ? 'bg-[#0052CC] text-white border-[#0052CC]'
                      : 'bg-white text-[#42526E] border-[#DFE1E6] hover:border-[#0052CC] hover:text-[#0052CC]'
                  }`}
                >
                  {opt.label}
                  <span className={`block text-[10px] font-normal mt-0.5 ${wordCount === opt.value ? 'text-blue-200' : 'text-[#6B778C]'}`}>
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-[#DFE1E6] rounded-lg text-sm font-semibold text-[#42526E] hover:bg-[#F4F5F7] transition-colors btn-press-subtle"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={noneSelected}
              className="flex-1 flex items-center justify-center gap-2 bg-white border border-purple-200 px-6 py-2 rounded-lg text-sm font-bold hover:border-purple-400 hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all btn-press"
            >
              <Sparkles size={14} className="text-violet-500" />
              <span className="bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
                Generate with {selectedIds.size} event{selectedIds.size !== 1 ? 's' : ''}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

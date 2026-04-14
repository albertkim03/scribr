'use client'

import { useState } from 'react'
import { X, Sparkles, ThumbsUp, Minus, ThumbsDown, Check } from 'lucide-react'
import type { Event, Subject, Sentiment } from '@/types'

interface Props {
  events: Event[]
  subjects: Subject[]
  onRegenerate: (instruction: string, selectedEventIds: string[], wordCount: number) => void
  onClose: () => void
}

const PRESETS = [
  { label: 'More formal',        instruction: 'Rewrite this report in a more formal and professional tone.' },
  { label: 'More compassionate', instruction: 'Rewrite this report in a warmer, more compassionate tone.' },
  { label: 'More positive',      instruction: 'Emphasise strengths and progress. Make the overall tone more positive and encouraging.' },
  { label: 'More concise',       instruction: 'Shorten this report significantly. Remove redundancy and keep only the most important points.' },
  { label: 'More detailed',      instruction: 'Expand this report with more specific detail and richer descriptions of each observation.' },
  { label: 'Different wording',  instruction: 'Rewrite this report using completely different wording and sentence structures, while keeping the same facts.' },
]

const WORD_COUNT_OPTIONS = [
  { label: 'Brief', value: 150, desc: '~150 words' },
  { label: 'Standard', value: 300, desc: '~300 words' },
  { label: 'Detailed', value: 500, desc: '~500 words' },
]

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

export default function RegenerateModal({ events, subjects, onRegenerate, onClose }: Props) {
  const [instruction, setInstruction] = useState('')
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(events.map(e => e.id)))
  const [wordCount, setWordCount] = useState(300)
  const [showEvents, setShowEvents] = useState(false)

  const subjectColorMap: Record<string, typeof SUBJECT_PALETTE[0]> = {}
  subjects.forEach((s, i) => { subjectColorMap[s.id] = SUBJECT_PALETTE[i % SUBJECT_PALETTE.length] })

  const allSelected = selectedIds.size === events.length

  function toggleEvent(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectPreset(preset: typeof PRESETS[0]) {
    setActivePreset(preset.label)
    setInstruction(preset.instruction)
  }

  function handleSubmit() {
    const trimmed = instruction.trim()
    if (!trimmed) return
    onRegenerate(trimmed, [...selectedIds], wordCount)
    // Do NOT call onClose() — parent's phase transition dismisses this modal
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-br from-violet-50 via-blue-50 to-cyan-50 border-b border-[#DFE1E6] px-6 py-5 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles size={15} className="text-violet-500" />
                <span className="text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
                  Regenerate Report
                </span>
              </div>
              <h2 className="text-lg font-black text-[#172B4D]">
                What should we focus on?
              </h2>
              <p className="text-sm text-[#42526E] mt-0.5">
                Your previous report is used as context and revised accordingly.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-[#6B778C] hover:text-[#172B4D] transition-colors p-1 rounded mt-0.5 btn-press-subtle"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="p-6 space-y-5">
            {/* Preset chips */}
            <div>
              <p className="text-xs font-bold text-[#42526E] uppercase tracking-wide mb-3">
                Quick presets
              </p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => selectPreset(preset)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all btn-press-subtle border ${
                      activePreset === preset.label
                        ? 'bg-[#0052CC] text-white border-[#0052CC] shadow-md'
                        : 'bg-white text-[#42526E] border-[#DFE1E6] hover:border-[#0052CC] hover:text-[#0052CC]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom instruction */}
            <div>
              <label className="text-xs font-bold text-[#42526E] uppercase tracking-wide mb-2 block">
                Or write your own instruction
              </label>
              <textarea
                value={instruction}
                onChange={e => { setInstruction(e.target.value); setActivePreset(null) }}
                rows={3}
                placeholder="e.g. Focus on improvement over the year and end on an encouraging note…"
                className="w-full px-3 py-2.5 border border-[#DFE1E6] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent resize-none text-[#172B4D] placeholder-[#6B778C]"
              />
            </div>

            {/* Events */}
            {events.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowEvents(v => !v)}
                  className="flex items-center justify-between w-full text-xs font-bold text-[#42526E] uppercase tracking-wide mb-2 hover:text-[#172B4D] transition-colors"
                >
                  <span>Events included · <span className="normal-case font-semibold text-[#0052CC]">{selectedIds.size} of {events.length} selected</span></span>
                  <span className="text-[#6B778C] normal-case font-semibold">{showEvents ? 'Hide' : 'Change'}</span>
                </button>
                {showEvents && (
                  <div className="border border-[#DFE1E6] rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-[#F4F5F7] border-b border-[#DFE1E6]">
                      <span className="text-xs text-[#6B778C]">
                        {allSelected ? 'All events selected' : `${selectedIds.size} events selected`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedIds(allSelected ? new Set() : new Set(events.map(e => e.id)))}
                        className="text-xs font-bold text-[#0052CC] hover:underline"
                      >
                        {allSelected ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto divide-y divide-[#F4F5F7]">
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
                            onClick={() => toggleEvent(event.id)}
                            className={`w-full text-left px-3 py-2 flex items-start gap-2.5 transition-colors ${
                              isSelected ? 'bg-white hover:bg-[#F4F5F7]' : 'bg-[#F4F5F7]/50 opacity-50 hover:opacity-70'
                            }`}
                          >
                            <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isSelected ? 'bg-[#0052CC] border-[#0052CC]' : 'bg-white border-[#DFE1E6]'
                            }`}>
                              {isSelected && <Check size={9} className="text-white" strokeWidth={3} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                                {event.subjects && (
                                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold ${subColor.pill}`}>
                                    <span className={`w-1 h-1 rounded-full ${subColor.dot}`} />
                                    {event.subjects.name}
                                  </span>
                                )}
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold ${sentimentClass}`}>
                                  <SentimentIcon size={9} />
                                </span>
                                <span className="text-xs text-[#6B778C] ml-auto">{formatDate(event.created_at)}</span>
                              </div>
                              <p className="text-xs text-[#172B4D] line-clamp-1">{event.description}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Word count */}
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

            {/* Footer */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-[#DFE1E6] rounded-lg text-sm font-semibold text-[#42526E] hover:bg-[#F4F5F7] transition-colors btn-press-subtle"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!instruction.trim() || selectedIds.size === 0}
                className="flex-1 flex items-center justify-center gap-2 bg-white border border-purple-200 py-2.5 rounded-lg text-sm font-bold hover:border-purple-400 hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all btn-press"
              >
                <Sparkles size={14} className="text-violet-500" />
                <span className="bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
                  Regenerate
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

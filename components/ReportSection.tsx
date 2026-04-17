'use client'

import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import ReportEditor from './ReportEditor'
import GenerateReportModal from './GenerateReportModal'
import RegenerateModal from './RegenerateModal'
import type { Event, Report, Subject } from '@/types'

type Phase =
  | { type: 'empty' }
  | { type: 'confirm-generate' }
  | { type: 'generating' }
  | { type: 'animating'; text: string; reportId: string }
  | { type: 'editing'; report: Report }
  | { type: 'confirm-regenerate'; report: Report }

interface Props {
  studentId: string
  studentName: string
  report: Report | null
  events: Event[]
  subjects: Subject[]
  profileNotes?: string
}

// ── Typewriter display ─────────────────────────────────────────
function TypewriterDisplay({ text, onDone }: { text: string; onDone: (text: string) => void }) {
  const [displayed, setDisplayed] = useState('')

  // Strip any residual HTML tags (safety net — API should return plain text)
  const plainText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

  useEffect(() => {
    let pos = 0
    const BATCH = 28
    const INTERVAL = 22
    const id = setInterval(() => {
      pos = Math.min(pos + BATCH, plainText.length)
      setDisplayed(plainText.slice(0, pos))
      if (pos >= plainText.length) {
        clearInterval(id)
        setTimeout(() => onDone(text), 500)
      }
    }, INTERVAL)
    return () => clearInterval(id)
  }, [plainText]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-white rounded-xl border-2 border-[#0052CC] shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#DEEBFF] border-b border-[#0052CC]/20">
        <div className="flex gap-1">
          {[0, 150, 300].map(delay => (
            <span
              key={delay}
              className="w-2 h-2 rounded-full bg-[#0052CC]"
              style={{ animation: `blink 1s step-start ${delay}ms infinite` }}
            />
          ))}
        </div>
        <span className="text-xs font-bold text-[#0052CC] tracking-wide">AI is writing…</span>
      </div>
      <div className="px-6 py-5 min-h-[200px] text-[#172B4D] leading-[1.45] whitespace-pre-wrap text-[0.875rem]">
        {displayed}
        <span className="typewriter-cursor" />
      </div>
    </div>
  )
}

// ── Generating state ──────────────────────────────────────────
function GeneratingState() {
  return (
    <div className="bg-white rounded-xl border-2 border-purple-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-br from-violet-50 via-blue-50 to-cyan-50 px-6 py-10 flex flex-col items-center text-center">
        <div className="relative mb-5">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-100 to-cyan-100 flex items-center justify-center">
            <Sparkles size={22} className="text-violet-500" />
          </div>
          {/* <Loader2
            size={52}
            className="animate-spin text-[#0052CC]/30 absolute inset-[-3px]"
            strokeWidth={1.5}
          /> */}
        </div>
        <p className="text-base font-black text-[#172B4D] mb-1">Generating report…</p>
        <p className="text-sm text-[#42526E]">Watch a TikTok while this generates</p>
        <div className="flex gap-1.5 mt-4">
          {[0, 200, 400].map(delay => (
            <span
              key={delay}
              className="w-1.5 h-1.5 rounded-full bg-[#0052CC]/40"
              style={{ animation: `blink 1.2s ease-in-out ${delay}ms infinite` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────
export default function ReportSection({
  studentId,
  studentName,
  report: initialReport,
  events,
  subjects,
  profileNotes = '',
}: Props) {
  const [phase, setPhase] = useState<Phase>(
    initialReport ? { type: 'editing', report: initialReport } : { type: 'empty' }
  )
  const [error, setError] = useState('')

  async function handleGenerate(selectedEventIds: string[], length: string, includeProfileNotes: boolean) {
    setPhase({ type: 'generating' })
    setError('')
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, selectedEventIds, length, includeProfileNotes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (typeof data.usageCount === 'number') {
        window.dispatchEvent(new CustomEvent('ai-usage-updated', { detail: { count: data.usageCount } }))
      }
      setPhase({ type: 'animating', text: data.report.content, reportId: data.report.id })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate. Please try again.')
      setPhase({ type: 'empty' })
    }
  }

  async function handleRegenerate(focusInstruction: string, selectedEventIds: string[], length: string, includeProfileNotes: boolean) {
    const previousReport = phase.type === 'confirm-regenerate' ? phase.report : null
    setPhase({ type: 'generating' })
    setError('')
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, selectedEventIds, previousContent: previousReport?.content, focusInstruction, length, includeProfileNotes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (typeof data.usageCount === 'number') {
        window.dispatchEvent(new CustomEvent('ai-usage-updated', { detail: { count: data.usageCount } }))
      }
      setPhase({ type: 'animating', text: data.report.content, reportId: data.report.id })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate. Please try again.')
      if (previousReport) {
        setPhase({ type: 'editing', report: previousReport })
      } else {
        setPhase({ type: 'empty' })
      }
    }
  }

  function handleAnimationDone(text: string) {
    if (phase.type !== 'animating') return
    setPhase({
      type: 'editing',
      report: {
        id: phase.reportId,
        student_id: studentId,
        user_id: '',
        content: text,
        is_draft: true,
        generated_at: new Date().toISOString(),
        last_edited_at: new Date().toISOString(),
      },
    })
  }

  // ── Render ─────────────────────────────────────────────────
  if (phase.type === 'empty') {
    return (
      <>
        <div className="bg-white rounded-xl border border-[#DFE1E6] shadow-sm p-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-[#DEEBFF] rounded-full flex items-center justify-center mb-4">
            <Sparkles size={24} className="text-[#0052CC]" />
          </div>
          <h3 className="text-lg font-bold text-[#172B4D] mb-1">No report yet</h3>
          <p className="text-sm text-[#42526E] mb-5 max-w-sm">
            Generate an AI-written report for {studentName} based on all logged events and profile notes.
          </p>
          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-4 max-w-sm">
              {error}
            </p>
          )}
          <button
            onClick={() => (events.length > 0 || profileNotes.trim()) ? setPhase({ type: 'confirm-generate' }) : undefined}
            disabled={events.length === 0 && !profileNotes.trim()}
            className="flex items-center gap-2 bg-white border border-purple-200 px-6 py-2.5 rounded-lg font-semibold hover:border-purple-400 hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all btn-press text-sm"
          >
            <Sparkles size={15} className="text-violet-500" />
            <span className="bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
              {events.length === 0 && !profileNotes.trim() ? 'Log events first' : 'Generate report'}
            </span>
          </button>
        </div>

        {phase.type === ('confirm-generate' as string) && null}
      </>
    )
  }

  if (phase.type === 'confirm-generate') {
    return (
      <>
        <div className="bg-white rounded-xl border border-[#DFE1E6] shadow-sm p-12 flex flex-col items-center text-center">
          <Sparkles size={24} className="text-[#0052CC] mb-2" />
          <p className="text-sm text-[#42526E]">Select events below…</p>
        </div>
        <GenerateReportModal
          studentName={studentName}
          events={events}
          subjects={subjects}
          profileNotes={profileNotes}
          onGenerate={handleGenerate}
          onClose={() => setPhase({ type: 'empty' })}
        />
      </>
    )
  }

  if (phase.type === 'generating') {
    return <GeneratingState />
  }

  if (phase.type === 'animating') {
    return <TypewriterDisplay text={phase.text} onDone={handleAnimationDone} />
  }

  // editing or confirm-regenerate
  const currentReport = phase.type === 'editing' || phase.type === 'confirm-regenerate'
    ? phase.report
    : null
  if (!currentReport) return null

  return (
    <>
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-3">
          {error}
          <button onClick={() => setError('')} className="ml-2 text-red-400 hover:text-red-600 float-right">×</button>
        </p>
      )}
      <ReportEditor
        studentName={studentName}
        initialContent={currentReport.content}
        reportId={currentReport.id}
        isDraft={currentReport.is_draft}
        onRequestRegenerate={() => setPhase({ type: 'confirm-regenerate', report: currentReport })}
      />
      {phase.type === 'confirm-regenerate' && (
        <RegenerateModal
          events={events}
          subjects={subjects}
          profileNotes={profileNotes}
          onRegenerate={handleRegenerate}
          onClose={() => setPhase({ type: 'editing', report: phase.report })}
        />
      )}
    </>
  )
}

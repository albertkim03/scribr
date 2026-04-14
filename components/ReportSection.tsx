'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
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
}

// ── Typewriter display ─────────────────────────────────────────
function TypewriterDisplay({ text, onDone }: { text: string; onDone: (text: string) => void }) {
  const [displayed, setDisplayed] = useState('')

  useEffect(() => {
    let pos = 0
    const BATCH = 28
    const INTERVAL = 22
    const id = setInterval(() => {
      pos = Math.min(pos + BATCH, text.length)
      setDisplayed(text.slice(0, pos))
      if (pos >= text.length) {
        clearInterval(id)
        setTimeout(() => onDone(text), 500)
      }
    }, INTERVAL)
    return () => clearInterval(id)
  }, [text]) // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="px-6 py-5 min-h-[200px] font-[Georgia,serif] text-[#172B4D] leading-[1.8] whitespace-pre-wrap text-[0.95rem]">
        {displayed}
        <span className="typewriter-cursor" />
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
}: Props) {
  const [phase, setPhase] = useState<Phase>(
    initialReport ? { type: 'editing', report: initialReport } : { type: 'empty' }
  )
  const [error, setError] = useState('')

  async function handleGenerate(selectedEventIds: string[]) {
    setPhase({ type: 'generating' })
    setError('')
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, selectedEventIds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPhase({ type: 'animating', text: data.report.content, reportId: data.report.id })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate. Please try again.')
      setPhase({ type: 'empty' })
    }
  }

  async function handleRegenerate(focusInstruction: string) {
    const previousReport = phase.type === 'confirm-regenerate' ? phase.report : null
    setPhase({ type: 'generating' })
    setError('')
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, previousContent: previousReport?.content, focusInstruction }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
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
            onClick={() => events.length > 0 ? setPhase({ type: 'confirm-generate' }) : undefined}
            disabled={events.length === 0}
            className="flex items-center gap-2 bg-white border border-purple-200 px-6 py-2.5 rounded-lg font-semibold hover:border-purple-400 hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all btn-press text-sm"
          >
            <Sparkles size={15} className="text-violet-500" />
            <span className="bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
              {events.length === 0 ? 'Log events first' : 'Generate report'}
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
          onGenerate={handleGenerate}
          onClose={() => setPhase({ type: 'empty' })}
        />
      </>
    )
  }

  if (phase.type === 'generating') {
    return (
      <div className="bg-white rounded-xl border border-[#DFE1E6] shadow-sm p-12 flex flex-col items-center text-center">
        <Loader2 size={32} className="animate-spin text-[#0052CC] mb-4" />
        <p className="text-lg font-bold text-[#172B4D]">Generating report…</p>
        <p className="text-sm text-[#42526E] mt-1">This usually takes 10–20 seconds.</p>
      </div>
    )
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
      <ReportEditor
        studentId={studentId}
        studentName={studentName}
        initialContent={currentReport.content}
        reportId={currentReport.id}
        onRequestRegenerate={() => setPhase({ type: 'confirm-regenerate', report: currentReport })}
      />
      {phase.type === 'confirm-regenerate' && (
        <RegenerateModal
          onRegenerate={handleRegenerate}
          onClose={() => setPhase({ type: 'editing', report: phase.report })}
        />
      )}
    </>
  )
}

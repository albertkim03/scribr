'use client'

import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Info } from 'lucide-react'

interface Props {
  studentId: string
  initialNotes: string
}

export default function ProfileNotes({ studentId, initialNotes }: Props) {
  const supabase = createClient()
  const [notes, setNotes] = useState(initialNotes)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = useCallback((value: string) => {
    setNotes(value)
    setSaveStatus('unsaved')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      await supabase.from('students').update({ profile_notes: value }).eq('id', studentId)
      setSaveStatus('saved')
    }, 1000)
  }, [studentId, supabase])

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-[#42526E] uppercase tracking-wide">
            Profile notes
          </span>
          <div className="group relative">
            <Info size={12} className="text-[#6B778C] cursor-help" />
            <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-56 bg-[#172B4D] text-white text-xs rounded-lg px-3 py-2 shadow-lg z-10 pointer-events-none">
              These notes are included in AI report generation as additional context.
            </div>
          </div>
        </div>
        <span className={`text-xs transition-colors ${
          saveStatus === 'saving' ? 'text-[#0052CC]'
          : saveStatus === 'unsaved' ? 'text-amber-600'
          : 'text-[#6B778C]'
        }`}>
          {saveStatus === 'saving' ? 'Saving…'
            : saveStatus === 'unsaved' ? 'Unsaved'
            : 'Saved'}
        </span>
      </div>
      <textarea
        value={notes}
        onChange={e => handleChange(e.target.value)}
        rows={3}
        placeholder="Learning style, background context, special considerations… anything the AI should know when writing this student's report."
        className="w-full px-3 py-2.5 border border-[#DFE1E6] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent resize-none bg-white text-[#172B4D] placeholder-[#6B778C] transition-shadow"
      />
    </div>
  )
}

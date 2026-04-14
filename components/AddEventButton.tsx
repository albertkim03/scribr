'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import AddEventModal from './AddEventModal'
import type { Subject } from '@/types'

interface Props {
  studentId: string
  studentName: string
  subjects: Subject[]
}

export default function AddEventButton({ studentId, studentName, subjects }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
      >
        <Plus size={14} />
        Add event
      </button>
      {open && (
        <AddEventModal
          studentId={studentId}
          studentName={studentName}
          subjects={subjects}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

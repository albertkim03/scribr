'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import type { Subject } from '@/types'

interface Props {
  subjects: Subject[]
}

export default function SubjectManager({ subjects: initialSubjects }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [newName, setNewName] = useState('')
  const [addingNew, setAddingNew] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd() {
    if (!newName.trim()) return
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('subjects')
      .insert({ user_id: user.id, name: newName.trim() })
      .select()
      .single()

    if (error) {
      setError(error.message.includes('unique') ? 'A subject with that name already exists.' : error.message)
    } else {
      setSubjects(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName('')
      setAddingNew(false)
    }
  }

  async function handleRename(id: string) {
    if (!editingName.trim()) return
    setError('')
    const { error } = await supabase
      .from('subjects')
      .update({ name: editingName.trim() })
      .eq('id', id)

    if (error) {
      setError(error.message.includes('unique') ? 'A subject with that name already exists.' : error.message)
    } else {
      setSubjects(prev =>
        prev.map(s => s.id === id ? { ...s, name: editingName.trim() } : s)
          .sort((a, b) => a.name.localeCompare(b.name))
      )
      setEditingId(null)
      router.refresh()
    }
  }

  async function handleDelete(id: string, name: string) {
    const { count } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('subject_id', id)

    const eventCount = count ?? 0
    const msg = eventCount > 0
      ? `"${name}" has ${eventCount} associated event${eventCount !== 1 ? 's' : ''}. Deleting it will remove the subject tag from those events. Continue?`
      : `Delete subject "${name}"?`

    if (!confirm(msg)) return

    const { error } = await supabase.from('subjects').delete().eq('id', id)
    if (!error) {
      setSubjects(prev => prev.filter(s => s.id !== id))
      router.refresh()
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {subjects.length === 0 && !addingNew ? (
        <div className="px-4 py-10 text-center text-slate-400 text-sm">No subjects yet.</div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {subjects.map(subject => (
            <li key={subject.id} className="flex items-center gap-3 px-4 py-3">
              {editingId === subject.id ? (
                <>
                  <input
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRename(subject.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    autoFocus
                  />
                  <button
                    onClick={() => handleRename(subject.id)}
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                    title="Save"
                  >
                    <Check size={15} />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md transition-colors"
                    title="Cancel"
                  >
                    <X size={15} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-slate-800 font-medium">{subject.name}</span>
                  <button
                    onClick={() => { setEditingId(subject.id); setEditingName(subject.name) }}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                    title="Rename"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(subject.id, subject.name)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="px-4 py-2 text-sm text-red-600 bg-red-50 border-t border-red-100">{error}</p>
      )}

      <div className="border-t border-slate-100 px-4 py-3">
        {addingNew ? (
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Subject name"
              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyDown={e => {
                if (e.key === 'Enter') handleAdd()
                if (e.key === 'Escape') { setAddingNew(false); setNewName('') }
              }}
              autoFocus
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              <Check size={13} /> Add
            </button>
            <button
              onClick={() => { setAddingNew(false); setNewName('') }}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingNew(true)}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            <Plus size={14} /> Add subject
          </button>
        )}
      </div>
    </div>
  )
}

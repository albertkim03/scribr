'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { X, Check } from 'lucide-react'
import Select from './Select'
import AvatarUpload from './AvatarUpload'
import type { Gender, Class, StudentWithStats } from '@/types'
import { markDirty } from '@/lib/route-cache'

interface ExistingStudent {
  id: string
  first_name: string
  last_name: string
  gender: Gender
  class_id: string | null
  avatar_url?: string | null
}

interface Props {
  classes?: Class[]
  existingStudent?: ExistingStudent
  onClassDeleted?: (classId: string) => void
  /** Called after a new student is created — parent can add them to local state immediately */
  onCreated?: (student: StudentWithStats) => void
  /** Called after an existing student is saved — parent updates local state immediately */
  onSaved?: (id: string, updates: { first_name: string; last_name: string; gender: Gender; class_id: string | null; avatar_url?: string | null }) => void
  onClose: () => void
}

const GENDERS: Gender[] = ['Male', 'Female', 'Other', 'Prefer not to say']
const GENDER_OPTIONS = GENDERS.map(g => ({ value: g, label: g }))
const CREATE_CLASS_VALUE = '__create_class__'

export default function AddStudentModal({
  classes: initialClasses = [],
  existingStudent,
  onClassDeleted,
  onCreated,
  onSaved,
  onClose,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [firstName, setFirstName] = useState(existingStudent?.first_name ?? '')
  const [lastName, setLastName] = useState(existingStudent?.last_name ?? '')
  const [gender, setGender] = useState<Gender>(existingStudent?.gender ?? 'Male')
  const [classId, setClassId] = useState<string>(existingStudent?.class_id ?? '')
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [localClasses, setLocalClasses] = useState<Class[]>(initialClasses)
  const [creatingClass, setCreatingClass] = useState(false)
  const [newClassName, setNewClassName] = useState('')
  const [savingClass, setSavingClass] = useState(false)

  const classOptions = [
    { value: '', label: 'No class' },
    ...localClasses.map(c => ({ value: c.id, label: c.name })),
    { value: CREATE_CLASS_VALUE, label: '+ Create new class…', isAction: true },
  ]

  function handleClassChange(v: string) {
    if (v === CREATE_CLASS_VALUE) {
      setCreatingClass(true)
    } else {
      setClassId(v)
      setCreatingClass(false)
      setNewClassName('')
    }
  }

  async function handleCreateClass() {
    if (!newClassName.trim()) return
    setSavingClass(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSavingClass(false); return }
    const { data: newClass } = await supabase
      .from('classes')
      .insert({ user_id: session.user.id, name: newClassName.trim() })
      .select()
      .single()
    if (newClass) {
      setLocalClasses(prev => [...prev, newClass as Class])
      setClassId(newClass.id)
    }
    setSavingClass(false)
    setNewClassName('')
    setCreatingClass(false)
  }

  async function handleDeleteClass(deletedId: string) {
    supabase.from('classes').delete().eq('id', deletedId).then(() => {})
    setLocalClasses(prev => prev.filter(c => c.id !== deletedId))
    if (classId === deletedId) setClassId('')
    onClassDeleted?.(deletedId)
  }

  async function uploadAvatar(file: File, userId: string, studentId: string): Promise<string | null> {
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${userId}/${studentId}.${ext}`
    const { error } = await supabase.storage
      .from('student-avatars')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (error) return null
    const { data: { publicUrl } } = supabase.storage
      .from('student-avatars')
      .getPublicUrl(path)
    return publicUrl
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    // If the teacher was typing a new class name and didn't explicitly save it, auto-create it.
    let effectiveClassId = classId
    if (creatingClass && newClassName.trim()) {
      const { data: newClass } = await supabase
        .from('classes')
        .insert({ user_id: session.user.id, name: newClassName.trim() })
        .select()
        .single()
      if (newClass) effectiveClassId = newClass.id
    }

    const basePayload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      gender,
      class_id: effectiveClassId || null,
    }

    if (existingStudent) {
      // ── Edit existing student ──────────────────────────────
      const { error } = await supabase.from('students').update(basePayload).eq('id', existingStudent.id)
      if (error) { setError(error.message); setLoading(false); return }

      let avatarUrl = existingStudent.avatar_url ?? null
      if (pendingPhoto) {
        avatarUrl = await uploadAvatar(pendingPhoto, session.user.id, existingStudent.id)
        if (avatarUrl) {
          supabase.from('students').update({ avatar_url: avatarUrl }).eq('id', existingStudent.id).then(() => {})
        }
      }

      const updates = { ...basePayload, avatar_url: avatarUrl }
      onSaved?.(existingStudent.id, updates)
      markDirty('dashboard')
      router.refresh()
      onClose()
    } else {
      // ── Create new student ─────────────────────────────────
      const { data: savedStudent, error } = await supabase
        .from('students')
        .insert({ user_id: session.user.id, ...basePayload })
        .select()
        .single()

      if (error || !savedStudent) { setError(error?.message ?? 'Failed to save.'); setLoading(false); return }

      let avatarUrl: string | null = null
      if (pendingPhoto) {
        avatarUrl = await uploadAvatar(pendingPhoto, session.user.id, savedStudent.id)
        if (avatarUrl) {
          supabase.from('students').update({ avatar_url: avatarUrl }).eq('id', savedStudent.id).then(() => {})
        }
      }

      const studentWithStats: StudentWithStats = {
        ...savedStudent,
        avatar_url: avatarUrl,
        event_count: 0,
        last_event_date: null,
        events: [],
        classes: localClasses.find(c => c.id === effectiveClassId) ?? null,
      }
      onCreated?.(studentWithStats)
      markDirty('dashboard')
      router.refresh()
      onClose()
    }
  }

  const initials = `${firstName.trim()[0] ?? ''}${lastName.trim()[0] ?? ''}`.toUpperCase()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl border border-[#DFE1E6] shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-[#172B4D]">
            {existingStudent ? 'Edit student' : 'Add student'}
          </h2>
          <button
            onClick={onClose}
            className="text-[#6B778C] hover:text-[#172B4D] transition-colors p-1 rounded btn-press-subtle"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar */}
          <div className="flex justify-center pb-1">
            <div className="flex flex-col items-center gap-1.5">
              <AvatarUpload
                currentUrl={existingStudent?.avatar_url}
                initials={initials || '?'}
                onFileSelected={file => setPendingPhoto(file)}
              />
              <span className="text-xs text-[#6B778C]">Click or drag photo</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5 uppercase tracking-wide">
                First name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-[#DFE1E6] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5 uppercase tracking-wide">
                Last name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-[#DFE1E6] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5 uppercase tracking-wide">
                Gender
              </label>
              <Select
                options={GENDER_OPTIONS}
                value={gender}
                onChange={v => setGender(v as Gender)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5 uppercase tracking-wide">
                Class
              </label>
              <Select
                options={classOptions}
                value={classId}
                onChange={handleClassChange}
                onDeleteItem={handleDeleteClass}
                placeholder="No class"
              />
            </div>
          </div>

          {creatingClass && (
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5 uppercase tracking-wide">
                New class name
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateClass() } }}
                  placeholder="e.g. Year 5 Maths…"
                  autoFocus
                  className="flex-1 px-3 py-2 border border-[#DFE1E6] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={handleCreateClass}
                  disabled={savingClass || !newClassName.trim()}
                  className="flex items-center gap-1 px-3 py-2 bg-[#0052CC] text-white rounded-lg text-xs font-bold hover:bg-[#0065FF] disabled:opacity-50 transition-colors btn-press"
                >
                  <Check size={12} />
                  {savingClass ? '…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => { setCreatingClass(false); setNewClassName('') }}
                  className="p-2 text-[#6B778C] hover:text-[#172B4D] rounded-lg hover:bg-[#F4F5F7] transition-colors btn-press-subtle"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

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
              {loading
                ? (pendingPhoto ? 'Uploading…' : 'Saving…')
                : existingStudent ? 'Save changes' : 'Add student'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

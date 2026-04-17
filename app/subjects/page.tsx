export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SubjectManager from '@/components/SubjectManager'

export default async function SubjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .order('name')

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Manage subjects</h1>
        <p className="text-sm text-slate-500 mt-1">
          Add, rename, or remove subjects used when logging events.
        </p>
      </div>
      <SubjectManager subjects={subjects ?? []} />
    </main>
  )
}

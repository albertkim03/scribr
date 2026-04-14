export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Nav from '@/components/Nav'
import AllReportsView from '@/components/AllReportsView'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [reportsResult, subjectsResult] = await Promise.all([
    supabase
      .from('reports')
      .select('*, students(first_name, last_name, gender, class_id, classes(name), events(*, subjects(*)))')
      .eq('user_id', user.id)
      .order('last_edited_at', { ascending: false }),
    supabase
      .from('subjects')
      .select('*')
      .order('name'),
  ])

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        <AllReportsView
          reports={reportsResult.data ?? []}
          subjects={subjectsResult.data ?? []}
        />
      </main>
    </>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles } from 'lucide-react'

interface Props {
  studentId: string
  studentName: string
  autoGenerate?: boolean
}

export default function GenerateReportButton({ studentId, studentName, autoGenerate }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function generate() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed. Please try again.')
      setLoading(false)
    }
  }

  useEffect(() => {
    if (autoGenerate) generate()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {loading ? (
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className="animate-spin text-blue-600" />
          <div>
            <p className="text-lg font-medium text-slate-900">Generating report for {studentName}…</p>
            <p className="text-sm text-slate-500 mt-1">This usually takes 10–20 seconds.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center">
            <Sparkles size={24} className="text-blue-600" />
          </div>
          <div>
            <p className="text-lg font-medium text-slate-900">No report yet</p>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              Generate an AI-written report based on all logged events for {studentName}.
            </p>
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2 max-w-sm">{error}</p>
          )}
          <button
            onClick={generate}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <Sparkles size={15} />
            Generate report
          </button>
        </div>
      )}
    </div>
  )
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { studentId, selectedEventIds, previousContent, focusInstruction, length = 'standard' } = await request.json()
  if (!studentId) return NextResponse.json({ error: 'Missing studentId' }, { status: 400 })

  // Fetch student
  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId)
    .eq('user_id', user.id)
    .single()

  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  // Fetch events with subject info
  const { data: allEvents } = await supabase
    .from('events')
    .select('*, subjects(*)')
    .eq('student_id', studentId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (!allEvents || allEvents.length === 0) {
    return NextResponse.json({ error: 'No events logged for this student.' }, { status: 400 })
  }

  // Filter to selected events (if provided), otherwise use all
  const events =
    selectedEventIds && selectedEventIds.length > 0
      ? allEvents.filter(e => selectedEventIds.includes(e.id))
      : allEvents

  if (events.length === 0) {
    return NextResponse.json({ error: 'No events selected for the report.' }, { status: 400 })
  }

  // Group events by subject
  const grouped: Record<string, typeof events> = {}
  const subjectOrder: string[] = []
  for (const event of events) {
    const subjectName = event.subjects?.name ?? 'General'
    if (!grouped[subjectName]) {
      grouped[subjectName] = []
      subjectOrder.push(subjectName)
    }
    grouped[subjectName].push(event)
  }

  const sections = subjectOrder.map(subjectName => {
    const lines = grouped[subjectName].map(e => {
      const date = new Date(e.created_at).toLocaleDateString(undefined, {
        day: 'numeric', month: 'short', year: 'numeric',
      })
      return `${date} [${e.sentiment}]: ${e.description}`
    })
    return `--- ${subjectName.toUpperCase()} ---\n${lines.join('\n')}`
  })

  const profileContext = student.profile_notes?.trim()
    ? `\n[TEACHER NOTES]: ${student.profile_notes.trim()}\n`
    : ''

  // Strip any HTML tags from previousContent before including in prompt
  const cleanPreviousContent = previousContent
    ? previousContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    : null

  const isRevision = !!cleanPreviousContent

  const lengthGuidance: Record<string, string> = {
    brief: 'Write a brief, concise report — keep it short and to the point.',
    standard: 'Write a report of standard length — balanced and thorough.',
    detailed: 'Write a detailed, comprehensive report — cover each area in depth with rich descriptions.',
  }
  const lengthRule = lengthGuidance[length] ?? lengthGuidance.standard

  const sharedRules = `Output ONLY the report text. Do not start with "Here is..." or any introductory phrase. Begin directly with the student's first name. ${lengthRule} Do not use em dashes (—) — use commas or restructure sentences instead. Use plain text paragraphs separated by blank lines. Do not use HTML tags, markdown, bullet points, or headings.`

  const prompt = isRevision
    ? `You are revising an existing student report for a teacher.

[PREVIOUS REPORT]:
${cleanPreviousContent}

[TEACHER INSTRUCTION]: ${focusInstruction || 'Improve and refine this report.'}

Using the observations below (${events.length} events), rewrite the report according to the teacher's instruction. Keep it professional, in third person using the student's first name. Make meaningful changes — do not simply repeat the previous version.
${sharedRules}
${profileContext}
[STUDENT NAME]: ${student.first_name} ${student.last_name}
[GENDER]: ${student.gender}

${sections.join('\n\n')}`
    : `You are assisting a teacher in writing an end-of-year student report.
Below are observations logged throughout the year, grouped by subject.
Write a professional, balanced, and encouraging report in prose. Write in third person using the student's first name. Each subject should have its own paragraph.
${sharedRules}
${profileContext}
[STUDENT NAME]: ${student.first_name} ${student.last_name}
[GENDER]: ${student.gender}

${sections.join('\n\n')}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    const reportText = content.text

    const { data: report, error } = await supabase
      .from('reports')
      .upsert(
        {
          student_id: studentId,
          user_id: user.id,
          content: reportText,
          generated_at: new Date().toISOString(),
          last_edited_at: new Date().toISOString(),
        },
        { onConflict: 'student_id' }
      )
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ report })
  } catch (err) {
    console.error('Report generation error:', err)
    return NextResponse.json({ error: 'Failed to generate report. Please try again.' }, { status: 500 })
  }
}

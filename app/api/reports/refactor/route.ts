import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { selectedText, instruction } = await request.json()
  if (!selectedText || !instruction) {
    return NextResponse.json({ error: 'Missing selectedText or instruction' }, { status: 400 })
  }

  const prompt = `You are editing a student report written by a teacher. Rewrite only the text provided below according to the instruction. Return only the rewritten text — no preamble, no quotes, no explanation.

Instruction: ${instruction}

Text to rewrite:
${selectedText}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    return NextResponse.json({ text: content.text })
  } catch (err) {
    console.error('Refactor error:', err)
    return NextResponse.json({ error: 'Failed to refactor text. Please try again.' }, { status: 500 })
  }
}

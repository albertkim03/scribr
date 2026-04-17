import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic'
import { AI_DAILY_LIMIT } from '@/lib/ai-config'
import { getResetCountdown } from '@/components/helpers/AIUsage'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { selectedText, instruction, fullContent } = await request.json()
  if (!selectedText || !instruction) {
    return NextResponse.json({ error: 'Missing selectedText or instruction' }, { status: 400 })
  }

  // ── Rate limit check ────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0]
  const { data: usageRow } = await supabase
    .from('ai_usage')
    .select('count')
    .eq('user_id', user.id)
    .eq('date', today)
    .maybeSingle()

  const currentCount = usageRow?.count ?? 0
  if (currentCount >= AI_DAILY_LIMIT) {
    return NextResponse.json({
      error: `You've reached today's limit of ${AI_DAILY_LIMIT} AI requests. ${getResetCountdown()}`,
      rateLimited: true,
    }, { status: 429 })
  }

  const contextBlock = fullContent
    ? `\n\nFull report context (for reference — do not rewrite this, use it to understand tone and content):\n${fullContent}\n`
    : ''

  const prompt = `You are editing a student report written by a teacher. Rewrite ONLY the selected text below according to the instruction. Return only the rewritten text — no preamble, no quotes, no explanation.${contextBlock}
Instruction: ${instruction}

Selected text to rewrite:
${selectedText}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    // Increment usage counter (fire and forget — don't block the response)
    supabase.from('ai_usage').upsert(
      { user_id: user.id, date: today, count: currentCount + 1 },
      { onConflict: 'user_id,date' }
    ).then(() => {})

    return NextResponse.json({ text: content.text, usageCount: currentCount + 1 })
  } catch (err) {
    console.error('Refactor error:', err)
    return NextResponse.json({ error: 'Failed to refactor text. Please try again.' }, { status: 500 })
  }
}

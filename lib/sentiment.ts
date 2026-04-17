import type { Sentiment } from '@/types'

/** Maps sentiment string to the INT2 value stored in the database */
export const SENTIMENT_TO_INT: Record<Sentiment, number> = {
  positive: 2,
  neutral:  1,
  negative: 0,
}

/** Maps INT2 database value back to sentiment string */
const INT_TO_SENTIMENT: Record<number, Sentiment> = {
  2: 'positive',
  1: 'neutral',
  0: 'negative',
}

/** Convert a raw DB INT2 value to the frontend Sentiment string */
export function parseSentiment(raw: number): Sentiment {
  return INT_TO_SENTIMENT[raw] ?? 'neutral'
}

/** Convert a frontend Sentiment string to the INT2 value for writing to the DB */
export function encodeSentiment(s: Sentiment): number {
  return SENTIMENT_TO_INT[s]
}

/** Normalise the sentiment field on any event-shaped object returned from Supabase */
export function withSentiment<T extends { sentiment: unknown }>(event: T): T & { sentiment: Sentiment } {
  return { ...event, sentiment: parseSentiment(event.sentiment as number) }
}

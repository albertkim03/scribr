import type { Gender } from '@/types'

/** Maps gender string to the INT2 value stored in the database */
export const GENDER_TO_INT: Record<Gender, number> = {
  'Male':              0,
  'Female':            1,
  'Other':             2,
  'Prefer not to say': 3,
}

/** Maps INT2 database value back to gender string */
const INT_TO_GENDER: Record<number, Gender> = {
  0: 'Male',
  1: 'Female',
  2: 'Other',
  3: 'Prefer not to say',
}

/** Convert a raw DB INT2 value to the frontend Gender string */
export function parseGender(raw: number): Gender {
  return INT_TO_GENDER[raw] ?? 'Male'
}

/** Convert a frontend Gender string to the INT2 value for writing to the DB */
export function encodeGender(g: Gender): number {
  return GENDER_TO_INT[g]
}

/** Normalise the gender field on any student-shaped object returned from Supabase */
export function withGender<T extends { gender: unknown }>(student: T): T & { gender: Gender } {
  return { ...student, gender: parseGender(student.gender as number) }
}

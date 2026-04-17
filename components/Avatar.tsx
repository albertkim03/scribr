import React from 'react'

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
  'bg-indigo-100 text-indigo-700',
  'bg-orange-100 text-orange-700',
]

function hashColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

interface Props {
  firstName: string
  lastName: string
  avatarUrl?: string | null
  size?: number
  className?: string
}

export default function Avatar({ firstName, lastName, avatarUrl, size = 32, className = '' }: Props) {
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
  const colorClass = hashColor(`${firstName} ${lastName}`)
  const sizeStyle = { width: size, height: size, fontSize: Math.round(size * 0.35) }

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        loading="lazy"
        className={`rounded-full object-cover shrink-0 border border-[#DFE1E6] ${className}`}
        style={sizeStyle}
      />
    )
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-black shrink-0 ${colorClass} ${className}`}
      style={sizeStyle}
    >
      {initials}
    </div>
  )
}

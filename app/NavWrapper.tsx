'use client'

import { usePathname } from 'next/navigation'
import Nav from '@/components/Nav'

const NO_NAV = ['/login', '/signup', '/reset-password']

export default function NavWrapper() {
  const pathname = usePathname()
  if (NO_NAV.some(p => pathname === p || pathname.startsWith(p + '/'))) return null
  return <Nav />
}

'use client'

import { useEffect } from 'react'

// Red variant of the ScribrLogo SVG (same shapes, red background instead of blue gradient)
const RED_FAVICON_SVG = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="8" fill="#dc2626"/>
  <path d="M16 26 L6 14.5 L16 6 L26 14.5 Z" fill="white" fill-opacity="0.18" stroke="white" stroke-width="1.6" stroke-linejoin="round"/>
  <line x1="16" y1="26" x2="16" y2="15.5" stroke="white" stroke-width="1.6" stroke-linecap="round"/>
  <circle cx="12.5" cy="14" r="1.3" fill="white" fill-opacity="0.9"/>
  <circle cx="19.5" cy="14" r="1.3" fill="white" fill-opacity="0.9"/>
</svg>`

const RED_FAVICON_HREF = `data:image/svg+xml,${encodeURIComponent(RED_FAVICON_SVG)}`

export default function LocalhostFavicon() {
  useEffect(() => {
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '::1'
    if (!isLocalhost) return

    // Remove all existing favicon links so the browser picks up the new one
    document.querySelectorAll('link[rel*="icon"]').forEach(el => el.remove())
    const link = document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/svg+xml'
    link.href = RED_FAVICON_HREF
    document.head.appendChild(link)
  }, [])

  return null
}

'use client'

import { useEffect } from 'react'

export default function LocalhostFavicon() {
  useEffect(() => {
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '::1'
    if (!isLocalhost) return

    function applyRedFavicon(href: string) {
      // Remove all existing favicon links to force the browser to re-pick
      document.querySelectorAll('link[rel*="icon"]').forEach(el => el.remove())
      const link = document.createElement('link')
      link.rel = 'icon'
      link.href = href
      document.head.appendChild(link)
    }

    fetch('/favicon.ico')
      .then(r => r.blob())
      .then(blob => {
        // Draw via blob URL — canvas always trusts blob: URLs, no CORS issue
        const blobUrl = URL.createObjectURL(blob)
        const img = new Image()
        img.onload = () => {
          const size = Math.max(img.naturalWidth, img.naturalHeight) || 32
          const canvas = document.createElement('canvas')
          canvas.width = size
          canvas.height = size
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0, size, size)
          ctx.globalCompositeOperation = 'source-atop'
          ctx.fillStyle = 'rgba(220, 38, 38, 0.85)'
          ctx.fillRect(0, 0, size, size)
          URL.revokeObjectURL(blobUrl)
          applyRedFavicon(canvas.toDataURL('image/png'))
        }
        img.onerror = () => {
          URL.revokeObjectURL(blobUrl)
          applyRedFallback()
        }
        img.src = blobUrl
      })
      .catch(applyRedFallback)

    function applyRedFallback() {
      // Plain red circle so localhost is always visually distinct
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#dc2626"/><text x="16" y="21" text-anchor="middle" font-size="14" font-family="sans-serif" fill="white" font-weight="bold">L</text></svg>`
      applyRedFavicon(`data:image/svg+xml,${encodeURIComponent(svg)}`)
    }
  }, [])

  return null
}

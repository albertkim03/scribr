'use client'

import { useState, useRef } from 'react'
import { Camera } from 'lucide-react'

interface Props {
  currentUrl?: string | null
  initials: string
  onFileSelected: (file: File) => void
  size?: number
}

export default function AvatarUpload({ currentUrl, initials, onFileSelected, size = 68 }: Props) {
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function processFile(file: File) {
    if (!file.type.startsWith('image/')) return
    // Show preview immediately from original
    const url = URL.createObjectURL(file)
    setPreview(url)
    // Compress to max 300px WebP in the background, then notify parent
    compressImage(file).then(compressed => onFileSelected(compressed))
  }

  function compressImage(file: File): Promise<File> {
    return new Promise(resolve => {
      const img = new Image()
      img.onload = () => {
        const MAX = 300
        const scale = Math.min(1, MAX / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        canvas.toBlob(
          blob => resolve(blob ? new File([blob], 'avatar.webp', { type: 'image/webp' }) : file),
          'image/webp',
          0.8
        )
      }
      img.onerror = () => resolve(file)
      img.src = URL.createObjectURL(file)
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  return (
    <div
      role="button"
      tabIndex={0}
      title="Click or drag a photo here"
      className={`relative rounded-full cursor-pointer group select-none flex-shrink-0 transition-all ${
        dragOver ? 'ring-2 ring-[#0052CC] ring-offset-2 scale-105' : ''
      }`}
      style={{ width: size, height: size }}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => fileRef.current?.click()}
      onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
    >
      {preview ? (
        <img
          src={preview}
          alt="Avatar"
          className="w-full h-full rounded-full object-cover border-2 border-[#DFE1E6]"
        />
      ) : (
        <div
          className="w-full h-full rounded-full bg-[#F4F5F7] flex items-center justify-center border-2 border-dashed border-[#C1C7D0] group-hover:border-[#0052CC] transition-colors"
        >
          <span className="font-black text-[#42526E]" style={{ fontSize: size * 0.26 }}>
            {initials || '?'}
          </span>
        </div>
      )}

      {/* Camera overlay on hover */}
      <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/25 flex items-center justify-center transition-all">
        <Camera
          size={size * 0.3}
          className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md"
        />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleChange}
      />
    </div>
  )
}

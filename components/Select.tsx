'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  /** Render differently — action items like "+ Add…" */
  isAction?: boolean
}

interface Props {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export default function Select({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  className = '',
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value && !o.isAction)

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 border border-[#DFE1E6] rounded-lg text-sm bg-white hover:border-[#0052CC] focus:outline-none focus:ring-2 focus:ring-[#0052CC] transition-colors btn-press-subtle disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={selected ? 'text-[#172B4D] font-medium' : 'text-[#6B778C]'}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`text-[#6B778C] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute z-[200] top-full mt-1 w-full bg-white border border-[#DFE1E6] rounded-lg shadow-xl overflow-hidden">
          {options.map((option, i) => (
            <button
              key={option.value + i}
              type="button"
              onClick={() => {
                onChange(option.value)
                if (!option.isAction) setOpen(false)
                else setOpen(false)
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors text-left
                ${option.isAction
                  ? 'text-[#0052CC] font-semibold hover:bg-blue-50 border-t border-[#DFE1E6]'
                  : option.value === value
                    ? 'bg-[#DEEBFF] text-[#0052CC] font-semibold'
                    : 'text-[#172B4D] hover:bg-[#F4F5F7]'
                }`}
            >
              {option.label}
              {!option.isAction && option.value === value && (
                <Check size={13} className="text-[#0052CC] shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

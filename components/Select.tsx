'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, X } from 'lucide-react'

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
  onDeleteItem?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export default function Select({
  options,
  value,
  onChange,
  onDeleteItem,
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
        <div className="absolute z-[200] top-full mt-1 w-full bg-white border border-[#DFE1E6] rounded-lg shadow-xl overflow-x-hidden overflow-y-auto max-h-56">
          {options.map((option, i) => {
            const canDelete = !!onDeleteItem && !option.isAction && option.value !== ''
            return (
              <div key={option.value + i} className={`flex items-center ${option.isAction ? 'border-t border-[#DFE1E6]' : ''}`}>
                <button
                  type="button"
                  title={option.label}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                  className={`flex-1 flex items-center gap-2 px-3 py-2.5 text-sm transition-colors text-left
                    ${option.isAction
                      ? 'text-[#0052CC] font-semibold hover:bg-blue-50'
                      : option.value === value
                        ? 'bg-[#DEEBFF] text-[#0052CC] font-semibold'
                        : 'text-[#172B4D] hover:bg-[#F4F5F7]'
                    }`}
                >
                  <span className="flex-1 truncate">{option.label}</span>
                  {!option.isAction && option.value === value && (
                    <Check size={13} className="text-[#0052CC] shrink-0" />
                  )}
                </button>
                {canDelete && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); onDeleteItem!(option.value) }}
                    className="shrink-0 px-2.5 py-2.5 text-[#6B778C] hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

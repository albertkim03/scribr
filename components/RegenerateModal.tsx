'use client'

import { useState } from 'react'
import { X, Sparkles } from 'lucide-react'

interface Props {
  onRegenerate: (instruction: string) => void
  onClose: () => void
}

const PRESETS = [
  { label: 'More formal',        instruction: 'Rewrite this report in a more formal and professional tone.' },
  { label: 'More compassionate', instruction: 'Rewrite this report in a warmer, more compassionate tone.' },
  { label: 'More positive',      instruction: 'Emphasise strengths and progress. Make the overall tone more positive and encouraging.' },
  { label: 'More concise',       instruction: 'Shorten this report significantly. Remove redundancy and keep only the most important points.' },
  { label: 'More detailed',      instruction: 'Expand this report with more specific detail and richer descriptions of each observation.' },
  { label: 'Different wording',  instruction: 'Rewrite this report using completely different wording and sentence structures, while keeping the same facts.' },
]

export default function RegenerateModal({ onRegenerate, onClose }: Props) {
  const [instruction, setInstruction] = useState('')
  const [activePreset, setActivePreset] = useState<string | null>(null)

  function selectPreset(preset: typeof PRESETS[0]) {
    setActivePreset(preset.label)
    setInstruction(preset.instruction)
  }

  function handleSubmit() {
    const trimmed = instruction.trim()
    if (!trimmed) return
    onRegenerate(trimmed)
    // Do NOT call onClose() — parent's phase transition dismisses this modal
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header — soft gradient */}
        <div className="bg-gradient-to-br from-violet-50 via-blue-50 to-cyan-50 border-b border-[#DFE1E6] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles size={15} className="text-violet-500" />
                <span className="text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
                  Regenerate Report
                </span>
              </div>
              <h2 className="text-lg font-black text-[#172B4D]">
                What should we focus on?
              </h2>
              <p className="text-sm text-[#42526E] mt-0.5">
                We'll use your previous report as context and revise it accordingly.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-[#6B778C] hover:text-[#172B4D] transition-colors p-1 rounded mt-0.5 btn-press-subtle"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Preset chips */}
          <div>
            <p className="text-xs font-bold text-[#42526E] uppercase tracking-wide mb-3">
              Quick presets
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => selectPreset(preset)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all btn-press-subtle border ${
                    activePreset === preset.label
                      ? 'bg-[#0052CC] text-white border-[#0052CC] shadow-md'
                      : 'bg-white text-[#42526E] border-[#DFE1E6] hover:border-[#0052CC] hover:text-[#0052CC]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom instruction */}
          <div>
            <label className="text-xs font-bold text-[#42526E] uppercase tracking-wide mb-2 block">
              Or write your own instruction
            </label>
            <textarea
              value={instruction}
              onChange={e => { setInstruction(e.target.value); setActivePreset(null) }}
              rows={3}
              placeholder="e.g. Focus on improvement over the year and end on an encouraging note…"
              className="w-full px-3 py-2.5 border border-[#DFE1E6] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent resize-none text-[#172B4D] placeholder-[#6B778C]"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-[#DFE1E6] rounded-lg text-sm font-semibold text-[#42526E] hover:bg-[#F4F5F7] transition-colors btn-press-subtle"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!instruction.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-white border border-purple-200 py-2.5 rounded-lg text-sm font-bold hover:border-purple-400 hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all btn-press"
            >
              <Sparkles size={14} className="text-violet-500" />
              <span className="bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
                Regenerate
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

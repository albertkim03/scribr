'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { createClient } from '@/lib/supabase/client'
import { Clipboard, Printer, Loader2, Check, X as XIcon, Sparkles } from 'lucide-react'

interface Props {
  studentId: string
  studentName: string
  initialContent: string
  reportId: string
  onRequestRegenerate?: () => void
}

const REFACTOR_OPTIONS = [
  { label: 'More formal',   instruction: 'Make this text more formal and professional.' },
  { label: 'Gentler',       instruction: 'Make this text gentler and more compassionate.' },
  { label: 'Kinder',        instruction: 'Make this text kinder and more positive.' },
  { label: 'More stern',    instruction: 'Make this text more stern and direct.' },
  { label: 'Shorter',       instruction: 'Make this text shorter and more concise.' },
  { label: 'More detailed', instruction: 'Make this text more detailed and descriptive.' },
]

interface PendingRefactor {
  from: number
  to: number
  original: string
  suggested: string
}

// ── ProseMirror plugin for blue underline flash ──────────────
const refactorFlashKey = new PluginKey<DecorationSet>('refactorFlash')

const RefactorFlashExtension = Extension.create({
  name: 'refactorFlash',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: refactorFlashKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, set, _, state) {
            const meta = tr.getMeta(refactorFlashKey)
            if (meta === 'clear') return DecorationSet.empty
            if (meta && typeof meta === 'object') {
              return DecorationSet.create(state.doc, [
                Decoration.inline(meta.from, meta.to, { class: 'refactor-flash' }),
              ])
            }
            return set.map(tr.mapping, tr.doc)
          },
        },
        props: {
          decorations(state) {
            return refactorFlashKey.getState(state) ?? DecorationSet.empty
          },
        },
      }),
    ]
  },
})

export default function ReportEditor({
  studentId,
  initialContent,
  reportId,
  onRequestRegenerate,
}: Props) {
  const supabase = createClient()

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [refactoringLabel, setRefactoringLabel] = useState<string | null>(null)
  const [refactorError, setRefactorError] = useState('')
  const [bubbleMenuRect, setBubbleMenuRect] = useState<DOMRect | null>(null)
  const [pendingRefactor, setPendingRefactor] = useState<PendingRefactor | null>(null)
  const [acceptedFlash, setAcceptedFlash] = useState(false)
  const [copied, setCopied] = useState(false)

  // Custom instruction state
  const [showCustomInput, setShowCustomInputState] = useState(false)
  const [customInstruction, setCustomInstruction] = useState('')
  const showCustomInputRef = useRef(false)
  const savedSelectionRef = useRef<{ from: number; to: number; selectedText: string } | null>(null)
  const savedRectRef = useRef<DOMRect | null>(null)

  function setShowCustomInput(v: boolean) {
    showCustomInputRef.current = v
    setShowCustomInputState(v)
  }

  const editorContainerRef = useRef<HTMLDivElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handleSelectionChange() {
      // Don't clear menu when custom input is open
      if (showCustomInputRef.current) return
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !sel.rangeCount || !editorContainerRef.current) {
        setBubbleMenuRect(null)
        return
      }
      const range = sel.getRangeAt(0)
      if (!editorContainerRef.current.contains(range.commonAncestorContainer)) {
        setBubbleMenuRect(null)
        return
      }
      setBubbleMenuRect(range.getBoundingClientRect())
    }
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [])

  const debouncedSave = useCallback(
    (html: string) => {
      setSaveStatus('unsaved')
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(async () => {
        setSaveStatus('saving')
        await supabase
          .from('reports')
          .update({ content: html, last_edited_at: new Date().toISOString() })
          .eq('id', reportId)
        setSaveStatus('saved')
      }, 1000)
    },
    [reportId, supabase]
  )

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start typing your report here, or use the Regenerate button above…',
      }),
      RefactorFlashExtension,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      debouncedSave(editor.getHTML())
    },
  })

  async function handleRefactor(instruction: string, label: string, savedSel?: { from: number; to: number; selectedText: string }) {
    if (!editor) return
    const sel = savedSel ?? (() => {
      const { from, to } = editor.state.selection
      return { from, to, selectedText: editor.state.doc.textBetween(from, to, ' ') }
    })()
    if (!sel.selectedText.trim()) return

    setRefactoringLabel(label)
    setRefactorError('')

    try {
      const res = await fetch('/api/reports/refactor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedText: sel.selectedText, instruction }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPendingRefactor({ from: sel.from, to: sel.to, original: sel.selectedText, suggested: data.text })
      setBubbleMenuRect(null)
    } catch (err) {
      setRefactorError(err instanceof Error ? err.message : 'Refactor failed.')
    } finally {
      setRefactoringLabel(null)
    }
  }

  async function handleCustomRefactor() {
    const trimmed = customInstruction.trim()
    if (!trimmed || !savedSelectionRef.current) return
    const saved = savedSelectionRef.current

    setShowCustomInput(false)
    setCustomInstruction('')
    savedSelectionRef.current = null
    savedRectRef.current = null
    setBubbleMenuRect(null)

    await handleRefactor(trimmed, 'Custom', saved)
  }

  function handleAcceptRefactor() {
    if (!editor || !pendingRefactor) return
    const { from, to, suggested } = pendingRefactor
    editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, suggested).run()

    // Dispatch flash decoration
    const newTo = from + suggested.length
    editor.view.dispatch(
      editor.view.state.tr.setMeta(refactorFlashKey, { from, to: newTo })
    )
    setTimeout(() => {
      if (!editor.isDestroyed) {
        editor.view.dispatch(editor.view.state.tr.setMeta(refactorFlashKey, 'clear'))
      }
    }, 5000)

    setPendingRefactor(null)
    setAcceptedFlash(true)
    setTimeout(() => setAcceptedFlash(false), 1200)
  }

  function handleCopy() {
    if (!editor) return
    navigator.clipboard.writeText(editor.getText())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const menuRect = savedRectRef.current ?? bubbleMenuRect

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-3 no-print flex-wrap">
        <span className={`text-xs font-medium transition-colors ${
          saveStatus === 'saving' ? 'text-[#0052CC]'
          : saveStatus === 'unsaved' ? 'text-amber-600'
          : 'text-[#6B778C]'
        }`}>
          {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Unsaved changes'}
          <span className="text-[#6B778C] font-normal hidden sm:inline">
            {' '}· Select any text to rewrite with AI
          </span>
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#DFE1E6] rounded-lg text-xs font-semibold text-[#42526E] hover:bg-[#F4F5F7] transition-colors btn-press-subtle"
          >
            {copied ? <><Check size={12} className="text-emerald-600" /> <span className="text-emerald-600">Copied!</span></> : <><Clipboard size={12} /> Copy</>}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#DFE1E6] rounded-lg text-xs font-semibold text-[#42526E] hover:bg-[#F4F5F7] transition-colors btn-press-subtle"
          >
            <Printer size={12} /> Print
          </button>
          {onRequestRegenerate && (
            <button
              onClick={onRequestRegenerate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-bold hover:border-purple-400 hover:shadow-sm transition-all btn-press"
            >
              <Sparkles size={12} className="text-violet-500" />
              <span className="bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
                Regenerate
              </span>
            </button>
          )}
        </div>
      </div>

      {refactorError && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between no-print">
          {refactorError}
          <button onClick={() => setRefactorError('')} className="ml-2 text-red-400 hover:text-red-600">
            <XIcon size={14} />
          </button>
        </div>
      )}

      {/* Before / after diff panel */}
      {pendingRefactor && (
        <div className="mb-3 rounded-xl border border-[#DFE1E6] overflow-hidden shadow-md no-print">
          <div className="bg-[#172B4D] px-4 py-2 flex items-center gap-2">
            <Sparkles size={12} className="text-blue-300" />
            <span className="text-xs font-bold text-white tracking-wide">
              AI suggestion — review before applying
            </span>
          </div>
          <div className="grid grid-cols-2 divide-x divide-[#DFE1E6]">
            <div className="p-4 bg-red-50">
              <p className="text-xs font-bold text-red-700 mb-2 uppercase tracking-wide">Before</p>
              <p className="text-sm text-red-800 line-through leading-relaxed">{pendingRefactor.original}</p>
            </div>
            <div className="p-4 bg-emerald-50">
              <p className="text-xs font-bold text-emerald-700 mb-2 uppercase tracking-wide">After</p>
              <p className="text-sm text-emerald-800 leading-relaxed">{pendingRefactor.suggested}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-3 bg-[#F4F5F7] border-t border-[#DFE1E6]">
            <button
              onClick={handleAcceptRefactor}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors btn-press"
            >
              <Check size={12} /> Accept
            </button>
            <button
              onClick={() => setPendingRefactor(null)}
              className="flex items-center gap-1.5 px-4 py-1.5 border border-[#DFE1E6] text-[#42526E] rounded-lg text-xs font-bold hover:bg-white transition-colors btn-press-subtle"
            >
              <XIcon size={12} /> Reject
            </button>
          </div>
        </div>
      )}

      {/* Floating AI bubble menu */}
      {(menuRect || showCustomInput) && !pendingRefactor && (
        <div
          className="fixed z-50 no-print"
          style={{
            top: (menuRect?.top ?? 0) + window.scrollY,
            left: (menuRect?.left ?? 0) + (menuRect?.width ?? 0) / 2,
            transform: 'translateX(-50%) translateY(calc(-100% - 8px))',
          }}
        >
          {showCustomInput ? (
            /* Custom instruction input */
            <div className="flex items-center gap-1.5 bg-[#172B4D] rounded-lg p-2 shadow-2xl" style={{ minWidth: '260px' }}>
              <input
                autoFocus
                value={customInstruction}
                onChange={e => setCustomInstruction(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && customInstruction.trim()) handleCustomRefactor()
                  if (e.key === 'Escape') { setShowCustomInput(false); setCustomInstruction('') }
                }}
                placeholder="Your instruction…"
                className="flex-1 px-2.5 py-1.5 text-xs bg-white/10 text-white placeholder-white/40 rounded border border-white/20 focus:outline-none focus:border-white/60 min-w-0"
              />
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={handleCustomRefactor}
                disabled={!customInstruction.trim()}
                className="shrink-0 px-2.5 py-1.5 text-xs text-white bg-white/20 rounded-md hover:bg-white/30 font-bold disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                Apply
              </button>
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={() => { setShowCustomInput(false); setCustomInstruction('') }}
                className="shrink-0 p-1 text-white/60 hover:text-white rounded transition-colors"
              >
                <XIcon size={12} />
              </button>
            </div>
          ) : (
            /* Regular refactor options */
            <div className="flex items-center gap-0.5 bg-[#172B4D] rounded-lg p-1 shadow-2xl flex-wrap max-w-lg">
              {REFACTOR_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => handleRefactor(opt.instruction, opt.label)}
                  disabled={!!refactoringLabel}
                  className="px-2.5 py-1 text-xs text-white rounded-md hover:bg-white/15 disabled:opacity-50 transition-colors whitespace-nowrap font-medium"
                >
                  {refactoringLabel === opt.label ? (
                    <span className="flex items-center gap-1">
                      <Loader2 size={10} className="animate-spin" />
                      {opt.label}
                    </span>
                  ) : opt.label}
                </button>
              ))}
              {/* Divider + Custom option */}
              <span className="w-px h-4 bg-white/20 mx-0.5 self-center" />
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={() => {
                  if (!editor) return
                  const { from, to } = editor.state.selection
                  const selectedText = editor.state.doc.textBetween(from, to, ' ')
                  if (!selectedText.trim()) return
                  savedSelectionRef.current = { from, to, selectedText }
                  if (bubbleMenuRect) savedRectRef.current = bubbleMenuRect
                  setShowCustomInput(true)
                }}
                disabled={!!refactoringLabel}
                className="px-2.5 py-1 text-xs text-white/70 rounded-md hover:bg-white/15 hover:text-white disabled:opacity-50 transition-colors whitespace-nowrap font-medium italic"
              >
                Custom…
              </button>
            </div>
          )}
        </div>
      )}

      {/* Editor */}
      <div
        ref={editorContainerRef}
        className={`bg-white rounded-xl border-2 shadow-sm tiptap-editor print-content transition-all cursor-text ${
          acceptedFlash ? 'refactor-accepted' : ''
        } border-[#DFE1E6] hover:border-[#0052CC]/40`}
        onClick={() => editor?.commands.focus()}
      >
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#DFE1E6] bg-[#F4F5F7] no-print rounded-t-xl">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <span className="text-xs text-[#6B778C] font-medium">Click anywhere to edit</span>
        </div>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

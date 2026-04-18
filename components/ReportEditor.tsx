'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { createClient } from '@/lib/supabase/client'
import {
  Clipboard, Printer, Loader2, Check, X as XIcon, Sparkles,
  Circle, CheckCircle2, Bold, Italic, Underline as UnderlineIcon,
  Strikethrough, List, ListOrdered, ZoomIn, ZoomOut,
} from 'lucide-react'

interface Props {
  studentName: string
  initialContent: string
  reportId: string
  isDraft?: boolean
  onRequestRegenerate?: () => void
  onStatusChanged?: (isDraft: boolean) => void
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

// ── Notion-like hovered block highlight ──────────────────────
const hoveredNodeKey = new PluginKey<DecorationSet>('hoveredNode')

const HoveredNodeExtension = Extension.create({
  name: 'hoveredNode',
  addProseMirrorPlugins() {
    let lastFrom = -1
    return [
      new Plugin({
        key: hoveredNodeKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, set) {
            const meta = tr.getMeta(hoveredNodeKey)
            if (meta === null) return DecorationSet.empty
            if (meta && typeof meta === 'object') {
              return DecorationSet.create(tr.doc, [
                Decoration.node(meta.from, meta.to, { class: 'notion-hovered-block' }),
              ])
            }
            return set.map(tr.mapping, tr.doc)
          },
        },
        props: {
          decorations(state) {
            return hoveredNodeKey.getState(state) ?? DecorationSet.empty
          },
          handleDOMEvents: {
            mousemove(view, event) {
              const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })
              if (!pos) {
                if (lastFrom !== -1) { lastFrom = -1; view.dispatch(view.state.tr.setMeta(hoveredNodeKey, null)) }
                return false
              }
              const $pos = view.state.doc.resolve(pos.pos)
              let from = -1, to = -1
              for (let d = $pos.depth; d > 0; d--) {
                const node = $pos.node(d)
                if (node.isBlock) { from = $pos.before(d); to = from + node.nodeSize; break }
              }
              if (from === -1 || from === lastFrom) return false
              lastFrom = from
              view.dispatch(view.state.tr.setMeta(hoveredNodeKey, { from, to }))
              return false
            },
            mouseleave(view) {
              if (lastFrom !== -1) { lastFrom = -1; view.dispatch(view.state.tr.setMeta(hoveredNodeKey, null)) }
              return false
            },
          },
        },
      }),
    ]
  },
})

const FONT_SIZES = [0.75, 0.85, 0.9, 1.0, 1.1, 1.25, 1.4, 1.6]
const DEFAULT_FONT_SIZE_IDX = 2 // 0.9rem

// ── Toolbar helpers ───────────────────────────────────────────
function ToolbarBtn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={e => e.preventDefault()} // keep editor focus
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
        active
          ? 'bg-[#0052CC]/10 text-[#0052CC]'
          : 'text-[#42526E] hover:bg-[#F4F5F7] hover:text-[#172B4D]'
      }`}
    >
      {children}
    </button>
  )
}

function TBDivider() {
  return <div className="w-px h-4 bg-[#DFE1E6] mx-0.5 shrink-0" />
}

export default function ReportEditor({
  initialContent,
  reportId,
  isDraft: initialIsDraft = true,
  onRequestRegenerate,
  onStatusChanged,
}: Props) {
  const supabase = createClient()

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [isDraft, setIsDraft] = useState<boolean>(initialIsDraft)
  const [fontSizeIdx, setFontSizeIdx] = useState(DEFAULT_FONT_SIZE_IDX)

  async function toggleStatus() {
    const newIsDraft = !isDraft
    setIsDraft(newIsDraft)
    onStatusChanged?.(newIsDraft)
    await supabase.from('reports').update({ is_draft: newIsDraft }).eq('id', reportId)
  }

  const [refactoringLabel, setRefactoringLabel] = useState<string | null>(null)
  const [refactorError, setRefactorError] = useState('')
  const [bubbleMenuRect, setBubbleMenuRect] = useState<DOMRect | null>(null)
  const [pendingRefactor, setPendingRefactor] = useState<PendingRefactor | null>(null)
  const [acceptedFlash, setAcceptedFlash] = useState(false)
  const [copied, setCopied] = useState(false)
  const [, forceUpdate] = useState(0) // used to re-render when editor state changes (toolbar active states)

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
  const bubbleMenuRef = useRef<HTMLDivElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function closeCustomInput() {
    setShowCustomInput(false)
    setCustomInstruction('')
    savedSelectionRef.current = null
    savedRectRef.current = null
    setBubbleMenuRect(null)
  }

  useEffect(() => {
    function handleHide() {
      if (showCustomInputRef.current) {
        setShowCustomInput(false)
        setCustomInstruction('')
        savedSelectionRef.current = null
        savedRectRef.current = null
        setBubbleMenuRect(null)
      }
    }
    window.addEventListener('blur', handleHide)
    document.addEventListener('visibilitychange', handleHide)
    return () => {
      window.removeEventListener('blur', handleHide)
      document.removeEventListener('visibilitychange', handleHide)
    }
  }, [])

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (!bubbleMenuRef.current) return
      if (!bubbleMenuRef.current.contains(e.target as Node)) {
        if (showCustomInputRef.current) {
          setShowCustomInput(false)
          setCustomInstruction('')
          savedSelectionRef.current = null
          savedRectRef.current = null
          setBubbleMenuRect(null)
        }
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  useEffect(() => {
    function handleSelectionChange() {
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
      // Disable code/codeBlock — they capture ⌥⌘C / ⌥⌘E on Mac
      // StarterKit v3 already includes Underline, Heading, BulletList, OrderedList
      StarterKit.configure({ code: false, codeBlock: false }),
      Placeholder.configure({
        placeholder: 'Start typing your report here, or use the Regenerate button above…',
      }),
      RefactorFlashExtension,
      HoveredNodeExtension,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      debouncedSave(editor.getHTML())
    },
    onSelectionUpdate: () => {
      forceUpdate(n => n + 1) // refresh toolbar active states
    },
    onTransaction: () => {
      forceUpdate(n => n + 1)
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
        body: JSON.stringify({ selectedText: sel.selectedText, instruction, fullContent: editor.getText() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (typeof data.usageCount === 'number') {
        window.dispatchEvent(new CustomEvent('ai-usage-updated', { detail: { count: data.usageCount } }))
      }
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
    const newTo = from + suggested.length
    editor.view.dispatch(editor.view.state.tr.setMeta(refactorFlashKey, { from, to: newTo }))
    setTimeout(() => {
      if (!editor.isDestroyed) editor.view.dispatch(editor.view.state.tr.setMeta(refactorFlashKey, 'clear'))
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
    <div className="flex flex-col flex-1 min-h-0">
      {/* Inject heading/list styles at runtime — guarantees they apply regardless of build cache */}
      <style>{`
        .tiptap-editor .ProseMirror h1{font-size:1.5rem;font-weight:800;color:#172B4D;margin-bottom:.5em;margin-top:.25em}
        .tiptap-editor .ProseMirror h2{font-size:1.15rem;font-weight:700;color:#172B4D;margin-bottom:.5em;margin-top:.25em}
        .tiptap-editor .ProseMirror h3{font-size:1rem;font-weight:700;color:#172B4D;margin-bottom:.5em}
        .tiptap-editor .ProseMirror ul{list-style-type:disc;padding-left:1.5rem;margin-bottom:.75em}
        .tiptap-editor .ProseMirror ol{list-style-type:decimal;padding-left:1.5rem;margin-bottom:.75em}
        .tiptap-editor .ProseMirror li{margin-bottom:.25em;padding-left:.25rem}
        .tiptap-editor .ProseMirror li>p{margin-bottom:.25em}
      `}</style>
      {/* Top action bar */}
      <div className="flex items-center justify-between gap-4 mb-3 no-print flex-wrap shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleStatus}
            title={isDraft ? 'Mark as complete' : 'Mark as draft'}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${
              !isDraft
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {!isDraft ? <><CheckCircle2 size={11} /> Complete</> : <><Circle size={11} /> Draft</>}
          </button>
          <span className={`text-xs font-medium transition-colors ${
            saveStatus === 'saving' ? 'text-[#0052CC]'
            : saveStatus === 'unsaved' ? 'text-amber-600'
            : 'text-[#6B778C]'
          }`}>
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Unsaved'}
            <span className="text-[#6B778C] font-normal hidden sm:inline"> · Select text to rewrite with AI</span>
          </span>
        </div>
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
              <span className="bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-500 bg-clip-text text-transparent">Regenerate</span>
            </button>
          )}
        </div>
      </div>

      {refactorError && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between no-print">
          {refactorError}
          <button onClick={() => setRefactorError('')} className="ml-2 text-red-400 hover:text-red-600"><XIcon size={14} /></button>
        </div>
      )}

      {pendingRefactor && (
        <div className="mb-3 rounded-xl border border-[#DFE1E6] overflow-hidden shadow-md no-print">
          <div className="bg-[#172B4D] px-4 py-2 flex items-center gap-2">
            <Sparkles size={12} className="text-blue-300" />
            <span className="text-xs font-bold text-white tracking-wide">AI suggestion — review before applying</span>
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
            <button onClick={handleAcceptRefactor} className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors btn-press">
              <Check size={12} /> Accept
            </button>
            <button onClick={() => setPendingRefactor(null)} className="flex items-center gap-1.5 px-4 py-1.5 border border-[#DFE1E6] text-[#42526E] rounded-lg text-xs font-bold hover:bg-white transition-colors btn-press-subtle">
              <XIcon size={12} /> Reject
            </button>
          </div>
        </div>
      )}

      {/* Floating AI bubble menu */}
      {(menuRect || showCustomInput) && !pendingRefactor && (
        <div
          ref={bubbleMenuRef}
          className="fixed z-50 no-print"
          style={{
            top: menuRect?.top ?? 0,
            left: (menuRect?.left ?? 0) + (menuRect?.width ?? 0) / 2,
            transform: 'translateX(-50%) translateY(calc(-100% - 14px))',
          }}
        >
          <div className="bg-white border border-[#DFE1E6] rounded-xl shadow-lg overflow-hidden" style={{ minWidth: '220px' }}>
            <div className="p-1.5 flex flex-wrap gap-1">
              {REFACTOR_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => handleRefactor(opt.instruction, opt.label)}
                  disabled={!!refactoringLabel}
                  className="px-2.5 py-1.5 text-xs text-[#172B4D] rounded-lg border border-[#DFE1E6] hover:bg-[#F4F5F7] hover:border-[#0052CC]/40 disabled:opacity-50 transition-colors whitespace-nowrap font-medium"
                >
                  {refactoringLabel === opt.label ? (
                    <span className="flex items-center gap-1"><Loader2 size={10} className="animate-spin text-[#0052CC]" />{opt.label}</span>
                  ) : opt.label}
                </button>
              ))}
            </div>
            <div className="border-t border-[#DFE1E6] p-1.5">
              {showCustomInput ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    value={customInstruction}
                    onChange={e => setCustomInstruction(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && customInstruction.trim()) handleCustomRefactor()
                      if (e.key === 'Escape') closeCustomInput()
                    }}
                    placeholder="Your instruction…"
                    className="flex-1 min-w-0 px-2.5 py-1.5 text-xs border border-[#DFE1E6] rounded-lg text-[#172B4D] placeholder-[#6B778C] focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:border-transparent"
                  />
                  <button onMouseDown={e => e.preventDefault()} onClick={handleCustomRefactor} disabled={!customInstruction.trim()} title="Send" className="shrink-0 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-white border border-purple-200 rounded-lg font-bold hover:border-purple-400 disabled:opacity-40 transition-colors btn-press">
                    <Sparkles size={10} className="text-violet-500" />
                    <span className="bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-500 bg-clip-text text-transparent">Send</span>
                  </button>
                  <button onMouseDown={e => e.preventDefault()} onClick={closeCustomInput} title="Cancel" className="shrink-0 p-1.5 text-[#6B778C] hover:text-[#172B4D] hover:bg-[#F4F5F7] rounded-lg transition-colors">
                    <XIcon size={13} />
                  </button>
                </div>
              ) : (
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
                  className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-dashed border-[#DFE1E6] hover:border-purple-300 hover:bg-violet-50 disabled:opacity-50 transition-colors font-medium text-[#6B778C] hover:text-violet-600"
                >
                  <Sparkles size={10} className="text-violet-400" />
                  Custom instruction…
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Editor card */}
      <div
        ref={editorContainerRef}
        className={`bg-white rounded-xl border shadow-sm tiptap-editor print-content transition-all ${
          acceptedFlash ? 'refactor-accepted' : ''
        } border-[#E8EAF0]`}
        style={{ '--tiptap-font-size': `${FONT_SIZES[fontSizeIdx]}rem` } as React.CSSProperties}
      >
        {/* ── Formatting toolbar — always visible, editor content scrolls below ── */}
        <div className="flex items-center gap-0.5 px-2.5 py-2 border-b border-[#E8EAF0] bg-[#FAFBFF] shrink-0 rounded-t-xl no-print z-10">
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Bold (⌘B)">
            <Bold size={13} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Italic (⌘I)">
            <Italic size={13} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')} title="Underline (⌘U)">
            <UnderlineIcon size={13} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive('strike')} title="Strikethrough">
            <Strikethrough size={13} />
          </ToolbarBtn>
          <TBDivider />
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })} title="Heading 1">
            <span className="text-[11px] font-black leading-none">H1</span>
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} title="Heading 2">
            <span className="text-[11px] font-black leading-none">H2</span>
          </ToolbarBtn>
          <TBDivider />
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Bullet list">
            <List size={13} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Numbered list">
            <ListOrdered size={13} />
          </ToolbarBtn>
          {/* Spacer pushes zoom to far right */}
          <div className="flex-1" />
          <TBDivider />
          <ToolbarBtn
            onClick={() => setFontSizeIdx(i => Math.max(0, i - 1))}
            disabled={fontSizeIdx === 0}
            title="Zoom out"
          >
            <ZoomOut size={13} />
          </ToolbarBtn>
          <span className="text-[10px] text-[#6B778C] font-medium w-8 text-center tabular-nums select-none">
            {Math.round(FONT_SIZES[fontSizeIdx] * 100)}%
          </span>
          <ToolbarBtn
            onClick={() => setFontSizeIdx(i => Math.min(FONT_SIZES.length - 1, i + 1))}
            disabled={fontSizeIdx === FONT_SIZES.length - 1}
            title="Zoom in"
          >
            <ZoomIn size={13} />
          </ToolbarBtn>
        </div>

        <EditorContent
          editor={editor}
          className="flex-1 min-h-0 flex flex-col overflow-hidden"
        />
      </div>
    </div>
  )
}

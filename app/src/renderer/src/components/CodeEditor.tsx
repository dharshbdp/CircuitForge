import { useState, useRef, useMemo } from 'react'

export interface CodeEditorProps {
  value: string
  onChange: (val: string) => void
  language: 'cpp' | 'python'
  readOnly?: boolean
}

export function CodeEditor({
  value,
  onChange,
  language,
  readOnly = false
}: CodeEditorProps): React.JSX.Element {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const gutterRef = useRef<HTMLDivElement>(null)
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 })

  const lines = useMemo(() => value.split('\n'), [value])
  const lineCount = lines.length

  // Synchronize gutter scroll with textarea
  const handleScroll = (): void => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  // Update cursor line and column position
  const updateCursor = (): void => {
    if (!textareaRef.current) return
    const selStart = textareaRef.current.selectionStart
    const textBefore = value.slice(0, selStart)
    const linesBefore = textBefore.split('\n')
    setCursorPos({
      line: linesBefore.length,
      col: linesBefore[linesBefore.length - 1].length + 1
    })
  }

  // Handle keyboard shortcuts (Tab indent/outdent, Ctrl+/ line comment)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (readOnly) return

    // 1. Quick Line Commenting (Ctrl+/ or Cmd+/)
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault()
      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const commentPrefix = language === 'cpp' ? '// ' : '# '
      const commentRegex = language === 'cpp' ? /^(\s*)\/\/\s?/ : /^(\s*)#\s?/

      const allLines = value.split('\n')

      // Find 0-indexed line numbers intersecting the selection
      let charCount = 0
      let startLineIdx = 0
      let endLineIdx = 0

      for (let i = 0; i < allLines.length; i++) {
        const lineLen = allLines[i].length + 1
        const lineStart = charCount
        const lineEnd = charCount + allLines[i].length

        if (start >= lineStart && start <= lineEnd) {
          startLineIdx = i
        }
        if (end >= lineStart && end <= lineEnd) {
          if (end === lineStart && start < end) {
            endLineIdx = Math.max(startLineIdx, i - 1)
          } else {
            endLineIdx = i
          }
        }
        charCount += lineLen
      }

      const targetLines = allLines.slice(startLineIdx, endLineIdx + 1)
      const nonBlankLines = targetLines.filter((l) => l.trim().length > 0)

      // Are all non-blank lines currently commented?
      const areAllCommented =
        nonBlankLines.length > 0 && nonBlankLines.every((l) => commentRegex.test(l))

      let deltaFirstLine = 0
      let totalDelta = 0

      const modifiedLines = targetLines.map((line, idx) => {
        let newLine = line
        if (areAllCommented) {
          // Remove comment prefix while preserving indentation
          newLine = line.replace(commentRegex, '$1')
        } else {
          // Add comment prefix preserving indentation
          if (targetLines.length === 1 || line.trim().length > 0) {
            const wsMatch = line.match(/^(\s*)/)
            const ws = wsMatch ? wsMatch[1] : ''
            const rest = line.slice(ws.length)
            newLine = `${ws}${commentPrefix}${rest}`
          }
        }

        const delta = newLine.length - line.length
        if (idx === 0) deltaFirstLine = delta
        totalDelta += delta
        return newLine
      })

      const newAllLines = [
        ...allLines.slice(0, startLineIdx),
        ...modifiedLines,
        ...allLines.slice(endLineIdx + 1)
      ]
      const nextVal = newAllLines.join('\n')

      onChange(nextVal)

      requestAnimationFrame(() => {
        if (!textareaRef.current) return
        const newStart = Math.max(0, start + deltaFirstLine)
        const newEnd = Math.max(newStart, end + totalDelta)
        textareaRef.current.selectionStart = newStart
        textareaRef.current.selectionEnd = newEnd
        updateCursor()
      })
      return
    }

    // 2. Handle Tab key for 2-space indentation and Shift+Tab outdent (supports single cursor & multi-line selection)
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd

      // Single cursor position without selection: insert 2 spaces
      if (start === end && !e.shiftKey) {
        const nextVal = value.substring(0, start) + '  ' + value.substring(end)
        onChange(nextVal)
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2
          updateCursor()
        })
        return
      }

      // Multi-line selection or Shift+Tab outdent
      const allLines = value.split('\n')
      let charCount = 0
      let startLineIdx = 0
      let endLineIdx = 0

      for (let i = 0; i < allLines.length; i++) {
        const lineLen = allLines[i].length + 1
        const lineStart = charCount
        const lineEnd = charCount + allLines[i].length

        if (start >= lineStart && start <= lineEnd) {
          startLineIdx = i
        }
        if (end >= lineStart && end <= lineEnd) {
          if (end === lineStart && start < end) {
            endLineIdx = Math.max(startLineIdx, i - 1)
          } else {
            endLineIdx = i
          }
        }
        charCount += lineLen
      }

      const targetLines = allLines.slice(startLineIdx, endLineIdx + 1)
      let deltaFirstLine = 0
      let totalDelta = 0

      const modifiedLines = targetLines.map((line, idx) => {
        let newLine = line
        if (e.shiftKey) {
          // Outdent up to 2 spaces
          if (line.startsWith('  ')) {
            newLine = line.slice(2)
          } else if (line.startsWith(' ')) {
            newLine = line.slice(1)
          }
        } else {
          // Indent 2 spaces
          newLine = '  ' + line
        }

        const delta = newLine.length - line.length
        if (idx === 0) deltaFirstLine = delta
        totalDelta += delta
        return newLine
      })

      const newAllLines = [
        ...allLines.slice(0, startLineIdx),
        ...modifiedLines,
        ...allLines.slice(endLineIdx + 1)
      ]
      const nextVal = newAllLines.join('\n')

      onChange(nextVal)

      requestAnimationFrame(() => {
        if (!textareaRef.current) return
        const newStart = Math.max(0, start + deltaFirstLine)
        const newEnd = Math.max(newStart, end + totalDelta)
        textareaRef.current.selectionStart = newStart
        textareaRef.current.selectionEnd = newEnd
        updateCursor()
      })
      return
    }
  }

  return (
    <div className="cf-code-editor-container">
      <div className="cf-code-editor-body">
        <div className="cf-code-gutter" ref={gutterRef} aria-hidden="true">
          {Array.from({ length: lineCount }, (_, i) => (
            <div
              key={i + 1}
              className={`cf-gutter-line ${cursorPos.line === i + 1 ? 'active' : ''}`}
            >
              {i + 1}
            </div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          className="cf-code-textarea"
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            updateCursor()
          }}
          onKeyDown={handleKeyDown}
          onKeyUp={updateCursor}
          onClick={updateCursor}
          onScroll={handleScroll}
          readOnly={readOnly}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
        />
      </div>
      <div className="cf-code-editor-status">
        <span className="cf-code-status-lang">
          {language === 'cpp' ? 'Arduino C++ (.ino)' : 'MicroPython (.py)'} &middot; Ctrl+/ to
          comment
        </span>
        <span className="cf-code-status-pos">
          Ln {cursorPos.line}, Col {cursorPos.col} &middot; {lineCount} lines &middot;{' '}
          {value.length} chars
        </span>
      </div>
    </div>
  )
}

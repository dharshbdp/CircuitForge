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

  // Handle Tab key for 2-space indentation and Shift+Tab outdent
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (readOnly) return

    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd

      if (e.shiftKey) {
        // Outdent 2 spaces
        const lineStart = value.lastIndexOf('\n', start - 1) + 1
        if (value.slice(lineStart, lineStart + 2) === '  ') {
          const nextVal = value.slice(0, lineStart) + value.slice(lineStart + 2)
          onChange(nextVal)
          requestAnimationFrame(() => {
            textarea.selectionStart = Math.max(lineStart, start - 2)
            textarea.selectionEnd = Math.max(lineStart, end - 2)
            updateCursor()
          })
        }
      } else {
        // Indent 2 spaces
        const nextVal = value.substring(0, start) + '  ' + value.substring(end)
        onChange(nextVal)
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2
          updateCursor()
        })
      }
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
          {language === 'cpp' ? 'Arduino C++ (.ino)' : 'MicroPython (.py)'}
        </span>
        <span className="cf-code-status-pos">
          Ln {cursorPos.line}, Col {cursorPos.col} &middot; {lineCount} lines &middot;{' '}
          {value.length} chars
        </span>
      </div>
    </div>
  )
}

import { useEffect, useCallback, useRef } from 'react'
import { useGameStore, Position } from '../stores/gameStore'

interface VimEditorProps {
  onTargetReached?: () => void
}

export default function VimEditor({ onTargetReached }: VimEditorProps) {
  const {
    lines,
    cursor,
    targets,
    currentTargetIndex,
    isPlaying,
    isFinished,
    inputBuffer,
    moveCursor,
    addKeystroke,
    setInputBuffer,
    checkTarget,
    startGame,
  } = useGameStore()

  const editorRef = useRef<HTMLDivElement>(null)

  // Get current target
  const currentTarget = targets[currentTargetIndex]

  // Vim motion handlers
  const handleVimMotion = useCallback((key: string, buffer: string) => {
    if (!isPlaying && !isFinished && lines.length > 0) {
      startGame()
    }

    if (isFinished) return

    const { line, col } = cursor
    let newPos: Position = { line, col }
    let consumed = true

    // Parse the full command (buffer + current key)
    const command = buffer + key

    // Single key motions
    switch (command) {
      // Basic movement
      case 'h':
        newPos = { line, col: col - 1 }
        break
      case 'j':
        newPos = { line: line + 1, col }
        break
      case 'k':
        newPos = { line: line - 1, col }
        break
      case 'l':
        newPos = { line, col: col + 1 }
        break

      // Word motions
      case 'w': {
        // Move to start of next word
        const currentLine = lines[line] || ''
        let newCol = col + 1
        // Skip current word
        while (newCol < currentLine.length && !/\s/.test(currentLine[newCol])) {
          newCol++
        }
        // Skip whitespace
        while (newCol < currentLine.length && /\s/.test(currentLine[newCol])) {
          newCol++
        }
        if (newCol >= currentLine.length && line < lines.length - 1) {
          // Move to next line
          const nextLine = lines[line + 1] || ''
          let nextCol = 0
          while (nextCol < nextLine.length && /\s/.test(nextLine[nextCol])) {
            nextCol++
          }
          newPos = { line: line + 1, col: nextCol }
        } else {
          newPos = { line, col: Math.min(newCol, currentLine.length - 1) }
        }
        break
      }

      case 'b': {
        // Move to start of previous word
        const currentLine = lines[line] || ''
        let newCol = col - 1
        // Skip whitespace
        while (newCol > 0 && /\s/.test(currentLine[newCol])) {
          newCol--
        }
        // Skip word
        while (newCol > 0 && !/\s/.test(currentLine[newCol - 1])) {
          newCol--
        }
        if (newCol < 0 && line > 0) {
          const prevLine = lines[line - 1] || ''
          newPos = { line: line - 1, col: Math.max(0, prevLine.length - 1) }
        } else {
          newPos = { line, col: Math.max(0, newCol) }
        }
        break
      }

      case 'e': {
        // Move to end of word
        const currentLine = lines[line] || ''
        let newCol = col + 1
        // Skip whitespace
        while (newCol < currentLine.length && /\s/.test(currentLine[newCol])) {
          newCol++
        }
        // Move to end of word
        while (newCol < currentLine.length - 1 && !/\s/.test(currentLine[newCol + 1])) {
          newCol++
        }
        newPos = { line, col: Math.min(newCol, currentLine.length - 1) }
        break
      }

      // Line motions
      case '0':
        newPos = { line, col: 0 }
        break
      case '^': {
        // First non-whitespace character
        const currentLine = lines[line] || ''
        let firstNonSpace = 0
        while (firstNonSpace < currentLine.length && /\s/.test(currentLine[firstNonSpace])) {
          firstNonSpace++
        }
        newPos = { line, col: firstNonSpace }
        break
      }
      case '$':
        newPos = { line, col: (lines[line]?.length || 1) - 1 }
        break

      // Document motions
      case 'g':
        // Wait for second key
        setInputBuffer('g')
        consumed = false
        break
      case 'gg':
        newPos = { line: 0, col: 0 }
        setInputBuffer('')
        break
      case 'G':
        newPos = { line: lines.length - 1, col: 0 }
        break

      // Find character motions
      case 'f':
      case 'F':
      case 't':
      case 'T':
        setInputBuffer(command)
        consumed = false
        break

      default:
        // Check for find character commands
        if (buffer.length === 1 && 'fFtT'.includes(buffer)) {
          const currentLine = lines[line] || ''
          const char = key
          
          if (buffer === 'f') {
            // Find forward
            const idx = currentLine.indexOf(char, col + 1)
            if (idx !== -1) newPos = { line, col: idx }
          } else if (buffer === 'F') {
            // Find backward
            const idx = currentLine.lastIndexOf(char, col - 1)
            if (idx !== -1) newPos = { line, col: idx }
          } else if (buffer === 't') {
            // Till forward
            const idx = currentLine.indexOf(char, col + 1)
            if (idx !== -1) newPos = { line, col: idx - 1 }
          } else if (buffer === 'T') {
            // Till backward
            const idx = currentLine.lastIndexOf(char, col - 1)
            if (idx !== -1) newPos = { line, col: idx + 1 }
          }
          setInputBuffer('')
        }
        // Check for number prefix (e.g., 5j)
        else if (/^\d+$/.test(buffer) && 'hjklwbeWBE'.includes(key)) {
          const count = parseInt(buffer)
          for (let i = 0; i < count; i++) {
            handleVimMotion(key, '')
          }
          setInputBuffer('')
          return
        }
        // Accumulate numbers
        else if (/\d/.test(key)) {
          setInputBuffer(buffer + key)
          consumed = false
        }
        else {
          // Unknown command, clear buffer
          setInputBuffer('')
          consumed = false
        }
        break
    }

    if (consumed) {
      addKeystroke()
      moveCursor(newPos)
      
      // Check if we reached the target
      setTimeout(() => {
        if (checkTarget()) {
          onTargetReached?.()
        }
      }, 0)
    }
  }, [cursor, lines, isPlaying, isFinished, inputBuffer, moveCursor, addKeystroke, setInputBuffer, checkTarget, startGame, onTargetReached])

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Prevent default for vim keys
      if (!e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault()
        handleVimMotion(e.key, inputBuffer)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleVimMotion, inputBuffer])

  // Focus editor on mount
  useEffect(() => {
    editorRef.current?.focus()
  }, [])

  return (
    <div
      ref={editorRef}
      tabIndex={0}
      className="bg-vim-surface rounded-lg border border-vim-overlay overflow-hidden focus:outline-none focus:ring-2 focus:ring-vim-green/50"
    >
      {/* Line numbers + Code */}
      <div className="flex">
        {/* Line numbers */}
        <div className="bg-vim-bg/50 px-3 py-4 text-right select-none border-r border-vim-overlay">
          {lines.map((_, idx) => (
            <div
              key={idx}
              className={`text-sm leading-6 ${
                idx === cursor.line ? 'text-vim-yellow' : 'text-vim-subtext/50'
              }`}
            >
              {idx + 1}
            </div>
          ))}
        </div>

        {/* Code content */}
        <div className="flex-1 px-4 py-4 overflow-x-auto">
          <pre className="text-sm leading-6">
            {lines.map((line, lineIdx) => (
              <div key={lineIdx} className="relative">
                {line.split('').map((char, charIdx) => {
                  const isCursor = lineIdx === cursor.line && charIdx === cursor.col
                  const isTarget = currentTarget && 
                    lineIdx === currentTarget.position.line && 
                    charIdx === currentTarget.position.col
                  const isCompletedTarget = targets.some(
                    t => t.completed && t.position.line === lineIdx && t.position.col === charIdx
                  )

                  return (
                    <span
                      key={charIdx}
                      className={`
                        ${isCursor ? 'bg-vim-cursor text-vim-bg vim-cursor' : ''}
                        ${isTarget && !isCursor ? 'bg-vim-green/30 text-vim-green target-highlight rounded' : ''}
                        ${isCompletedTarget ? 'text-vim-green/50' : ''}
                        ${!isCursor && !isTarget && !isCompletedTarget ? 'text-vim-text' : ''}
                      `}
                    >
                      {char}
                    </span>
                  )
                })}
                {/* Show cursor at end of line if needed */}
                {cursor.line === lineIdx && cursor.col >= line.length && (
                  <span className="bg-vim-cursor text-vim-bg vim-cursor">&nbsp;</span>
                )}
                {/* Empty line placeholder */}
                {line.length === 0 && cursor.line !== lineIdx && <span>&nbsp;</span>}
              </div>
            ))}
          </pre>
        </div>
      </div>

      {/* Status bar */}
      <div className="bg-vim-bg/80 border-t border-vim-overlay px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-vim-green">NORMAL</span>
          {inputBuffer && (
            <span className="text-vim-yellow">{inputBuffer}</span>
          )}
        </div>
        <div className="flex items-center gap-4 text-vim-subtext">
          <span>Ln {cursor.line + 1}, Col {cursor.col + 1}</span>
          {currentTarget && (
            <span className="text-vim-green">
              Target: Ln {currentTarget.position.line + 1}, Col {currentTarget.position.col + 1}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

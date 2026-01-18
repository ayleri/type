import { useEffect, useCallback, useRef } from 'react'
import { useGameStore, Position } from '../stores/gameStore'

interface VimEditorProps {
  onTargetReached?: () => void
}

// Helper function to apply a single motion (used for count prefixes like 5j)
function applySingleMotion(motion: string, pos: Position, lines: string[]): Position {
  const { line, col } = pos
  const isWordChar = (c: string) => /\w/.test(c)
  const isWORDChar = (c: string) => !/\s/.test(c)

  switch (motion) {
    case 'h':
      return { line, col: Math.max(0, col - 1) }
    case 'j':
      return { line: Math.min(lines.length - 1, line + 1), col }
    case 'k':
      return { line: Math.max(0, line - 1), col }
    case 'l': {
      const lineLen = lines[line]?.length || 0
      return { line, col: Math.min(lineLen - 1, col + 1) }
    }
    case 'w': {
      const currentLine = lines[line] || ''
      let newCol = col + 1
      // Skip current word
      while (newCol < currentLine.length && isWordChar(currentLine[newCol])) {
        newCol++
      }
      // Skip non-word characters
      while (newCol < currentLine.length && !isWordChar(currentLine[newCol]) && !/\s/.test(currentLine[newCol])) {
        newCol++
      }
      // Skip whitespace
      while (newCol < currentLine.length && /\s/.test(currentLine[newCol])) {
        newCol++
      }
      if (newCol >= currentLine.length && line < lines.length - 1) {
        const nextLine = lines[line + 1] || ''
        let nextCol = 0
        while (nextCol < nextLine.length && /\s/.test(nextLine[nextCol])) {
          nextCol++
        }
        return { line: line + 1, col: nextCol }
      }
      return { line, col: Math.min(newCol, Math.max(0, currentLine.length - 1)) }
    }
    case 'W': {
      const currentLine = lines[line] || ''
      let newCol = col + 1
      while (newCol < currentLine.length && isWORDChar(currentLine[newCol])) {
        newCol++
      }
      while (newCol < currentLine.length && /\s/.test(currentLine[newCol])) {
        newCol++
      }
      if (newCol >= currentLine.length && line < lines.length - 1) {
        const nextLine = lines[line + 1] || ''
        let nextCol = 0
        while (nextCol < nextLine.length && /\s/.test(nextLine[nextCol])) {
          nextCol++
        }
        return { line: line + 1, col: nextCol }
      }
      return { line, col: Math.min(newCol, Math.max(0, currentLine.length - 1)) }
    }
    case 'b': {
      const currentLine = lines[line] || ''
      let newCol = col - 1
      while (newCol > 0 && /\s/.test(currentLine[newCol])) {
        newCol--
      }
      while (newCol > 0 && !isWordChar(currentLine[newCol]) && !/\s/.test(currentLine[newCol])) {
        newCol--
      }
      while (newCol > 0 && isWordChar(currentLine[newCol - 1])) {
        newCol--
      }
      if (newCol < 0 && line > 0) {
        const prevLine = lines[line - 1] || ''
        return { line: line - 1, col: Math.max(0, prevLine.length - 1) }
      }
      return { line, col: Math.max(0, newCol) }
    }
    case 'B': {
      const currentLine = lines[line] || ''
      let newCol = col - 1
      while (newCol > 0 && /\s/.test(currentLine[newCol])) {
        newCol--
      }
      while (newCol > 0 && isWORDChar(currentLine[newCol - 1])) {
        newCol--
      }
      if (newCol < 0 && line > 0) {
        const prevLine = lines[line - 1] || ''
        return { line: line - 1, col: Math.max(0, prevLine.length - 1) }
      }
      return { line, col: Math.max(0, newCol) }
    }
    case 'e': {
      const currentLine = lines[line] || ''
      let newCol = col + 1
      while (newCol < currentLine.length && /\s/.test(currentLine[newCol])) {
        newCol++
      }
      while (newCol < currentLine.length - 1 && isWordChar(currentLine[newCol + 1])) {
        newCol++
      }
      return { line, col: Math.min(newCol, currentLine.length - 1) }
    }
    case 'E': {
      const currentLine = lines[line] || ''
      let newCol = col + 1
      while (newCol < currentLine.length && /\s/.test(currentLine[newCol])) {
        newCol++
      }
      while (newCol < currentLine.length - 1 && isWORDChar(currentLine[newCol + 1])) {
        newCol++
      }
      return { line, col: Math.min(newCol, currentLine.length - 1) }
    }
    case '0':
      return { line, col: 0 }
    case '$': {
      const lineLen = lines[line]?.length || 0
      return { line, col: Math.max(0, lineLen - 1) }
    }
    case '^': {
      const currentLine = lines[line] || ''
      let newCol = 0
      while (newCol < currentLine.length && /\s/.test(currentLine[newCol])) {
        newCol++
      }
      return { line, col: newCol }
    }
    case '{': {
      // Move to previous blank line
      let newLine = line - 1
      while (newLine > 0 && lines[newLine].trim() !== '') {
        newLine--
      }
      return { line: Math.max(0, newLine), col: 0 }
    }
    case '}': {
      // Move to next blank line
      let newLine = line + 1
      while (newLine < lines.length - 1 && lines[newLine].trim() !== '') {
        newLine++
      }
      return { line: Math.min(lines.length - 1, newLine), col: 0 }
    }
    case 'G':
      return { line: lines.length - 1, col: 0 }
    default:
      return pos
  }
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

    // Check for count prefix first (e.g., "5j", "10w", "3k")
    const countMatch = command.match(/^(\d+)([hjklwbeWBEGgfFtT$0^{}])$/)
    if (countMatch) {
      const count = parseInt(countMatch[1])
      const motion = countMatch[2]
      
      // Apply the motion 'count' times
      let currentPos = { ...cursor }
      for (let i = 0; i < count; i++) {
        currentPos = applySingleMotion(motion, currentPos, lines)
      }
      
      addKeystroke(command)
      moveCursor(currentPos)
      setInputBuffer('')
      
      setTimeout(() => {
        if (checkTarget()) {
          onTargetReached?.()
        }
      }, 0)
      return
    }
    
    // Check if we're accumulating digits for a count
    if (/^\d+$/.test(command)) {
      setInputBuffer(command)
      return
    }

    // Helper: Check if character is a word character (alphanumeric or underscore)
    const isWordChar = (c: string) => /\w/.test(c)
    // Helper: Check if character is a WORD character (non-whitespace)
    const isWORDChar = (c: string) => !/\s/.test(c)

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

      // Word motions (word = alphanumeric + underscore)
      case 'w': {
        // Move to start of next word
        const currentLine = lines[line] || ''
        let newCol = col + 1
        // Skip current word
        while (newCol < currentLine.length && isWordChar(currentLine[newCol])) {
          newCol++
        }
        // Skip non-word characters (but not whitespace if we hit punctuation)
        while (newCol < currentLine.length && !isWordChar(currentLine[newCol]) && !/\s/.test(currentLine[newCol])) {
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
          newPos = { line, col: Math.min(newCol, Math.max(0, currentLine.length - 1)) }
        }
        break
      }

      // WORD motions (WORD = non-whitespace)
      case 'W': {
        const currentLine = lines[line] || ''
        let newCol = col + 1
        // Skip current WORD
        while (newCol < currentLine.length && isWORDChar(currentLine[newCol])) {
          newCol++
        }
        // Skip whitespace
        while (newCol < currentLine.length && /\s/.test(currentLine[newCol])) {
          newCol++
        }
        if (newCol >= currentLine.length && line < lines.length - 1) {
          const nextLine = lines[line + 1] || ''
          let nextCol = 0
          while (nextCol < nextLine.length && /\s/.test(nextLine[nextCol])) {
            nextCol++
          }
          newPos = { line: line + 1, col: nextCol }
        } else {
          newPos = { line, col: Math.min(newCol, Math.max(0, currentLine.length - 1)) }
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
        // Skip non-word chars
        while (newCol > 0 && !isWordChar(currentLine[newCol]) && !/\s/.test(currentLine[newCol])) {
          newCol--
        }
        // Skip word
        while (newCol > 0 && isWordChar(currentLine[newCol - 1])) {
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

      case 'B': {
        // Move to start of previous WORD
        const currentLine = lines[line] || ''
        let newCol = col - 1
        // Skip whitespace
        while (newCol > 0 && /\s/.test(currentLine[newCol])) {
          newCol--
        }
        // Skip WORD
        while (newCol > 0 && isWORDChar(currentLine[newCol - 1])) {
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
        while (newCol < currentLine.length - 1 && isWordChar(currentLine[newCol + 1])) {
          newCol++
        }
        newPos = { line, col: Math.min(newCol, currentLine.length - 1) }
        break
      }

      case 'E': {
        // Move to end of WORD
        const currentLine = lines[line] || ''
        let newCol = col + 1
        // Skip whitespace
        while (newCol < currentLine.length && /\s/.test(currentLine[newCol])) {
          newCol++
        }
        // Move to end of WORD
        while (newCol < currentLine.length - 1 && isWORDChar(currentLine[newCol + 1])) {
          newCol++
        }
        newPos = { line, col: Math.min(newCol, currentLine.length - 1) }
        break
      }

      // ge - end of previous word
      case 'ge': {
        const currentLine = lines[line] || ''
        let newCol = col - 1
        // Skip whitespace
        while (newCol >= 0 && /\s/.test(currentLine[newCol])) {
          newCol--
        }
        // We're now at end of previous word
        if (newCol < 0 && line > 0) {
          const prevLine = lines[line - 1] || ''
          newPos = { line: line - 1, col: Math.max(0, prevLine.length - 1) }
        } else {
          newPos = { line, col: Math.max(0, newCol) }
        }
        setInputBuffer('')
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
      case '_': {
        // First non-blank of current line (like ^)
        const currentLine = lines[line] || ''
        let firstNonSpace = 0
        while (firstNonSpace < currentLine.length && /\s/.test(currentLine[firstNonSpace])) {
          firstNonSpace++
        }
        newPos = { line, col: firstNonSpace }
        break
      }

      // Paragraph motions
      case '{': {
        // Move to previous blank line (paragraph start)
        let newLine = line - 1
        while (newLine > 0 && lines[newLine].trim() !== '') {
          newLine--
        }
        newPos = { line: Math.max(0, newLine), col: 0 }
        break
      }
      case '}': {
        // Move to next blank line (paragraph end)
        let newLine = line + 1
        while (newLine < lines.length - 1 && lines[newLine].trim() !== '') {
          newLine++
        }
        newPos = { line: Math.min(lines.length - 1, newLine), col: 0 }
        break
      }

      // Matching bracket
      case '%': {
        const currentLine = lines[line] || ''
        const char = currentLine[col]
        const brackets: Record<string, string> = {
          '(': ')', ')': '(',
          '[': ']', ']': '[',
          '{': '}', '}': '{',
          '<': '>', '>': '<',
        }
        const openBrackets = '([{<'
        const closeBrackets = ')]}>'
        
        if (brackets[char]) {
          const isOpen = openBrackets.includes(char)
          const target = brackets[char]
          let depth = 1
          
          if (isOpen) {
            // Search forward
            for (let l = line; l < lines.length && depth > 0; l++) {
              const startCol = l === line ? col + 1 : 0
              for (let c = startCol; c < lines[l].length && depth > 0; c++) {
                if (lines[l][c] === char) depth++
                else if (lines[l][c] === target) {
                  depth--
                  if (depth === 0) newPos = { line: l, col: c }
                }
              }
            }
          } else {
            // Search backward
            for (let l = line; l >= 0 && depth > 0; l--) {
              const startCol = l === line ? col - 1 : lines[l].length - 1
              for (let c = startCol; c >= 0 && depth > 0; c--) {
                if (lines[l][c] === char) depth++
                else if (lines[l][c] === target) {
                  depth--
                  if (depth === 0) newPos = { line: l, col: c }
                }
              }
            }
          }
        }
        break
      }

      // Screen motions
      case 'H':
        // Top of screen (first line)
        newPos = { line: 0, col: 0 }
        break
      case 'M':
        // Middle of screen
        newPos = { line: Math.floor(lines.length / 2), col: 0 }
        break
      case 'L':
        // Bottom of screen (last line)
        newPos = { line: lines.length - 1, col: 0 }
        break

      // Line jumps
      case '+': {
        // First non-blank of next line
        if (line < lines.length - 1) {
          const nextLine = lines[line + 1] || ''
          let firstNonSpace = 0
          while (firstNonSpace < nextLine.length && /\s/.test(nextLine[firstNonSpace])) {
            firstNonSpace++
          }
          newPos = { line: line + 1, col: firstNonSpace }
        }
        break
      }
      case '-': {
        // First non-blank of previous line
        if (line > 0) {
          const prevLine = lines[line - 1] || ''
          let firstNonSpace = 0
          while (firstNonSpace < prevLine.length && /\s/.test(prevLine[firstNonSpace])) {
            firstNonSpace++
          }
          newPos = { line: line - 1, col: firstNonSpace }
        }
        break
      }

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

      // Repeat find
      case ';':
      case ',':
        // These would repeat last f/F/t/T - need to store last find
        // For now, just consume
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
        else {
          // Unknown command, clear buffer
          setInputBuffer('')
          consumed = false
        }
        break
    }

    if (consumed) {
      addKeystroke(command)  // Pass the full command for analysis
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

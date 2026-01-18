import { useEffect, useRef, useCallback, useState } from 'react'
import { useTypingAnalyticsStore } from '../stores/typingAnalyticsStore'
import { typingApi } from '../api'

interface TypingTestProps {
  onFinish?: () => void
  timeLimit?: number
  mode?: 'words' | 'code'
  language?: string
}

export default function TypingTest({ 
  onFinish, 
  timeLimit: timeLimitProp = 60,
  mode = 'words',
  language = 'javascript'
}: TypingTestProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [timeLeft, setTimeLeft] = useState(timeLimitProp)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onFinishRef = useRef(onFinish)
  const [codeLines, setCodeLines] = useState<string[]>([])
  const [isLoadingCode, setIsLoadingCode] = useState(false)
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [currentLineInput, setCurrentLineInput] = useState('')
  const [completedLines, setCompletedLines] = useState<{line: string; typed: string; correct: boolean}[]>([])
  
  // Keep ref updated
  useEffect(() => {
    onFinishRef.current = onFinish
  }, [onFinish])
  
  const {
    words,
    currentWordIndex,
    currentInput,
    isRunning,
    isFinished,
    initTest,
    startTest,
    handleKeyPress,
    handleBackspace,
    finishTest,
    wordAttempts,
    currentWordStart,
    currentWordErrors,
    currentWordHasError,
  } = useTypingAnalyticsStore()
  
  // Helper to get leading whitespace from a line
  const getLeadingWhitespace = (line: string): string => {
    const match = line.match(/^(\s*)/)
    return match ? match[1] : ''
  }
  
  // Fetch AI-generated code for code mode
  const fetchCode = useCallback(async () => {
    if (mode !== 'code') return
    
    setIsLoadingCode(true)
    try {
      const response = await typingApi.generateTypingCode(language)
      if (response.data.lines) {
        setCodeLines(response.data.lines)
        setCurrentLineIndex(0)
        // Pre-fill with leading whitespace of first line
        const firstLine = response.data.lines[0] || ''
        setCurrentLineInput(getLeadingWhitespace(firstLine))
        setCompletedLines([])
      }
    } catch (error) {
      console.error('Failed to generate code:', error)
      // Fallback to some default code
      const fallbackLines = [
        `function hello() {`,
        `  console.log("Hello, World!");`,
        `}`,
      ]
      setCodeLines(fallbackLines)
      setCurrentLineInput(getLeadingWhitespace(fallbackLines[0]))
    }
    setIsLoadingCode(false)
  }, [mode, language])
  
  // Initialize test on mount and when mode/language changes (NOT timer)
  useEffect(() => {
    if (mode === 'code') {
      fetchCode()
    } else {
      initTest([], timeLimitProp)
    }
    setCurrentLineIndex(0)
    setCurrentLineInput('')
    setCompletedLines([])
  }, [mode, language, initTest, fetchCode])
  
  // Update timer when timeLimitProp changes (without refetching code)
  useEffect(() => {
    setTimeLeft(timeLimitProp)
  }, [timeLimitProp])
  
  // Timer countdown - only depends on isRunning and isFinished
  useEffect(() => {
    if (isRunning && !isFinished) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Use store's finishTest directly
            useTypingAnalyticsStore.getState().finishTest()
            onFinishRef.current?.()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isRunning, isFinished])
  
  // Focus input
  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  
  // Handle input for words mode
  const handleWordsInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const currentWord = words[currentWordIndex]
    
    if (!isRunning && !isFinished) {
      startTest()
    }
    
    // Handle space - move to next word
    if (value.endsWith(' ')) {
      const typedWord = value.trim()
      const wordHadError = currentWordHasError || typedWord !== currentWord
      
      // Record word attempt - errors is 1 if any error occurred, 0 otherwise
      const attempt = {
        word: currentWord,
        typed: typedWord,
        startTime: currentWordStart || Date.now(),
        endTime: Date.now(),
        correct: typedWord === currentWord,
        errors: wordHadError ? 1 : 0,
      }
      
      useTypingAnalyticsStore.setState(state => ({
        wordAttempts: [...state.wordAttempts, attempt],
        currentWordIndex: state.currentWordIndex + 1,
        currentInput: '',
        currentWordStart: Date.now(),
        currentWordErrors: 0,
        currentWordHasError: false,
      }))
      
      // Check if test complete
      if (currentWordIndex + 1 >= words.length) {
        finishTest()
        onFinish?.()
      }
      return
    }
    
    // Handle regular character input
    if (value.length > currentInput.length) {
      const newChar = value[value.length - 1]
      if (newChar !== ' ') {
        handleKeyPress(newChar, Date.now())
      }
    } else if (value.length < currentInput.length) {
      handleBackspace()
    }
    
    useTypingAnalyticsStore.setState({ currentInput: value })
  }, [words, currentWordIndex, currentInput, isRunning, isFinished, startTest, handleKeyPress, handleBackspace, finishTest, onFinish, currentWordStart, currentWordHasError])
  
  // Bracket pairs for auto-completion
  const BRACKET_PAIRS: Record<string, string> = {
    '(': ')',
    '[': ']',
    '{': '}',
    '"': '"',
    "'": "'",
    '`': '`',
  }
  
  // Handle input for code mode (line by line)
  const handleCodeInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value
    const currentLine = codeLines[currentLineIndex] || ''
    
    if (!isRunning && !isFinished) {
      startTest()
    }
    
    // Track keystrokes for analytics - only for new characters typed
    if (value.length > currentLineInput.length) {
      const newChar = value[value.length - 1]
      const expectedCharIndex = value.length - 1
      const expectedChar = currentLine[expectedCharIndex]
      
      // Auto-complete brackets if the next expected char is the closing bracket
      if (BRACKET_PAIRS[newChar]) {
        const closingBracket = BRACKET_PAIRS[newChar]
        const nextExpectedChar = currentLine[value.length]
        if (nextExpectedChar === closingBracket) {
          value = value + closingBracket
        }
      }
      
      // Use the store's handleKeyPress to properly track finger transitions
      // But we need to record correct/incorrect based on expected char comparison
      const isCorrectChar = newChar === expectedChar
      
      // Call handleKeyPress for finger transition tracking
      handleKeyPress(newChar, Date.now())
      
      // Update the last keystroke's correct status based on our comparison
      useTypingAnalyticsStore.setState(state => {
        const keystrokes = [...state.keystrokes]
        if (keystrokes.length > 0) {
          keystrokes[keystrokes.length - 1] = {
            ...keystrokes[keystrokes.length - 1],
            correct: isCorrectChar,
          }
        }
        return {
          keystrokes,
          currentWordHasError: state.currentWordHasError || !isCorrectChar,
        }
      })
    }
    
    setCurrentLineInput(value)
    
    // No auto-advance - user must press Enter to go to next line
  }, [codeLines, currentLineIndex, currentLineInput, isRunning, isFinished, startTest, handleKeyPress])
  
  // Handle Enter key for code mode
  const handleCodeKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const currentLine = codeLines[currentLineIndex] || ''
      
      if (!isRunning && !isFinished) {
        startTest()
      }
      
      // Count character-level errors for this line
      let charErrors = 0
      const maxLen = Math.max(currentLine.length, currentLineInput.length)
      for (let i = 0; i < maxLen; i++) {
        if (currentLine[i] !== currentLineInput[i]) {
          charErrors++
        }
      }
      
      const isCorrect = currentLineInput === currentLine
      
      // Record line attempt with character error count
      const attempt = {
        word: currentLine,
        typed: currentLineInput,
        startTime: currentWordStart || Date.now(),
        endTime: Date.now(),
        correct: isCorrect,
        errors: charErrors,
      }
      
      useTypingAnalyticsStore.setState(state => ({
        wordAttempts: [...state.wordAttempts, attempt],
        currentWordIndex: state.currentWordIndex + 1,
        currentWordStart: Date.now(),
        currentWordErrors: 0,
        currentWordHasError: false,
      }))
      
      setCompletedLines(prev => [...prev, { line: currentLine, typed: currentLineInput, correct: isCorrect }])
      
      // Move to next line with leading whitespace pre-filled
      const nextLineIndex = currentLineIndex + 1
      if (nextLineIndex < codeLines.length) {
        const nextLine = codeLines[nextLineIndex]
        setCurrentLineIndex(nextLineIndex)
        setCurrentLineInput(getLeadingWhitespace(nextLine))
      } else {
        setCurrentLineIndex(nextLineIndex)
        setCurrentLineInput('')
        finishTest()
        onFinish?.()
      }
    }
  }, [codeLines, currentLineIndex, currentLineInput, isRunning, isFinished, startTest, finishTest, onFinish, currentWordStart])
  
  // Render word with character highlighting
  const renderWord = (word: string, wordIndex: number) => {
    const isCurrentWord = wordIndex === currentWordIndex
    const isPastWord = wordIndex < currentWordIndex
    const attempt = wordAttempts[wordIndex]
    
    if (isPastWord && attempt) {
      // Show completed word
      const isCorrect = attempt.correct
      return (
        <span
          key={wordIndex}
          className={`mr-2 ${isCorrect ? 'text-vim-green' : 'text-vim-red line-through'}`}
        >
          {word}
        </span>
      )
    }
    
    if (isCurrentWord) {
      // Show current word with character highlighting
      return (
        <span key={wordIndex} className="mr-2 relative">
          {word.split('').map((char, charIndex) => {
            let className = 'text-vim-subtext'
            
            if (charIndex < currentInput.length) {
              const typedChar = currentInput[charIndex]
              className = typedChar === char ? 'text-vim-green' : 'text-vim-red bg-red-500/20'
            } else if (charIndex === currentInput.length) {
              className = 'text-vim-text border-l-2 border-vim-mauve animate-pulse'
            }
            
            return (
              <span key={charIndex} className={className}>
                {char}
              </span>
            )
          })}
          {/* Show extra typed characters */}
          {currentInput.length > word.length && (
            <span className="text-vim-red bg-red-500/20">
              {currentInput.slice(word.length)}
            </span>
          )}
        </span>
      )
    }
    
    // Future word
    return (
      <span key={wordIndex} className="mr-2 text-vim-subtext">
        {word}
      </span>
    )
  }
  
  const restartTest = () => {
    if (mode === 'code') {
      fetchCode()
    } else {
      initTest([], timeLimitProp)
    }
    setTimeLeft(timeLimitProp)
    setCurrentLineIndex(0)
    setCurrentLineInput('')
    setCompletedLines([])
    inputRef.current?.focus()
  }
  
  // Render character with highlighting for code mode
  const renderCodeChar = (char: string, index: number, typed: string) => {
    let className = 'text-vim-subtext'
    
    if (index < typed.length) {
      className = typed[index] === char ? 'text-vim-green' : 'text-vim-red bg-red-500/20'
    } else if (index === typed.length) {
      className = 'text-vim-text border-l-2 border-vim-mauve animate-pulse'
    }
    
    // Preserve whitespace
    if (char === ' ') {
      return <span key={index} className={className}>&nbsp;</span>
    }
    
    return <span key={index} className={className}>{char}</span>
  }
  
  // Loading state for code mode
  if (mode === 'code' && isLoadingCode) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-vim-surface rounded-lg p-6 min-h-[200px] flex items-center justify-center border border-vim-overlay">
          <div className="text-vim-subtext">Generating code...</div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Timer and stats bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-4xl font-bold text-vim-mauve">
          {timeLeft}
        </div>
        <div className="flex gap-6 text-vim-subtext">
          {mode === 'code' ? (
            <div>
              <span className="text-vim-text font-medium">{currentLineIndex}</span>
              <span className="text-sm ml-1">/ {codeLines.length} lines</span>
            </div>
          ) : (
            <>
              <div>
                <span className="text-vim-text font-medium">{currentWordIndex}</span>
                <span className="text-sm ml-1">words</span>
              </div>
              <div>
                <span className="text-vim-text font-medium">
                  {wordAttempts.filter(a => a.correct).length}
                </span>
                <span className="text-sm ml-1">correct</span>
              </div>
            </>
          )}
        </div>
        <button
          onClick={restartTest}
          className="px-4 py-2 bg-vim-surface hover:bg-vim-overlay rounded-lg text-vim-text transition-colors"
        >
          ⟳ Restart
        </button>
      </div>
      
      {/* Code display (for code mode) */}
      {mode === 'code' ? (
        <div 
          className="bg-vim-surface rounded-lg p-6 mb-4 min-h-[300px] cursor-text border border-vim-overlay font-mono"
          onClick={() => inputRef.current?.focus()}
        >
          <div className="space-y-1 text-lg">
            {codeLines.map((line, lineIndex) => {
              const isCompleted = lineIndex < currentLineIndex
              const isCurrent = lineIndex === currentLineIndex
              const completedLine = completedLines[lineIndex]
              
              if (isCompleted && completedLine) {
                return (
                  <div 
                    key={lineIndex} 
                    className={`${completedLine.correct ? 'text-vim-green' : 'text-vim-red'} whitespace-pre`}
                  >
                    {line || '\u00A0'}
                  </div>
                )
              }
              
              if (isCurrent) {
                return (
                  <div key={lineIndex} className="whitespace-pre">
                    {line.split('').map((char, charIndex) => 
                      renderCodeChar(char, charIndex, currentLineInput)
                    )}
                    {currentLineInput.length > line.length && (
                      <span className="text-vim-red bg-red-500/20">
                        {currentLineInput.slice(line.length)}
                      </span>
                    )}
                    {line.length === 0 && currentLineInput.length === 0 && (
                      <span className="text-vim-text border-l-2 border-vim-mauve animate-pulse">&nbsp;</span>
                    )}
                  </div>
                )
              }
              
              // Future line
              return (
                <div key={lineIndex} className="text-vim-subtext/50 whitespace-pre">
                  {line || '\u00A0'}
                </div>
              )
            })}
          </div>
          
          {/* Hidden input for code mode */}
          <input
            ref={inputRef}
            type="text"
            value={currentLineInput}
            onChange={handleCodeInputChange}
            onKeyDown={handleCodeKeyDown}
            className="opacity-0 absolute -z-10"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            disabled={isFinished || currentLineIndex >= codeLines.length}
          />
        </div>
      ) : (
        <>
          {/* Words display (for words mode) */}
          <div 
            className="bg-vim-surface rounded-lg p-6 mb-4 min-h-[200px] cursor-text border border-vim-overlay"
            onClick={() => inputRef.current?.focus()}
          >
            <div className="text-2xl leading-relaxed font-mono flex flex-wrap">
              {words.slice(0, Math.min(currentWordIndex + 30, words.length)).map((word, index) => 
                renderWord(word, index)
              )}
            </div>
          </div>
          
          {/* Hidden input for words mode */}
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={handleWordsInputChange}
            className="opacity-0 absolute -z-10"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            disabled={isFinished}
          />
        </>
      )}
      
      {/* Instructions */}
      {!isRunning && !isFinished && (
        <div className="text-center text-vim-subtext">
          {mode === 'code' 
            ? 'Type each line exactly as shown, press Enter to move to the next line'
            : 'Click and start typing to begin the test'
          }
        </div>
      )}
    </div>
  )
}

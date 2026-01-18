import { useEffect, useRef, useCallback, useState } from 'react'
import { useTypingAnalyticsStore } from '../stores/typingAnalyticsStore'

interface TypingTestProps {
  onFinish?: () => void
  timeLimit?: number
}

export default function TypingTest({ onFinish, timeLimit: timeLimitProp = 60 }: TypingTestProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [timeLeft, setTimeLeft] = useState(timeLimitProp)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onFinishRef = useRef(onFinish)
  
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
  
  // Initialize test on mount
  useEffect(() => {
    initTest([], timeLimitProp)
    setTimeLeft(timeLimitProp)
  }, [initTest])
  
  // Sync timeLeft when timeLimitProp changes (and test hasn't started)
  useEffect(() => {
    if (!isRunning && !isFinished) {
      setTimeLeft(timeLimitProp)
      initTest([], timeLimitProp)
    }
  }, [timeLimitProp, isRunning, isFinished, initTest])
  
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
  
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, [words, currentWordIndex, currentInput, isRunning, isFinished, startTest, handleKeyPress, handleBackspace, finishTest, onFinish, currentWordStart, currentWordErrors])
  
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
    initTest([], timeLimitProp)
    setTimeLeft(timeLimitProp)
    inputRef.current?.focus()
  }
  
  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Timer and stats bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-4xl font-bold text-vim-mauve">
          {timeLeft}
        </div>
        <div className="flex gap-6 text-vim-subtext">
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
        </div>
        <button
          onClick={restartTest}
          className="px-4 py-2 bg-vim-surface hover:bg-vim-overlay rounded-lg text-vim-text transition-colors"
        >
          ⟳ Restart
        </button>
      </div>
      
      {/* Words display */}
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
      
      {/* Hidden input */}
      <input
        ref={inputRef}
        type="text"
        value={currentInput}
        onChange={handleInputChange}
        className="opacity-0 absolute -z-10"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        disabled={isFinished}
      />
      
      {/* Instructions */}
      {!isRunning && !isFinished && (
        <div className="text-center text-vim-subtext">
          Click and start typing to begin the test
        </div>
      )}
    </div>
  )
}

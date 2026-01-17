import { useEffect, useCallback, useRef } from 'react'
import { useTypingStore } from '../stores/typingStore'
import api from '../services/api'
import { useAuthStore } from '../stores/authStore'

export default function TypingTest() {
  const {
    mode,
    timeOption,
    wordsOption,
    words,
    setWords,
    currentWordIndex,
    currentCharIndex,
    typedWords,
    isActive,
    isFinished,
    timeLeft,
    startTest,
    resetTest,
    updateProgress,
    decrementTime,
    correctChars,
    incorrectChars,
    addCorrectChar,
    addIncorrectChar,
    startTime,
    endTime,
  } = useTypingStore()
  
  const { user } = useAuthStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch words on mount and when mode/options change
  useEffect(() => {
    const fetchWords = async () => {
      try {
        let count = 50
        if (mode === 'words') {
          count = wordsOption
        } else if (mode === 'time') {
          count = Math.max(100, timeOption * 3)
        }
        
        if (mode === 'quote') {
          const response = await api.get('/typing/quote')
          setWords(response.data.words)
        } else {
          const response = await api.get(`/typing/words?count=${count}`)
          setWords(response.data.words)
        }
        resetTest()
      } catch (error) {
        console.error('Failed to fetch words:', error)
        // Fallback words
        setWords(['the', 'quick', 'brown', 'fox', 'jumps', 'over', 'the', 'lazy', 'dog'])
      }
    }
    
    fetchWords()
  }, [mode, timeOption, wordsOption, setWords, resetTest])

  // Timer for time mode
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    
    if (isActive && mode === 'time') {
      interval = setInterval(() => {
        decrementTime()
      }, 1000)
    }
    
    return () => clearInterval(interval)
  }, [isActive, mode, decrementTime])

  // Focus input when clicking container
  useEffect(() => {
    const handleClick = () => {
      inputRef.current?.focus()
    }
    
    containerRef.current?.addEventListener('click', handleClick)
    return () => containerRef.current?.removeEventListener('click', handleClick)
  }, [])

  // Check if words mode is complete
  useEffect(() => {
    if (mode === 'words' && currentWordIndex >= words.length && words.length > 0) {
      useTypingStore.getState().finishTest()
    }
  }, [mode, currentWordIndex, words.length])

  // Save result when test finishes
  useEffect(() => {
    if (isFinished && user && startTime) {
      const duration = ((endTime || Date.now()) - startTime) / 1000
      const totalChars = correctChars + incorrectChars
      const wpm = totalChars > 0 ? (correctChars / 5) / (duration / 60) : 0
      const rawWpm = totalChars > 0 ? (totalChars / 5) / (duration / 60) : 0
      const accuracy = totalChars > 0 ? (correctChars / totalChars) * 100 : 0

      api.post('/typing/result', {
        mode,
        mode_value: mode === 'time' ? timeOption : wordsOption,
        wpm,
        raw_wpm: rawWpm,
        accuracy,
        correct_chars: correctChars,
        incorrect_chars: incorrectChars,
        test_duration: duration,
      }).catch(console.error)
    }
  }, [isFinished, user, correctChars, incorrectChars, mode, timeOption, wordsOption, startTime, endTime])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isFinished) return
    
    if (!isActive && e.key.length === 1) {
      startTest()
    }

    const currentWord = words[currentWordIndex] || ''
    const currentTyped = typedWords[currentWordIndex] || ''

    if (e.key === ' ') {
      e.preventDefault()
      if (currentTyped.length > 0) {
        // Move to next word
        const newTypedWords = [...typedWords]
        newTypedWords[currentWordIndex] = currentTyped
        updateProgress(currentWordIndex + 1, 0, newTypedWords)
      }
    } else if (e.key === 'Backspace') {
      if (currentTyped.length > 0) {
        const newTypedWords = [...typedWords]
        newTypedWords[currentWordIndex] = currentTyped.slice(0, -1)
        updateProgress(currentWordIndex, currentCharIndex - 1, newTypedWords)
      } else if (currentWordIndex > 0) {
        // Go back to previous word
        const prevTyped = typedWords[currentWordIndex - 1] || ''
        updateProgress(currentWordIndex - 1, prevTyped.length, typedWords)
      }
    } else if (e.key.length === 1) {
      const newTypedWords = [...typedWords]
      newTypedWords[currentWordIndex] = currentTyped + e.key
      
      // Track accuracy
      if (currentCharIndex < currentWord.length) {
        if (e.key === currentWord[currentCharIndex]) {
          addCorrectChar()
        } else {
          addIncorrectChar()
        }
      } else {
        addIncorrectChar() // Extra characters
      }
      
      updateProgress(currentWordIndex, currentCharIndex + 1, newTypedWords)
    }
  }, [
    isActive, isFinished, words, currentWordIndex, currentCharIndex, 
    typedWords, startTest, updateProgress, addCorrectChar, addIncorrectChar
  ])

  const handleRestart = () => {
    resetTest()
    inputRef.current?.focus()
  }

  // Calculate stats
  const calculateStats = () => {
    if (!startTime) return { wpm: 0, rawWpm: 0, accuracy: 0 }
    
    const duration = ((endTime || Date.now()) - startTime) / 1000
    const totalChars = correctChars + incorrectChars
    const wpm = totalChars > 0 ? Math.round((correctChars / 5) / (duration / 60)) : 0
    const rawWpm = totalChars > 0 ? Math.round((totalChars / 5) / (duration / 60)) : 0
    const accuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100
    
    return { wpm, rawWpm, accuracy }
  }

  const stats = calculateStats()

  if (isFinished) {
    return (
      <div className="text-center py-12">
        <h2 className="text-4xl font-bold text-main mb-8">Test Complete!</h2>
        
        <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto mb-8">
          <div>
            <div className="text-5xl font-bold text-main">{stats.wpm}</div>
            <div className="text-sub">wpm</div>
          </div>
          <div>
            <div className="text-5xl font-bold text-text">{stats.accuracy}%</div>
            <div className="text-sub">accuracy</div>
          </div>
          <div>
            <div className="text-5xl font-bold text-text">{stats.rawWpm}</div>
            <div className="text-sub">raw</div>
          </div>
        </div>

        <div className="flex justify-center gap-4 text-sub mb-8">
          <span>correct: <span className="text-correct">{correctChars}</span></span>
          <span>incorrect: <span className="text-error">{incorrectChars}</span></span>
        </div>

        <button
          onClick={handleRestart}
          className="px-6 py-2 bg-bg-secondary text-text rounded hover:text-main transition-colors"
        >
          restart test
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="cursor-text">
      {/* Timer/Counter */}
      <div className="text-center mb-8">
        {mode === 'time' && (
          <span className="text-4xl font-bold text-main">{timeLeft}</span>
        )}
        {mode === 'words' && (
          <span className="text-2xl text-sub">
            {currentWordIndex} / {words.length}
          </span>
        )}
        {isActive && (
          <span className="text-2xl text-sub ml-8">{stats.wpm} wpm</span>
        )}
      </div>

      {/* Hidden input for capturing keystrokes */}
      <input
        ref={inputRef}
        type="text"
        className="absolute opacity-0 pointer-events-none"
        onKeyDown={handleKeyDown}
        autoFocus
      />

      {/* Words display */}
      <div className="text-2xl leading-relaxed select-none focus:outline-none">
        {words.map((word, wordIndex) => {
          const typedWord = typedWords[wordIndex] || ''
          const isCurrentWord = wordIndex === currentWordIndex
          
          return (
            <span key={wordIndex} className="inline-block mr-3 mb-2">
              {word.split('').map((char, charIndex) => {
                let className = 'text-sub'
                
                if (wordIndex < currentWordIndex) {
                  // Past word
                  if (charIndex < typedWord.length) {
                    className = typedWord[charIndex] === char ? 'text-correct' : 'text-error'
                  } else {
                    className = 'text-error' // Missed character
                  }
                } else if (isCurrentWord) {
                  // Current word
                  if (charIndex < typedWord.length) {
                    className = typedWord[charIndex] === char ? 'text-correct' : 'text-error'
                  }
                  if (charIndex === typedWord.length) {
                    className += ' border-l-2 border-caret typing-cursor'
                  }
                }
                
                return (
                  <span key={charIndex} className={className}>
                    {char}
                  </span>
                )
              })}
              {/* Extra typed characters */}
              {typedWord.length > word.length && (
                <span className="text-error">
                  {typedWord.slice(word.length)}
                </span>
              )}
              {/* Cursor at end of word */}
              {isCurrentWord && typedWord.length >= word.length && (
                <span className="border-l-2 border-caret typing-cursor">&nbsp;</span>
              )}
            </span>
          )
        })}
      </div>

      {/* Instructions */}
      {!isActive && (
        <p className="text-center text-sub mt-8">
          Click here and start typing to begin the test
        </p>
      )}

      {/* Restart button */}
      <div className="text-center mt-8">
        <button
          onClick={handleRestart}
          className="text-sub hover:text-main transition-colors"
        >
          ↻ restart
        </button>
      </div>
    </div>
  )
}

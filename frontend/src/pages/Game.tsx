import { useEffect, useState, useCallback, useRef } from 'react'
import VimEditor from '../components/VimEditor'
import { useGameStore, Target, Position } from '../stores/gameStore'
import { useAuthStore } from '../stores/authStore'
import { typingApi } from '../api'

const LANGUAGES = ['python', 'javascript', 'typescript', 'rust', 'go', 'c']

// Generate random targets within the code
function generateTargets(lines: string[], count: number): Target[] {
  const targets: Target[] = []
  const validPositions: Position[] = []

  // Find all valid positions (non-whitespace characters)
  lines.forEach((line, lineIdx) => {
    line.split('').forEach((char, colIdx) => {
      if (!/\s/.test(char)) {
        validPositions.push({ line: lineIdx, col: colIdx })
      }
    })
  })

  // Shuffle and pick random positions
  const shuffled = [...validPositions].sort(() => Math.random() - 0.5)
  
  // Make sure targets are spread out
  let lastPos: Position | null = null
  for (const pos of shuffled) {
    if (targets.length >= count) break
    
    // Ensure minimum distance between targets
    if (lastPos) {
      const distance = Math.abs(pos.line - lastPos.line) + Math.abs(pos.col - lastPos.col)
      if (distance < 5) continue
    }
    
    targets.push({ position: pos, completed: false })
    lastPos = pos
  }

  return targets
}

export default function Game() {
  const { 
    language, 
    lines,
    targets,
    isPlaying,
    isFinished,
    startTime,
    endTime,
    keystrokeCount,
    targetsCompleted,
    currentTargetIndex,
    setLanguage,
    initGame,
    resetGame,
  } = useGameStore()

  const { isAuthenticated } = useAuthStore()
  
  const [isLoading, setIsLoading] = useState(false)
  const [targetCount, setTargetCount] = useState(5)
  const [showResults, setShowResults] = useState(false)
  const [resultSaved, setResultSaved] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [useAI, setUseAI] = useState(false)
  const [isAIGenerated, setIsAIGenerated] = useState(false)
  const timerRef = useRef<number | null>(null)

  // Timer effect - updates every 100ms while playing
  useEffect(() => {
    if (isPlaying && !isFinished && startTime) {
      timerRef.current = window.setInterval(() => {
        setCurrentTime(Date.now())
      }, 100)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isPlaying, isFinished, startTime])

  // Calculate stats with live timer
  const elapsedTime = startTime 
    ? ((isFinished && endTime ? endTime : currentTime || Date.now()) - startTime) / 1000 
    : 0
  
  const avgTimePerTarget = targetsCompleted > 0 
    ? elapsedTime / targetsCompleted 
    : 0

  // Load a new snippet
  const loadNewGame = useCallback(async () => {
    setIsLoading(true)
    setShowResults(false)
    setResultSaved(false)
    setIsAIGenerated(false)
    
    try {
      const response = await typingApi.getSnippet(language, useAI)
      const { lines: codeLines, ai_generated } = response.data
      const generatedTargets = generateTargets(codeLines, targetCount)
      initGame(codeLines, generatedTargets)
      setIsAIGenerated(ai_generated || false)
    } catch (error) {
      console.error('Failed to load snippet:', error)
      // Fallback code
      const fallbackCode = [
        'def example():',
        '    x = 10',
        '    y = 20',
        '    return x + y',
      ]
      const generatedTargets = generateTargets(fallbackCode, targetCount)
      initGame(fallbackCode, generatedTargets)
    }
    
    setIsLoading(false)
  }, [language, targetCount, useAI, initGame])

  // Load game on mount and language change
  useEffect(() => {
    loadNewGame()
  }, [language])

  // Show results when finished
  useEffect(() => {
    if (isFinished) {
      setShowResults(true)
    }
  }, [isFinished])

  // Save result when game finishes
  const saveResult = async () => {
    if (!isAuthenticated || resultSaved) return
    
    try {
      await typingApi.saveResult({
        mode: 'vim',
        language,
        wpm: Math.round(60 / avgTimePerTarget), // Approximate WPM based on targets/time
        raw_wpm: Math.round(60 / avgTimePerTarget),
        accuracy: 100, // In vim racer, you must reach exact position
        correct_chars: keystrokeCount,
        incorrect_chars: 0,
        test_duration: elapsedTime,
        lines_completed: targetsCompleted,
      })
      setResultSaved(true)
    } catch (error) {
      console.error('Failed to save result:', error)
    }
  }

  // Handle target reached
  const handleTargetReached = () => {
    // Play success sound or animation could be added here
  }

  return (
    <div className="space-y-6">
      {/* Game Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Language Selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={isPlaying}
            className="bg-vim-surface border border-vim-overlay rounded-lg px-4 py-2 text-vim-text focus:outline-none focus:ring-2 focus:ring-vim-green/50 disabled:opacity-50"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang.charAt(0).toUpperCase() + lang.slice(1)}
              </option>
            ))}
          </select>

          {/* Target Count */}
          <div className="flex items-center gap-2">
            <label className="text-vim-subtext text-sm">Targets:</label>
            <select
              value={targetCount}
              onChange={(e) => setTargetCount(parseInt(e.target.value))}
              disabled={isPlaying}
              className="bg-vim-surface border border-vim-overlay rounded-lg px-3 py-2 text-vim-text focus:outline-none focus:ring-2 focus:ring-vim-green/50 disabled:opacity-50"
            >
              {[3, 5, 7, 10].map((count) => (
                <option key={count} value={count}>{count}</option>
              ))}
            </select>
          </div>

          {/* AI Toggle */}
          <div className="flex items-center gap-2">
            <label className="text-vim-subtext text-sm">AI Code:</label>
            <button
              onClick={() => setUseAI(!useAI)}
              disabled={isPlaying}
              className={`px-3 py-2 rounded-lg border transition-colors disabled:opacity-50 ${
                useAI 
                  ? 'bg-vim-green/20 border-vim-green text-vim-green' 
                  : 'bg-vim-surface border-vim-overlay text-vim-subtext hover:text-vim-text'
              }`}
            >
              {useAI ? '✨ On' : 'Off'}
            </button>
            {isAIGenerated && (
              <span className="text-vim-green text-xs">✨ AI Generated</span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              resetGame()
              loadNewGame()
            }}
            className="bg-vim-surface border border-vim-overlay text-vim-text px-4 py-2 rounded-lg hover:bg-vim-overlay transition-colors"
          >
            New Game
          </button>
          {isPlaying && (
            <button
              onClick={resetGame}
              className="text-vim-red hover:text-vim-red/80 transition-colors"
            >
              Restart
            </button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-vim-surface rounded-lg border border-vim-overlay p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div>
              <div className="text-vim-subtext text-xs uppercase tracking-wide">Time</div>
              <div className="text-2xl font-bold text-vim-text">
                {elapsedTime.toFixed(1)}s
              </div>
            </div>
            <div>
              <div className="text-vim-subtext text-xs uppercase tracking-wide">Targets</div>
              <div className="text-2xl font-bold text-vim-green">
                {targetsCompleted} / {targets.length}
              </div>
            </div>
            <div>
              <div className="text-vim-subtext text-xs uppercase tracking-wide">Keystrokes</div>
              <div className="text-2xl font-bold text-vim-text">
                {keystrokeCount}
              </div>
            </div>
            <div>
              <div className="text-vim-subtext text-xs uppercase tracking-wide">Avg Time</div>
              <div className="text-2xl font-bold text-vim-yellow">
                {avgTimePerTarget.toFixed(2)}s
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-48">
            <div className="h-2 bg-vim-bg rounded-full overflow-hidden">
              <div 
                className="h-full bg-vim-green transition-all duration-300"
                style={{ width: `${(targetsCompleted / targets.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Editor */}
      {isLoading ? (
        <div className="bg-vim-surface rounded-lg border border-vim-overlay p-16 text-center">
          <div className="text-vim-subtext">Loading code snippet...</div>
        </div>
      ) : (
        <VimEditor onTargetReached={handleTargetReached} />
      )}

      {/* Instructions */}
      {!isPlaying && !isFinished && (
        <div className="bg-vim-surface/50 rounded-lg border border-vim-overlay p-6 text-center">
          <p className="text-vim-subtext mb-2">
            Navigate to the <span className="text-vim-green">highlighted target</span> using Vim motions
          </p>
          <p className="text-vim-text">
            Press any Vim key to start!
          </p>
        </div>
      )}

      {/* Target Indicator */}
      {isPlaying && currentTargetIndex < targets.length && (
        <div className="bg-vim-surface rounded-lg border border-vim-overlay p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-vim-subtext">Current Target:</span>
              <span className="text-vim-green font-mono">
                Line {targets[currentTargetIndex].position.line + 1}, 
                Col {targets[currentTargetIndex].position.col + 1}
              </span>
            </div>
            <div className="text-vim-subtext text-sm">
              Hint: Try using <kbd className="bg-vim-bg px-2 py-1 rounded text-vim-yellow">gg</kbd>,{' '}
              <kbd className="bg-vim-bg px-2 py-1 rounded text-vim-yellow">G</kbd>,{' '}
              <kbd className="bg-vim-bg px-2 py-1 rounded text-vim-yellow">f</kbd>, or{' '}
              <kbd className="bg-vim-bg px-2 py-1 rounded text-vim-yellow">w</kbd>
            </div>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {showResults && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-vim-surface rounded-xl border border-vim-overlay p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-vim-green text-center mb-6">
              🎉 Race Complete!
            </h2>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-vim-subtext">Total Time</span>
                <span className="text-vim-text text-xl font-bold">{elapsedTime.toFixed(2)}s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-vim-subtext">Targets Hit</span>
                <span className="text-vim-green text-xl font-bold">{targetsCompleted}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-vim-subtext">Total Keystrokes</span>
                <span className="text-vim-text text-xl font-bold">{keystrokeCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-vim-subtext">Avg Time/Target</span>
                <span className="text-vim-yellow text-xl font-bold">{avgTimePerTarget.toFixed(2)}s</span>
              </div>
            </div>

            <div className="space-y-3">
              {isAuthenticated && !resultSaved && (
                <button
                  onClick={saveResult}
                  className="w-full bg-vim-blue text-vim-bg py-3 rounded-lg font-medium hover:bg-vim-blue/90 transition-colors"
                >
                  Save Result
                </button>
              )}
              {resultSaved && (
                <div className="text-vim-green text-center py-2">
                  ✓ Result saved!
                </div>
              )}
              <button
                onClick={() => {
                  setShowResults(false)
                  loadNewGame()
                }}
                className="w-full bg-vim-green text-vim-bg py-3 rounded-lg font-bold hover:bg-vim-green/90 transition-colors"
              >
                Play Again
              </button>
              <button
                onClick={() => setShowResults(false)}
                className="w-full text-vim-subtext py-2 hover:text-vim-text transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vim Commands Reference */}
      <div className="bg-vim-surface rounded-lg border border-vim-overlay p-6">
        <h3 className="text-lg font-semibold text-vim-text mb-4">Vim Motions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <kbd className="bg-vim-bg px-2 py-1 rounded text-vim-green">h j k l</kbd>
            <span className="text-vim-subtext ml-2">Move</span>
          </div>
          <div>
            <kbd className="bg-vim-bg px-2 py-1 rounded text-vim-green">w b e</kbd>
            <span className="text-vim-subtext ml-2">Words</span>
          </div>
          <div>
            <kbd className="bg-vim-bg px-2 py-1 rounded text-vim-green">0 $ ^</kbd>
            <span className="text-vim-subtext ml-2">Line</span>
          </div>
          <div>
            <kbd className="bg-vim-bg px-2 py-1 rounded text-vim-green">gg G</kbd>
            <span className="text-vim-subtext ml-2">File</span>
          </div>
          <div>
            <kbd className="bg-vim-bg px-2 py-1 rounded text-vim-green">f{'{c}'}</kbd>
            <span className="text-vim-subtext ml-2">Find char</span>
          </div>
          <div>
            <kbd className="bg-vim-bg px-2 py-1 rounded text-vim-green">t{'{c}'}</kbd>
            <span className="text-vim-subtext ml-2">Till char</span>
          </div>
          <div>
            <kbd className="bg-vim-bg px-2 py-1 rounded text-vim-green">F{'{c}'}</kbd>
            <span className="text-vim-subtext ml-2">Find back</span>
          </div>
          <div>
            <kbd className="bg-vim-bg px-2 py-1 rounded text-vim-green">{'{n}'}j</kbd>
            <span className="text-vim-subtext ml-2">Repeat</span>
          </div>
        </div>
      </div>
    </div>
  )
}

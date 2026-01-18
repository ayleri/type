import { useEffect, useState, useCallback, useRef } from 'react'
import VimEditor from '../components/VimEditor'
import { useGameStore, Target, Position } from '../stores/gameStore'
import { useAuthStore } from '../stores/authStore'
import { typingApi } from '../api'

const LANGUAGES = ['python', 'javascript', 'typescript', 'rust', 'go', 'c']

// Weakness-aware target generation
interface UserWeakness {
  type: string           // Backend uses 'type' not 'weakness_type'
  count: number
  label: string
  tip: string
  practice: string
  severity: string
}

// Generate random targets within the code, optionally focusing on weaknesses
function generateTargets(
  lines: string[], 
  count: number, 
  startPos: Position = { line: 0, col: 0 },
  weaknesses: UserWeakness[] = []
): Target[] {
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

  // If no weaknesses, use random selection
  if (weaknesses.length === 0) {
    return generateRandomTargets(validPositions, count)
  }

  // Score positions based on how well they target weaknesses
  let currentPos = startPos
  
  for (let i = 0; i < count && validPositions.length > 0; i++) {
    const scoredPositions = validPositions.map(pos => {
      let score = 0
      const lineDiff = Math.abs(pos.line - currentPos.line)
      const colDiff = Math.abs(pos.col - currentPos.col)
      
      // Score based on weaknesses (using backend weakness types)
      for (const weakness of weaknesses) {
        // Higher count = more weight to practice this weakness
        const weight = Math.min(weakness.count / 5, 3) // Cap at 3x multiplier
        
        switch (weakness.type) {
          case 'slow_basic_movement':
            // Prefer targets that require precise h/j/k/l movement
            if (lineDiff <= 3 && colDiff <= 5) {
              score += weight * 10
            }
            break
          case 'missing_word_motions':
            // Prefer targets at word boundaries
            const line = lines[pos.line]
            if (pos.col === 0 || /\s/.test(line[pos.col - 1] || '')) {
              score += weight * 15
            }
            break
          case 'missing_line_motions':
            // Prefer line start/end positions
            const lineLen = lines[pos.line].length
            if (pos.col === 0 || pos.col >= lineLen - 2) {
              score += weight * 15
            }
            break
          case 'missing_find_motions':
            // Prefer specific characters that benefit from f/t
            const targetChar = lines[pos.line][pos.col]
            if (/[(){}\[\]<>'"=:;,.]/.test(targetChar)) {
              score += weight * 15
            }
            break
          case 'missing_bracket_matching':
            // Prefer matching bracket positions
            const char = lines[pos.line][pos.col]
            if (/[(){}\[\]]/.test(char)) {
              score += weight * 20
            }
            break
          case 'missing_paragraph_motions':
            // Prefer targets on different lines (encourages } or { usage)
            if (lineDiff >= 4) {
              score += weight * 15
            }
            break
          case 'missing_count_prefix':
            // Prefer targets that would benefit from counted motions
            if (lineDiff >= 3 || colDiff >= 5) {
              score += weight * 12
            }
            break
        }
      }
      
      // Add some randomness to prevent predictable patterns
      score += Math.random() * 5
      
      // Ensure minimum distance
      const distance = lineDiff + colDiff
      if (distance < 3) {
        score -= 50
      }
      
      return { pos, score }
    })

    // Sort by score and pick the best
    scoredPositions.sort((a, b) => b.score - a.score)
    
    // Pick from top candidates with some randomness
    const topCandidates = scoredPositions.slice(0, Math.max(3, Math.floor(scoredPositions.length * 0.2)))
    const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)]
    
    if (selected) {
      targets.push({ position: selected.pos, completed: false })
      currentPos = selected.pos
      
      // Remove selected position to avoid duplicates
      const idx = validPositions.findIndex(p => p.line === selected.pos.line && p.col === selected.pos.col)
      if (idx > -1) validPositions.splice(idx, 1)
    }
  }

  return targets
}

// Original random target generation
function generateRandomTargets(validPositions: Position[], count: number): Target[] {
  const targets: Target[] = []
  const shuffled = [...validPositions].sort(() => Math.random() - 0.5)
  
  let lastPos: Position | null = null
  for (const pos of shuffled) {
    if (targets.length >= count) break
    
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
    targets,
    isPlaying,
    isFinished,
    startTime,
    endTime,
    keystrokeCount,
    optimalKeystrokes,
    targetsCompleted,
    currentTargetIndex,
    targetResults,
    sessionWeaknesses,
    setLanguage,
    initGame,
    initGameWithSolutions,
    resetGame,
    getSessionAnalysis,
  } = useGameStore()

  const { isAuthenticated } = useAuthStore()
  
  const [isLoading, setIsLoading] = useState(false)
  const [targetCount, setTargetCount] = useState(5)
  const [showResults, setShowResults] = useState(false)
  const [resultSaved, setResultSaved] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [userWeaknesses, setUserWeaknesses] = useState<UserWeakness[]>([])
  const [practiceMode, setPracticeMode] = useState<'random' | 'weaknesses'>('random')
  const timerRef = useRef<number | null>(null)

  // Fetch user weaknesses on auth change
  useEffect(() => {
    if (isAuthenticated) {
      typingApi.getWeaknesses()
        .then((res) => {
          if (res.data?.weaknesses) {
            setUserWeaknesses(res.data.weaknesses)
          }
        })
        .catch(() => console.log('No weaknesses data yet'))
    }
  }, [isAuthenticated])

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

  // Load a new snippet - always uses AI-generated challenges
  const loadNewGame = useCallback(async () => {
    setIsLoading(true)
    setShowResults(false)
    setResultSaved(false)
    
    try {
      // Use AI to generate code WITH optimal solutions
      const weaknessTypes = practiceMode === 'weaknesses' 
        ? userWeaknesses.map(w => w.type) 
        : []
      
      const response = await typingApi.getVimChallenge(language, targetCount, weaknessTypes)
      const { lines: codeLines, targets: aiTargets } = response.data
      
      // Convert AI targets to our format (they already have optimal solutions)
      const targetsWithSolutions: Target[] = aiTargets.map((t: any) => ({
        position: t.position,
        completed: false,
        optimalSolution: {
          keys: [t.optimal_keys],
          description: t.description,
          category: 'count' as const
        }
      }))
      
      initGameWithSolutions(codeLines, targetsWithSolutions)
    } catch (error) {
      console.error('Failed to load snippet:', error)
      // Fallback code
      const fallbackCode = [
        'def example():',
        '    x = 10',
        '    y = 20',
        '    return x + y',
      ]
      const weaknessesToUse = practiceMode === 'weaknesses' ? userWeaknesses : []
      const generatedTargets = generateTargets(fallbackCode, targetCount, { line: 0, col: 0 }, weaknessesToUse)
      initGame(fallbackCode, generatedTargets)
    }
    
    setIsLoading(false)
  }, [language, targetCount, practiceMode, userWeaknesses, initGame, initGameWithSolutions])

  // Load game on mount, language change, or target count change
  useEffect(() => {
    loadNewGame()
  }, [loadNewGame])

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
      const analysis = getSessionAnalysis()
      
      await typingApi.saveResult({
        mode: 'vim',
        language,
        wpm: Math.round(60 / avgTimePerTarget), // Approximate WPM based on targets/time
        raw_wpm: Math.round(60 / avgTimePerTarget),
        accuracy: 100, // In typrace, you must reach exact position
        correct_chars: keystrokeCount,
        incorrect_chars: 0,
        test_duration: elapsedTime,
        lines_completed: targetsCompleted,
        efficiency: analysis.totalEfficiency,
        optimal_keystrokes: optimalKeystrokes,
        actual_keystrokes: keystrokeCount,
        weaknesses: sessionWeaknesses as Record<string, number>,
        target_results: targetResults.map(r => ({
          targetIndex: r.targetIndex,
          userKeys: r.userKeys,
          timeTaken: r.timeTaken,
          efficiency: r.analysis.efficiency,
          isOptimal: r.analysis.isOptimal,
          weakness: r.analysis.weakness,
        })),
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

          {/* Practice Mode Toggle */}
          {isAuthenticated && userWeaknesses.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-vim-subtext text-sm">Mode:</label>
              <button
                onClick={() => setPracticeMode(practiceMode === 'random' ? 'weaknesses' : 'random')}
                disabled={isPlaying}
                className={`px-3 py-2 rounded-lg border transition-colors disabled:opacity-50 ${
                  practiceMode === 'weaknesses'
                    ? 'bg-vim-yellow/20 border-vim-yellow text-vim-yellow'
                    : 'bg-vim-surface border-vim-overlay text-vim-subtext hover:text-vim-text'
                }`}
              >
                {practiceMode === 'weaknesses' ? '🎯 Practice' : 'Random'}
              </button>
              {practiceMode === 'weaknesses' && (
                <span className="text-vim-yellow text-xs">Targeting {userWeaknesses.length} weakness{userWeaknesses.length !== 1 ? 'es' : ''}</span>
              )}
            </div>
          )}
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
          <div className="bg-vim-surface rounded-xl border border-vim-overlay p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-vim-green text-center mb-6">
              🎉 Race Complete!
            </h2>
            
            {/* Main Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-vim-bg/50 rounded-lg p-4 text-center">
                <div className="text-vim-subtext text-sm">Total Time</div>
                <div className="text-vim-text text-2xl font-bold">{elapsedTime.toFixed(2)}s</div>
              </div>
              <div className="bg-vim-bg/50 rounded-lg p-4 text-center">
                <div className="text-vim-subtext text-sm">Targets Hit</div>
                <div className="text-vim-green text-2xl font-bold">{targetsCompleted}</div>
              </div>
              <div className="bg-vim-bg/50 rounded-lg p-4 text-center">
                <div className="text-vim-subtext text-sm">Keystrokes</div>
                <div className="text-vim-text text-2xl font-bold">
                  {keystrokeCount}
                  {optimalKeystrokes > 0 && (
                    <span className="text-vim-subtext text-sm ml-1">/ {optimalKeystrokes} optimal</span>
                  )}
                </div>
              </div>
              <div className="bg-vim-bg/50 rounded-lg p-4 text-center">
                <div className="text-vim-subtext text-sm">Efficiency</div>
                <div className={`text-2xl font-bold ${
                  getSessionAnalysis().totalEfficiency >= 90 ? 'text-vim-green' :
                  getSessionAnalysis().totalEfficiency >= 70 ? 'text-vim-yellow' : 'text-vim-red'
                }`}>
                  {getSessionAnalysis().totalEfficiency}%
                </div>
              </div>
            </div>

            {/* Target Breakdown */}
            {targetResults.length > 0 && (
              <div className="mb-6">
                <h3 className="text-vim-text font-semibold mb-3">Target Breakdown</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {targetResults.map((result, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-center justify-between p-2 rounded ${
                        result.analysis.isOptimal ? 'bg-vim-green/10' : 'bg-vim-bg/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-vim-subtext text-sm">#{idx + 1}</span>
                        <div>
                          <span className="text-vim-text text-sm">
                            Your keys: <code className="bg-vim-bg px-1 rounded">{result.userKeys.join('')}</code>
                          </span>
                          {result.analysis.optimal && (
                            <span className="text-vim-subtext text-sm ml-2">
                              Optimal: <code className="bg-vim-green/20 text-vim-green px-1 rounded">
                                {result.analysis.optimal.keys.join('')}
                              </code>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${
                          result.analysis.isOptimal ? 'text-vim-green' : 'text-vim-yellow'
                        }`}>
                          {result.analysis.efficiency}%
                        </span>
                        {result.analysis.isOptimal && <span className="text-vim-green">✓</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {getSessionAnalysis().recommendations.length > 0 && (
              <div className="mb-6 bg-vim-yellow/10 border border-vim-yellow/30 rounded-lg p-4">
                <h3 className="text-vim-yellow font-semibold mb-2">💡 Tips to Improve</h3>
                <ul className="space-y-1">
                  {getSessionAnalysis().recommendations.map((rec, idx) => (
                    <li key={idx} className="text-vim-text text-sm flex items-start gap-2">
                      <span className="text-vim-yellow">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

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
    </div>
  )
}

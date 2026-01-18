import { create } from 'zustand'
import { VimSolution, TargetAnalysis, WeaknessType, VimCategory, calculateOptimalSolution, analyzeTargetPerformance } from '../utils/vimSolver'

export interface Position {
  line: number
  col: number
}

export interface Target {
  position: Position
  completed: boolean
  optimalSolution?: VimSolution
  alternativeSolutions?: VimSolution[]
  analysis?: TargetAnalysis
}

export interface TargetResult {
  targetIndex: number
  from: Position
  to: Position
  userKeys: string[]
  timeTaken: number
  analysis: TargetAnalysis
}

interface GameState {
  // Game settings
  language: string
  difficulty: 'easy' | 'medium' | 'hard'
  
  // Code content
  lines: string[]
  
  // Cursor position
  cursor: Position
  previousCursor: Position  // Track previous position for analysis
  
  // Targets to reach
  targets: Target[]
  currentTargetIndex: number
  
  // Game state
  isPlaying: boolean
  isFinished: boolean
  startTime: number | null
  endTime: number | null
  targetStartTime: number | null  // When current target started
  
  // Stats
  keystrokeCount: number
  optimalKeystrokes: number
  targetsCompleted: number
  
  // Per-target tracking
  currentTargetKeys: string[]  // Keys pressed for current target
  targetResults: TargetResult[]  // Analysis of each completed target
  
  // Weakness tracking
  sessionWeaknesses: Record<WeaknessType, number>
  
  // Input buffer for multi-key commands
  inputBuffer: string
  
  // Actions
  setLanguage: (language: string) => void
  setDifficulty: (difficulty: 'easy' | 'medium' | 'hard') => void
  initGame: (lines: string[], targets: Target[]) => void
  initGameWithSolutions: (lines: string[], targets: Target[]) => void  // For AI-generated challenges
  startGame: () => void
  moveCursor: (newPosition: Position) => void
  addKeystroke: (key: string) => void
  setInputBuffer: (buffer: string) => void
  checkTarget: () => boolean
  finishGame: () => void
  resetGame: () => void
  getSessionAnalysis: () => { 
    totalEfficiency: number
    weaknesses: Record<WeaknessType, number>
    recommendations: string[]
  }
}

export const useGameStore = create<GameState>((set, get) => ({
  language: 'python',
  difficulty: 'medium',
  lines: [],
  cursor: { line: 0, col: 0 },
  previousCursor: { line: 0, col: 0 },
  targets: [],
  currentTargetIndex: 0,
  isPlaying: false,
  isFinished: false,
  startTime: null,
  endTime: null,
  targetStartTime: null,
  keystrokeCount: 0,
  optimalKeystrokes: 0,
  targetsCompleted: 0,
  currentTargetKeys: [],
  targetResults: [],
  sessionWeaknesses: {} as Record<WeaknessType, number>,
  inputBuffer: '',

  setLanguage: (language) => set({ language }),
  
  setDifficulty: (difficulty) => set({ difficulty }),
  
  initGame: (lines, targets) => {
    // Calculate optimal solutions for each target
    let prevPos = { line: 0, col: 0 }
    const targetsWithSolutions = targets.map((target) => {
      const solutions = calculateOptimalSolution(prevPos, target.position, lines)
      prevPos = target.position
      return {
        ...target,
        optimalSolution: solutions[0],
        alternativeSolutions: solutions.slice(1),
      }
    })
    
    // Sum up optimal keystrokes
    const totalOptimal = targetsWithSolutions.reduce((sum, t) => {
      return sum + (t.optimalSolution?.keys.join('').length || 0)
    }, 0)
    
    set({
      lines,
      targets: targetsWithSolutions,
      cursor: { line: 0, col: 0 },
      previousCursor: { line: 0, col: 0 },
      currentTargetIndex: 0,
      isPlaying: false,
      isFinished: false,
      startTime: null,
      endTime: null,
      targetStartTime: null,
      keystrokeCount: 0,
      optimalKeystrokes: totalOptimal,
      targetsCompleted: 0,
      currentTargetKeys: [],
      targetResults: [],
      sessionWeaknesses: {} as Record<WeaknessType, number>,
      inputBuffer: '',
    })
  },
  
  // Initialize game with pre-computed solutions (from AI)
  initGameWithSolutions: (lines, targets) => {
    // Targets already have optimal solutions from AI
    const totalOptimal = targets.reduce((sum, t) => {
      return sum + (t.optimalSolution?.keys.join('').length || 0)
    }, 0)
    
    set({
      lines,
      targets,
      cursor: { line: 0, col: 0 },
      previousCursor: { line: 0, col: 0 },
      currentTargetIndex: 0,
      isPlaying: false,
      isFinished: false,
      startTime: null,
      endTime: null,
      targetStartTime: null,
      keystrokeCount: 0,
      optimalKeystrokes: totalOptimal,
      targetsCompleted: 0,
      currentTargetKeys: [],
      targetResults: [],
      sessionWeaknesses: {} as Record<WeaknessType, number>,
      inputBuffer: '',
    })
  },
  
  startGame: () => set({
    isPlaying: true,
    startTime: Date.now(),
    targetStartTime: Date.now(),
  }),
  
  moveCursor: (newPosition) => {
    const { lines, cursor } = get()
    // Clamp position to valid range
    const line = Math.max(0, Math.min(newPosition.line, lines.length - 1))
    const maxCol = lines[line] ? lines[line].length - 1 : 0
    const col = Math.max(0, Math.min(newPosition.col, maxCol))
    
    set({ cursor: { line, col }, previousCursor: cursor })
  },
  
  addKeystroke: (key: string) => set((state) => ({
    keystrokeCount: state.keystrokeCount + 1,
    currentTargetKeys: [...state.currentTargetKeys, key],
  })),
  
  setInputBuffer: (buffer) => set({ inputBuffer: buffer }),
  
  checkTarget: () => {
    const { cursor, targets, currentTargetIndex, lines, currentTargetKeys, targetStartTime, targetResults, sessionWeaknesses } = get()
    
    if (currentTargetIndex >= targets.length) return false
    
    const currentTarget = targets[currentTargetIndex]
    
    if (cursor.line === currentTarget.position.line && 
        cursor.col === currentTarget.position.col) {
      
      // Calculate time taken for this target
      const timeTaken = targetStartTime ? (Date.now() - targetStartTime) / 1000 : 0
      
      // Get the starting position for this target
      const fromPos = currentTargetIndex === 0 
        ? { line: 0, col: 0 } 
        : targets[currentTargetIndex - 1].position
      
      // Analyze performance
      const analysis = analyzeTargetPerformance(
        fromPos,
        currentTarget.position,
        lines,
        currentTargetKeys,
        timeTaken
      )
      
      // Track weakness
      const newWeaknesses = { ...sessionWeaknesses }
      if (analysis.weakness) {
        newWeaknesses[analysis.weakness] = (newWeaknesses[analysis.weakness] || 0) + 1
      }
      
      // Store result
      const result: TargetResult = {
        targetIndex: currentTargetIndex,
        from: fromPos,
        to: currentTarget.position,
        userKeys: currentTargetKeys,
        timeTaken,
        analysis,
      }
      
      const newTargets = [...targets]
      newTargets[currentTargetIndex] = { 
        ...currentTarget, 
        completed: true,
        analysis,
      }
      
      const newIndex = currentTargetIndex + 1
      const isFinished = newIndex >= targets.length
      
      set({
        targets: newTargets,
        currentTargetIndex: newIndex,
        targetsCompleted: get().targetsCompleted + 1,
        isFinished,
        endTime: isFinished ? Date.now() : null,
        isPlaying: !isFinished,
        currentTargetKeys: [],  // Reset for next target
        targetStartTime: isFinished ? null : Date.now(),
        targetResults: [...targetResults, result],
        sessionWeaknesses: newWeaknesses,
      })
      
      return true
    }
    
    return false
  },
  
  finishGame: () => set({
    isFinished: true,
    isPlaying: false,
    endTime: Date.now(),
  }),
  
  resetGame: () => set({
    cursor: { line: 0, col: 0 },
    previousCursor: { line: 0, col: 0 },
    currentTargetIndex: 0,
    isPlaying: false,
    isFinished: false,
    startTime: null,
    endTime: null,
    targetStartTime: null,
    keystrokeCount: 0,
    targetsCompleted: 0,
    currentTargetKeys: [],
    targetResults: [],
    sessionWeaknesses: {} as Record<WeaknessType, number>,
    inputBuffer: '',
    targets: get().targets.map(t => ({ ...t, completed: false, analysis: undefined })),
  }),
  
  getSessionAnalysis: () => {
    const { targetResults, sessionWeaknesses } = get()
    
    // Calculate total efficiency
    const totalEfficiency = targetResults.length > 0
      ? Math.round(targetResults.reduce((sum, r) => sum + r.analysis.efficiency, 0) / targetResults.length)
      : 100
    
    // Generate recommendations based on weaknesses
    const recommendations: string[] = []
    
    if (sessionWeaknesses.missing_word_motions > 1) {
      recommendations.push("Practice 'w', 'b', 'e' to jump between words faster")
    }
    if (sessionWeaknesses.missing_find_motions > 1) {
      recommendations.push("Use 'f{char}' and 't{char}' to jump to specific characters")
    }
    if (sessionWeaknesses.missing_line_motions > 1) {
      recommendations.push("Use '0', '^', '$' for quick line navigation")
    }
    if (sessionWeaknesses.missing_count_prefix > 2) {
      recommendations.push("Use number prefixes like '5j' to move multiple lines at once")
    }
    if (sessionWeaknesses.missing_paragraph_motions > 1) {
      recommendations.push("Use '{' and '}' to jump between paragraphs/code blocks")
    }
    if (sessionWeaknesses.missing_bracket_matching > 1) {
      recommendations.push("Use '%' to jump between matching brackets")
    }
    if (sessionWeaknesses.slow_basic_movement > 2) {
      recommendations.push("Focus on faster h/j/k/l movements - try to build muscle memory")
    }
    if (sessionWeaknesses.inefficient_path > 2) {
      recommendations.push("Plan your movements before pressing keys")
    }
    
    return {
      totalEfficiency,
      weaknesses: sessionWeaknesses,
      recommendations,
    }
  },
}))

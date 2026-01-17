import { create } from 'zustand'

export interface Position {
  line: number
  col: number
}

export interface Target {
  position: Position
  completed: boolean
}

interface GameState {
  // Game settings
  language: string
  difficulty: 'easy' | 'medium' | 'hard'
  
  // Code content
  lines: string[]
  
  // Cursor position
  cursor: Position
  
  // Targets to reach
  targets: Target[]
  currentTargetIndex: number
  
  // Game state
  isPlaying: boolean
  isFinished: boolean
  startTime: number | null
  endTime: number | null
  
  // Stats
  keystrokeCount: number
  optimalKeystrokes: number
  targetsCompleted: number
  
  // Input buffer for multi-key commands
  inputBuffer: string
  
  // Actions
  setLanguage: (language: string) => void
  setDifficulty: (difficulty: 'easy' | 'medium' | 'hard') => void
  initGame: (lines: string[], targets: Target[]) => void
  startGame: () => void
  moveCursor: (newPosition: Position) => void
  addKeystroke: () => void
  setInputBuffer: (buffer: string) => void
  checkTarget: () => boolean
  finishGame: () => void
  resetGame: () => void
}

export const useGameStore = create<GameState>((set, get) => ({
  language: 'python',
  difficulty: 'medium',
  lines: [],
  cursor: { line: 0, col: 0 },
  targets: [],
  currentTargetIndex: 0,
  isPlaying: false,
  isFinished: false,
  startTime: null,
  endTime: null,
  keystrokeCount: 0,
  optimalKeystrokes: 0,
  targetsCompleted: 0,
  inputBuffer: '',

  setLanguage: (language) => set({ language }),
  
  setDifficulty: (difficulty) => set({ difficulty }),
  
  initGame: (lines, targets) => set({
    lines,
    targets,
    cursor: { line: 0, col: 0 },
    currentTargetIndex: 0,
    isPlaying: false,
    isFinished: false,
    startTime: null,
    endTime: null,
    keystrokeCount: 0,
    targetsCompleted: 0,
    inputBuffer: '',
  }),
  
  startGame: () => set({
    isPlaying: true,
    startTime: Date.now(),
  }),
  
  moveCursor: (newPosition) => {
    const { lines } = get()
    // Clamp position to valid range
    const line = Math.max(0, Math.min(newPosition.line, lines.length - 1))
    const maxCol = lines[line] ? lines[line].length - 1 : 0
    const col = Math.max(0, Math.min(newPosition.col, maxCol))
    
    set({ cursor: { line, col } })
  },
  
  addKeystroke: () => set((state) => ({
    keystrokeCount: state.keystrokeCount + 1,
  })),
  
  setInputBuffer: (buffer) => set({ inputBuffer: buffer }),
  
  checkTarget: () => {
    const { cursor, targets, currentTargetIndex } = get()
    
    if (currentTargetIndex >= targets.length) return false
    
    const currentTarget = targets[currentTargetIndex]
    
    if (cursor.line === currentTarget.position.line && 
        cursor.col === currentTarget.position.col) {
      const newTargets = [...targets]
      newTargets[currentTargetIndex] = { ...currentTarget, completed: true }
      
      const newIndex = currentTargetIndex + 1
      const isFinished = newIndex >= targets.length
      
      set({
        targets: newTargets,
        currentTargetIndex: newIndex,
        targetsCompleted: get().targetsCompleted + 1,
        isFinished,
        endTime: isFinished ? Date.now() : null,
        isPlaying: !isFinished,
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
    currentTargetIndex: 0,
    isPlaying: false,
    isFinished: false,
    startTime: null,
    endTime: null,
    keystrokeCount: 0,
    targetsCompleted: 0,
    inputBuffer: '',
    targets: get().targets.map(t => ({ ...t, completed: false })),
  }),
}))

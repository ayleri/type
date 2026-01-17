import { create } from 'zustand'

export type TestMode = 'time' | 'words' | 'quote'
export type TimeOption = 15 | 30 | 60 | 120
export type WordsOption = 10 | 25 | 50 | 100

interface TypingState {
  mode: TestMode
  timeOption: TimeOption
  wordsOption: WordsOption
  words: string[]
  currentWordIndex: number
  currentCharIndex: number
  typedWords: string[]
  isActive: boolean
  isFinished: boolean
  startTime: number | null
  endTime: number | null
  timeLeft: number
  correctChars: number
  incorrectChars: number
  
  setMode: (mode: TestMode) => void
  setTimeOption: (option: TimeOption) => void
  setWordsOption: (option: WordsOption) => void
  setWords: (words: string[]) => void
  startTest: () => void
  finishTest: () => void
  resetTest: () => void
  updateProgress: (wordIndex: number, charIndex: number, typed: string[]) => void
  decrementTime: () => void
  addCorrectChar: () => void
  addIncorrectChar: () => void
}

export const useTypingStore = create<TypingState>((set, get) => ({
  mode: 'time',
  timeOption: 30,
  wordsOption: 25,
  words: [],
  currentWordIndex: 0,
  currentCharIndex: 0,
  typedWords: [],
  isActive: false,
  isFinished: false,
  startTime: null,
  endTime: null,
  timeLeft: 30,
  correctChars: 0,
  incorrectChars: 0,

  setMode: (mode) => set({ mode }),
  
  setTimeOption: (option) => set({ timeOption: option, timeLeft: option }),
  
  setWordsOption: (option) => set({ wordsOption: option }),
  
  setWords: (words) => set({ words }),
  
  startTest: () => set({ 
    isActive: true, 
    startTime: Date.now(),
    timeLeft: get().timeOption 
  }),
  
  finishTest: () => set({ 
    isActive: false, 
    isFinished: true, 
    endTime: Date.now() 
  }),
  
  resetTest: () => set({
    currentWordIndex: 0,
    currentCharIndex: 0,
    typedWords: [],
    isActive: false,
    isFinished: false,
    startTime: null,
    endTime: null,
    timeLeft: get().timeOption,
    correctChars: 0,
    incorrectChars: 0,
  }),
  
  updateProgress: (wordIndex, charIndex, typed) => set({
    currentWordIndex: wordIndex,
    currentCharIndex: charIndex,
    typedWords: typed,
  }),
  
  decrementTime: () => {
    const { timeLeft, isActive } = get()
    if (isActive && timeLeft > 0) {
      set({ timeLeft: timeLeft - 1 })
      if (timeLeft - 1 === 0) {
        get().finishTest()
      }
    }
  },
  
  addCorrectChar: () => set((state) => ({ correctChars: state.correctChars + 1 })),
  
  addIncorrectChar: () => set((state) => ({ incorrectChars: state.incorrectChars + 1 })),
}))

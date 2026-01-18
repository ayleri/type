import { create } from 'zustand'

// Keyboard layout for finger mapping
const FINGER_MAP: Record<string, number> = {
  // Left pinky (0)
  'q': 0, 'a': 0, 'z': 0, '1': 0, '`': 0,
  // Left ring (1)
  'w': 1, 's': 1, 'x': 1, '2': 1,
  // Left middle (2)
  'e': 2, 'd': 2, 'c': 2, '3': 2,
  // Left index (3)
  'r': 3, 'f': 3, 'v': 3, 't': 3, 'g': 3, 'b': 3, '4': 3, '5': 3,
  // Right index (4)
  'y': 4, 'h': 4, 'n': 4, 'u': 4, 'j': 4, 'm': 4, '6': 4, '7': 4,
  // Right middle (5)
  'i': 5, 'k': 5, ',': 5, '8': 5,
  // Right ring (6)
  'o': 6, 'l': 6, '.': 6, '9': 6,
  // Right pinky (7)
  'p': 7, ';': 7, '/': 7, '0': 7, '-': 7, '=': 7, '[': 7, ']': 7, '\\': 7, "'": 7,
}

// Left hand = fingers 0-3, Right hand = fingers 4-7
const isLeftHand = (finger: number) => finger <= 3
const isSameFinger = (f1: number, f2: number) => f1 === f2
const isSameHand = (f1: number, f2: number) => isLeftHand(f1) === isLeftHand(f2)

export interface KeystrokeEvent {
  key: string
  timestamp: number
  correct: boolean
  expected: string
}

export interface KeyPairStats {
  pair: string
  totalMs: number
  count: number
  errors: number
}

export interface WordAttempt {
  word: string
  typed: string
  startTime: number
  endTime: number
  correct: boolean
  errors: number
}

export interface FingerTransitionStats {
  sameFinger: { totalMs: number; count: number; errors: number }
  sameHand: { totalMs: number; count: number; errors: number }
  crossHand: { totalMs: number; count: number; errors: number }
}

export interface TypingAnalytics {
  problem_character_pairs: Array<{ pair: string; avg_ms: number; errors: number }>
  problem_words: Array<{ word: string; attempts: number; errors: number; avg_wpm: number }>
  difficult_finger_transitions: Array<{ type: string; avg_ms: number; errors: number; severity: string }>
}

interface TypingAnalyticsState {
  // Test state
  words: string[]
  currentWordIndex: number
  currentInput: string
  isRunning: boolean
  isFinished: boolean
  startTime: number | null
  endTime: number | null
  timeLimit: number // seconds
  
  // Keystroke tracking
  keystrokes: KeystrokeEvent[]
  keyPairStats: Map<string, KeyPairStats>
  wordAttempts: WordAttempt[]
  fingerTransitions: FingerTransitionStats
  
  // Current word tracking
  currentWordStart: number | null
  currentWordErrors: number
  currentWordHasError: boolean
  
  // Results
  wpm: number
  rawWpm: number
  accuracy: number
  
  // Actions
  initTest: (words: string[], timeLimit: number) => void
  startTest: () => void
  handleKeyPress: (key: string, timestamp: number) => void
  handleBackspace: () => void
  finishTest: () => void
  getAnalytics: () => TypingAnalytics
  reset: () => void
}

const COMMON_WORDS = [
  'chaos', 'anarchy', 'mayhem', 'destruction', 'malice', 'evil', 'wicked', 'sinister', 'vile', 'dark',
  'ruin', 'havoc', 'discord', 'carnage', 'terror', 'doom', 'dread', 'fear', 'pain', 'rage',
  'betray', 'deceive', 'corrupt', 'sabotage', 'destroy', 'annihilate', 'devastate', 'obliterate', 'crush', 'raze',
  'malevolent', 'nefarious', 'villainous', 'diabolical', 'heinous', 'malicious', 'treacherous', 'ruthless', 'cruel', 'savage',
  'manipulate', 'terrorize', 'torment', 'scheme', 'plot', 'conspire', 'undermine', 'overthrow', 'dominate', 'subjugate',
  'darkness', 'shadows', 'abyss', 'void', 'nightmare', 'horror', 'agony', 'despair', 'misery', 'suffering',
  'plague', 'blight', 'curse', 'hex', 'jinx', 'venom', 'poison', 'toxin', 'disease', 'infection',
  'pandemonium', 'bedlam', 'turmoil', 'upheaval', 'cataclysm', 'apocalypse', 'armageddon', 'calamity', 'catastrophe', 'disaster',
  'tyrant', 'despot', 'dictator', 'oppressor', 'villain', 'fiend', 'demon', 'monster', 'beast', 'scourge',
  'vengeance', 'wrath', 'fury', 'hatred', 'spite', 'malevolence', 'vindictive', 'merciless', 'pitiless', 'remorseless',
  'corruption', 'depravity', 'wickedness', 'maleficence', 'atrocity', 'abomination', 'blasphemy', 'sacrilege', 'heresy', 'profanity',
  'conspiracy', 'treachery', 'betrayal', 'deception', 'duplicity', 'fraud', 'subterfuge', 'machination', 'intrigue', 'stratagem',
  'obliteration', 'extermination', 'eradication', 'elimination', 'annihilation', 'decimation', 'slaughter', 'massacre', 'downfall', 'collapse',
  'dominion', 'supremacy', 'hegemony', 'sovereignty', 'ascendancy', 'conquest', 'subjugation', 'enslavement', 'oppression', 'tyranny',
  'necromancy', 'sorcery', 'witchcraft', 'occult', 'forbidden', 'profane', 'unholy', 'impious', 'blasphemous', 'sacrilegious',
]

// Code snippets by language
const CODE_SNIPPETS: Record<string, string[]> = {
  javascript: [
    'const sum = (a, b) => a + b;',
    'function greet(name) { return `Hello, ${name}!`; }',
    'const arr = [1, 2, 3].map(x => x * 2);',
    'if (user && user.isActive) { sendEmail(user); }',
    'const { name, age } = person;',
    'async function fetchData(url) { const res = await fetch(url); return res.json(); }',
    'const filtered = items.filter(item => item.price > 10);',
    'try { await saveData(); } catch (e) { console.error(e); }',
    'export default function App() { return <div>Hello</div>; }',
    'const [count, setCount] = useState(0);',
    'useEffect(() => { loadData(); }, []);',
    'const result = numbers.reduce((acc, n) => acc + n, 0);',
    'class User { constructor(name) { this.name = name; } }',
    'const promise = new Promise((resolve, reject) => {});',
    'Object.keys(obj).forEach(key => console.log(key));',
  ],
  python: [
    'def greet(name): return f"Hello, {name}!"',
    'result = [x * 2 for x in range(10)]',
    'if user and user.is_active: send_email(user)',
    'class User: def __init__(self, name): self.name = name',
    'with open("file.txt", "r") as f: data = f.read()',
    'async def fetch_data(url): return await client.get(url)',
    'filtered = list(filter(lambda x: x > 10, items))',
    'try: save_data() except Exception as e: print(e)',
    'from typing import List, Optional, Dict',
    'def factorial(n): return 1 if n <= 1 else n * factorial(n-1)',
    '@app.route("/api/users") def get_users(): return users',
    'import numpy as np; arr = np.array([1, 2, 3])',
    'data = {"name": "John", "age": 30, "active": True}',
    'for i, item in enumerate(items): print(f"{i}: {item}")',
    'result = sum(x for x in numbers if x % 2 == 0)',
  ],
  typescript: [
    'const greet = (name: string): string => `Hello, ${name}!`;',
    'interface User { id: number; name: string; email: string; }',
    'type Status = "pending" | "active" | "completed";',
    'function process<T>(data: T[]): T[] { return data; }',
    'const result: number = arr.reduce((a, b) => a + b, 0);',
    'export interface Props { children: React.ReactNode; }',
    'const [items, setItems] = useState<string[]>([]);',
    'async function fetchUser(id: number): Promise<User> {}',
    'const handler: React.ChangeEventHandler<HTMLInputElement> = (e) => {};',
    'type Partial<T> = { [P in keyof T]?: T[P] };',
    'class Service implements IService { async fetch() {} }',
    'const config: Readonly<Config> = Object.freeze({});',
    'function assert(condition: boolean): asserts condition {}',
    'const map = new Map<string, number>();',
    'enum Direction { Up, Down, Left, Right }',
  ],
  rust: [
    'fn main() { println!("Hello, world!"); }',
    'let mut vec: Vec<i32> = Vec::new();',
    'fn greet(name: &str) -> String { format!("Hello, {}!", name) }',
    'match result { Ok(v) => v, Err(e) => panic!("{}", e) }',
    'struct User { name: String, age: u32 }',
    'impl User { fn new(name: &str) -> Self { Self { name: name.to_string(), age: 0 } } }',
    'let filtered: Vec<_> = items.iter().filter(|x| x > &10).collect();',
    'if let Some(value) = option { println!("{}", value); }',
    'async fn fetch_data(url: &str) -> Result<String, Error> {}',
    '#[derive(Debug, Clone, Serialize)]',
    'use std::collections::HashMap;',
    'for (i, item) in items.iter().enumerate() { println!("{}: {}", i, item); }',
    'let closure = |x: i32| x * 2;',
    'pub enum Option<T> { Some(T), None }',
    'fn process<T: Clone>(data: &[T]) -> Vec<T> { data.to_vec() }',
  ],
  go: [
    'func main() { fmt.Println("Hello, World!") }',
    'func greet(name string) string { return "Hello, " + name }',
    'type User struct { Name string; Age int }',
    'if err != nil { return fmt.Errorf("failed: %w", err) }',
    'for i, v := range items { fmt.Printf("%d: %v\\n", i, v) }',
    'result := make([]int, 0, 10)',
    'go func() { processData(data) }()',
    'select { case msg := <-ch: handle(msg) default: wait() }',
    'defer file.Close()',
    'func (u *User) Greet() string { return "Hi, " + u.Name }',
    'ctx, cancel := context.WithTimeout(ctx, 5*time.Second)',
    'var wg sync.WaitGroup; wg.Add(1)',
    'json.Unmarshal(data, &result)',
    'http.HandleFunc("/api", handler)',
    'import ( "fmt"; "strings"; "errors" )',
  ],
}

export function generateCodeWords(language: string): string[] {
  const snippets = CODE_SNIPPETS[language] || CODE_SNIPPETS.javascript
  // Shuffle and pick random snippets, split into words
  const shuffled = [...snippets].sort(() => Math.random() - 0.5)
  const words: string[] = []
  for (const snippet of shuffled) {
    // Split code into "words" (tokens separated by spaces)
    words.push(...snippet.split(/\s+/).filter(w => w.length > 0))
  }
  // Repeat if needed for longer tests
  while (words.length < 200) {
    const more = [...snippets].sort(() => Math.random() - 0.5)
    for (const snippet of more) {
      words.push(...snippet.split(/\s+/).filter(w => w.length > 0))
    }
  }
  return words
}

export const useTypingAnalyticsStore = create<TypingAnalyticsState>((set, get) => ({
  words: [],
  currentWordIndex: 0,
  currentInput: '',
  isRunning: false,
  isFinished: false,
  startTime: null,
  endTime: null,
  timeLimit: 60,
  
  keystrokes: [],
  keyPairStats: new Map(),
  wordAttempts: [],
  fingerTransitions: {
    sameFinger: { totalMs: 0, count: 0, errors: 0 },
    sameHand: { totalMs: 0, count: 0, errors: 0 },
    crossHand: { totalMs: 0, count: 0, errors: 0 },
  },
  
  currentWordStart: null,
  currentWordErrors: 0,
  currentWordHasError: false,
  
  wpm: 0,
  rawWpm: 0,
  accuracy: 0,
  
  initTest: (words, timeLimit) => {
    const testWords = words.length > 0 ? words : 
      Array.from({ length: 100 }, () => COMMON_WORDS[Math.floor(Math.random() * COMMON_WORDS.length)])
    
    set({
      words: testWords,
      currentWordIndex: 0,
      currentInput: '',
      isRunning: false,
      isFinished: false,
      startTime: null,
      endTime: null,
      timeLimit,
      keystrokes: [],
      keyPairStats: new Map(),
      wordAttempts: [],
      fingerTransitions: {
        sameFinger: { totalMs: 0, count: 0, errors: 0 },
        sameHand: { totalMs: 0, count: 0, errors: 0 },
        crossHand: { totalMs: 0, count: 0, errors: 0 },
      },
      currentWordStart: null,
      currentWordErrors: 0,
      currentWordHasError: false,
      wpm: 0,
      rawWpm: 0,
      accuracy: 0,
    })
  },
  
  startTest: () => {
    set({
      isRunning: true,
      startTime: Date.now(),
      currentWordStart: Date.now(),
    })
  },
  
  handleKeyPress: (key, timestamp) => {
    const state = get()
    if (!state.isRunning || state.isFinished) return
    
    const currentWord = state.words[state.currentWordIndex]
    const expectedChar = currentWord[state.currentInput.length]
    const isCorrect = key === expectedChar
    
    // Record keystroke
    const keystroke: KeystrokeEvent = {
      key,
      timestamp,
      correct: isCorrect,
      expected: expectedChar || '',
    }
    
    const newKeystrokes = [...state.keystrokes, keystroke]
    
    // Track key pair timing (errors are counted per word, not per keystroke)
    const newKeyPairStats = new Map(state.keyPairStats)
    if (newKeystrokes.length >= 2) {
      const prevKeystroke = newKeystrokes[newKeystrokes.length - 2]
      const pair = (prevKeystroke.key + key).toLowerCase()
      const timeDiff = timestamp - prevKeystroke.timestamp
      
      const existing = newKeyPairStats.get(pair) || { pair, totalMs: 0, count: 0, errors: 0 }
      newKeyPairStats.set(pair, {
        pair,
        totalMs: existing.totalMs + timeDiff,
        count: existing.count + 1,
        errors: existing.errors, // Don't increment here - will be updated at word completion
      })
      
      // Track finger transitions (errors are counted per word, not per keystroke)
      const prevFinger = FINGER_MAP[prevKeystroke.key.toLowerCase()]
      const currFinger = FINGER_MAP[key.toLowerCase()]
      
      if (prevFinger !== undefined && currFinger !== undefined) {
        const newFingerTransitions = { ...state.fingerTransitions }
        
        if (isSameFinger(prevFinger, currFinger)) {
          newFingerTransitions.sameFinger = {
            totalMs: newFingerTransitions.sameFinger.totalMs + timeDiff,
            count: newFingerTransitions.sameFinger.count + 1,
            errors: newFingerTransitions.sameFinger.errors + (isCorrect ? 0 : 1),
          }
        } else if (isSameHand(prevFinger, currFinger)) {
          newFingerTransitions.sameHand = {
            totalMs: newFingerTransitions.sameHand.totalMs + timeDiff,
            count: newFingerTransitions.sameHand.count + 1,
            errors: newFingerTransitions.sameHand.errors + (isCorrect ? 0 : 1),
          }
        } else {
          newFingerTransitions.crossHand = {
            totalMs: newFingerTransitions.crossHand.totalMs + timeDiff,
            count: newFingerTransitions.crossHand.count + 1,
            errors: newFingerTransitions.crossHand.errors + (isCorrect ? 0 : 1),
          }
        }
        
        set({ fingerTransitions: newFingerTransitions })
      }
    }
    
    const newInput = state.currentInput + key
    const newWordErrors = state.currentWordErrors + (isCorrect ? 0 : 1)
    const newWordHasError = state.currentWordHasError || !isCorrect
    
    set({
      currentInput: newInput,
      keystrokes: newKeystrokes,
      keyPairStats: newKeyPairStats,
      currentWordHasError: newWordHasError,
      currentWordErrors: newWordErrors,
    })
  },
  
  handleBackspace: () => {
    const state = get()
    if (!state.isRunning || state.currentInput.length === 0) return
    
    set({
      currentInput: state.currentInput.slice(0, -1),
    })
  },
  
  finishTest: () => {
    const state = get()
    const endTime = Date.now()
    
    // Calculate WPM
    const timeInMinutes = (endTime - (state.startTime || endTime)) / 60000
    const correctChars = state.keystrokes.filter(k => k.correct).length
    const totalChars = state.keystrokes.length
    
    const wpm = Math.round((correctChars / 5) / timeInMinutes)
    const rawWpm = Math.round((totalChars / 5) / timeInMinutes)
    const accuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100
    
    set({
      isRunning: false,
      isFinished: true,
      endTime,
      wpm,
      rawWpm,
      accuracy,
    })
  },
  
  getAnalytics: (): TypingAnalytics => {
    const state = get()
    
    // Problem character pairs (sorted by slowest avg time)
    const pairStats = Array.from(state.keyPairStats.values())
      .filter(p => p.count >= 3) // Only pairs with enough data
      .map(p => ({
        pair: p.pair,
        avg_ms: Math.round(p.totalMs / p.count),
        errors: 0, // Not tracking per-keystroke errors anymore
      }))
      .sort((a, b) => b.avg_ms - a.avg_ms) // Sort by slowest
      .slice(0, 10)
    
    // Problem words
    const wordStats = new Map<string, { attempts: number; errors: number; totalTime: number }>()
    for (const attempt of state.wordAttempts) {
      const existing = wordStats.get(attempt.word) || { attempts: 0, errors: 0, totalTime: 0 }
      wordStats.set(attempt.word, {
        attempts: existing.attempts + 1,
        errors: existing.errors + attempt.errors,
        totalTime: existing.totalTime + (attempt.endTime - attempt.startTime),
      })
    }
    
    const problemWords = Array.from(wordStats.entries())
      .filter(([_, stats]) => stats.errors > 0)
      .map(([word, stats]) => ({
        word,
        attempts: stats.attempts,
        errors: stats.errors,
        avg_wpm: Math.round((word.length / 5) / (stats.totalTime / stats.attempts / 60000)),
      }))
      .sort((a, b) => b.errors - a.errors)
      .slice(0, 10)
    
    // Finger transitions - show timing data, severity based on how slow compared to average
    const fingerTransitions: TypingAnalytics['difficult_finger_transitions'] = []
    const ft = state.fingerTransitions
    
    // Calculate overall average ms for comparison
    const totalTransitions = ft.sameFinger.count + ft.sameHand.count + ft.crossHand.count
    const totalMs = ft.sameFinger.totalMs + ft.sameHand.totalMs + ft.crossHand.totalMs
    const overallAvgMs = totalTransitions > 0 ? totalMs / totalTransitions : 200
    
    if (ft.sameFinger.count > 0) {
      const avgMs = Math.round(ft.sameFinger.totalMs / ft.sameFinger.count)
      // Same finger is usually slowest, severity based on how much slower than baseline
      const slowRatio = avgMs / overallAvgMs
      fingerTransitions.push({
        type: 'same_finger',
        avg_ms: avgMs,
        errors: ft.sameFinger.errors,
        severity: slowRatio > 1.3 ? 'high' : slowRatio > 1.1 ? 'medium' : 'low',
      })
    }
    
    if (ft.sameHand.count > 0) {
      const avgMs = Math.round(ft.sameHand.totalMs / ft.sameHand.count)
      const slowRatio = avgMs / overallAvgMs
      fingerTransitions.push({
        type: 'same_hand',
        avg_ms: avgMs,
        errors: ft.sameHand.errors,
        severity: slowRatio > 1.3 ? 'high' : slowRatio > 1.1 ? 'medium' : 'low',
      })
    }
    
    if (ft.crossHand.count > 0) {
      const avgMs = Math.round(ft.crossHand.totalMs / ft.crossHand.count)
      const slowRatio = avgMs / overallAvgMs
      fingerTransitions.push({
        type: 'cross_hand',
        avg_ms: avgMs,
        errors: ft.crossHand.errors,
        severity: slowRatio > 1.3 ? 'high' : slowRatio > 1.1 ? 'medium' : 'low',
      })
    }
    
    return {
      problem_character_pairs: pairStats,
      problem_words: problemWords,
      difficult_finger_transitions: fingerTransitions.sort((a, b) => b.errors - a.errors),
    }
  },
  
  reset: () => {
    set({
      words: [],
      currentWordIndex: 0,
      currentInput: '',
      isRunning: false,
      isFinished: false,
      startTime: null,
      endTime: null,
      keystrokes: [],
      keyPairStats: new Map(),
      wordAttempts: [],
      fingerTransitions: {
        sameFinger: { totalMs: 0, count: 0, errors: 0 },
        sameHand: { totalMs: 0, count: 0, errors: 0 },
        crossHand: { totalMs: 0, count: 0, errors: 0 },
      },
      currentWordStart: null,
      currentWordErrors: 0,
      currentWordHasError: false,
      wpm: 0,
      rawWpm: 0,
      accuracy: 0,
    })
  },
}))

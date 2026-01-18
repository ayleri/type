import { Position } from '../stores/gameStore'

export interface VimSolution {
  keys: string[]
  description: string
  category: VimCategory
}

export type VimCategory = 
  | 'basic'      // h, j, k, l
  | 'word'       // w, b, e, W, B, E, ge
  | 'line'       // 0, ^, $, _, +, -
  | 'find'       // f, F, t, T
  | 'search'     // /, ?, *, #, n, N
  | 'paragraph'  // {, }
  | 'document'   // gg, G, H, M, L
  | 'bracket'    // %
  | 'count'      // number prefixes like 5j

export interface TargetAnalysis {
  optimal: VimSolution
  alternatives: VimSolution[]
  userKeys: string[]
  efficiency: number // 0-100, optimal = 100
  timeTaken: number  // seconds
  isOptimal: boolean
  weakness?: WeaknessType
}

export type WeaknessType = 
  | 'slow_basic_movement'
  | 'missing_word_motions'
  | 'missing_find_motions'
  | 'missing_line_motions'
  | 'missing_count_prefix'
  | 'inefficient_path'
  | 'missing_paragraph_motions'
  | 'missing_bracket_matching'

/**
 * Calculate the optimal Vim motion(s) to reach a target position
 */
export function calculateOptimalSolution(
  from: Position,
  to: Position,
  lines: string[]
): VimSolution[] {
  const solutions: VimSolution[] = []
  
  const deltaLine = to.line - from.line
  const deltaCol = to.col - from.col
  const currentLine = lines[from.line] || ''
  const targetLine = lines[to.line] || ''
  const targetChar = targetLine[to.col]

  // Same line solutions
  if (deltaLine === 0) {
    // Direct h/l movement
    if (Math.abs(deltaCol) <= 3) {
      const key = deltaCol > 0 ? 'l' : 'h'
      const count = Math.abs(deltaCol)
      solutions.push({
        keys: count === 1 ? [key] : [`${count}${key}`],
        description: count === 1 ? `Move ${deltaCol > 0 ? 'right' : 'left'}` : `Move ${count} chars ${deltaCol > 0 ? 'right' : 'left'}`,
        category: count === 1 ? 'basic' : 'count'
      })
    }

    // Line start/end motions
    if (to.col === 0) {
      solutions.push({
        keys: ['0'],
        description: 'Go to line start',
        category: 'line'
      })
    }
    
    const firstNonSpace = currentLine.search(/\S/)
    if (to.col === firstNonSpace && firstNonSpace > 0) {
      solutions.push({
        keys: ['^'],
        description: 'Go to first non-blank',
        category: 'line'
      })
    }
    
    if (to.col === currentLine.length - 1) {
      solutions.push({
        keys: ['$'],
        description: 'Go to line end',
        category: 'line'
      })
    }

    // Find character motions (f/t)
    if (deltaCol > 0 && targetChar) {
      const idx = currentLine.indexOf(targetChar, from.col + 1)
      if (idx === to.col) {
        solutions.push({
          keys: ['f', targetChar],
          description: `Find '${targetChar}' forward`,
          category: 'find'
        })
      }
      if (idx === to.col + 1) {
        solutions.push({
          keys: ['t', targetChar],
          description: `Till '${targetChar}' forward`,
          category: 'find'
        })
      }
    }
    
    if (deltaCol < 0 && targetChar) {
      const idx = currentLine.lastIndexOf(targetChar, from.col - 1)
      if (idx === to.col) {
        solutions.push({
          keys: ['F', targetChar],
          description: `Find '${targetChar}' backward`,
          category: 'find'
        })
      }
      if (idx === to.col - 1) {
        solutions.push({
          keys: ['T', targetChar],
          description: `Till '${targetChar}' backward`,
          category: 'find'
        })
      }
    }

    // Word motions
    if (deltaCol > 0) {
      const wordSolution = simulateWordMotion(from, to, lines, 'w')
      if (wordSolution) {
        solutions.push({
          keys: wordSolution.count === 1 ? ['w'] : [`${wordSolution.count}w`],
          description: wordSolution.count === 1 ? 'Next word' : `${wordSolution.count} words forward`,
          category: wordSolution.count === 1 ? 'word' : 'count'
        })
      }
      
      const endSolution = simulateWordMotion(from, to, lines, 'e')
      if (endSolution) {
        solutions.push({
          keys: endSolution.count === 1 ? ['e'] : [`${endSolution.count}e`],
          description: endSolution.count === 1 ? 'End of word' : `${endSolution.count} word ends`,
          category: endSolution.count === 1 ? 'word' : 'count'
        })
      }
    }
    
    if (deltaCol < 0) {
      const backSolution = simulateWordMotion(from, to, lines, 'b')
      if (backSolution) {
        solutions.push({
          keys: backSolution.count === 1 ? ['b'] : [`${backSolution.count}b`],
          description: backSolution.count === 1 ? 'Previous word' : `${backSolution.count} words back`,
          category: backSolution.count === 1 ? 'word' : 'count'
        })
      }
    }
  }
  
  // Different line solutions
  if (deltaLine !== 0) {
    // Direct j/k movement
    const key = deltaLine > 0 ? 'j' : 'k'
    const lineCount = Math.abs(deltaLine)
    
    // After j/k, cursor stays at same column but clamped to line length
    const targetLineLen = lines[to.line]?.length || 1
    const colAfterLineMove = Math.min(from.col, Math.max(0, targetLineLen - 1))
    const colAdjust = to.col - colAfterLineMove
    
    // Always add basic j/k + h/l solution for cross-line movement
    {
      const keys: string[] = []
      if (lineCount === 1) {
        keys.push(key)
      } else {
        keys.push(`${lineCount}${key}`)
      }
      
      if (colAdjust !== 0) {
        const colKey = colAdjust > 0 ? 'l' : 'h'
        const absColAdjust = Math.abs(colAdjust)
        if (absColAdjust === 1) {
          keys.push(colKey)
        } else {
          keys.push(`${absColAdjust}${colKey}`)
        }
      }
      
      solutions.push({
        keys,
        description: `Move ${lineCount} line${lineCount > 1 ? 's' : ''} ${deltaLine > 0 ? 'down' : 'up'}${colAdjust !== 0 ? ` and ${Math.abs(colAdjust)} col${Math.abs(colAdjust) > 1 ? 's' : ''} ${colAdjust > 0 ? 'right' : 'left'}` : ''}`,
        category: lineCount === 1 && colAdjust === 0 ? 'basic' : 'count'
      })
    }

    // +/- for first non-blank of next/prev line
    const targetFirstNonSpace = targetLine.search(/\S/)
    if (Math.abs(deltaLine) <= 3 && to.col === Math.max(0, targetFirstNonSpace)) {
      const plusMinus = deltaLine > 0 ? '+' : '-'
      solutions.push({
        keys: Math.abs(deltaLine) === 1 ? [plusMinus] : [`${Math.abs(deltaLine)}${plusMinus}`],
        description: `First non-blank ${deltaLine > 0 ? 'below' : 'above'}`,
        category: 'line'
      })
    }

    // gg for first line
    if (to.line === 0 && to.col === 0) {
      solutions.push({
        keys: ['g', 'g'],
        description: 'Go to first line',
        category: 'document'
      })
    }
    
    // G for last line (only if column is at start or first non-blank)
    if (to.line === lines.length - 1 && (to.col === 0 || to.col === Math.max(0, targetLine.search(/\S/)))) {
      solutions.push({
        keys: ['G'],
        description: 'Go to last line',
        category: 'document'
      })
    }

    // Number + G for specific line (only if column is at start or first non-blank)
    if (to.col === 0 || to.col === Math.max(0, targetLine.search(/\S/))) {
      solutions.push({
        keys: [`${to.line + 1}G`],
        description: `Go to line ${to.line + 1}`,
        category: 'document'
      })
    }

    // Paragraph motions
    if (deltaLine > 2) {
      const paragraphSolution = simulateParagraphMotion(from, to, lines, '}')
      if (paragraphSolution) {
        solutions.push({
          keys: paragraphSolution.count === 1 ? ['}'] : [`${paragraphSolution.count}}`],
          description: 'Next paragraph',
          category: 'paragraph'
        })
      }
    }
    
    if (deltaLine < -2) {
      const paragraphSolution = simulateParagraphMotion(from, to, lines, '{')
      if (paragraphSolution) {
        solutions.push({
          keys: paragraphSolution.count === 1 ? ['{'] : [`${paragraphSolution.count}{`],
          description: 'Previous paragraph',
          category: 'paragraph'
        })
      }
    }
  }

  // Bracket matching
  const brackets = '()[]{}' 
  if (brackets.includes(targetChar || '')) {
    const matchResult = findMatchingBracket(from, to, lines)
    if (matchResult) {
      solutions.push({
        keys: ['%'],
        description: 'Jump to matching bracket',
        category: 'bracket'
      })
    }
  }

  // Sort solutions by key count (fewer is better)
  solutions.sort((a, b) => {
    const aLen = a.keys.join('').length
    const bLen = b.keys.join('').length
    return aLen - bLen
  })

  // If no solutions found, provide basic h/j/k/l solution
  if (solutions.length === 0) {
    const keys: string[] = []
    
    // First, handle line movement
    if (deltaLine !== 0) {
      const key = deltaLine > 0 ? 'j' : 'k'
      const count = Math.abs(deltaLine)
      keys.push(count === 1 ? key : `${count}${key}`)
    }
    
    // After moving lines with j/k, cursor column stays at from.col
    // BUT it gets clamped if target line is shorter
    const targetLineLen = targetLine.length
    const colAfterLineMove = deltaLine !== 0 
      ? Math.min(from.col, Math.max(0, targetLineLen - 1))
      : from.col
    
    // Now calculate how much we need to move horizontally
    const actualColDelta = to.col - colAfterLineMove
    
    if (actualColDelta !== 0) {
      const key = actualColDelta > 0 ? 'l' : 'h'
      const count = Math.abs(actualColDelta)
      keys.push(count === 1 ? key : `${count}${key}`)
    }
    
    solutions.push({
      keys,
      description: 'Basic movement',
      category: 'basic'
    })
  }

  return solutions
}

/**
 * Simulate word motion and check if it lands on target
 */
function simulateWordMotion(
  from: Position,
  to: Position,
  lines: string[],
  motion: 'w' | 'b' | 'e'
): { count: number } | null {
  let pos = { ...from }
  const maxIterations = 20
  
  for (let count = 1; count <= maxIterations; count++) {
    pos = applyMotion(pos, lines, motion)
    if (pos.line === to.line && pos.col === to.col) {
      return { count }
    }
    // Went past target
    if (motion === 'w' || motion === 'e') {
      if (pos.line > to.line || (pos.line === to.line && pos.col > to.col)) {
        return null
      }
    } else {
      if (pos.line < to.line || (pos.line === to.line && pos.col < to.col)) {
        return null
      }
    }
  }
  return null
}

/**
 * Simulate paragraph motion
 */
function simulateParagraphMotion(
  from: Position,
  to: Position,
  lines: string[],
  motion: '{' | '}'
): { count: number } | null {
  let line = from.line
  const maxIterations = 10
  
  for (let count = 1; count <= maxIterations; count++) {
    if (motion === '}') {
      line++
      while (line < lines.length - 1 && lines[line].trim() !== '') {
        line++
      }
    } else {
      line--
      while (line > 0 && lines[line].trim() !== '') {
        line--
      }
    }
    
    if (line === to.line) {
      return { count }
    }
  }
  return null
}

/**
 * Check if % motion would work
 */
function findMatchingBracket(
  from: Position,
  to: Position,
  lines: string[]
): boolean {
  const currentLine = lines[from.line] || ''
  const currentChar = currentLine[from.col]
  const brackets: Record<string, string> = {
    '(': ')', ')': '(',
    '[': ']', ']': '[',
    '{': '}', '}': '{',
  }
  
  if (!brackets[currentChar]) return false
  
  // Simplified check - just verify target has matching bracket
  const targetLine = lines[to.line] || ''
  const targetChar = targetLine[to.col]
  
  return brackets[currentChar] === targetChar || brackets[targetChar] === currentChar
}

/**
 * Apply a single motion and return new position
 */
function applyMotion(pos: Position, lines: string[], motion: string): Position {
  const { line, col } = pos
  const currentLine = lines[line] || ''
  
  const isWordChar = (c: string) => /\w/.test(c)
  
  switch (motion) {
    case 'w': {
      let newCol = col + 1
      while (newCol < currentLine.length && isWordChar(currentLine[newCol])) {
        newCol++
      }
      while (newCol < currentLine.length && !isWordChar(currentLine[newCol]) && !/\s/.test(currentLine[newCol])) {
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
    
    case 'e': {
      let newCol = col + 1
      while (newCol < currentLine.length && /\s/.test(currentLine[newCol])) {
        newCol++
      }
      while (newCol < currentLine.length - 1 && isWordChar(currentLine[newCol + 1])) {
        newCol++
      }
      return { line, col: Math.min(newCol, currentLine.length - 1) }
    }
    
    default:
      return pos
  }
}

/**
 * Analyze user's performance on a target
 */
export function analyzeTargetPerformance(
  from: Position,
  to: Position,
  lines: string[],
  userKeys: string[],
  timeTaken: number
): TargetAnalysis {
  const solutions = calculateOptimalSolution(from, to, lines)
  const optimal = solutions[0]
  const alternatives = solutions.slice(1)
  
  const optimalKeyCount = optimal.keys.join('').length
  const userKeyCount = userKeys.join('').length
  
  const efficiency = Math.min(100, Math.round((optimalKeyCount / Math.max(1, userKeyCount)) * 100))
  const isOptimal = userKeyCount <= optimalKeyCount
  
  // Determine weakness
  let weakness: WeaknessType | undefined
  
  if (timeTaken > 5 && optimal.category === 'basic') {
    weakness = 'slow_basic_movement'
  } else if (!isOptimal) {
    // Check what optimal solution uses that user didn't
    const userKeysStr = userKeys.join('')
    
    if (optimal.category === 'word' && !userKeysStr.match(/[wbeWBE]/)) {
      weakness = 'missing_word_motions'
    } else if (optimal.category === 'find' && !userKeysStr.match(/[fFtT]/)) {
      weakness = 'missing_find_motions'
    } else if (optimal.category === 'line' && !userKeysStr.match(/[0^$_+-]/)) {
      weakness = 'missing_line_motions'
    } else if (optimal.category === 'count' && !userKeysStr.match(/\d/)) {
      weakness = 'missing_count_prefix'
    } else if (optimal.category === 'paragraph' && !userKeysStr.match(/[{}]/)) {
      weakness = 'missing_paragraph_motions'
    } else if (optimal.category === 'bracket' && !userKeysStr.includes('%')) {
      weakness = 'missing_bracket_matching'
    } else {
      weakness = 'inefficient_path'
    }
  }
  
  return {
    optimal,
    alternatives,
    userKeys,
    efficiency,
    timeTaken,
    isOptimal,
    weakness
  }
}

/**
 * Get target generation weights based on weaknesses
 */
export function getWeaknessBasedWeights(
  weaknesses: Record<WeaknessType, number>
): Record<VimCategory, number> {
  const baseWeight = 1
  const weights: Record<VimCategory, number> = {
    basic: baseWeight,
    word: baseWeight,
    line: baseWeight,
    find: baseWeight,
    search: baseWeight,
    paragraph: baseWeight,
    document: baseWeight,
    bracket: baseWeight,
    count: baseWeight,
  }
  
  // Increase weight for weak areas
  if (weaknesses.slow_basic_movement > 2) {
    weights.basic += 2
  }
  if (weaknesses.missing_word_motions > 1) {
    weights.word += 3
  }
  if (weaknesses.missing_find_motions > 1) {
    weights.find += 3
  }
  if (weaknesses.missing_line_motions > 1) {
    weights.line += 3
  }
  if (weaknesses.missing_count_prefix > 2) {
    weights.count += 2
  }
  if (weaknesses.missing_paragraph_motions > 1) {
    weights.paragraph += 2
  }
  if (weaknesses.missing_bracket_matching > 1) {
    weights.bracket += 2
  }
  
  return weights
}

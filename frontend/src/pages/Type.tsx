import { useState, useEffect } from 'react'
import TypingTest from '../components/TypingTest'
import { useTypingAnalyticsStore } from '../stores/typingAnalyticsStore'
import { useAuthStore } from '../stores/authStore'
import { typingApi } from '../api'

type TestMode = 'words' | 'code' | 'practice'
const LANGUAGES = ['javascript', 'python', 'typescript', 'rust', 'go'] as const

export default function Type() {
  const [showResults, setShowResults] = useState(false)
  const [timeLimit, setTimeLimit] = useState(60)
  const [testMode, setTestMode] = useState<TestMode>('words')
  const [language, setLanguage] = useState<string>('javascript')
  const [resultSaved, setResultSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [practiceWords, setPracticeWords] = useState<string[] | null>(null)
  
  // Check for practice words from Stats page
  useEffect(() => {
    const storedWords = sessionStorage.getItem('practiceWords')
    const storedMode = sessionStorage.getItem('practiceMode')
    
    if (storedWords && storedMode === 'weakness') {
      try {
        const words = JSON.parse(storedWords)
        setPracticeWords(words)
        setTestMode('practice')
        // Clear after loading
        sessionStorage.removeItem('practiceWords')
        sessionStorage.removeItem('practiceMode')
      } catch (e) {
        console.error('Failed to parse practice words:', e)
      }
    }
  }, [])
  
  const {
    isFinished,
    wpm,
    rawWpm,
    accuracy,
    getAnalytics,
    initTest,
    keystrokes,
    wordAttempts,
  } = useTypingAnalyticsStore()
  
  const { isAuthenticated } = useAuthStore()
  
  const handleFinish = () => {
    setShowResults(true)
  }
  
  const handleRestart = () => {
    setShowResults(false)
    setResultSaved(false)
    initTest([], timeLimit)
  }
  
  const analytics = isFinished ? getAnalytics() : null
  
  // Copy analytics JSON to clipboard
  const copyAnalytics = () => {
    if (analytics) {
      navigator.clipboard.writeText(JSON.stringify(analytics, null, 2))
    }
  }
  
  // Save result to backend
  const saveResult = async () => {
    if (!analytics || saving || resultSaved) return
    
    setSaving(true)
    try {
      // Map practice mode to words for storage
      const storageMode = testMode === 'practice' ? 'words' : testMode
      await typingApi.saveTypingAnalytics({
        wpm,
        raw_wpm: rawWpm,
        accuracy,
        time_limit: timeLimit,
        keystrokes: keystrokes.length,
        correct_keystrokes: keystrokes.filter(k => k.correct).length,
        words_typed: wordAttempts.length,
        test_mode: storageMode,
        language: testMode === 'code' ? language : undefined,
        analytics,
      })
      setResultSaved(true)
    } catch (error) {
      console.error('Failed to save result:', error)
    }
    setSaving(false)
  }
  
  return (
    <div className="min-h-screen bg-vim-base py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-vim-text mb-2">
            {testMode === 'practice' ? '🎯 Weakness Practice' : 'Typing Test'}
          </h1>
          <p className="text-vim-subtext">
            {testMode === 'practice' 
              ? 'AI-generated text targeting your problem areas' 
              : 'Track your typing speed and identify weaknesses'}
          </p>
        </div>
        
        {/* Practice mode banner */}
        {testMode === 'practice' && !isFinished && (
          <div className="bg-vim-mauve/20 border border-vim-mauve/30 rounded-lg p-4 mb-6 text-center">
            <p className="text-vim-text">
              This practice session is tailored to your weaknesses. 
              <button 
                onClick={() => {
                  setTestMode('words')
                  setPracticeWords(null)
                }}
                className="text-vim-mauve hover:underline ml-2"
              >
                Switch to regular mode
              </button>
            </p>
          </div>
        )}
        
        {/* Settings bar */}
        {!isFinished && testMode !== 'practice' && (
          <div className="flex flex-col items-center gap-4 mb-8">
            {/* Mode selector */}
            <div className="flex items-center gap-2 bg-vim-surface rounded-lg p-1">
              <button
                onClick={() => setTestMode('words')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  testMode === 'words'
                    ? 'bg-vim-green text-vim-base'
                    : 'text-vim-subtext hover:text-vim-text'
                }`}
              >
                Words
              </button>
              <button
                onClick={() => setTestMode('code')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  testMode === 'code'
                    ? 'bg-vim-green text-vim-base'
                    : 'text-vim-subtext hover:text-vim-text'
                }`}
              >
                Code
              </button>
            </div>
            {/* Language selector (only for code mode) */}
            {testMode === 'code' && (
              <div className="flex items-center gap-2 bg-vim-surface rounded-lg p-1">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`px-3 py-1.5 rounded-md transition-colors text-sm capitalize ${
                      language === lang
                        ? 'bg-vim-mauve text-vim-base'
                        : 'text-vim-subtext hover:text-vim-text'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}
            
            {/* Time selector */}
            <div className="flex items-center gap-2 bg-vim-surface rounded-lg p-1">
              {[10, 30, 60].map(time => (
                <button
                  key={time}
                  onClick={() => setTimeLimit(time)}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    timeLimit === time
                      ? 'bg-vim-mauve text-vim-base'
                      : 'text-vim-subtext hover:text-vim-text'
                  }`}
                >
                  {time}s
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Test or Results */}
        {!showResults ? (
          <TypingTest 
            onFinish={handleFinish} 
            timeLimit={timeLimit} 
            mode={testMode}
            language={language}
            practiceWords={practiceWords || undefined}
          />
        ) : (
          <div className="space-y-6">
            {/* Main stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-vim-surface rounded-lg p-6 text-center border border-vim-overlay">
                <div className="text-5xl font-bold text-vim-mauve mb-2">{wpm}</div>
                <div className="text-vim-subtext">WPM</div>
              </div>
              <div className="bg-vim-surface rounded-lg p-6 text-center border border-vim-overlay">
                <div className="text-5xl font-bold text-vim-green mb-2">{accuracy}%</div>
                <div className="text-vim-subtext">Accuracy</div>
              </div>
              <div className="bg-vim-surface rounded-lg p-6 text-center border border-vim-overlay">
                <div className="text-5xl font-bold text-vim-text mb-2">{rawWpm}</div>
                <div className="text-vim-subtext">Raw WPM</div>
              </div>
            </div>
            
            {/* Additional stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-vim-surface rounded-lg p-4 text-center border border-vim-overlay">
                <div className="text-2xl font-bold text-vim-text">{keystrokes.length}</div>
                <div className="text-vim-subtext text-sm">Keystrokes</div>
              </div>
              <div className="bg-vim-surface rounded-lg p-4 text-center border border-vim-overlay">
                <div className="text-2xl font-bold text-vim-green">
                  {keystrokes.filter(k => k.correct).length}
                </div>
                <div className="text-vim-subtext text-sm">Correct</div>
              </div>
              <div className="bg-vim-surface rounded-lg p-4 text-center border border-vim-overlay">
                <div className="text-2xl font-bold text-vim-red">
                  {keystrokes.filter(k => !k.correct).length}
                </div>
                <div className="text-vim-subtext text-sm">Errors</div>
              </div>
              <div className="bg-vim-surface rounded-lg p-4 text-center border border-vim-overlay">
                <div className="text-2xl font-bold text-vim-text">{wordAttempts.length}</div>
                <div className="text-vim-subtext text-sm">Words</div>
              </div>
            </div>
            
            {/* Weakness Analysis */}
            {analytics && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-vim-text">Weakness Analysis</h2>
                  <button
                    onClick={copyAnalytics}
                    className="px-4 py-2 bg-vim-surface hover:bg-vim-overlay rounded-lg text-vim-subtext hover:text-vim-text transition-colors text-sm"
                  >
                    📋 Copy JSON
                  </button>
                </div>
                
                {/* Problem Character Pairs */}
                {analytics.problem_character_pairs.length > 0 && (
                  <div className="bg-vim-surface rounded-lg p-6 border border-vim-overlay">
                    <h3 className="text-lg font-semibold text-vim-text mb-4">
                      Problem Character Pairs
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {analytics.problem_character_pairs.map((pair, i) => (
                        <div
                          key={i}
                          className="bg-vim-base rounded-lg p-3 text-center"
                        >
                          <div className="text-xl font-mono text-vim-mauve mb-1">
                            "{pair.pair}"
                          </div>
                          <div className="text-sm text-vim-subtext">
                            {pair.avg_ms}ms avg
                          </div>
                          {pair.errors > 0 && (
                            <div className="text-sm text-vim-red">
                              {pair.errors} errors
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Problem Words / Lines */}
                {analytics.problem_words.length > 0 && (
                  <div className="bg-vim-surface rounded-lg p-6 border border-vim-overlay">
                    <h3 className="text-lg font-semibold text-vim-text mb-4">
                      {testMode === 'code' ? 'Problem Lines' : 'Problem Words'}
                    </h3>
                    <div className="space-y-2">
                      {analytics.problem_words.map((word, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between bg-vim-base rounded-lg p-3"
                        >
                          <span className="font-mono text-vim-text truncate max-w-[60%]">{word.word}</span>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-vim-subtext">
                              {word.attempts} attempts
                            </span>
                            <span className="text-vim-red">
                              {word.errors} errors
                            </span>
                            <span className="text-vim-yellow">
                              {word.avg_wpm} WPM
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Finger Transitions */}
                {analytics.difficult_finger_transitions.length > 0 && (
                  <div className="bg-vim-surface rounded-lg p-6 border border-vim-overlay">
                    <h3 className="text-lg font-semibold text-vim-text mb-4">
                      Finger Transition Analysis
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {analytics.difficult_finger_transitions.map((transition, i) => (
                        <div
                          key={i}
                          className={`rounded-lg p-4 ${
                            transition.severity === 'high'
                              ? 'bg-red-500/10 border border-red-500/30'
                              : transition.severity === 'medium'
                              ? 'bg-yellow-500/10 border border-yellow-500/30'
                              : 'bg-vim-base border border-vim-overlay'
                          }`}
                        >
                          <div className="font-medium text-vim-text capitalize mb-2">
                            {transition.type.replace('_', ' ')}
                          </div>
                          <div className="text-sm text-vim-subtext space-y-1">
                            <div>Avg: {transition.avg_ms}ms</div>
                            <div>Errors: {transition.errors}</div>
                            <div className={`capitalize ${
                              transition.severity === 'high' ? 'text-vim-red' :
                              transition.severity === 'medium' ? 'text-vim-yellow' :
                              'text-vim-green'
                            }`}>
                              {transition.severity} severity
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
              </div>
            )}
            
            {/* Actions */}
            <div className="flex justify-center gap-4">
              <button
                onClick={handleRestart}
                className="px-6 py-3 bg-vim-mauve text-vim-base rounded-lg font-medium hover:bg-vim-mauve/80 transition-colors"
              >
                Try Again
              </button>
              {isAuthenticated && !resultSaved && (
                <button
                  onClick={saveResult}
                  disabled={saving}
                  className="px-6 py-3 bg-vim-surface text-vim-text rounded-lg font-medium hover:bg-vim-overlay transition-colors border border-vim-overlay disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Result'}
                </button>
              )}
              {resultSaved && (
                <span className="px-6 py-3 text-vim-green">
                  ✓ Result Saved
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

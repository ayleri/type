import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { typingApi } from '../api'
import { Link } from 'react-router-dom'

interface Result {
  id: string
  mode: string
  language: string
  wpm: number
  accuracy: number
  test_duration: number
  time_limit?: number
  lines_completed: number
  words_typed?: number
  created_at: string
}

interface Stats {
  [language: string]: {
    best_wpm: number
    best_accuracy: number
    tests_count: number
    avg_wpm: number
  }
}

interface WeaknessData {
  type: string
  count: number
  label: string
  tip: string
  practice: string
  severity: 'high' | 'medium' | 'low'
}

interface WeaknessResponse {
  weaknesses: WeaknessData[]
  avg_efficiency: number
  total_vim_tests: number
  trend: number
  recommendations: string[]
  weakness_counts: Record<string, number>
}

interface TypingAnalyticsResponse {
  problem_character_pairs: Array<{ pair: string; avg_ms: number; errors: number; count: number }>
  problem_words: Array<{ word: string; attempts: number; errors: number; error_rate: number }>
  difficult_finger_transitions: Array<{ type: string; avg_ms: number; errors: number; severity: string }>
  tests_completed: number
  history: Array<{ wpm: number; accuracy: number; date: string }>
}

export default function Stats() {
  const { isAuthenticated, user } = useAuthStore()
  const [results, setResults] = useState<Result[]>([])
  const [stats, setStats] = useState<Stats>({})
  const [weaknesses, setWeaknesses] = useState<WeaknessResponse | null>(null)
  const [typingAnalytics, setTypingAnalytics] = useState<TypingAnalyticsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLanguage, setSelectedLanguage] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'vim' | 'typing'>('vim')

  useEffect(() => {
    if (isAuthenticated) {
      loadStats()
    } else {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  const loadStats = async () => {
    setIsLoading(true)
    try {
      const [statsRes, resultsRes, weaknessesRes, typingRes] = await Promise.all([
        typingApi.getStats(),
        typingApi.getResults(1),
        typingApi.getWeaknesses(),
        typingApi.getTypingAnalytics().catch(() => ({ data: null })),
      ])
      
      setStats(statsRes.data.stats_by_language || {})
      setResults(resultsRes.data.results || [])
      setWeaknesses(weaknessesRes.data || null)
      setTypingAnalytics(typingRes.data || null)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
    setIsLoading(false)
  }

  const getWeaknessIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      slow_basic_movement: '←→',
      missing_word_motions: 'wbe',
      missing_find_motions: 'f/t',
      missing_line_motions: '0$^',
      missing_count_prefix: '5j',
      missing_paragraph_motions: '{}',
      missing_bracket_matching: '%',
      inefficient_path: '⤵',
    }
    return icons[type] || '?'
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center py-16">
        <h1 className="text-3xl font-bold text-vim-text mb-4">Your Statistics</h1>
        <p className="text-vim-subtext mb-8">
          Sign in to track your progress and view your statistics.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/login"
            className="bg-vim-green text-vim-bg px-6 py-3 rounded-lg font-medium hover:bg-vim-green/90 transition-colors"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="border border-vim-overlay text-vim-text px-6 py-3 rounded-lg font-medium hover:bg-vim-surface transition-colors"
          >
            Sign Up
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <div className="text-vim-subtext">Loading statistics...</div>
      </div>
    )
  }

  const languages = Object.keys(stats)
  const vimResults = results.filter(r => r.mode !== 'typing')
  const typingResults = results.filter(r => r.mode === 'typing')
  const filteredResults = selectedLanguage 
    ? vimResults.filter(r => r.language === selectedLanguage)
    : vimResults

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-vim-text">Statistics</h1>
          <p className="text-vim-subtext mt-1">
            Welcome back, <span className="text-vim-green">{user?.username}</span>
          </p>
        </div>
        <div className="text-right">
          <div className="text-vim-subtext text-sm">Total Tests</div>
          <div className="text-3xl font-bold text-vim-green">{user?.tests_completed || 0}</div>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2 bg-vim-surface rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('vim')}
          className={`px-6 py-2 rounded-md font-medium transition-colors ${
            activeTab === 'vim'
              ? 'bg-vim-mauve text-vim-base'
              : 'text-vim-subtext hover:text-vim-text'
          }`}
        >
          Vim Racer
        </button>
        <button
          onClick={() => setActiveTab('typing')}
          className={`px-6 py-2 rounded-md font-medium transition-colors ${
            activeTab === 'typing'
              ? 'bg-vim-mauve text-vim-base'
              : 'text-vim-subtext hover:text-vim-text'
          }`}
        >
          Typing Test
        </button>
      </div>

      {activeTab === 'vim' ? (
        <>
          {/* Language Stats */}
      {languages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {languages.map((lang) => (
            <div
              key={lang}
              className="bg-vim-surface rounded-xl border border-vim-overlay p-6 hover:border-vim-green/50 transition-colors cursor-pointer"
              onClick={() => setSelectedLanguage(lang === selectedLanguage ? '' : lang)}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-vim-text capitalize">{lang}</h3>
                <span className="text-vim-subtext text-sm">{stats[lang].tests_count} tests</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-vim-subtext text-xs uppercase tracking-wide">Best</div>
                  <div className="text-2xl font-bold text-vim-green">{stats[lang].best_wpm}</div>
                  <div className="text-vim-subtext text-xs">targets/min</div>
                </div>
                <div>
                  <div className="text-vim-subtext text-xs uppercase tracking-wide">Average</div>
                  <div className="text-2xl font-bold text-vim-yellow">
                    {stats[lang].avg_wpm.toFixed(0)}
                  </div>
                  <div className="text-vim-subtext text-xs">targets/min</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-vim-surface rounded-xl border border-vim-overlay p-8 text-center">
          <p className="text-vim-subtext mb-4">No stats yet. Complete some races to see your progress!</p>
          <Link
            to="/play"
            className="inline-flex bg-vim-green text-vim-bg px-6 py-3 rounded-lg font-medium hover:bg-vim-green/90 transition-colors"
          >
            Start Racing
          </Link>
        </div>
      )}

      {/* Weakness Analysis */}
      {weaknesses && weaknesses.weaknesses.length > 0 && (
        <div className="bg-vim-surface rounded-xl border border-vim-overlay p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-vim-text">Vim Motion Weaknesses</h2>
              <p className="text-vim-subtext text-sm mt-1">
                Average efficiency: <span className="text-vim-green font-bold">{weaknesses.avg_efficiency}%</span>
                {weaknesses.trend !== 0 && (
                  <span className={`ml-2 ${weaknesses.trend > 0 ? 'text-vim-green' : 'text-vim-red'}`}>
                    {weaknesses.trend > 0 ? '↑' : '↓'} {Math.abs(weaknesses.trend).toFixed(1)}%
                  </span>
                )}
              </p>
            </div>
            <span className="text-vim-subtext text-sm">
              Based on {weaknesses.total_vim_tests} tests
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {weaknesses.weaknesses.map((weakness) => (
              <div
                key={weakness.type}
                className={`bg-vim-bg rounded-lg border p-4 ${
                  weakness.severity === 'high' 
                    ? 'border-vim-red/50' 
                    : weakness.severity === 'medium' 
                      ? 'border-vim-yellow/50' 
                      : 'border-vim-overlay'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-mono">{getWeaknessIcon(weakness.type)}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    weakness.severity === 'high'
                      ? 'bg-vim-red/20 text-vim-red'
                      : weakness.severity === 'medium'
                        ? 'bg-vim-yellow/20 text-vim-yellow'
                        : 'bg-vim-green/20 text-vim-green'
                  }`}>
                    {weakness.severity}
                  </span>
                </div>
                <h3 className="text-vim-text font-medium mb-1">
                  {weakness.label}
                </h3>
                <p className="text-vim-subtext text-xs">
                  {weakness.count} occurrence{weakness.count !== 1 ? 's' : ''}
                </p>
                <p className="text-vim-green text-xs mt-2">
                  💡 {weakness.tip}
                </p>
                <p className="text-vim-subtext text-xs mt-1 italic">
                  {weakness.practice}
                </p>
              </div>
            ))}
          </div>

          {weaknesses.recommendations.length > 0 && (
            <div className="border-t border-vim-overlay pt-4">
              <h3 className="text-vim-text font-medium mb-3">Top Recommendations</h3>
              <ul className="space-y-2">
                {weaknesses.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-vim-subtext text-sm">
                    <span className="text-vim-yellow">→</span>
                    {rec}
                  </li>
                ))}
              </ul>
              <Link
                to="/play"
                className="inline-flex mt-4 bg-vim-green text-vim-bg px-4 py-2 rounded-lg text-sm font-medium hover:bg-vim-green/90 transition-colors"
              >
                Practice Weaknesses
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Recent Results */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-vim-text">Recent Results</h2>
          {selectedLanguage && (
            <button
              onClick={() => setSelectedLanguage('')}
              className="text-vim-subtext hover:text-vim-text text-sm"
            >
              Clear filter: {selectedLanguage}
            </button>
          )}
        </div>

        {filteredResults.length > 0 ? (
          <div className="bg-vim-surface rounded-xl border border-vim-overlay overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-vim-overlay">
                  <th className="text-left text-vim-subtext text-xs uppercase tracking-wide px-6 py-3">
                    Language
                  </th>
                  <th className="text-left text-vim-subtext text-xs uppercase tracking-wide px-6 py-3">
                    Score
                  </th>
                  <th className="text-left text-vim-subtext text-xs uppercase tracking-wide px-6 py-3">
                    Duration
                  </th>
                  <th className="text-left text-vim-subtext text-xs uppercase tracking-wide px-6 py-3">
                    Targets
                  </th>
                  <th className="text-left text-vim-subtext text-xs uppercase tracking-wide px-6 py-3">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((result) => (
                  <tr key={result.id} className="border-b border-vim-overlay/50 hover:bg-vim-overlay/20">
                    <td className="px-6 py-4">
                      <span className="text-vim-text capitalize">{result.language}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-vim-green font-bold">{result.wpm}</span>
                      <span className="text-vim-subtext text-sm ml-1">t/min</span>
                    </td>
                    <td className="px-6 py-4 text-vim-text">
                      {result.test_duration.toFixed(1)}s
                    </td>
                    <td className="px-6 py-4 text-vim-text">
                      {result.lines_completed}
                    </td>
                    <td className="px-6 py-4 text-vim-subtext text-sm">
                      {new Date(result.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-vim-surface rounded-xl border border-vim-overlay p-8 text-center">
            <p className="text-vim-subtext">No results found.</p>
          </div>
        )}
      </div>
        </>
      ) : (
        <>
          {/* Typing Test Stats */}
          <div className="space-y-6">
            {/* Summary Stats */}
            {typingAnalytics && typingAnalytics.history.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-vim-surface rounded-xl border border-vim-overlay p-6 text-center">
                    <div className="text-4xl font-bold text-vim-mauve mb-2">
                      {Math.max(...typingAnalytics.history.map(h => h.wpm))}
                    </div>
                    <div className="text-vim-subtext">Best WPM</div>
                  </div>
                  <div className="bg-vim-surface rounded-xl border border-vim-overlay p-6 text-center">
                    <div className="text-4xl font-bold text-vim-green mb-2">
                      {Math.round(typingAnalytics.history.reduce((a, h) => a + h.accuracy, 0) / typingAnalytics.history.length)}%
                    </div>
                    <div className="text-vim-subtext">Avg Accuracy</div>
                  </div>
                  <div className="bg-vim-surface rounded-xl border border-vim-overlay p-6 text-center">
                    <div className="text-4xl font-bold text-vim-text mb-2">
                      {typingAnalytics.tests_completed}
                    </div>
                    <div className="text-vim-subtext">Tests Completed</div>
                  </div>
                </div>

                {/* Problem Character Pairs */}
                {typingAnalytics.problem_character_pairs.length > 0 && (
                  <div className="bg-vim-surface rounded-xl border border-vim-overlay p-6">
                    <h3 className="text-lg font-semibold text-vim-text mb-4">Problem Character Pairs</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {typingAnalytics.problem_character_pairs.slice(0, 10).map((pair, i) => (
                        <div key={i} className="bg-vim-base rounded-lg p-3 text-center">
                          <div className="text-xl font-mono text-vim-mauve mb-1">"{pair.pair}"</div>
                          <div className="text-sm text-vim-subtext">{pair.avg_ms}ms</div>
                          {pair.errors > 0 && (
                            <div className="text-sm text-vim-red">{pair.errors} errors</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Problem Words */}
                {typingAnalytics.problem_words.length > 0 && (
                  <div className="bg-vim-surface rounded-xl border border-vim-overlay p-6">
                    <h3 className="text-lg font-semibold text-vim-text mb-4">Problem Words</h3>
                    <div className="space-y-2">
                      {typingAnalytics.problem_words.slice(0, 5).map((word, i) => (
                        <div key={i} className="flex items-center justify-between bg-vim-base rounded-lg p-3">
                          <span className="font-mono text-vim-text">{word.word}</span>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-vim-subtext">{word.attempts} attempts</span>
                            <span className="text-vim-red">{word.errors} errors</span>
                            <span className="text-vim-yellow">{word.error_rate}% error rate</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Finger Transitions */}
                {typingAnalytics.difficult_finger_transitions.length > 0 && (
                  <div className="bg-vim-surface rounded-xl border border-vim-overlay p-6">
                    <h3 className="text-lg font-semibold text-vim-text mb-4">Finger Transition Analysis</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {typingAnalytics.difficult_finger_transitions.map((transition, i) => (
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
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Typing Results */}
                <div>
                  <h2 className="text-xl font-semibold text-vim-text mb-4">Recent Typing Tests</h2>
                  <div className="bg-vim-surface rounded-xl border border-vim-overlay overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-vim-overlay">
                          <th className="text-left text-vim-subtext text-xs uppercase tracking-wide px-6 py-3">WPM</th>
                          <th className="text-left text-vim-subtext text-xs uppercase tracking-wide px-6 py-3">Accuracy</th>
                          <th className="text-left text-vim-subtext text-xs uppercase tracking-wide px-6 py-3">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {typingAnalytics.history.map((result, i) => (
                          <tr key={i} className="border-b border-vim-overlay/50 hover:bg-vim-overlay/20">
                            <td className="px-6 py-4">
                              <span className="text-vim-green font-bold">{result.wpm}</span>
                              <span className="text-vim-subtext text-sm ml-1">wpm</span>
                            </td>
                            <td className="px-6 py-4 text-vim-text">{result.accuracy}%</td>
                            <td className="px-6 py-4 text-vim-subtext text-sm">
                              {result.date ? new Date(result.date).toLocaleDateString() : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-vim-surface rounded-xl border border-vim-overlay p-8 text-center">
                <p className="text-vim-subtext mb-4">No typing test stats yet. Complete some tests to see your progress!</p>
                <Link
                  to="/type"
                  className="inline-flex bg-vim-green text-vim-bg px-6 py-3 rounded-lg font-medium hover:bg-vim-green/90 transition-colors"
                >
                  Start Typing Test
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

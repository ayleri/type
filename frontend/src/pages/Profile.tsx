import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import api from '../services/api'

interface TypingResult {
  id: number
  mode: string
  mode_value: number
  wpm: number
  accuracy: number
  created_at: string
}

export default function Profile() {
  const { user, checkAuth } = useAuthStore()
  const navigate = useNavigate()
  const [results, setResults] = useState<TypingResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    const fetchResults = async () => {
      try {
        const response = await api.get('/typing/results?per_page=20')
        setResults(response.data.results)
      } catch (error) {
        console.error('Failed to fetch results:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [user, navigate])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (!user) {
    return null
  }

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto">
        {/* User stats */}
        <div className="bg-bg-secondary rounded-lg p-8 mb-8">
          <h1 className="text-3xl font-bold text-main mb-6">{user.username}</h1>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-3xl font-bold text-text">{user.best_wpm}</div>
              <div className="text-sub">best wpm</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-text">{user.average_wpm}</div>
              <div className="text-sub">avg wpm</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-text">{user.average_accuracy}%</div>
              <div className="text-sub">avg accuracy</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-text">{user.tests_completed}</div>
              <div className="text-sub">tests completed</div>
            </div>
          </div>
        </div>

        {/* Recent results */}
        <h2 className="text-2xl font-bold text-text mb-4">Recent Tests</h2>
        
        {loading ? (
          <div className="text-sub">Loading...</div>
        ) : results.length === 0 ? (
          <div className="text-sub">No tests completed yet. Start typing!</div>
        ) : (
          <div className="bg-bg-secondary rounded-lg overflow-hidden">
            <div className="grid grid-cols-5 gap-4 p-4 font-bold text-sub border-b border-bg">
              <span>mode</span>
              <span className="text-right">wpm</span>
              <span className="text-right">accuracy</span>
              <span className="text-right">time</span>
              <span className="text-right">date</span>
            </div>
            
            {results.map((result) => (
              <div 
                key={result.id}
                className="grid grid-cols-5 gap-4 p-4 border-b border-bg last:border-0 hover:bg-bg transition-colors"
              >
                <span className="text-text">
                  {result.mode} {result.mode_value}
                </span>
                <span className="text-right text-main font-bold">{result.wpm}</span>
                <span className="text-right text-text">{result.accuracy}%</span>
                <span className="text-right text-sub">
                  {result.mode === 'time' ? `${result.mode_value}s` : `${result.mode_value} words`}
                </span>
                <span className="text-right text-sub text-sm">
                  {new Date(result.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

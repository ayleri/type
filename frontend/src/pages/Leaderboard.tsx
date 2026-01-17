import { useEffect, useState } from 'react'
import api from '../services/api'

interface LeaderboardEntry {
  rank: number
  username: string
  wpm: number
  accuracy: number
  date: string
}

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [mode] = useState('time')
  const [modeValue, setModeValue] = useState(60)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true)
      try {
        const response = await api.get(`/leaderboard?mode=${mode}&mode_value=${modeValue}`)
        setLeaderboard(response.data.leaderboard)
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [mode, modeValue])

  const timeOptions = [15, 30, 60, 120]

  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold text-main mb-8 text-center">Leaderboard</h1>

      {/* Mode selector */}
      <div className="flex justify-center gap-4 mb-8">
        {timeOptions.map((option) => (
          <button
            key={option}
            onClick={() => setModeValue(option)}
            className={`px-4 py-2 rounded transition-colors ${
              modeValue === option 
                ? 'bg-main text-bg' 
                : 'bg-bg-secondary text-sub hover:text-text'
            }`}
          >
            {option}s
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-sub">Loading...</div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center text-sub">
          No results yet. Be the first to complete a test!
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          <div className="grid grid-cols-5 gap-4 p-4 bg-bg-secondary rounded-t-lg font-bold text-sub">
            <span>#</span>
            <span>user</span>
            <span className="text-right">wpm</span>
            <span className="text-right">accuracy</span>
            <span className="text-right">date</span>
          </div>
          
          {leaderboard.map((entry) => (
            <div 
              key={entry.rank}
              className="grid grid-cols-5 gap-4 p-4 border-b border-bg-secondary hover:bg-bg-secondary transition-colors"
            >
              <span className={entry.rank <= 3 ? 'text-main font-bold' : 'text-sub'}>
                {entry.rank}
              </span>
              <span className="text-text">{entry.username}</span>
              <span className="text-right text-main font-bold">{entry.wpm}</span>
              <span className="text-right text-text">{entry.accuracy}%</span>
              <span className="text-right text-sub text-sm">
                {new Date(entry.date).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

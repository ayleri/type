import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuthStore()
  
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)

    try {
      await register(username, email, password)
      navigate('/play')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed')
    }
    
    setIsLoading(false)
  }

  return (
    <div className="max-w-md mx-auto py-16">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-vim-text">Create Account</h1>
        <p className="text-vim-subtext mt-2">Start your Vim mastery journey</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-vim-surface rounded-xl border border-vim-overlay p-8">
        {error && (
          <div className="bg-vim-red/10 border border-vim-red text-vim-red px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-vim-subtext text-sm mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-vim-bg border border-vim-overlay rounded-lg px-4 py-3 text-vim-text focus:outline-none focus:ring-2 focus:ring-vim-green/50 focus:border-vim-green"
              required
              minLength={3}
            />
          </div>

          <div>
            <label className="block text-vim-subtext text-sm mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-vim-bg border border-vim-overlay rounded-lg px-4 py-3 text-vim-text focus:outline-none focus:ring-2 focus:ring-vim-green/50 focus:border-vim-green"
              required
            />
          </div>

          <div>
            <label className="block text-vim-subtext text-sm mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-vim-bg border border-vim-overlay rounded-lg px-4 py-3 text-vim-text focus:outline-none focus:ring-2 focus:ring-vim-green/50 focus:border-vim-green"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-vim-subtext text-sm mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-vim-bg border border-vim-overlay rounded-lg px-4 py-3 text-vim-text focus:outline-none focus:ring-2 focus:ring-vim-green/50 focus:border-vim-green"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-vim-green text-vim-bg py-3 rounded-lg font-bold mt-6 hover:bg-vim-green/90 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Creating account...' : 'Create Account'}
        </button>

        <p className="text-center text-vim-subtext mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-vim-green hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}

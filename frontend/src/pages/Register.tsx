import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function Register() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const { register, isLoading, error } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters')
      return
    }

    try {
      await register(username, email, password)
      navigate('/')
    } catch {
      // Error is handled by the store
    }
  }

  const displayError = localError || error

  return (
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-3xl font-bold text-main mb-8 text-center">Register</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {displayError && (
          <div className="p-4 bg-error/20 border border-error rounded text-error">
            {displayError}
          </div>
        )}

        <div>
          <label htmlFor="username" className="block text-sub mb-2">
            Username
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 bg-bg-secondary text-text rounded focus:outline-none focus:ring-2 focus:ring-main"
            minLength={3}
            maxLength={50}
            required
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sub mb-2">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-bg-secondary text-text rounded focus:outline-none focus:ring-2 focus:ring-main"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sub mb-2">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-bg-secondary text-text rounded focus:outline-none focus:ring-2 focus:ring-main"
            minLength={6}
            required
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sub mb-2">
            Confirm Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 bg-bg-secondary text-text rounded focus:outline-none focus:ring-2 focus:ring-main"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-3 bg-main text-bg font-bold rounded hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isLoading ? 'Creating account...' : 'Register'}
        </button>
      </form>

      <p className="mt-6 text-center text-sub">
        Already have an account?{' '}
        <Link to="/login" className="text-main hover:underline">
          Login
        </Link>
      </p>
    </div>
  )
}

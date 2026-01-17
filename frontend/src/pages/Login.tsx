import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const { login, isLoading, error } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(username, password)
      navigate('/')
    } catch {
      // Error is handled by the store
    }
  }

  return (
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-3xl font-bold text-main mb-8 text-center">Login</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-error/20 border border-error rounded text-error">
            {error}
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
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-3 bg-main text-bg font-bold rounded hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <p className="mt-6 text-center text-sub">
        Don't have an account?{' '}
        <Link to="/register" className="text-main hover:underline">
          Register
        </Link>
      </p>
    </div>
  )
}

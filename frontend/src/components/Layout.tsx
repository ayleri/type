import { Outlet, Link, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'

export default function Layout() {
  const location = useLocation()
  const { user, isAuthenticated, isLoading, checkAuth, logout } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/play', label: 'Play' },
    { path: '/stats', label: 'Stats' },
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-vim-bg flex items-center justify-center">
        <div className="text-vim-green text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-vim-bg">
      {/* Header */}
      <header className="border-b border-vim-surface">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-vim-surface rounded-lg flex items-center justify-center">
                <span className="text-vim-green font-bold text-xl">V</span>
              </div>
              <span className="text-xl font-bold text-vim-text">
                Vim<span className="text-vim-green">Racer</span>
              </span>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm font-medium transition-colors ${
                    location.pathname === link.path
                      ? 'text-vim-green'
                      : 'text-vim-subtext hover:text-vim-text'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {/* Auth */}
              {isAuthenticated ? (
                <div className="flex items-center gap-4">
                  <span className="text-vim-subtext text-sm">
                    {user?.username}
                  </span>
                  <button
                    onClick={logout}
                    className="text-sm text-vim-red hover:text-vim-red/80 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Link
                    to="/login"
                    className="text-sm text-vim-subtext hover:text-vim-text transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="text-sm bg-vim-green text-vim-bg px-4 py-2 rounded-lg font-medium hover:bg-vim-green/90 transition-colors"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-vim-surface mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-vim-subtext text-sm">
            <span>Master Vim motions through practice</span>
            <div className="flex items-center gap-4">
              <span>Press <kbd className="bg-vim-surface px-2 py-1 rounded text-vim-green">?</kbd> for help</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

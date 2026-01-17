import { Outlet, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useEffect } from 'react'

export default function Layout() {
  const { user, logout, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-bg-secondary">
        <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-main">
            monkeytype
          </Link>
          
          <div className="flex items-center gap-6">
            <Link 
              to="/" 
              className="text-sub hover:text-text transition-colors"
            >
              test
            </Link>
            <Link 
              to="/leaderboard" 
              className="text-sub hover:text-text transition-colors"
            >
              leaderboard
            </Link>
            
            {user ? (
              <>
                <Link 
                  to="/profile" 
                  className="text-sub hover:text-text transition-colors"
                >
                  {user.username}
                </Link>
                <button 
                  onClick={logout}
                  className="text-sub hover:text-error transition-colors"
                >
                  logout
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="text-sub hover:text-text transition-colors"
                >
                  login
                </Link>
                <Link 
                  to="/register" 
                  className="text-main hover:text-text transition-colors"
                >
                  register
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        <Outlet />
      </main>

      <footer className="border-t border-bg-secondary py-4">
        <div className="max-w-6xl mx-auto px-4 text-center text-sub text-sm">
          <p>MonkeyType Clone - Built with React, Flask & PostgreSQL</p>
        </div>
      </footer>
    </div>
  )
}

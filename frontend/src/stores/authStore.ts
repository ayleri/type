import { create } from 'zustand'
import api from '../services/api'

interface User {
  id: number
  username: string
  email: string
  tests_completed: number
  tests_started: number
  best_wpm: number
  average_wpm: number
  average_accuracy: number
}

interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post('/auth/login', { username, password })
      const { user, access_token, refresh_token } = response.data
      
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
      
      set({ user, isLoading: false })
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      set({ 
        error: err.response?.data?.error || 'Login failed', 
        isLoading: false 
      })
      throw error
    }
  },

  register: async (username: string, email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post('/auth/register', { username, email, password })
      const { user, access_token, refresh_token } = response.data
      
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
      
      set({ user, isLoading: false })
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      set({ 
        error: err.response?.data?.error || 'Registration failed', 
        isLoading: false 
      })
      throw error
    }
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ user: null })
  },

  checkAuth: async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      set({ user: null })
      return
    }

    try {
      const response = await api.get('/auth/me')
      set({ user: response.data.user })
    } catch {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      set({ user: null })
    }
  },
}))

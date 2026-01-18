import axios from 'axios'

const API_URL = '/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  register: (username: string, email: string, password: string) =>
    api.post('/auth/register', { username, email, password }),
  
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  
  getMe: () => api.get('/auth/me'),
}

// Typing API
export const typingApi = {
  getVimChallenge: (language: string, targetCount: number = 5, weaknesses: string[] = []) =>
    api.post('/typing/vim-challenge', { language, target_count: targetCount, weaknesses }),
  
  saveResult: (data: {
    mode: string
    language: string
    wpm: number
    raw_wpm: number
    accuracy: number
    correct_chars: number
    incorrect_chars: number
    test_duration: number
    lines_completed?: number
    efficiency?: number
    optimal_keystrokes?: number
    actual_keystrokes?: number
    weaknesses?: Record<string, number>
    target_results?: Array<{
      targetIndex: number
      userKeys: string[]
      timeTaken: number
      efficiency: number
      isOptimal: boolean
      weakness?: string
    }>
  }) => api.post('/typing/result', data),
  
  getResults: (page: number = 1, language?: string) =>
    api.get(`/typing/results?page=${page}${language ? `&language=${language}` : ''}`),
  
  getStats: () => api.get('/typing/stats'),
  
  getWeaknesses: () => api.get('/typing/weaknesses'),
}

export default api

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
  
  refresh: () => api.post('/auth/refresh'),
}

// Typing API
export const typingApi = {
  getLanguages: () => api.get('/typing/languages'),
  
  getSnippet: (language: string, useAI: boolean = false) =>
    api.get(`/typing/snippet?language=${language}&ai=${useAI}`),
  
  generateSnippet: (language: string) =>
    api.post('/typing/generate', { language }),
  
  getSnippets: (language: string, count: number = 3) =>
    api.get(`/typing/snippets?language=${language}&count=${count}`),
  
  getVimCommands: (count: number = 10) =>
    api.get(`/typing/vim-commands?count=${count}`),
  
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
  }) => api.post('/typing/result', data),
  
  getResults: (page: number = 1, language?: string) =>
    api.get(`/typing/results?page=${page}${language ? `&language=${language}` : ''}`),
  
  getStats: () => api.get('/typing/stats'),
}

export default api

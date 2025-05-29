import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token'))
  const loading = ref(false)
  const error = ref(null)

  const isLoggedIn = computed(() => !!token.value)

  const login = async (credentials: { email: string; password: string }) => {
    loading.value = true
    try {
      const response = await axios.post('/api/auth/login', credentials)
      token.value = response.data.token
      user.value = response.data.user
      localStorage.setItem('token', token.value || '')
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
  }

  const fetchProfile = async () => {
    if (!token.value) return

    loading.value = true
    try {
      const response = await axios.get('/api/auth/profile')
      user.value = response.data
    } catch (err: any) {
      error.value = err.message
      if (err.response?.status === 401) {
        logout()
      }
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    token,
    loading,
    error,
    isLoggedIn,
    login,
    logout,
    fetchProfile
  }
}) 
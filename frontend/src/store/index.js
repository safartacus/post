import { createStore } from 'vuex'
import axios from 'axios'

const API_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000/api'

export default createStore({
  state: {
    user: null,
    token: localStorage.getItem('token') || null,
    notifications: [],
    categories: [],
    loading: false,
    error: null
  },
  
  mutations: {
    SET_USER(state, user) {
      state.user = user
    },
    SET_TOKEN(state, token) {
      state.token = token
      localStorage.setItem('token', token)
    },
    CLEAR_AUTH(state) {
      state.user = null
      state.token = null
      localStorage.removeItem('token')
    },
    SET_NOTIFICATIONS(state, notifications) {
      state.notifications = notifications
    },
    ADD_NOTIFICATION(state, notification) {
      state.notifications.unshift(notification)
    },
    SET_CATEGORIES(state, categories) {
      state.categories = categories
    },
    SET_LOADING(state, loading) {
      state.loading = loading
    },
    SET_ERROR(state, error) {
      state.error = error
    }
  },
  
  actions: {
    async login({ commit }, credentials) {
      try {
        commit('SET_LOADING', true)
        const response = await axios.post(`${API_URL}/auth/login`, credentials)
        commit('SET_TOKEN', response.data.token)
        commit('SET_USER', response.data.user)
        commit('SET_ERROR', null)
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.error || 'Login failed')
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    async register({ commit }, userData) {
      try {
        commit('SET_LOADING', true)
        const response = await axios.post(`${API_URL}/auth/register`, userData)
        commit('SET_TOKEN', response.data.token)
        commit('SET_USER', response.data.user)
        commit('SET_ERROR', null)
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.error || 'Registration failed')
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    logout({ commit }) {
      commit('CLEAR_AUTH')
    },
    
    async fetchUser({ commit }) {
      try {
        commit('SET_LOADING', true)
        const response = await axios.get(`${API_URL}/auth/profile`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
        commit('SET_USER', response.data)
        commit('SET_ERROR', null)
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.error || 'Failed to fetch user')
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    async fetchNotifications({ commit }) {
      try {
        commit('SET_LOADING', true)
        const response = await axios.get(`${API_URL}/notifications`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
        commit('SET_NOTIFICATIONS', response.data)
        commit('SET_ERROR', null)
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.error || 'Failed to fetch notifications')
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    async fetchCategories({ commit }) {
      try {
        commit('SET_LOADING', true)
        const response = await axios.get(`${API_URL}/categories`)
        commit('SET_CATEGORIES', response.data)
        commit('SET_ERROR', null)
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.error || 'Failed to fetch categories')
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    }
  },
  
  getters: {
    isAuthenticated: state => !!state.token,
    currentUser: state => state.user,
    notifications: state => state.notifications,
    unreadNotifications: state => state.notifications.filter(n => !n.read),
    categories: state => state.categories,
    loading: state => state.loading,
    error: state => state.error
  }
}) 
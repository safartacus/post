import { createStore } from 'vuex'
import axios from 'axios'

const API_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000/api'

export default createStore({
  state: {
    admin: null,
    token: localStorage.getItem('token') || null,
    statistics: {
      totalVlogs: 0,
      totalUsers: 0,
      totalComments: 0,
      totalCategories: 0
    },
    loading: false,
    error: null
  },
  
  mutations: {
    SET_ADMIN(state, admin) {
      state.admin = admin
    },
    SET_TOKEN(state, token) {
      state.token = token
      localStorage.setItem('token', token)
    },
    CLEAR_AUTH(state) {
      state.admin = null
      state.token = null
      localStorage.removeItem('token')
    },
    SET_STATISTICS(state, statistics) {
      state.statistics = statistics
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
        const response = await axios.post(`${API_URL}/admin/login`, credentials)
        commit('SET_TOKEN', response.data.token)
        commit('SET_ADMIN', response.data.admin)
        commit('SET_ERROR', null)
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.error || 'Login failed')
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    logout({ commit }) {
      commit('CLEAR_AUTH')
    },
    
    async fetchAdmin({ commit }) {
      try {
        commit('SET_LOADING', true)
        const response = await axios.get(`${API_URL}/admin/profile`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
        commit('SET_ADMIN', response.data)
        commit('SET_ERROR', null)
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.error || 'Failed to fetch admin profile')
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    async fetchStatistics({ commit }) {
      try {
        commit('SET_LOADING', true)
        const response = await axios.get(`${API_URL}/admin/statistics`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
        commit('SET_STATISTICS', response.data)
        commit('SET_ERROR', null)
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.error || 'Failed to fetch statistics')
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    async updateAdminProfile({ commit }, profileData) {
      try {
        commit('SET_LOADING', true)
        const response = await axios.put(`${API_URL}/admin/profile`, profileData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
        commit('SET_ADMIN', response.data)
        commit('SET_ERROR', null)
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.error || 'Failed to update profile')
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    async changePassword({ commit }, passwordData) {
      try {
        commit('SET_LOADING', true)
        await axios.put(`${API_URL}/admin/change-password`, passwordData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
        commit('SET_ERROR', null)
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.error || 'Failed to change password')
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    }
  },
  
  getters: {
    isAuthenticated: state => !!state.token,
    currentAdmin: state => state.admin,
    statistics: state => state.statistics,
    loading: state => state.loading,
    error: state => state.error
  }
}) 
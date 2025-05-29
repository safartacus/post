import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Home from '../views/Home.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/create-blog',
    name: 'CreateBlog',
    component: () => import('../views/CreateBlog.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/blog/:id',
    name: 'BlogDetail',
    component: () => import('../views/BlogDetail.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Auth guard
router.beforeEach((to, from, next) => {
  const isLoggedIn = localStorage.getItem('token')
  
  if (to.meta && (to.meta as any).requiresAuth && !isLoggedIn) {
    next('/login')
  } else {
    next()
  }
})

export default router 
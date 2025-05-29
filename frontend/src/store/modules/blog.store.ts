import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

interface Blog {
  id: string
  title: string
  content: string
  author: {
    name: string
    avatar?: string
  }
  createdAt: string
  likes: number
  isLiked: boolean
  comments: Array<any>
}

export const useBlogStore = defineStore('blog', () => {
  const blogs = ref<Blog[]>([])
  const currentBlog = ref<Blog | null>(null)
  const loading = ref(false)
  const error = ref(null)

  const fetchBlogs = async () => {
    loading.value = true
    try {
      const response = await axios.get('/api/content')
      blogs.value = response.data
    } catch (err: any) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  const fetchBlogDetail = async (blogId: string) => {
    loading.value = true
    try {
      const response = await axios.get(`/api/content/${blogId}`)
      currentBlog.value = response.data
    } catch (err: any) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  const toggleLike = async (blogId: string) => {
    try {
      await axios.post(`/api/content/${blogId}/like`)
      const blog = blogs.value.find((b) => b.id === blogId)
      if (blog) {
        blog.isLiked = !blog.isLiked
        blog.likes += blog.isLiked ? 1 : -1
      }
    } catch (err: any) {
      error.value = err.message
    }
  }

  const addComment = async (blogId: string, content: string) => {
    try {
      await axios.post(`/api/content/${blogId}/comments`, { content })
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  const createBlog = async (data: { title: string; content: string }) => {
    try {
      await axios.post('/api/content', data)
      await fetchBlogs()
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  return {
    blogs,
    currentBlog,
    loading,
    error,
    fetchBlogs,
    fetchBlogDetail,
    toggleLike,
    addComment,
    createBlog
  }
}) 
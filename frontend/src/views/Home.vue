<template>
  <div class="home">
    <div class="container">
      <!-- Üst Kısım -->
      <div class="header">
        <h1>Blog Yazıları</h1>
        <el-button 
          v-if="isLoggedIn" 
          type="primary" 
          @click="navigateToCreate"
        >
          Yeni Blog Yaz
        </el-button>
      </div>

      <!-- Blog Listesi -->
      <div class="blog-list">
        <el-card 
          v-for="blog in filteredBlogs" 
          :key="blog.id" 
          class="blog-card"
        >
          <div class="blog-header">
            <el-avatar :src="blog.author.avatar" />
            <div class="blog-info">
              <h3>{{ blog.title }}</h3>
              <p class="author">{{ blog.author.name }}</p>
              <p class="date">{{ formatDate(blog.createdAt) }}</p>
            </div>
          </div>

          <div class="blog-content">
            <p>{{ blog.excerpt }}</p>
          </div>

          <div class="blog-footer">
            <div class="actions">
              <el-button 
                :type="blog.isLiked ? 'primary' : 'default'"
                @click="handleLike(blog.id)"
              >
                <el-icon><Thumb /></el-icon>
                {{ blog.likes }} Beğeni
              </el-button>
              <el-button @click="navigateToDetail(blog.id)">
                <el-icon><ChatDotRound /></el-icon>
                {{ blog.comments.length }} Yorum
              </el-button>
            </div>
          </div>
        </el-card>
        <div v-if="filteredBlogs.length === 0" class="no-results">
          <el-empty description="Sonuç bulunamadı" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBlogStore } from '@/store/modules/blog.store'
import { useAuthStore } from '@/store/modules/auth.store'
import { Thumb, ChatDotRound } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const blogStore = useBlogStore()
const authStore = useAuthStore()

const blogs = ref([])
const isLoggedIn = computed(() => authStore.isLoggedIn)

const searchTerm = computed(() => (route.query.q as string) || '')

const filteredBlogs = computed(() => {
  if (!searchTerm.value.trim()) return blogStore.blogs
  const q = searchTerm.value.trim().toLowerCase()
  return blogStore.blogs.filter(
    (blog: any) =>
      blog.title.toLowerCase().includes(q) ||
      (blog.content && blog.content.toLowerCase().includes(q))
  )
})

onMounted(async () => {
  await blogStore.fetchBlogs()
  blogs.value = blogStore.blogs
})

watch(
  () => route.query.q,
  () => {
    // Sadece reactive olması için blogs'u güncelle
    blogs.value = blogStore.blogs
  }
)

const handleLike = async (blogId: string) => {
  if (!isLoggedIn.value) {
    router.push('/login')
    return
  }
  await blogStore.toggleLike(blogId)
}

const navigateToCreate = () => {
  router.push('/create-blog')
}

const navigateToDetail = (blogId: string) => {
  router.push(`/blog/${blogId}`)
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<style scoped>
.home {
  padding: 2rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.blog-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
}

.blog-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.blog-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.blog-info {
  flex: 1;
}

.blog-info h3 {
  margin: 0;
  font-size: 1.2rem;
}

.author {
  color: #666;
  margin: 0.5rem 0;
}

.date {
  color: #999;
  font-size: 0.9rem;
  margin: 0;
}

.blog-content {
  flex: 1;
  margin: 1rem 0;
}

.blog-footer {
  margin-top: auto;
}

.actions {
  display: flex;
  gap: 1rem;
}

.no-results {
  grid-column: 1 / -1;
  margin-top: 2rem;
  text-align: center;
}
</style> 
<template>
  <div class="blog-detail">
    <div class="container">
      <!-- Blog İçeriği -->
      <el-card class="blog-content">
        <div class="blog-header">
          <div class="author-info">
            <el-avatar :src="blog?.author?.avatar" />
            <div class="author-meta">
              <h3>{{ blog?.author?.name }}</h3>
              <p class="date">{{ formatDate(blog?.createdAt) }}</p>
            </div>
          </div>
          <div class="blog-actions">
            <el-button 
              :type="blog?.isLiked ? 'primary' : 'default'"
              @click="handleLike"
            >
              <el-icon><Thumb /></el-icon>
              {{ blog?.likes }} Beğeni
            </el-button>
          </div>
        </div>

        <h1 class="blog-title">{{ blog?.title }}</h1>
        <div class="blog-body" v-html="blog?.content"></div>
      </el-card>

      <!-- Yorumlar Bölümü -->
      <el-card class="comments-section">
        <template #header>
          <div class="comments-header">
            <h2>Yorumlar ({{ blog?.comments?.length || 0 }})</h2>
          </div>
        </template>

        <!-- Yorum Formu -->
        <div v-if="isLoggedIn" class="comment-form">
          <el-input
            v-model="newComment"
            type="textarea"
            :rows="3"
            placeholder="Yorumunuzu yazın..."
          />
          <el-button 
            type="primary" 
            @click="submitComment"
            :loading="submitting"
          >
            Yorum Yap
          </el-button>
        </div>
        <el-alert
          v-else
          type="info"
          :closable="false"
        >
          Yorum yapmak için <router-link to="/login">giriş yapın</router-link>
        </el-alert>

        <!-- Yorum Listesi -->
        <div class="comments-list">
          <div 
            v-for="comment in blog?.comments" 
            :key="comment.id" 
            class="comment-item"
          >
            <div class="comment-header">
              <el-avatar :src="comment.author?.avatar" />
              <div class="comment-meta">
                <h4>{{ comment.author?.name }}</h4>
                <p class="date">{{ formatDate(comment.createdAt) }}</p>
              </div>
            </div>
            <p class="comment-content">{{ comment.content }}</p>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBlogStore } from '@/store/modules/blog.store'
import { useAuthStore } from '@/store/modules/auth.store'
import { Thumb } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const blogStore = useBlogStore()
const authStore = useAuthStore()

const blog = computed(() => blogStore.currentBlog)
const newComment = ref('')
const submitting = ref(false)

const isLoggedIn = computed(() => authStore.isLoggedIn)

onMounted(async () => {
  const blogId = route.params.id as string
  await blogStore.fetchBlogDetail(blogId)
})

const handleLike = async () => {
  if (!isLoggedIn.value) {
    router.push('/login')
    return
  }
  await blogStore.toggleLike(blog.value.id)
}

const submitComment = async () => {
  if (!newComment.value.trim()) {
    ElMessage.warning('Lütfen bir yorum yazın')
    return
  }
  submitting.value = true
  try {
    // Yorum ekleme API isteği
    await blogStore.addComment(blog.value.id, newComment.value)
    newComment.value = ''
    ElMessage.success('Yorumunuz eklendi')
    await blogStore.fetchBlogDetail(blog.value.id)
  } catch (error) {
    ElMessage.error('Yorum eklenirken bir hata oluştu')
  } finally {
    submitting.value = false
  }
}

const formatDate = (date: string) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.blog-detail {
  padding: 2rem;
}

.container {
  max-width: 800px;
  margin: 0 auto;
}

.blog-content {
  margin-bottom: 2rem;
}

.blog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.author-meta h3 {
  margin: 0;
}

.date {
  color: #666;
  margin: 0.5rem 0;
}

.blog-title {
  font-size: 2rem;
  margin: 1rem 0;
}

.blog-body {
  line-height: 1.6;
}

.comments-section {
  margin-top: 2rem;
}

.comments-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comment-form {
  margin-bottom: 2rem;
}

.comment-form .el-button {
  margin-top: 1rem;
}

.comments-list {
  margin-top: 2rem;
}

.comment-item {
  padding: 1rem 0;
  border-bottom: 1px solid #eee;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.comment-meta h4 {
  margin: 0;
}

.comment-content {
  margin: 0.5rem 0;
  line-height: 1.5;
}
</style> 
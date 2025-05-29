<template>
  <el-container class="app-container">
    <el-header>
      <nav class="nav">
        <router-link to="/" class="logo">Blog App</router-link>
        <div class="nav-search">
          <el-input
            v-model="searchTerm"
            placeholder="Bloglarda ara..."
            class="search-input rounded-input"
            clearable
            @keyup.enter="handleSearch"
            :prefix-icon="Search"
          >
            <template #append>
              <el-button @click="handleSearch" circle>
                <el-icon><Search /></el-icon>
              </el-button>
            </template>
          </el-input>
        </div>
        <div class="nav-links">
          <template v-if="isLoggedIn">
            <el-button @click="navigateToCreate">Yeni Blog</el-button>
            <el-dropdown @command="handleCommand">
              <el-avatar :src="user?.avatar" />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">Profil</el-dropdown-item>
                  <el-dropdown-item command="logout">Çıkış Yap</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
          <template v-else>
            <router-link to="/login">
              <el-button type="primary">Giriş Yap</el-button>
            </router-link>
          </template>
        </div>
      </nav>
    </el-header>

    <el-main>
      <router-view />
    </el-main>

    <el-footer>
      <p>&copy; 2024 Blog App. Tüm hakları saklıdır.</p>
    </el-footer>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/modules/auth.store'
import { Search } from '@element-plus/icons-vue'

const router = useRouter()
const authStore = useAuthStore()

const isLoggedIn = computed(() => authStore.isLoggedIn)
const user = computed(() => authStore.user)

const searchTerm = ref('')

const handleSearch = () => {
  if (searchTerm.value.trim()) {
    router.push({ path: '/', query: { q: searchTerm.value.trim() } })
  } else {
    router.push({ path: '/' })
  }
}

const navigateToCreate = () => {
  router.push('/create-blog')
}

const handleCommand = (command: string) => {
  switch (command) {
    case 'profile':
      router.push('/profile')
      break
    case 'logout':
      authStore.logout()
      router.push('/login')
      break
  }
}
</script>

<style scoped>
.app-container {
  min-height: 100vh;
}

.el-header {
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: fixed;
  width: 100%;
  z-index: 100;
}

.nav {
  max-width: 1200px;
  margin: 0 auto;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  font-size: 1.5rem;
  font-weight: bold;
  color: #409EFF;
  text-decoration: none;
}

.nav-search {
  flex: 1;
  max-width: 400px;
  margin: 0 2rem;
}

.search-input {
  width: 100%;
}

.rounded-input .el-input__wrapper {
  border-radius: 999px !important;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.el-main {
  padding-top: 80px;
  background-color: #f5f7fa;
}

.el-footer {
  text-align: center;
  color: #666;
  padding: 1rem;
  background-color: #fff;
}
</style> 
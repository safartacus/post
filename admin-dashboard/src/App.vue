<template>
  <div id="app">
    <el-container v-if="isAuthenticated">
      <el-aside width="200px">
        <admin-sidebar />
      </el-aside>
      
      <el-container>
        <el-header>
          <admin-header />
        </el-header>
        
        <el-main>
          <router-view />
        </el-main>
      </el-container>
    </el-container>
    
    <router-view v-else />
  </div>
</template>

<script>
import { computed } from 'vue'
import { useStore } from 'vuex'
import AdminSidebar from '@/components/AdminSidebar.vue'
import AdminHeader from '@/components/AdminHeader.vue'

export default {
  name: 'App',
  components: {
    AdminSidebar,
    AdminHeader
  },
  setup() {
    const store = useStore()
    const isAuthenticated = computed(() => store.getters.isAuthenticated)
    
    return {
      isAuthenticated
    }
  }
}
</script>

<style lang="scss">
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  height: 100vh;
}

.el-header {
  padding: 0;
  height: 60px !important;
  border-bottom: 1px solid #dcdfe6;
}

.el-aside {
  background-color: #304156;
  color: #fff;
}

.el-main {
  background-color: #f0f2f5;
  padding: 20px;
}
</style> 
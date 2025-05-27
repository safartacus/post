<template>
  <div id="app">
    <el-container>
      <el-header>
        <nav-bar />
      </el-header>
      
      <el-main>
        <router-view />
      </el-main>
      
      <el-footer>
        <footer-component />
      </el-footer>
    </el-container>
  </div>
</template>

<script>
import NavBar from '@/components/NavBar.vue'
import FooterComponent from '@/components/Footer.vue'

export default {
  name: 'App',
  components: {
    NavBar,
    FooterComponent
  }
}
</script>

<style lang="scss">
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

.el-header {
  padding: 0;
  height: auto !important;
}

.el-main {
  min-height: calc(100vh - 120px);
  padding: 20px;
}

.el-footer {
  height: 60px !important;
  padding: 0;
}
</style> 
<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <h2>Giriş Yap</h2>
      </template>

      <el-form 
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="handleSubmit"
      >
        <el-form-item label="Email" prop="email">
          <el-input 
            v-model="form.email"
            type="email"
            placeholder="Email adresinizi girin"
          />
        </el-form-item>

        <el-form-item label="Şifre" prop="password">
          <el-input 
            v-model="form.password"
            type="password"
            placeholder="Şifrenizi girin"
            show-password
          />
        </el-form-item>

        <el-form-item>
          <el-button 
            type="primary" 
            native-type="submit"
            :loading="loading"
            class="submit-button"
          >
            Giriş Yap
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/modules/auth.store'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref<FormInstance>()

const form = ref({
  email: '',
  password: ''
})

const loading = ref(false)

const rules: FormRules = {
  email: [
    { required: true, message: 'Email adresi gerekli', trigger: 'blur' },
    { type: 'email', message: 'Geçerli bir email adresi girin', trigger: 'blur' }
  ],
  password: [
    { required: true, message: 'Şifre gerekli', trigger: 'blur' },
    { min: 6, message: 'Şifre en az 6 karakter olmalı', trigger: 'blur' }
  ]
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        await authStore.login(form.value)
        ElMessage.success('Giriş başarılı')
        router.push('/')
      } catch (error) {
        ElMessage.error('Giriş başarısız')
      } finally {
        loading.value = false
      }
    }
  })
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 200px);
}

.login-card {
  width: 100%;
  max-width: 400px;
}

.submit-button {
  width: 100%;
}
</style> 
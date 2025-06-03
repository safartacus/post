<template>
  <div class="create-blog-container">
    <el-card class="create-blog-card">
      <template #header>
        <h2>Yeni Blog Oluştur</h2>
      </template>
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="handleSubmit"
      >
        <el-form-item label="Başlık" prop="title">
          <el-input v-model="form.title" placeholder="Blog başlığı" />
        </el-form-item>
        <el-form-item label="Açıklama" prop="description">
          <el-input v-model="form.description" placeholder="Kısa açıklama" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="İçerik" prop="content">
          <QuillEditor
            v-model:content="form.content"
            contentType="html"
            :modules="quillModules"
            style="min-height: 300px; width: 100%"
          />
        </el-form-item>
        <el-form-item label="Kategori" prop="category">
          <el-select v-model="form.category" placeholder="Kategori seçin">
            <el-option
              v-for="cat in categories"
              :key="cat._id"
              :label="cat.name"
              :value="cat._id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Etiketler (virgül ile ayırın)" prop="tags">
          <el-input v-model="form.tags" placeholder="ör: vue, javascript, frontend" />
        </el-form-item>
        <el-form-item label="Durum" prop="status">
          <el-select v-model="form.status" placeholder="Durum seçin">
            <el-option label="Taslak" value="draft" />
            <el-option label="Yayınlandı" value="published" />
          </el-select>
        </el-form-item>
        <el-form-item label="Görünürlük" prop="visibility">
          <el-select v-model="form.visibility" placeholder="Görünürlük seçin">
            <el-option label="Herkese Açık" value="public" />
            <el-option label="Gizli" value="private" />
            <el-option label="Liste Dışı" value="unlisted" />
          </el-select>
        </el-form-item>
        <el-form-item label="Medya">
          <el-upload
            class="upload-demo"
            :http-request="handleMediaUpload"
            :show-file-list="false"
            :accept="mediaType === 'image' ? 'image/*' : 'video/*'"
          >
            <el-button>{{ mediaType === 'image' ? 'Resim Yükle' : 'Video Yükle' }}</el-button>
          </el-upload>
          <el-radio-group v-model="mediaType" style="margin-left: 1rem;">
            <el-radio label="image">Resim</el-radio>
            <el-radio label="video">Video</el-radio>
          </el-radio-group>
          <div v-if="mediaPreview" style="margin-top: 1rem;">
            <img v-if="mediaType === 'image'" :src="mediaPreview" style="max-width: 200px;" />
            <video v-else :src="mediaPreview" controls style="max-width: 200px;" />
          </div>
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            native-type="submit"
            :loading="loading"
            class="submit-button"
          >
            Yayınla
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBlogStore } from '@/store/modules/blog.store'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { createBlog, getCategories, uploadMedia } from '@/apis/blogApi'
import { quillEditor as QuillEditor } from 'vue3-quill'
import 'quill/dist/quill.snow.css'

const router = useRouter()
const blogStore = useBlogStore()
const formRef = ref<FormInstance>()

const categories = ref<any[]>([])

const form = ref({
  title: '',
  description: '',
  content: '',
  category: '',
  tags: '', // comma separated string
  status: 'draft',
  visibility: 'public'
})

const loading = ref(false)

// Media upload
const mediaType = ref<'image' | 'video'>('image')
const mediaPreview = ref<string | null>(null)
const mediaInfo = ref<any>(null)

const handleMediaUpload = async (options: any) => {
  try {
    const file = options.file;
    console.log('Dosya Bilgileri:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    });
    const reader = new FileReader();
    reader.onload = (e) => {
      console.log('Dosya İçeriği (ilk 100 byte):', 
        e.target.result.slice(0, 100));
    };
    reader.readAsArrayBuffer(file);
    const result = await uploadMedia(file, mediaType.value);
    mediaInfo.value = result;
    mediaPreview.value = result.url || '';
    options.onSuccess(result);
  } catch (error) {
    options.onError(error);
    ElMessage.error('Medya yüklenemedi');
  }
}

// Quill toolbar ve image handler
const quillModules = {
  toolbar: {
    container: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ header: 1 }, { header: 2 }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ script: 'sub' }, { script: 'super' }],
      [{ indent: '-1' }, { indent: '+1' }],
      [{ direction: 'rtl' }],
      [{ size: ['small', false, 'large', 'huge'] }],
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      [{ color: [] }, { background: [] }],
      [{ font: [] }],
      [{ align: [] }],
      ['clean'],
      ['image', 'video']
    ],
    handlers: {
      image: function () {
        const input = document.createElement('input')
        input.setAttribute('type', 'file')
        input.setAttribute('accept', 'image/*')
        input.click()
        input.onchange = async () => {
          const file = input.files ? input.files[0] : null
          if (file) {
            try {
              const result = await uploadMedia(file, 'image')
              const url = result.url
              const quill = this.quill
              const range = quill.getSelection()
              quill.insertEmbed(range.index, 'image', url)
            } catch (e) {
              ElMessage.error('Görsel yüklenemedi')
            }
          }
        }
      },
      video: function () {
        const input = document.createElement('input')
        input.setAttribute('type', 'file')
        input.setAttribute('accept', 'video/*')
        input.click()
        input.onchange = async () => {
          const file = input.files ? input.files[0] : null
          if (file) {
            try {
              const result = await uploadMedia(file, 'video')
              const url = result.url
              const quill = this.quill
              const range = quill.getSelection()
              quill.insertEmbed(range.index, 'video', url)
            } catch (e) {
              ElMessage.error('Video yüklenemedi')
            }
          }
        }
      }
    }
  }
}

const rules: FormRules = {
  title: [
    { required: true, message: 'Başlık gerekli', trigger: 'blur' },
    { min: 3, message: 'Başlık en az 3 karakter olmalı', trigger: 'blur' }
  ],
  description: [
    { required: true, message: 'Açıklama gerekli', trigger: 'blur' },
    { min: 10, message: 'Açıklama en az 10 karakter olmalı', trigger: 'blur' }
  ],
  content: [
    { required: true, message: 'İçerik gerekli', trigger: 'blur' },
    { min: 10, message: 'İçerik en az 10 karakter olmalı', trigger: 'blur' }
  ],
  category: [
    { required: true, message: 'Kategori seçilmeli', trigger: 'change' }
  ],
  status: [
    { required: true, message: 'Durum seçilmeli', trigger: 'change' }
  ],
  visibility: [
    { required: true, message: 'Görünürlük seçilmeli', trigger: 'change' }
  ]
}

onMounted(async () => {
  try {
    const data = await getCategories();
    categories.value = data;
  } catch (e) {
    categories.value = [];
    ElMessage.error('Kategoriler yüklenemedi');
  }
})

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        const blogData = {
          ...form.value,
          tags: form.value.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
          media: mediaInfo.value
        };
        await createBlog(blogData);
        ElMessage.success('Blog başarıyla oluşturuldu')
        router.push('/')
      } catch (error) {
        ElMessage.error('Blog oluşturulamadı')
      } finally {
        loading.value = false
      }
    }
  })
}
</script>

<style scoped>
.create-blog-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 200px);
}

.create-blog-card {
  width: 100%;
  max-width: 600px;
}

.submit-button {
  width: 100%;
}
</style> 
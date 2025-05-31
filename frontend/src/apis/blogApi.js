import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

// Blog oluşturma
export const createBlog = async (blogData) => {
  try {
    const response = await axios.post(`${API_URL}/content/posts`, blogData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Kategorileri getirme
export const getCategories = async () => {
  try {
    const response = await axios.get(`${API_URL}/categories`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Blog listesi
export const getBlogs = async (params = {}) => {
  try {
    var s = localStorage.getItem('token')
    const response = await axios.get(`${API_URL}/content/posts`, {
      params,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Blog detayı
export const getBlogById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/content/posts/${id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Blog güncelleme
export const updateBlog = async (id, blogData) => {
  try {
    const response = await axios.put(`${API_URL}/content/posts/${id}`, blogData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Blog silme
export const deleteBlog = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/content/posts/${id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};
export const uploadMedia = async (file, type) => {
  try {
    // 1. Upload URL'i al
    const uploadUrlResponse = await axios.post(`${API_URL}/media/upload-url`, {
      type,
      originalName: file.name,
      isPublic: true
    }, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    const { uploadUrl, key, bucket, mediaId } = uploadUrlResponse.data;

    // 2. Dosyayı yükle
    const formData = new FormData();
    formData.append('file', file);

     await axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type,
        'x-amz-acl': 'public-read'
      },
      withCredentials: false
    });


    // 3. İşleme isteği gönder
    const processResponse = await axios.post(`${API_URL}/media/process`, {
      type,
      key,
      bucket,
      originalName: file.name,
      mimeType: file.type, // Dosyanın MIME tipi
      size: file.size,     // Dosyanın boyutu
      mediaId
    }, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return processResponse.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};
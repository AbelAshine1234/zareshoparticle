import { configureStore, createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from './baseApi.js'

export const fetchCategories = createAsyncThunk('categories/fetch', async () => {
  return await api.get('/categories')
})

export const createCategory = createAsyncThunk('categories/create', async (name) => {
  const data = await api.post('/categories', { name })
  return data.name
})

export const fetchArticles = createAsyncThunk('articles/fetch', async (category) => {
  const qs = category ? `?category=${encodeURIComponent(category)}` : ''
  return await api.get('/articles' + qs)
})

export const postArticle = createAsyncThunk('articles/post', async ({ title, content, category, imageUrl }) => {
  return await api.post('/articles', { title, content, category, imageUrl })
})

export const uploadImage = createAsyncThunk('upload/image', async (file) => {
  const formData = new FormData()
  formData.append('image', file)
  return await api.post('/upload', formData)
})

export const deleteArticle = createAsyncThunk('articles/delete', async (id) => {
  await api.del(`/articles/${id}`)
  return id
})

export const fetchComments = createAsyncThunk('comments/fetch', async (articleId) => {
  return await api.get(`/articles/${articleId}/comments`)
})

export const postComment = createAsyncThunk('comments/post', async ({ articleId, content, name }) => {
  return await api.post(`/articles/${articleId}/comments`, { content, name })
})

export const deleteComment = createAsyncThunk('comments/delete', async (id) => {
  await api.del(`/comments/${id}`)
  return id
})

export const requireAuth = () => {
  const token = localStorage.getItem('token') || ''
  if (!token) throw new Error('AUTH_REQUIRED')
}

export const fetchMe = createAsyncThunk('auth/me', async () => {
  const token = localStorage.getItem('token') || ''
  if (!token) return null
  try {
    return await api.get('/auth/me')
  } catch {
    return null
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState: { token: localStorage.getItem('token') || '', user: null },
  reducers: {
    setToken(state, action) { state.token = action.payload; localStorage.setItem('token', state.token) },
    signOut(state) { state.token = ''; state.user = null; localStorage.removeItem('token') },
  },
  extraReducers: builder => {
    builder.addCase(fetchMe.fulfilled, (state, action) => { state.user = action.payload })
  }
})

const categoriesSlice = createSlice({
  name: 'categories',
  initialState: { items: [], selected: '' },
  reducers: { select(state, action) { state.selected = action.payload } },
  extraReducers: builder => {
    builder
      .addCase(fetchCategories.fulfilled, (state, action) => { state.items = action.payload })
      .addCase(createCategory.fulfilled, (state, action) => { if (!state.items.includes(action.payload)) state.items.push(action.payload) })
  }
})

const articlesSlice = createSlice({
  name: 'articles',
  initialState: { items: [], loading: false, error: '' },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchArticles.pending, (state) => { state.loading = true; state.error = '' })
      .addCase(fetchArticles.fulfilled, (state, action) => { state.items = action.payload; state.loading = false })
      .addCase(fetchArticles.rejected, (state, action) => { state.loading = false; state.error = action.error.message || 'Error' })
      .addCase(postArticle.fulfilled, (state, action) => { state.items.unshift(action.payload) })
      .addCase(deleteArticle.fulfilled, (state, action) => { state.items = state.items.filter(a => a.id !== action.payload) })
  }
})

const commentsSlice = createSlice({
  name: 'comments',
  initialState: { items: [], loading: false, error: '' },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchComments.pending, (state) => { state.loading = true; state.error = '' })
      .addCase(fetchComments.fulfilled, (state, action) => { state.items = action.payload; state.loading = false })
      .addCase(fetchComments.rejected, (state, action) => { state.loading = false; state.error = action.error.message || 'Error' })
      .addCase(postComment.fulfilled, (state, action) => { state.items.push(action.payload) })
      .addCase(deleteComment.fulfilled, (state, action) => { state.items = state.items.filter(c => c.id !== action.payload) })
  }
})

export const { setToken, signOut } = authSlice.actions
export const { select } = categoriesSlice.actions

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    categories: categoriesSlice.reducer,
    articles: articlesSlice.reducer,
    comments: commentsSlice.reducer,
  }
})



import { configureStore, createSlice, createAsyncThunk } from '@reduxjs/toolkit'

export const fetchCategories = createAsyncThunk('categories/fetch', async () => {
  const res = await fetch('/api/categories')
  if (!res.ok) throw new Error('Failed to load categories')
  return await res.json()
})

export const createCategory = createAsyncThunk('categories/create', async (name) => {
  const token = localStorage.getItem('token') || ''
  const res = await fetch('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ name }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create category')
  return data.name
})

export const fetchArticles = createAsyncThunk('articles/fetch', async (category) => {
  const qs = category ? `?category=${encodeURIComponent(category)}` : ''
  const res = await fetch('/api/articles' + qs)
  if (!res.ok) throw new Error('Failed to load articles')
  return await res.json()
})

export const postArticle = createAsyncThunk('articles/post', async ({ title, content, category, imageUrl }) => {
  const token = localStorage.getItem('token') || ''
  const res = await fetch('/api/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ title, content, category, imageUrl }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to post')
  return data
})

export const uploadImage = createAsyncThunk('upload/image', async (file) => {
  const formData = new FormData()
  formData.append('image', file)
  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to upload')
  return data
})

export const deleteArticle = createAsyncThunk('articles/delete', async (id) => {
  const token = localStorage.getItem('token') || ''
  const res = await fetch(`/api/articles/${id}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to delete')
  return id
})

export const fetchComments = createAsyncThunk('comments/fetch', async (articleId) => {
  const res = await fetch(`/api/articles/${articleId}/comments`)
  if (!res.ok) throw new Error('Failed to load comments')
  return await res.json()
})

export const postComment = createAsyncThunk('comments/post', async ({ articleId, content, name }) => {
  const token = localStorage.getItem('token') || ''
  const res = await fetch(`/api/articles/${articleId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ content, name }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to post comment')
  return data
})

export const deleteComment = createAsyncThunk('comments/delete', async (id) => {
  const token = localStorage.getItem('token') || ''
  const res = await fetch(`/api/comments/${id}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to delete comment')
  return id
})

export const requireAuth = () => {
  const token = localStorage.getItem('token') || ''
  if (!token) throw new Error('AUTH_REQUIRED')
}

export const fetchMe = createAsyncThunk('auth/me', async () => {
  const token = localStorage.getItem('token') || ''
  if (!token) return null
  const res = await fetch('/api/auth/me', { headers: { authorization: `Bearer ${token}` } })
  if (!res.ok) return null
  return await res.json()
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



import { useEffect, useState } from 'react'
import { Routes, Route, Link, useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchArticles, fetchCategories, postArticle, select, setToken, createCategory, fetchMe, requireAuth, signOut, uploadImage, deleteArticle, fetchComments, postComment, deleteComment } from './store.js'
import './App.css'
import api from './baseApi.js'

// AdminForm removed (replaced by phone/password + bearer token flow)

function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card" style={{ width: 420, maxWidth: '90%', textAlign: 'left', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button onClick={onClose} aria-label="Close" style={{ background: '#eee', color: '#333', border: '1px solid #ddd' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function PublicList() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { items, loading, error } = useSelector(s => s.articles)
  const { items: cats, selected } = useSelector(s => s.categories)
  const auth = useSelector(s => s.auth)

  useEffect(() => { dispatch(fetchCategories()) }, [dispatch])
  useEffect(() => { dispatch(fetchArticles(selected)) }, [dispatch, selected])

  // Group by category for display
  const grouped = items.reduce((acc, a) => {
    const key = a.category || 'Uncategorized'
    acc[key] = acc[key] || []
    acc[key].push(a)
    return acc
  }, {})

  return (
    <div className="card" style={{ textAlign: 'left', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
      <aside style={{ borderRight: '1px solid #e0e0e0', paddingRight: 12 }}>
        <details open>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Categories</summary>
          <ul>
            <li key="all"><a href="#" onClick={(e)=>{e.preventDefault(); dispatch(select(''))}}>All</a></li>
            {cats.map(c => (
              <li key={c}><a href="#" onClick={(e)=>{e.preventDefault(); dispatch(select(c))}}>{c}</a></li>
            ))}
          </ul>
        </details>
      </aside>
      <div>
        <h2>Articles</h2>
        <div style={{ margin: '8px 0' }}>
          <label style={{ marginRight: 8 }}>Filter:</label>
          <select value={selected} onChange={e => dispatch(select(e.target.value))}>
            <option value="">All</option>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {Object.keys(grouped)
          .filter(k => !selected || k === selected)
          .map(cat => (
            <section key={cat} style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '12px 0 6px' }}>{cat}</h3>
              <ul>
                {grouped[cat].map(a => (
                  <li key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                    <div>
                      <a href="#" onClick={(e) => { e.preventDefault(); navigate(`/articles/${a.id}`) }}>{a.title}</a>
                      <span style={{ color: '#888', marginLeft: 8 }}>
                        by {a.authorName || 'Unknown'} • {new Date(a.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {auth.user?.role === 'admin' && (
                      <button
                        className="btn-danger"
                        onClick={async (e) => {
                          e.preventDefault()
                          if (window.confirm('Are you sure you want to delete this article?')) {
                            try {
                              await dispatch(deleteArticle(a.id)).unwrap()
                            } catch (err) {
                              alert(err.message || 'Failed to delete article')
                            }
                          }
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {grouped[cat].length === 0 && !loading && (
                <p className="muted" style={{ marginTop: 8 }}>No articles in this category yet.</p>
              )}
            </section>
          ))}
        {!loading && !error && items.length === 0 && (
          <p className="muted">No articles yet. Be the first to post!</p>
        )}
      </div>
    </div>
  )
}

function ArticleView() {
  const { id } = useParams()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [commentContent, setCommentContent] = useState('')
  const [guestName, setGuestName] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const auth = useSelector(s => s.auth)
  const { items: comments, loading: commentsLoading } = useSelector(s => s.comments)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError('')
    fetch(`/api/articles/${id}`)
      .then(res => { if (!res.ok) throw new Error('Failed to load'); return res.json() })
      .then(setArticle)
      .catch(err => setError(err.message || 'Error'))
      .finally(() => setLoading(false))
    
    // Fetch comments
    dispatch(fetchComments(id))
  }, [id, dispatch])

  const handleDeleteArticle = async () => {
    if (!window.confirm('Are you sure you want to delete this article?')) return
    try {
      await dispatch(deleteArticle(id)).unwrap()
      navigate('/')
    } catch (err) {
      setError(err.message || 'Failed to delete article')
    }
  }

  const handlePostComment = async (e) => {
    e.preventDefault()
    if (!commentContent.trim()) return
    try {
      setPostingComment(true)
      await dispatch(postComment({ articleId: id, content: commentContent, name: auth.user ? undefined : guestName || 'Guest' })).unwrap()
      setCommentContent('')
      setGuestName('')
    } catch (err) {
      setError(err.message || 'Failed to post comment')
    } finally {
      setPostingComment(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return
    try {
      await dispatch(deleteComment(commentId)).unwrap()
    } catch (err) {
      setError(err.message || 'Failed to delete comment')
    }
  }

  if (!id) return null
  return (
    <div className="card" style={{ textAlign: 'left' }}>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {article && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0 }}>{article.title}</h2>
              <p style={{ color: '#666', margin: '4px 0' }}>
                By {article.authorName || 'Unknown'} • {new Date(article.createdAt).toLocaleString()}
              </p>
            </div>
            {auth.user?.role === 'admin' && (
              <button className="btn-danger" onClick={handleDeleteArticle}>
                Delete Article
              </button>
            )}
          </div>
          
          {article.imageUrl && (
            <div style={{ marginBottom: 16 }}>
              <img 
                src={article.imageUrl} 
                alt={article.title}
                style={{ 
                  maxWidth: '100%', 
                  height: 'auto', 
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
            </div>
          )}
          
          <p style={{ whiteSpace: 'pre-wrap', marginBottom: 32 }}>{article.content}</p>
          
          {/* Comments Section */}
          <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: 16 }}>
            <h3>Comments ({comments.length})</h3>
            
            <form onSubmit={handlePostComment} style={{ marginBottom: 16 }}>
              {!auth.user && (
                <div style={{ marginBottom: 8 }}>
                  <label>
                    <div>Name (optional)</div>
                    <input 
                      value={guestName}
                      onChange={e => setGuestName(e.target.value)}
                      placeholder="Your name or leave blank for Guest"
                      style={{ width: '100%', padding: 8 }}
                    />
                  </label>
                  <div className="muted" style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                    If left empty, your comment will appear as <strong>Guest</strong>.
                  </div>
                </div>
              )}
              <textarea
                value={commentContent}
                onChange={e => setCommentContent(e.target.value)}
                placeholder="Write a comment..."
                rows={3}
                style={{ 
                  width: '100%', 
                  padding: 8, 
                  border: '1px solid #ddd', 
                  borderRadius: 4,
                  resize: 'vertical'
                }}
              />
              <button type="submit" className="btn-primary" disabled={postingComment || !commentContent.trim()} style={{ marginTop: 8 }}>
                {postingComment ? 'Posting…' : 'Post Comment'}
              </button>
            </form>
            
            {commentsLoading && <p>Loading comments...</p>}
            {!commentsLoading && comments.length === 0 && (
              <p className="muted">No comments yet. Start the conversation.</p>
            )}
            {comments.map(comment => (
              <div key={comment.id} style={{ 
                border: '1px solid #e0e0e0', 
                borderRadius: 8, 
                padding: 12, 
                marginBottom: 12,
                background: '#f9f9f9'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong>{comment.authorName || 'Anonymous'}</strong>
                    <span style={{ color: '#666', marginLeft: 8 }}>
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {auth.user?.role === 'admin' && (
                    <button className="btn-danger" onClick={() => handleDeleteComment(comment.id)} style={{ fontSize: '12px', padding: '4px 8px' }}>
                      Delete
                    </button>
                  )}
                </div>
                <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{comment.content}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function SignInPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const dispatch = useDispatch()

  async function submit(path) {
    setError('')
    if (path === 'signup' && !name) { setError('name is required'); return }
    const res = await fetch(`/api/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(path === 'signup' ? { name, phone, password } : { phone, password }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Error'); return }
    if (data.token) dispatch(setToken(data.token))
    await dispatch(fetchMe())
    navigate('/post')
  }

  return (
    <div className="card" style={{ textAlign: 'left' }}>
      <h2>Sign in / Sign up</h2>
      <div style={{ marginBottom: 8 }}>
        <label>Name (for Sign up)</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={{ display: 'block', width: '100%', padding: 8 }} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>Phone</label>
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 0912..." style={{ display: 'block', width: '100%', padding: 8 }} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" style={{ display: 'block', width: '100%', padding: 8 }} />
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-primary" onClick={() => submit('signin')}>Sign in</button>
        <button className="btn-primary" onClick={() => submit('signup')}>Sign up</button>
      </div>
    </div>
  )
}

function PostPage() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('')
  const [error, setError] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [resultOpen, setResultOpen] = useState(false)
  const [resultSuccess, setResultSuccess] = useState(false)
  const [resultMsg, setResultMsg] = useState('')
  const [createdId, setCreatedId] = useState(null)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const cats = useSelector(s => s.categories.items)
  const [newCat, setNewCat] = useState('')
  const auth = useSelector(s => s.auth)

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    setUploading(true)
    setError('')
    try {
      const result = await dispatch(uploadImage(file)).unwrap()
      setImageUrl(result.url)
      setImageFile(file)
    } catch (err) {
      setError(err.message || 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    try {
      requireAuth()
      const data = await dispatch(postArticle({ title, content, category, imageUrl })).unwrap()
      setCreatedId(data.id)
      setResultSuccess(true)
      setResultMsg('Article published successfully')
      setResultOpen(true)
    } catch (err) {
      if (err.message === 'AUTH_REQUIRED') { navigate('/signin'); return }
      setError(err.message || 'Error')
      setResultSuccess(false)
      setResultMsg(err.message || 'Failed to publish')
      setResultOpen(true)
    }
  }

  return (
    <>
    <form onSubmit={submit} className="card" style={{ textAlign: 'left' }}>
      <h2>Post Article</h2>
      <div style={{ marginBottom: 8 }}>
        <label>Category</label>
        <select value={category} onChange={e => setCategory(e.target.value)} style={{ display: 'block', width: '100%', padding: 8 }}>
          <option value="">Select category</option>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {auth.user?.role === 'admin' && (
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="New category" style={{ flex: 1, padding: 8 }} />
            <button type="button" onClick={async () => { if (!newCat) return; try { await dispatch(createCategory(newCat)).unwrap(); setCategory(newCat); setNewCat('') } catch (e) { setError(e.message || 'Error') } }}>Add</button>
          </div>
        )}
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" style={{ display: 'block', width: '100%', padding: 8 }} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>Image (optional)</label>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleImageUpload}
          style={{ display: 'block', width: '100%', padding: 8 }}
        />
        {uploading && <p style={{ color: '#666', fontSize: '14px' }}>Uploading image...</p>}
        {imageUrl && (
          <div style={{ marginTop: 8 }}>
            <img 
              src={imageUrl} 
              alt="Preview" 
              style={{ 
                maxWidth: '200px', 
                height: 'auto', 
                borderRadius: 4,
                border: '1px solid #ddd'
              }}
            />
            <p style={{ color: '#666', fontSize: '12px', margin: '4px 0' }}>
              Image uploaded successfully
            </p>
          </div>
        )}
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>Content</label>
        <textarea value={content} onChange={e => setContent(e.target.value)} rows={6} placeholder="Write your article..." style={{ display: 'block', width: '100%', padding: 8 }} />
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button className="btn-primary" disabled={uploading}>Publish</button>
    </form>
    <Modal 
      open={resultOpen}
      onClose={() => { 
        setResultOpen(false)
        if (resultSuccess && createdId) navigate(`/articles/${createdId}`)
      }} 
      title={resultSuccess ? 'Success' : 'Error'}
    >
      <p style={{ marginTop: 0 }}>{resultMsg}</p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={() => { setResultOpen(false); if (resultSuccess && createdId) navigate(`/articles/${createdId}`) }}>Close</button>
        {resultSuccess && (
          <button className="btn-primary" onClick={() => navigate(`/articles/${createdId}`)}>View article</button>
        )}
      </div>
    </Modal>
    </>
  )
}

function AdminPage() {
  const [createName, setCreateName] = useState('')
  const [createPhone, setCreatePhone] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [promotePhone, setPromotePhone] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const auth = useSelector(s => s.auth)
  const navigate = useNavigate()

  useEffect(() => {
    // Only admins may access this page
    if (!auth.user) return
    if ((auth.user.role || 'user') !== 'admin') navigate('/')
  }, [auth.user, navigate])

  async function createAdmin(e) {
    e.preventDefault()
    setErr(''); setMsg('')
    try {
      const data = await api.post('/admin/create', { name: createName, phone: createPhone, password: createPassword })
      setMsg(`Created admin: ${data.name || data.phone}`)
      setCreateName(''); setCreatePhone(''); setCreatePassword('')
    } catch (e) {
      setErr(e.message || 'Failed to create admin')
    }
  }

  async function promote(e) {
    e.preventDefault()
    setErr(''); setMsg('')
    try {
      const data = await api.post('/admin/promote', { phone: promotePhone })
      setMsg(`Promoted to admin: ${data.phone}`)
      setPromotePhone('')
    } catch (e) {
      setErr(e.message || 'Failed to promote')
    }
  }

  return (
    <div className="card" style={{ textAlign: 'left' }}>
      <h2>Admin Panel</h2>
      <p className="muted" style={{ marginTop: -6 }}>Create a new admin or promote an existing user.</p>
      {msg && <p style={{ color: 'green' }}>{msg}</p>}
      {err && <p style={{ color: 'red' }}>{err}</p>}

      <section style={{ marginTop: 12 }}>
        <h3 style={{ marginBottom: 8 }}>Create Admin</h3>
        <form onSubmit={createAdmin} style={{ display: 'grid', gap: 8, maxWidth: 420 }}>
          <label>
            <div>Name</div>
            <input value={createName} onChange={e => setCreateName(e.target.value)} placeholder="Admin name" style={{ width: '100%', padding: 8 }} />
          </label>
          <label>
            <div>Phone</div>
            <input value={createPhone} onChange={e => setCreatePhone(e.target.value)} placeholder="e.g. 0912..." style={{ width: '100%', padding: 8 }} />
          </label>
          <label>
            <div>Password</div>
            <input type="password" value={createPassword} onChange={e => setCreatePassword(e.target.value)} placeholder="Password" style={{ width: '100%', padding: 8 }} />
          </label>
          <button className="btn-primary">Create Admin</button>
        </form>
      </section>

      <section style={{ marginTop: 20 }}>
        <h3 style={{ marginBottom: 8 }}>Promote Existing User</h3>
        <form onSubmit={promote} style={{ display: 'grid', gap: 8, maxWidth: 420 }}>
          <label>
            <div>User Phone</div>
            <input value={promotePhone} onChange={e => setPromotePhone(e.target.value)} placeholder="e.g. 0912..." style={{ width: '100%', padding: 8 }} />
          </label>
          <button className="btn-primary">Promote</button>
        </form>
      </section>
    </div>
  )
}

function App() {
  const dispatch = useDispatch()
  const auth = useSelector(s => s.auth)
  const [showLogin, setShowLogin] = useState(false)
  const [showSignup, setShowSignup] = useState(false)
  const [showAdminToken, setShowAdminToken] = useState(false)
  const [authErr, setAuthErr] = useState('')
  const [loginPhone, setLoginPhone] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [signupName, setSignupName] = useState('')
  const [signupPhone, setSignupPhone] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [adminTokenInput, setAdminTokenInput] = useState('')
  const [adminTokenErr, setAdminTokenErr] = useState('')
  useEffect(() => { dispatch(fetchMe()) }, [dispatch])

  async function doSignin() {
    setAuthErr('')
    const res = await fetch(`/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: loginPhone, password: loginPassword }),
    })
    const data = await res.json()
    if (!res.ok) { setAuthErr(data.error || 'Error'); return }
    if (data.token) dispatch(setToken(data.token))
    await dispatch(fetchMe())
    setShowLogin(false)
  }

  async function doSignup() {
    setAuthErr('')
    if (!signupName) { setAuthErr('name is required'); return }
    const res = await fetch(`/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: signupName, phone: signupPhone, password: signupPassword }),
    })
    const data = await res.json()
    if (!res.ok) { setAuthErr(data.error || 'Error'); return }
    // After signup, sign in directly
    const res2 = await fetch(`/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: signupPhone, password: signupPassword }),
    })
    const data2 = await res2.json()
    if (!res2.ok) { setAuthErr(data2.error || 'Error'); return }
    if (data2.token) dispatch(setToken(data2.token))
    await dispatch(fetchMe())
    setShowSignup(false)
  }

  async function doAdminTokenSignin() {
    setAdminTokenErr('')
    try {
      const res = await fetch(`/api/auth/admin-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: adminTokenInput })
      })
      const data = await res.json()
      if (!res.ok) { setAdminTokenErr(data.error || 'Error'); return }
      if (data.token) dispatch(setToken(data.token))
      await dispatch(fetchMe())
      setShowAdminToken(false)
      setAdminTokenInput('')
    } catch (e) {
      setAdminTokenErr(e.message || 'Error')
    }
  }

  return (
    <div className="container">
      <header style={{ background: '#2e7d32', color: 'white', padding: '12px 16px', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>ZareShop Articles</h1>
        <nav style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <Link to="/" style={{ color: 'white' }}>Articles</Link>
            {auth.user ? (
              <Link to="/post" style={{ color: 'white' }}>Post</Link>
            ) : (
              <button className="btn-primary" onClick={() => { setAuthErr(''); setShowSignup(true) }}>Post</button>
            )}
            {auth.user?.role === 'admin' && (
              <Link to="/admin" style={{ color: 'white' }}>Admin</Link>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {auth.user ? (
              <>
                <span style={{ opacity: 0.9 }}>{auth.user.name || auth.user.phone}</span>
                <button className="btn-primary" onClick={() => { dispatch(signOut()); }}>Logout</button>
              </>
            ) : (
              <>
                <button className="btn-primary" onClick={() => { setAuthErr(''); setShowLogin(true) }}>Login</button>
                <button className="btn-primary" onClick={() => { setAuthErr(''); setShowSignup(true) }}>Sign up</button>
                <button onClick={() => { setAdminTokenErr(''); setShowAdminToken(true) }} title="Sign in with admin token">Admin token</button>
              </>
            )}
          </div>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<PublicList />} />
        <Route path="/articles/:id" element={<ArticleView />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/post" element={<PostPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>

      {/* Auth Modals */}
      <Modal open={showLogin} onClose={() => setShowLogin(false)} title="Login">
        <div style={{ display: 'grid', gap: 8 }}>
          <label>
            <div>Phone</div>
            <input value={loginPhone} onChange={e => setLoginPhone(e.target.value)} placeholder="e.g. 0912..." style={{ width: '100%', padding: 8 }} />
          </label>
          <label>
            <div>Password</div>
            <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Password" style={{ width: '100%', padding: 8 }} />
          </label>
          {authErr && <p style={{ color: 'red' }}>{authErr}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowLogin(false)}>Cancel</button>
            <button className="btn-primary" onClick={doSignin}>Login</button>
          </div>
        </div>
      </Modal>

      <Modal open={showSignup} onClose={() => setShowSignup(false)} title="Sign up">
        <div style={{ display: 'grid', gap: 8 }}>
          <label>
            <div>Name</div>
            <input value={signupName} onChange={e => setSignupName(e.target.value)} placeholder="Your name" style={{ width: '100%', padding: 8 }} />
          </label>
          <label>
            <div>Phone</div>
            <input value={signupPhone} onChange={e => setSignupPhone(e.target.value)} placeholder="e.g. 0912..." style={{ width: '100%', padding: 8 }} />
          </label>
          <label>
            <div>Password</div>
            <input type="password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} placeholder="Password" style={{ width: '100%', padding: 8 }} />
          </label>
          {authErr && <p style={{ color: 'red' }}>{authErr}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowSignup(false)}>Cancel</button>
            <button className="btn-primary" onClick={doSignup}>Create account</button>
          </div>
        </div>
      </Modal>

      <Modal open={showAdminToken} onClose={() => setShowAdminToken(false)} title="Admin Token">
        <div style={{ display: 'grid', gap: 8 }}>
          <label>
            <div>Token</div>
            <input value={adminTokenInput} onChange={e => setAdminTokenInput(e.target.value)} placeholder="Paste admin token" style={{ width: '100%', padding: 8 }} />
          </label>
          {adminTokenErr && <p style={{ color: 'red' }}>{adminTokenErr}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowAdminToken(false)}>Cancel</button>
            <button className="btn-primary" onClick={doAdminTokenSignin} disabled={!adminTokenInput.trim()}>Sign in</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default App

import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";

// For Vercel deployment, we'll use in-memory storage
// In production, you should use a proper database like MongoDB, PostgreSQL, or Vercel KV
let db = {
  articles: [],
  users: [],
  sessions: [],
  categories: [],
  comments: []
};

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dddiaaofj',
  api_key: process.env.CLOUDINARY_API_KEY || '868597764483733',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'dT-9mngHlwVBIIiLUvAEAvKK9X0'
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

function readDatabase() {
  return db;
}

function writeDatabase(newDb) {
  db = { ...newDb };
}

const app = express();
app.use(cors());
app.use(express.json());

function getAuthUser(req) {
  const db = readDatabase();
  const auth = req.header("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const session = db.sessions.find(s => s.token === token);
  if (!session) return null;
  const user = db.users.find(u => u.id === session.userId);
  return user || null;
}

// Auth endpoints
app.post("/api/auth/signup", (req, res) => {
  const { phone, password, name } = req.body || {};
  if (!phone || !password || !name) return res.status(400).json({ error: "name, phone and password required" });
  const db = readDatabase();
  const exists = db.users.find(u => u.phone === String(phone));
  if (exists) return res.status(409).json({ error: "phone already registered" });
  const isFirst = db.users.length === 0;
  const user = { id: uuidv4(), phone: String(phone), name: String(name), password: String(password), role: isFirst ? 'admin' : 'user' };
  db.users.push(user);
  writeDatabase(db);
  res.status(201).json({ id: user.id, phone: user.phone, name: user.name });
});

app.post("/api/auth/signin", (req, res) => {
  const { phone, password } = req.body || {};
  if (!phone || !password) return res.status(400).json({ error: "phone and password required" });
  const db = readDatabase();
  const user = db.users.find(u => u.phone === String(phone) && u.password === String(password));
  if (!user) return res.status(401).json({ error: "invalid credentials" });
  const token = uuidv4();
  db.sessions = db.sessions.filter(s => s.userId !== user.id);
  db.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
  writeDatabase(db);
  res.json({ token, user: { id: user.id, phone: user.phone, role: user.role || 'user' } });
});

app.get('/api/auth/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ id: user.id, phone: user.phone, role: user.role || 'user' });
});

// List all articles (newest first)
app.get("/api/articles", (req, res) => {
  const db = readDatabase();
  const { category } = req.query || {};
  let list = [...db.articles];
  if (category) list = list.filter(a => (a.category || "") === String(category));
  const articles = list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  res.json(articles);
});

// Get single article
app.get("/api/articles/:id", (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  const article = db.articles.find(a => a.id === id);
  if (!article) return res.status(404).json({ error: "Article not found" });
  res.json(article);
});

// Image upload endpoint
app.post("/api/upload", upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }
    
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { resource_type: "auto" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });
    
    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

// Create article (simple admin-less endpoint; protect later if needed)
app.post("/api/articles", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const { title, content, category, imageUrl } = req.body || {};
  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required" });
  }
  const db = readDatabase();
  const article = {
    id: uuidv4(),
    title: String(title).trim(),
    content: String(content).trim(),
    createdAt: new Date().toISOString(),
    authorId: user.id,
    authorName: user.name || user.phone,
    category: category ? String(category) : "",
    imageUrl: imageUrl || "",
  };
  db.articles.push(article);
  writeDatabase(db);
  res.status(201).json(article);
});

// Delete article (admin only)
app.delete("/api/articles/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if ((user.role || 'user') !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  
  const { id } = req.params;
  const db = readDatabase();
  const articleIndex = db.articles.findIndex(a => a.id === id);
  if (articleIndex === -1) return res.status(404).json({ error: "Article not found" });
  
  db.articles.splice(articleIndex, 1);
  // Also delete related comments
  db.comments = db.comments.filter(c => c.articleId !== id);
  writeDatabase(db);
  res.json({ message: "Article deleted successfully" });
});

// Comments endpoints
app.get("/api/articles/:id/comments", (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  const comments = db.comments.filter(c => c.articleId === id).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  res.json(comments);
});

app.post("/api/articles/:id/comments", (req, res) => {
  const authUser = getAuthUser(req);
  const { id } = req.params;
  const { content, name } = req.body || {};
  if (!content) return res.status(400).json({ error: "Comment content is required" });
  
  const db = readDatabase();
  const article = db.articles.find(a => a.id === id);
  if (!article) return res.status(404).json({ error: "Article not found" });
  
  const comment = {
    id: uuidv4(),
    articleId: id,
    content: String(content).trim(),
    authorId: authUser ? authUser.id : null,
    authorName: authUser ? (authUser.name || authUser.phone) : (name ? String(name).trim() : 'Guest'),
    createdAt: new Date().toISOString(),
  };
  
  db.comments.push(comment);
  writeDatabase(db);
  res.status(201).json(comment);
});

app.delete("/api/comments/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if ((user.role || 'user') !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  
  const { id } = req.params;
  const db = readDatabase();
  const commentIndex = db.comments.findIndex(c => c.id === id);
  if (commentIndex === -1) return res.status(404).json({ error: "Comment not found" });
  
  db.comments.splice(commentIndex, 1);
  writeDatabase(db);
  res.json({ message: "Comment deleted successfully" });
});

// Categories
app.get("/api/categories", (req, res) => {
  const db = readDatabase();
  res.json(db.categories);
});

app.post("/api/categories", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if ((user.role || 'user') !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: "name required" });
  const db = readDatabase();
  const value = String(name).trim();
  if (!db.categories.includes(value)) db.categories.push(value);
  writeDatabase(db);
  res.status(201).json({ name: value });
});

// Export the app for Vercel
export default app;

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}



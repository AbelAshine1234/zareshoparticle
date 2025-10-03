import express from "express";
import cors from "cors";

// Modular routes (Prisma-backed)
import authRouter from "./routes/auth.js";
import articlesRouter from "./routes/articles.js";
import commentsRouter from "./routes/comments.js";
import categoriesRouter from "./routes/categories.js";
import uploadRouter from "./routes/upload.js";
import adminRouter from "./routes/admin.js";

const app = express();
app.use(cors());
app.use(express.json());

// Mount routes
app.use("/api/auth", authRouter);
app.use("/api/articles", articlesRouter);
app.use("/api", commentsRouter); // /comments, /articles/:id/comments
app.use("/api/categories", categoriesRouter);
app.use("/api", uploadRouter); // /upload
app.use("/api/admin", adminRouter);

// Export the app for Vercel
export default app;

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}



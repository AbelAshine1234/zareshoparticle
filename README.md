# ZareShop Articles

Quick React (Vite) + Node/Express JSON API to create and view simple articles.

## Local Development

- Requirements: Node 18+

### Install deps

```bash
# client
cd client && npm install

# server
cd ../server && npm install
```

### Run

```bash
# Start server (port 4000)
cd server && npm run dev

# In another terminal, start client (port 5173/5174)
cd ../client && npm run dev
```

The client proxies `/api` to `http://localhost:4000`.

## API

- GET `/api/articles` → list articles
- GET `/api/articles/:id` → read one
- POST `/api/articles` `{ title, content, category, imageUrl }` → create (requires `Authorization: Bearer <token>`)
- DELETE `/api/articles/:id` → delete article (admin only, requires `Authorization: Bearer <token>`)
- POST `/api/upload` → upload image to Cloudinary (multipart/form-data with 'image' field)
- GET `/api/articles/:id/comments` → get comments for article
- POST `/api/articles/:id/comments` `{ content }` → post comment (requires `Authorization: Bearer <token>`)
- DELETE `/api/comments/:id` → delete comment (admin only, requires `Authorization: Bearer <token>`)

### Auth

- POST `/api/auth/signup` `{ name, phone, password }` → create account (name is required)
- POST `/api/auth/signin` `{ phone, password }` → `{ token }`
- GET `/api/auth/me` → `{ id, phone, role }` (requires `Authorization`)

Client routes:
- `/` list of articles (shows author info, admin delete buttons)
- `/articles/:id` article detail (shows image, comments, admin controls)
- `/signin` sign-in/sign-up with phone/password
- `/post` create article with image upload (requires token)

## Features

### Image Upload
- Upload images using Cloudinary integration
- Images are displayed in articles
- Preview during article creation

### Comments System
- Users can post comments on articles (requires authentication)
- Comments show author name and timestamp
- Admins can delete any comment

### Admin Features
- Delete articles (admin only)
- Delete comments (admin only)
- Create new categories
- All admin actions require admin role

### Author Information
- Articles show author name and creation date
- Comments show author name and timestamp

## Admin setup

Two ways to create an admin:

1) First user becomes admin automatically
- Start the server: `cd server && npm run dev`
- In the app, open Sign in and Sign up with name, phone, password

2) Create an admin user via command (one step)
- In `server/`:

```bash
npm run create:admin -- "Admin Name" 0912345678 mypassword
```

3) Promote an existing user by phone
- Ensure the user exists (sign up first). Then run in `server/`:

```bash
npm run make:admin -- 0986064500
```

Verify role:

```bash
# sign in to get token
curl -s -X POST http://localhost:4000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"phone":"0986064500","password":"yourpass"}'

# replace TOKEN below
curl -s http://localhost:4000/api/auth/me -H "Authorization: Bearer TOKEN"
```

Notes:
- Only admins can create categories.
- Any signed-in user can post articles, and posting requires a valid token.

### Admin token

The POST endpoint requires header `x-admin-token` that matches the token stored in `server/db.json`.

Generate or view the token:

```bash
cd server
npm run init:admin
```

Copy the printed token and paste it into the Admin Token field in the UI.

## Deployment (free)

- Client: deploy to Vercel or Netlify (static).
- Server: deploy to Render free web service or Railway free plan.

Minimal steps:
- Push this repo to GitHub.
- Vercel: import the repo, set root to `client`, build command `npm run build`, output `dist`.
- Render: new Web Service from same repo, root `server`, build command `npm install`, start command `node index.js`.

Tip: Optionally add simple auth (basic token) on POST before going public.

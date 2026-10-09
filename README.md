# Exam Hall Seating Allocator — Frontend

The modern web user interface for the **Exam Hall Seating Allocator**, providing intuitive workflows for academic administrators and students. Features interactive seating allocation wizards, room grid visualizations, printable PDF downloads, and academic management dashboards.

---

## 🚀 Tech Stack

- **Framework**: React 18+
- **Bundler & Dev Server**: Vite
- **Routing**: React Router DOM (v7)
- **HTTP Client**: Axios (with centralized interceptors & JWT token handling)
- **Icons**: Lucide React
- **Styling**: Modern vanilla CSS with responsive design system

---

## 📋 Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

---

## 🛠️ Installation & Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd exam-seating-frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a local `.env.local` file from the provided `.env.example`:
   ```bash
   cp .env.example .env.local
   ```

   Configure the backend API URL:
   ```env
   # Local Spring Boot backend
   VITE_API_BASE_URL=http://localhost:8083
   ```
   *(Note: If `VITE_API_BASE_URL` is omitted, the frontend automatically defaults to `http://localhost:8083`).*

---

## 💻 Running Locally

### Development Server:
Start Vite dev server with hot module replacement (HMR):
```bash
npm run dev
```
The application will be accessible at: **`http://localhost:5173`**

### Production Build:
Compile and optimize assets for deployment:
```bash
npm run build
```
The production bundle will be generated in the `dist/` directory.

### Preview Production Build:
Locally preview the generated production build:
```bash
npm run preview
```

---

## 🔌 Connecting to the Backend

The frontend communicates with the Spring Boot backend through the centralized API client in [`src/services/api.js`](src/services/api.js).
- **Authentication**: JWT tokens are automatically stored in `localStorage` upon login and attached as `Authorization: Bearer <token>` headers to all outgoing requests.
- **Session Expiration**: Automatic 401 response interception clears expired tokens and redirects users gracefully.
- **Configurable Base URL**: Reads `import.meta.env.VITE_API_BASE_URL`.

---

## ☁️ Deployment Guide (Vercel)

This frontend repository is optimized for one-click deployment on **Vercel**:

1. **Push to GitHub**:
   Push this `exam-seating-frontend` repository to your GitHub account.
2. **Import Project into Vercel**:
   - Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
   - Select the `exam-seating-frontend` repository.
3. **Configure Build Settings**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Configure Environment Variables**:
   Add the following environment variable in the Vercel dashboard:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://<your-backend-app>.onrender.com` (Your deployed Render backend URL)
5. **Deploy**:
   Click **Deploy**. Vercel will build and host your frontend globally with automatic HTTPS.

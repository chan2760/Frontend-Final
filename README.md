# Frontend-Final

React + Vite frontend for the library borrow system.

## Source Code
Main app code is under:
- `src/components`
- `src/contexts`
- `src/middleware`

## Local Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create env file:
   ```bash
   cp .env.example .env
   ```
3. Set backend URL in `.env`:
   ```env
   VITE_API_URL=http://localhost:3000
   ```
4. Start dev server:
   ```bash
   npm run dev
   ```

## Build
```bash
npm run build
```

## Deploy (Static Hosting: Vercel/Netlify)
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable:
  - `VITE_API_URL=https://your-backend-domain.com`

## Deploy (Docker)
```bash
docker build -t frontend-final .
docker run -d -p 8080:80 --name frontend-final frontend-final
```

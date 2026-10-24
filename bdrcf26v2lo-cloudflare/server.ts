import 'dotenv/config';
import { enableLocalDatabase } from './src/db/local';
enableLocalDatabase();
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './src/app';
import { requestContext } from './src/context/requestContext';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  app.use((req: any, res: any, next: any) => {
    res.removeHeader('X-Frame-Options');
    res.setHeader('Access-Control-Allow-Origin', '*');
    requestContext.run({ env: process.env }, () => {
      next();
    });
  });

  const distPath = path.resolve(__dirname, 'dist');
  app.use(express.static(distPath));
  
  // If not an API route, serve index.html for SPA routing
  app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });

  app.listen(Number(process.env.PORT) || 3000, '0.0.0.0', () => {
    console.log(`BDR API v1 & Web Frontend running on port ${Number(process.env.PORT) || 3000} (Cloudflare D1 backend active)`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

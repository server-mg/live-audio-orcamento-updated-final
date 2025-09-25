import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import fs from 'fs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  
  // Verificar se existe certificado HTTPS local para desenvolvimento
  const httpsConfig = (() => {
    const keyPath = path.resolve(__dirname, 'certs/key.pem');
    const certPath = path.resolve(__dirname, 'certs/cert.pem');
    
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      return {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };
    }
    return undefined; // Retorna undefined ao invés de false
  })();

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      ...(httpsConfig && { https: httpsConfig }), // Apenas adiciona https se certificados existirem
      cors: true,
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
    },
    plugins: [],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.VITE_API_TIMEOUT': JSON.stringify(env.VITE_API_TIMEOUT || '30000'),
      'process.env.VITE_DEBUG': JSON.stringify(env.VITE_DEBUG || 'false'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'es2022',
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: true,
      minify: 'terser',
      rollupOptions: {
        external: [],
        output: {
          manualChunks: {
            vendor: ['lit', 'three'],
            gemini: ['@google/genai'],
          },
        },
      },
    },
    optimizeDeps: {
      include: ['lit', 'three', '@google/genai'],
      exclude: [],
    },
    assetsInclude: ['**/*.exr'],
  };
});

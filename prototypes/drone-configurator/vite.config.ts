import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


// https://vite.dev/config/
export default defineConfig({
  base: './',
  build: { modulePreload: false, rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } } },
  plugins: [react(), {
    name: 'local-file-preview',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: html => html.replace(/<script type="module" crossorigin src=/g, '<script defer src=')
                           .replace(/<link rel="stylesheet" crossorigin href=/g, '<link rel="stylesheet" href='),
    },
  }],
  server: {host:'127.0.0.1',fs:{deny:['.env','.env.*','*.{crt,pem}','**/.git/**','**/*.local','**/*.md','**/*.py','**/design_filtered_comments.json']}},
  preview: {host:'127.0.0.1'},
})

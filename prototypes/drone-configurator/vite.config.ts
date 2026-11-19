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
  // 本机编辑预览时，把证据检索、设计对话和图像作业转给 studio:chat 服务（默认 4178 端口）。
  server: {host:'127.0.0.1',proxy:{'/api':{target:process.env.WORKBENCH_API ?? 'http://127.0.0.1:4178',changeOrigin:true,
    configure:proxy=>{proxy.on('proxyReq',request=>request.removeHeader('origin'));}}},fs:{deny:['.env','.env.*','*.{crt,pem}','**/.git/**','**/*.local','**/*.md','**/*.py','**/design_filtered_comments.json']}},
  preview: {host:'127.0.0.1'},
})

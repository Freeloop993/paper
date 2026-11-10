@echo off
chcp 65001 >nul
title 无人机RAG知识库系统

echo.
echo 🚁========================================================🚁
echo     无人机造型参数化AI生图应用 - RAG知识库系统
echo     Drone Design AI Image Generation - RAG System  
echo 🚁========================================================🚁
echo.

echo 🚀 启动RAG知识库系统...
python start_system.py

echo.
echo 👋 系统已停止，按任意键退出...
pause >nul 
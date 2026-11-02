@echo off
title MailGuard AI - Vite Frontend Dev Server
echo ========================================================
echo   MailGuard AI - React + Vite Frontend Dev Server
echo ========================================================
echo.
set "PATH=%~dp0tools\node-v20.18.0-win-x64;%PATH%"
cd frontend
echo Starting Vite Dev Server on http://localhost:5173 ...
npm run dev
pause

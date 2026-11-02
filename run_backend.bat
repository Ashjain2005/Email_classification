@echo off
title MailGuard AI - Backend API Server
echo ========================================================
echo   MailGuard AI - Backend API Server
echo ========================================================
echo.
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause

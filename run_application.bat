@echo off
title MailGuard AI - Email Security System
echo ========================================================
echo   MailGuard AI - Unified Server (API + Web Frontend)
echo ========================================================
echo.
echo Starting MailGuard AI server...
echo Opening application in your default browser...
echo.
cd /d "%~dp0backend"
start "" "http://127.0.0.1:8000"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
pause

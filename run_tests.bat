@echo off
title MailGuard AI - Automated Test Suite
echo ========================================================
echo   Running MailGuard AI Automated Test Suite (PyTest)
echo ========================================================
echo.
python -m pytest backend/tests/ -v
echo.
pause

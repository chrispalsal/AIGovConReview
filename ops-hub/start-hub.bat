@echo off
title 22nd Century AI Operations Hub
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is required. Install it from https://nodejs.org then run this again.
  echo.
  pause
  exit /b 1
)

if not exist server.js (
  echo.
  echo   server.js not found. Extract the WHOLE ops-hub folder from the zip first,
  echo   then double-click start-hub.bat inside the extracted folder.
  echo.
  pause
  exit /b 1
)

echo.
echo   Starting the 22nd Century AI Operations Hub...
echo   KEEP THIS WINDOW OPEN while presenting - closing it stops the hub.
echo.

set OPEN=1
node server.js

echo.
pause

@echo off
echo Starting Development Servers...
echo.

:: Start frontend in a new window
start "Frontend Dev Server" cmd /k "cd frontend && npm run dev"

:: Wait a moment for frontend to initialize
timeout /t 2 /nobreak > nul

:: Start backend in a new window
start "Backend Server" cmd /k "cd backend && npm run start"

echo.
echo Both servers are starting in separate windows...
echo Close those windows to stop the servers.
pause

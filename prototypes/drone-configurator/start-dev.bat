@echo off
echo Starting Drone Configurator UI...
echo Current directory: %CD%
echo.
echo Installing dependencies if needed...
call npm install
echo.
echo Starting development server...
call npm run dev
pause 
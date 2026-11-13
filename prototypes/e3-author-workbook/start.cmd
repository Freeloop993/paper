@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>&1
if errorlevel 1 goto usepython
py -3 -B -m http.server 8765 --bind 127.0.0.1
goto :eof
:usepython
python -B -m http.server 8765 --bind 127.0.0.1

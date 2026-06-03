@echo off
chcp 65001 >nul 2>&1
title HE THONG KHANG HUYNH CLOUD — Node + PHP
cd /d "%~dp0"

echo ==================================================
echo   KHOI DONG DAY DU: Node (3000) + PHP (8080)
echo ==================================================
echo.

set "NODE_CMD="
if exist "%~dp0.tools\node\node.exe" set "NODE_CMD=%~dp0.tools\node\node.exe"
if not defined NODE_CMD if exist "%~dp0node.exe" set "NODE_CMD=%~dp0node.exe"

set "PHP_EXE="
if exist "%~dp0.tools\php-run\php.exe" set "PHP_EXE=%~dp0.tools\php-run\php.exe"
if not defined PHP_EXE if exist "%~dp0.tools\php-portable\php.exe" set "PHP_EXE=%~dp0.tools\php-portable\php.exe"
if not defined PHP_EXE if exist "%~dp0.tools\php\php.exe" set "PHP_EXE=%~dp0.tools\php\php.exe"

if not defined NODE_CMD (
  echo [x] Khong tim thay node.exe trong .tools\node\
  pause
  exit /b 1
)

if not defined PHP_EXE (
  echo [x] Khong tim thay php.exe trong .tools\php-run\ hoac .tools\php-portable\
  pause
  exit /b 1
)

REM PHP — cua so rieng, port 8080
echo [+] Khoi dong PHP Portable (8080)...
start "PHP Portal 8080" /MIN cmd /c ""%PHP_EXE%" -S 127.0.0.1:8080 -t "%~dp0" & pause"

timeout /t 2 /nobreak >nul

REM Node — cua so hien tai
echo [+] Chuan bi port 3000
for /f "tokens=5" %%A in ('netstat -ano ^| findstr /R /C:":3000 .*LISTENING"') do (
  echo     Giai phong port 3000, dong PID %%A...
  taskkill /F /PID %%A >nul 2>&1
)

echo [+] Khoi dong Node.js (3000)...
echo     Admin:  http://127.0.0.1:3000/admin
echo     Health: http://127.0.0.1:3000/api/health
echo     Portal: http://127.0.0.1:8080/activate.php
echo ==================================================
echo.

"%NODE_CMD%" "%~dp0app.js"
pause
exit /b %ERRORLEVEL%

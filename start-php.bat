@echo off
chcp 65001 >nul 2>&1
cd /d "%~dp0"

set "PHP_EXE="
if exist "%~dp0.tools\php-run\php.exe" set "PHP_EXE=%~dp0.tools\php-run\php.exe"
if not defined PHP_EXE if exist "%~dp0.tools\php-portable\php.exe" set "PHP_EXE=%~dp0.tools\php-portable\php.exe"
if not defined PHP_EXE if exist "%~dp0php\php.exe" set "PHP_EXE=%~dp0php\php.exe"

if not defined PHP_EXE (
  where php >nul 2>&1 && set "PHP_EXE=php"
)

if not defined PHP_EXE (
  echo [LOI] Khong tim thay php.exe — dung .tools\php-run\php.exe
  pause
  exit /b 1
)

echo [PHP] Engine: %PHP_EXE%
echo [PHP] Portal: http://127.0.0.1:8080/activate.php
echo [PHP] Ctrl+C de dung
echo.

"%PHP_EXE%" -S 127.0.0.1:8080 -t "%~dp0"
exit /b %ERRORLEVEL%

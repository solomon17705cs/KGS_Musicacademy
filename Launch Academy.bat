@echo off
TITLE KGS Music Academy - Web Portal Launcher
echo --------------------------------------------------
echo    KGS Music Academy - Web Portal Launcher
echo --------------------------------------------------
echo.

cd /d "%~dp0"

IF NOT EXIST node_modules (
    echo Installing dependencies... (Please wait)
    call npm install
)

echo Starting the Web Portal...
echo Please wait a moment for the browser to open.
echo.
echo Close this window to stop the server when you are finished.
echo --------------------------------------------------

npx expo start --web
pause

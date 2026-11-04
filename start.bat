@echo off
setlocal enabledelayedexpansion
echo.
echo ========================================
echo  Klassic Group Corporate Hub Server
echo ========================================
echo.

cd /d "%~dp0"

set "NODE_EXE="

rem 1) Prefer a Node that is already on PATH.
for %%I in (node.exe) do if not "%%~$PATH:I"=="" set "NODE_EXE=%%~$PATH:I"

rem 2) Fall back to the Node bundled with the IDE.
if not defined NODE_EXE (
  for /d %%D in ("%USERPROFILE%\.workbuddy-ai\binaries\node\versions\*") do (
    if exist "%%~fD\node.exe" set "NODE_EXE=%%~fD\node.exe"
  )
)

if not defined NODE_EXE (
  echo [ERROR] Node.js was not found on this computer.
  echo.
  echo Install Node.js from https://nodejs.org, then run this file again.
  echo.
  pause
  exit /b 1
)

echo Using Node: !NODE_EXE!
echo Starting server at http://localhost:3000
echo Leave this window open while you use the site. Press Ctrl+C to stop.
echo.

"!NODE_EXE!" server.js

echo.
echo Server stopped (exit code %ERRORLEVEL%).
pause

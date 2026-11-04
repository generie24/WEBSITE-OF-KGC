@echo off
setlocal
echo.
echo ========================================
echo  Install the new Klassic header logo
echo ========================================
echo.

set "SRC=C:\Users\hp\Downloads\6293995666161735099.jpg"
set "DEST=%~dp0images\klassic-logo.jpg"

if not exist "%SRC%" (
  echo [ERROR] Could not find the image at:
  echo   %SRC%
  echo.
  echo If you moved or renamed it, edit the SRC line in this file
  echo to point at the .jpg, then run it again.
  echo.
  pause
  exit /b 1
)

copy /Y "%SRC%" "%DEST%" >nul
if errorlevel 1 (
  echo [ERROR] Copy failed. Is the images folder writable?
  echo.
  pause
  exit /b 1
)

echo Done. The new logo is now at:
echo   %DEST%
echo.
echo Open http://localhost:3000 and press Ctrl+Shift+R to see it.
echo You can delete this file afterwards.
echo.
pause

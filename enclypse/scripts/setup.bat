@echo off
setlocal ENABLEDELAYEDEXPANSION

set APP_NAME=enclypse
set CONDA_ENV=enclypse-node

where conda >nul 2>nul
if %errorlevel% neq 0 (
  echo [!] Miniconda or Anaconda is required. Please install it first.
  exit /b 1
)

echo [+] Creating Conda environment %CONDA_ENV%
conda env list | findstr /C:"%CONDA_ENV%" >nul 2>nul
if %errorlevel% neq 0 (
  call conda create -y -n %CONDA_ENV% nodejs=20 sqlite
)

call conda activate %CONDA_ENV%

if not exist node_modules (
  echo [+] Installing npm dependencies
  call npm install
)

pushd enclypse\backend
if not exist node_modules (
  echo [+] Installing backend dependencies
  call npm install
)
popd

start "Enclypse Backend" cmd /k "cd /d %cd%\enclypse\backend && node server.js"

ping 127.0.0.1 -n 5 >nul

start "Enclypse Desktop" cmd /k "cd /d %cd% && npm run electron:start"

echo [+] Enclypse stack launched.
endlocal

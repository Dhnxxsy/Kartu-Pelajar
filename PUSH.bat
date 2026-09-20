@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ==============================================
echo  Upload Preview Kartu Pelajar ke GitHub
echo ==============================================
echo.

if not exist .git (
  git init >nul 2>&1
)
if defined CI (
  set "GITOK=1"
)
git config user.name "admin" >nul 2>&1
git config user.email "admin@local" >nul 2>&1

git add .
git commit -m "Preview Kartu Pelajar SMK YAPIMDA 2026/2027" >nul 2>&1
if errorlevel 1 (
  echo Tidak ada perubahan baru atau commit gagal.
)

echo.
echo Repo lokal siap. Langkah berikutnya:
echo   1. Buka https://github.com/new  (nama repo: kartu-pelajar-preview, pilih PRIVATE)
echo   2. Salin URL repo, contoh: https://github.com/username/kartu-pelajar-preview.git
echo.
set /p URL=Tempel URL repositori di sini lalu Enter: 
if "!URL!"=="" (
  echo URL kosong, dibatalkan.
  pause
  exit /b 1
)

git remote remove origin >nul 2>&1
git remote add origin "!URL!"
git branch -M main
git push -u origin main

echo.
echo Selesai. Sekarang aktifkan Pages: repo -^> Settings -^> Pages -^> branch main / (root).
pause
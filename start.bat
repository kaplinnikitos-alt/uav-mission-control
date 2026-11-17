@echo off
cd /d "%~dp0"
py -m pip install -r requirements.txt
start "UAV Mission Control Server" cmd /k py server\server.py
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:5000

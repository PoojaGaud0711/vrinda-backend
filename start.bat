@echo off
echo ========================================================
echo               Vrinda Backend Server Starter
echo ========================================================

:: Check if MongoDB is already listening on port 27017
netstat -ano | findstr /R /C:":27017 .*LISTENING" >nul
if %errorlevel% neq 0 (
    echo [*] Starting local MongoDB server on port 27017...
    start "MongoDB Server" /min "C:\Program Files\MongoDB\Server\9.0\bin\mongod.exe" --dbpath "E:\vrinda-data\db" --bind_ip 127.0.0.1 --port 27017
    timeout /t 3 /nobreak >nul
) else (
    echo [*] MongoDB is already running on port 27017.
)

echo [*] Starting Node.js backend server...
node server.js

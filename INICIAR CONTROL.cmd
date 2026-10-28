@echo off
cd /d "%~dp0"
echo Abriendo el control local de Sanat Pharma...
echo Direccion: http://127.0.0.1:5173/
echo Mantenga esta ventana abierta mientras utiliza la aplicacion.
call npm run dev -- --port 5173 --strictPort
pause

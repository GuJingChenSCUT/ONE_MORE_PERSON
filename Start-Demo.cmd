@echo off
cd /d "%~dp0"
echo One More Person - three-page LOCAL blockchain rehearsal
set "OMP_NODE=node"
where node >nul 2>nul
if errorlevel 1 set "OMP_NODE=C:\Program Files\WindowsApps\OpenAI.CodexPrimaryRuntime.v26-1112-611-0_26.1112.611.0_x64__3k8sg7r9htsxt\dependencies\node\bin\node.exe"
"%OMP_NODE%" scripts/launch-rehearsal.mjs
pause

@echo off
cd %~dp0
echo Deploying contract to localhost...
npx hardhat run scripts/deploy.ts --network localhost
pause

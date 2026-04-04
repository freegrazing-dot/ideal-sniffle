@echo off
echo Removing all submodule traces...

REM Remove .gitmodules if it exists
if exist .gitmodules (
    git rm -f .gitmodules
    echo Removed .gitmodules
)

REM Remove submodule directory from git cache
git rm -rf --cached ideal-sniffle 2>nul

REM Remove from .git/config
git config --remove-section submodule.ideal-sniffle 2>nul

REM Remove from .git/modules
if exist .git\modules\ideal-sniffle (
    rmdir /s /q .git\modules\ideal-sniffle
    echo Removed .git/modules/ideal-sniffle
)

REM Stage all changes
git add .

REM Commit the cleanup
git commit -m "Remove submodule completely"

REM Force push to remote
echo.
echo About to force push to remote repository.
echo This will overwrite the remote history.
set /p confirm="Are you sure you want to continue? (y/n): "
if /i "%confirm%"=="y" (
    git push origin main --force
    echo.
    echo Cleanup complete! Try deploying again.
) else (
    echo.
    echo Cancelled. Changes are committed locally but not pushed.
    echo Run 'git push origin main --force' when ready.
)

pause

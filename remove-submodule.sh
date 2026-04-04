#!/bin/bash

echo "Removing submodule configuration..."

git config --file=.gitmodules --remove-section submodule.ideal-sniffle 2>/dev/null || true

rm -f .gitmodules

git config --remove-section submodule.ideal-sniffle 2>/dev/null || true

rm -rf .git/modules/ideal-sniffle 2>/dev/null || true

git rm -f --cached ideal-sniffle 2>/dev/null || true
rm -rf ideal-sniffle 2>/dev/null || true

git add -A

echo "Submodule removed. Ready to commit."

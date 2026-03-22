#!/bin/bash
set -e

# Skip submodule initialization
git config --global --unset-all submodule.recurse || true
git config --global --add submodule.recurse false || true

# Install dependencies and build
npm ci
npm run build

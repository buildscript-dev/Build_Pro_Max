#!/bin/bash
set -e
echo "Reverting UI/UX upgrade..."
# Pop the stash that contains the pre-upgrade state including untracked files
git stash pop -q || { echo "No stash found. Aborting."; exit 1; }
# Reinstall dependencies to match the old package.json/package-lock.json
echo "Reinstalling previous dependencies..."
npm install
echo "Undo complete. Your project is back to its original state."

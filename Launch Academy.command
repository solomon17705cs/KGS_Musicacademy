#!/bin/bash

# Navigate to the directory where this script is located
cd "$(dirname "$0")"

echo "--------------------------------------------------"
echo "   KGS Music Academy - Web Portal Launcher"
echo "--------------------------------------------------"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies... (Please wait)"
    npm install
fi

echo "Starting the Web Portal..."
echo "Please wait a moment for the browser to open."
echo ""
echo "Press Ctrl+C to stop the server when you are finished."
echo "--------------------------------------------------"

# Start expo in web mode
npx expo start --web

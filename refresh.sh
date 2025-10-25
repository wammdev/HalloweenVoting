#!/bin/bash
# Refresh script - Clears database, restarts backend and ngrok

echo "🎃 Halloween Voting System - Refresh Script"
echo "==========================================="
echo ""

# Check if backend is running
BACKEND_PID=$(pgrep -f "python.*app.py" | head -1)

if [ ! -z "$BACKEND_PID" ]; then
    echo "⏹️  Stopping backend server (PID: $BACKEND_PID)..."
    kill $BACKEND_PID
    sleep 2

    # Force kill if still running
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo "   Force stopping..."
        kill -9 $BACKEND_PID
    fi
    echo "   ✅ Backend stopped"
else
    echo "ℹ️  Backend not currently running"
fi

echo ""

# Clear database
if [ -f "backend/halloween.db" ]; then
    echo "🗑️  Deleting database..."
    rm backend/halloween.db
    echo "   ✅ Database deleted"
else
    echo "ℹ️  No database to delete"
fi

echo ""

# Clear uploads
UPLOAD_COUNT=$(ls -1 backend/uploads/ 2>/dev/null | grep -v ".gitkeep" | wc -l)
if [ $UPLOAD_COUNT -gt 0 ]; then
    echo "🗑️  Deleting $UPLOAD_COUNT uploaded file(s)..."
    find backend/uploads/ -type f ! -name ".gitkeep" -delete
    echo "   ✅ Uploads cleared"
else
    echo "ℹ️  No uploads to delete"
fi

echo ""
echo "==========================================="
echo "🚀 Starting services..."
echo "==========================================="
echo ""

# Start backend in background
echo "Starting backend server..."
cd backend
python3 app.py > /tmp/halloween_backend.log 2>&1 &
BACKEND_PID=$!
cd ..
sleep 2

if ps -p $BACKEND_PID > /dev/null 2>&1; then
    echo "   ✅ Backend started (PID: $BACKEND_PID)"
    echo "   📝 Logs: /tmp/halloween_backend.log"
else
    echo "   ❌ Backend failed to start. Check /tmp/halloween_backend.log"
    exit 1
fi

echo ""

# Check if ngrok is already running
NGROK_PID=$(pgrep -f "ngrok.*http" | head -1)
NGROK_WAS_RUNNING=false
NGROK_URL=""
NEED_TO_UPDATE_CONFIG=false

if [ ! -z "$NGROK_PID" ]; then
    echo "✅ ngrok already running (PID: $NGROK_PID)"
    NGROK_WAS_RUNNING=true

    # Get existing URL from ngrok API
    echo "   Fetching existing ngrok URL..."
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o 'https://[^"]*\.ngrok-free\.\(app\|dev\)' | head -1)

    if [ ! -z "$NGROK_URL" ]; then
        echo "   🌐 Using existing URL: $NGROK_URL"
    else
        echo "   ⚠️  Could not fetch ngrok URL from API"
    fi
else
    echo "Starting ngrok..."

    # Find ngrok command
    NGROK_CMD="ngrok"
    if [ -f "$HOME/.local/bin/ngrok" ]; then
        NGROK_CMD="$HOME/.local/bin/ngrok"
    fi

    $NGROK_CMD http 8000 > /tmp/halloween_ngrok.log 2>&1 &
    NGROK_PID=$!
    echo "   Waiting for ngrok to connect..."

    # Wait for ngrok to be ready (check API endpoint)
    MAX_WAIT=15
    WAITED=0

    while [ $WAITED -lt $MAX_WAIT ]; do
        sleep 1
        WAITED=$((WAITED + 1))

        # Try to get URL from ngrok API
        NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o 'https://[^"]*\.ngrok-free\.\(app\|dev\)' | head -1)

        if [ ! -z "$NGROK_URL" ]; then
            break
        fi
    done

    if [ -z "$NGROK_URL" ]; then
        echo "   ❌ Failed to get ngrok URL after ${MAX_WAIT}s"
        echo "   Check /tmp/halloween_ngrok.log for errors"
        echo "   You may need to start ngrok manually and update config.js"
    else
        echo "   ✅ ngrok started (PID: $NGROK_PID)"
        echo "   🌐 New URL: $NGROK_URL"
        NEED_TO_UPDATE_CONFIG=true
    fi
fi

# Update config.js and push to GitHub only if ngrok was newly started
if [ "$NEED_TO_UPDATE_CONFIG" = true ] && [ ! -z "$NGROK_URL" ]; then
    echo ""
    echo "Updating frontend configuration..."
    CONFIG_FILE="frontend/js/config.js"

    if [ -f "$CONFIG_FILE" ]; then
        # Create backup
        cp "$CONFIG_FILE" "$CONFIG_FILE.bak"

        # Update the PRODUCTION_API_URL line
        sed -i "s|const PRODUCTION_API_URL = '.*';|const PRODUCTION_API_URL = '$NGROK_URL';|" "$CONFIG_FILE"

        echo "   ✅ Updated $CONFIG_FILE"
        echo "   📋 Backup saved to $CONFIG_FILE.bak"
    else
        echo "   ⚠️  Config file not found at $CONFIG_FILE"
    fi
elif [ "$NGROK_WAS_RUNNING" = true ]; then
    echo ""
    echo "ℹ️  ngrok URL unchanged - no need to update config or push to GitHub"
fi

echo ""
echo "==========================================="
echo "📤 Deploying to GitHub..."
echo "==========================================="
echo ""

# Only push to GitHub if we updated the config (i.e., ngrok was newly started)
if [ "$NEED_TO_UPDATE_CONFIG" = true ]; then
    # Check if we're in a git repository
    if [ -d ".git" ]; then
        # Get timestamp for commit message
        TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

        # Add config file
        git add frontend/js/config.js

        # Check if there are changes to commit
        if git diff --cached --quiet; then
            echo "ℹ️  No changes to config.js - skipping git push"
        else
            echo "Committing changes..."
            git commit -m "Website refresh $TIMESTAMP"

            echo "Pushing to GitHub..."
            git push origin main

            if [ $? -eq 0 ]; then
                echo "   ✅ Pushed to GitHub"
                echo "   ⏱️  GitHub Pages will rebuild in 1-3 minutes"
                echo "   🌐 Your site will be updated shortly"
            else
                echo "   ⚠️  Git push failed - you may need to push manually"
            fi
        fi
    else
        echo "⚠️  Not a git repository - skipping git push"
    fi
else
    echo "ℹ️  Skipping GitHub push - ngrok URL unchanged"
fi

echo ""
echo "==========================================="
echo "✅ Refresh complete!"
echo "==========================================="
echo ""
echo "📊 Service Status:"
echo "   Backend:  http://localhost:8000"
echo "   ngrok:    $NGROK_URL"
echo "   Frontend: Open frontend/index.html in browser"
echo ""
echo "📝 Logs:"
echo "   Backend: /tmp/halloween_backend.log"
echo "   ngrok:   /tmp/halloween_ngrok.log"
echo ""
echo "🔍 Monitor ngrok: http://localhost:4040"
echo ""
echo "To stop services:"
echo "   kill $BACKEND_PID  # Stop backend"
echo "   kill $NGROK_PID    # Stop ngrok"
echo ""

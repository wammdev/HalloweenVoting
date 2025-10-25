#!/bin/bash
# Refresh script - Clears database and restarts backend

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
echo "🚀 Starting fresh backend server..."
echo "==========================================="
echo ""

# Start backend
cd backend
exec ./start.sh

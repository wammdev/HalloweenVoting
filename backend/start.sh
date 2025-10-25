#!/bin/bash
# Quick start script for Halloween Voting System backend

echo "🎃 Starting Halloween Voting System Backend..."
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "❌ Python is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Use python3 if available, otherwise python
PYTHON_CMD="python3"
if ! command -v python3 &> /dev/null; then
    PYTHON_CMD="python"
fi

echo "Using Python: $PYTHON_CMD"
$PYTHON_CMD --version
echo ""

# Check if requirements are installed
echo "Checking dependencies..."
if ! $PYTHON_CMD -c "import fastapi" 2>/dev/null; then
    echo "📦 Installing dependencies..."
    $PYTHON_CMD -m pip install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
else
    echo "✅ Dependencies already installed"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Quick reminders:"
echo "   - Results password is set in config.py (default: spooky2025)"
echo "   - Categories can be customized in config.py"
echo "   - API docs will be at: http://localhost:8000/docs"
echo ""
echo "🚀 Starting server on http://localhost:8000"
echo ""
echo "💡 In another terminal, run: ngrok http 8000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""
echo "=========================================="
echo ""

# Start the server
$PYTHON_CMD app.py

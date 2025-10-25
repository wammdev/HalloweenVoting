#!/bin/bash
# Start ngrok with workaround for SSL issues
~/.local/bin/ngrok http 8000 --log=stdout 2>&1

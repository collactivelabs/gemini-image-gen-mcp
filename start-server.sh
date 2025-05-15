#!/bin/bash

# Check if .env file exists, create from example if not
if [ ! -f .env ]; then
  echo "Creating .env file from .env.example..."
  cp .env.example .env
  echo "Please edit .env file to add your Google API key!"
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Parse command line arguments
WEB_SERVER=false
MCP_SERVER=true

# Parse options
while [ "$#" -gt 0 ]; do
  case "$1" in
    --web-only) WEB_SERVER=true; MCP_SERVER=false; shift 1;;
    --mcp-only) WEB_SERVER=false; MCP_SERVER=true; shift 1;;
    --both) WEB_SERVER=true; MCP_SERVER=true; shift 1;;
    *) echo "Unknown option: $1"; exit 1;;
  esac
done

# Start servers based on options
if [ "$MCP_SERVER" = true ] && [ "$WEB_SERVER" = true ]; then
  echo "Starting both MCP server and web interface..."
  echo "Starting MCP server in background..."
  node src/mcp-server.js &
  MCP_PID=$!
  echo "MCP server started with PID: $MCP_PID"

  echo "Starting web interface..."
  node src/web-server.js

  # When web server stops, kill MCP server
  kill $MCP_PID
elif [ "$MCP_SERVER" = true ]; then
  echo "Starting Gemini Image Generation MCP server..."
  node src/mcp-server.js
elif [ "$WEB_SERVER" = true ]; then
  echo "Starting web interface..."
  node src/web-server.js
fi
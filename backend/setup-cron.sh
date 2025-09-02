#!/bin/bash

# PlayTraq Daily Sync Cron Setup for macOS

echo "🚀 Setting up PlayTraq daily sync..."

# Get the current directory
BACKEND_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
NODE_PATH="$(which node)"

# Create a launch agent plist file
PLIST_FILE="$HOME/Library/LaunchAgents/com.playtraq.dailysync.plist"

cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.playtraq.dailysync</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>$NODE_PATH</string>
        <string>$BACKEND_DIR/dailySync.js</string>
    </array>
    
    <key>WorkingDirectory</key>
    <string>$BACKEND_DIR</string>
    
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>3</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    
    <key>StandardOutPath</key>
    <string>$HOME/Desktop/playtraq/backend/logs/sync.log</string>
    
    <key>StandardErrorPath</key>
    <string>$HOME/Desktop/playtraq/backend/logs/sync-error.log</string>
    
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
EOF

# Create logs directory
mkdir -p "$BACKEND_DIR/logs"

# Load the launch agent
launchctl unload "$PLIST_FILE" 2>/dev/null
launchctl load "$PLIST_FILE"

echo "✅ Daily sync scheduled for 3:00 AM every day"
echo "📁 Logs will be saved to: $BACKEND_DIR/logs/"
echo ""
echo "Useful commands:"
echo "  Check status:  launchctl list | grep playtraq"
echo "  Stop sync:     launchctl unload $PLIST_FILE"
echo "  Start sync:    launchctl load $PLIST_FILE"
echo "  Run now:       node $BACKEND_DIR/dailySync.js"
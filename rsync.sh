#!/bin/bash

# Source directory
SRC_DIR="."

# Destination directory on the remote server
DEST_DIR="aptr-dev:code/sdk/"

# Rsync command with --exclude-from option
rsync -avz --delete \
    --exclude-from=".gitignore" \
    --exclude=".git/" \
    "$SRC_DIR" "$DEST_DIR"


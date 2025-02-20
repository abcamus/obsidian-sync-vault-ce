#!/usr/bin/env bash

VERSION=$(jq -r '.version' manifest.json)
DEPLOY_DIR=~/obsidian仓库/obsidian仓库/.obsidian/plugins

echo "version: $VERSION"
mkdir -p $DEPLOY_DIR/obsidian-sync-vault-ce/
cp main.js manifest.json styles.css LICENSE $DEPLOY_DIR/obsidian-sync-vault-ce/

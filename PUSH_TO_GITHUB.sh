#!/bin/bash
# Script to push vacation-management to personal GitHub account
# Username: simastorgovickis
# Email: simas.torgovickis@gmail.com

set -e

echo "🚀 Pushing vacation-management to GitHub..."
echo ""
echo "Repository will be created at:"
echo "https://github.com/simastorgovickis/vacation-management"
echo ""

# Check if remote already exists
if git remote get-url origin >/dev/null 2>&1; then
    echo "⚠️  Remote 'origin' already exists:"
    git remote get-url origin
    echo ""
    read -p "Do you want to remove it and add the new one? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git remote remove origin
    else
        echo "Aborted. Please configure remote manually."
        exit 1
    fi
fi

# Add remote
echo "📦 Adding remote repository..."
git remote add origin https://github.com/simastorgovickis/vacation-management.git

# Verify remote
echo ""
echo "✅ Remote configured:"
git remote -v
echo ""

# Push to GitHub
echo "📤 Pushing to GitHub..."
echo "Note: You may be prompted for GitHub credentials"
echo ""

git branch -M main
git push -u origin main

echo ""
echo "✅ Successfully pushed to GitHub!"
echo ""
echo "Repository URL: https://github.com/simastorgovickis/vacation-management"
echo ""
echo "Next steps:"
echo "1. Go to Supabase and create a project"
echo "2. Deploy to Vercel"
echo "3. See DEPLOY_NOW.md for full deployment guide"

# Manual Push Instructions

The automated push didn't work. Let's do it manually with proper authentication.

## Option 1: Use Git Credential Helper (Recommended)

```bash
cd /Users/storgovickis/Cursor_root_folder/vacation-management

# Set up credential helper to store token
git config credential.helper store

# Push (will prompt for credentials once)
git push -u origin main
```

When prompted:
- **Username**: `simastorgovickis`
- **Password**: `[YOUR_GITHUB_PERSONAL_ACCESS_TOKEN]` (use your GitHub Personal Access Token)

After the first push, credentials will be stored and you won't need to enter them again.

---

## Option 2: Use GIT_ASKPASS Environment Variable

```bash
cd /Users/storgovickis/Cursor_root_folder/vacation-management

# Create a temporary script
cat > /tmp/git-askpass.sh << 'EOF'
#!/bin/bash
if [ "$1" = "Username for 'https://github.com':" ]; then
    echo "simastorgovickis"
elif [ "$1" = "Password for 'https://simastorgovickis@github.com':" ]; then
    echo "[YOUR_GITHUB_PERSONAL_ACCESS_TOKEN]"
fi
EOF

chmod +x /tmp/git-askpass.sh
export GIT_ASKPASS=/tmp/git-askpass.sh

# Push
git push -u origin main

# Clean up
unset GIT_ASKPASS
rm /tmp/git-askpass.sh
```

---

## Option 3: Verify Token Permissions

The 403 error might mean the token doesn't have the right permissions.

1. Go to: https://github.com/settings/tokens
2. Find your token (or create a new one)
3. Make sure it has:
   - ✅ **repo** (Full control of private repositories)
   - ✅ **workflow** (if you plan to use GitHub Actions)

If you need to create a new token:
1. Click "Generate new token" → "Generate new token (classic)"
2. Name: `vacation-management-deploy`
3. Expiration: Choose your preference (90 days, 1 year, or no expiration)
4. Select scopes: ✅ **repo**
5. Generate and copy the new token
6. Use the new token instead

---

## Option 4: Use SSH Instead (Most Secure)

If HTTPS continues to have issues, switch to SSH:

```bash
# Generate SSH key (if you don't have one)
ssh-keygen -t ed25519 -C "simas.torgovickis@gmail.com"

# Copy public key
cat ~/.ssh/id_ed25519.pub

# Add to GitHub: https://github.com/settings/keys
# Click "New SSH key", paste the public key

# Change remote to SSH
git remote set-url origin git@github.com:simastorgovickis/vacation-management.git

# Push
git push -u origin main
```

---

## Quick Test

Try this first - it's the simplest:

```bash
cd /Users/storgovickis/Cursor_root_folder/vacation-management
git config credential.helper store
git push -u origin main
```

Then enter:
- Username: `simastorgovickis`
- Password: `[YOUR_GITHUB_PERSONAL_ACCESS_TOKEN]` (use your GitHub Personal Access Token)

Let me know which method works or if you get a different error!

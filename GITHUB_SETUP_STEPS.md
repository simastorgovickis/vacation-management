# GitHub Repository Setup - Step by Step

## ⚠️ Repository Not Found

The repository `vacation-management` doesn't exist yet on GitHub. Let's create it first.

---

## Step 1: Create Repository on GitHub

1. **Go to**: https://github.com/new
2. **Verify** you're logged into your personal account (`simastorgovickis`)
3. **Fill in**:
   - **Repository name**: `vacation-management`
   - **Description**: `Employee Vacation Management System` (optional)
   - **Visibility**: ✅ **Private** (recommended)
   - **DO NOT check**:
     - ❌ Add a README file
     - ❌ Add .gitignore  
     - ❌ Choose a license
4. **Click**: "Create repository"

---

## Step 2: After Creating Repository

Once you've created the repository, come back here and I'll help you push the code.

**Or**, if you want to do it yourself, run:

```bash
cd /Users/storgovickis/Cursor_root_folder/vacation-management

# Add remote (without token in URL - safer)
git remote add origin https://github.com/simastorgovickis/vacation-management.git

# Push (GitHub will prompt for credentials)
git branch -M main
git push -u origin main
```

When prompted:
- **Username**: `simastorgovickis`
- **Password**: `[YOUR_GITHUB_PERSONAL_ACCESS_TOKEN]` (use your GitHub Personal Access Token)

---

## Alternative: Use GitHub CLI (if you prefer)

If you install GitHub CLI:
```bash
brew install gh
gh auth login
gh repo create vacation-management --private --source=. --remote=origin --push
```

---

**Let me know once you've created the repository on GitHub, and I'll help you push the code!**

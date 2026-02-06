# Create GitHub Repository - Personal Account

## ⚠️ Important: Using Personal Account

We'll create the repository in your **personal GitHub account**, not the company account.

---

## Step 1: Configure Git for This Project

First, let's set your personal Git identity for this project:

```bash
cd /Users/storgovickis/Cursor_root_folder/vacation-management

# Set your personal name and email (replace with your personal GitHub details)
git config user.name "Your Personal Name"
git config user.email "your-personal-email@example.com"
```

**Please provide:**
- Your personal GitHub username
- Your personal GitHub email (the one associated with your personal account)

Or you can set it yourself:
```bash
git config user.name "Your Name"
git config user.email "your-email@example.com"
```

---

## Step 2: Create Repository on GitHub Website

### 2.1 Go to GitHub

1. **Make sure you're logged into your PERSONAL GitHub account** (not company account)
2. Go to: https://github.com/new
3. Verify the account name in the top-right corner is your **personal account**

### 2.2 Create Repository

Fill in:
- **Repository name**: `vacation-management` (or your preferred name)
- **Description**: `Employee Vacation Management System` (optional)
- **Visibility**: 
  - ✅ **Private** (recommended - keeps your code private)
  - ⚠️ **Public** (if you want it public)
- **DO NOT** check:
  - ❌ Add a README file (you already have one)
  - ❌ Add .gitignore (you already have one)
  - ❌ Choose a license (optional, can add later)

### 2.3 Click "Create repository"

**DO NOT** follow the "push an existing repository" instructions yet - we'll do that next.

---

## Step 3: Connect Local Repository to GitHub

After creating the repository, GitHub will show you a page with instructions. 

**Copy the repository URL** - it should look like:
- `https://github.com/YOUR_PERSONAL_USERNAME/vacation-management.git`

Then run these commands:

```bash
cd /Users/storgovickis/Cursor_root_folder/vacation-management

# Add remote (replace YOUR_PERSONAL_USERNAME with your actual username)
git remote add origin https://github.com/YOUR_PERSONAL_USERNAME/vacation-management.git

# Verify remote is set correctly
git remote -v

# Push to GitHub
git branch -M main
git push -u origin main
```

**If GitHub asks for authentication:**
- Use your **personal GitHub account** credentials
- Or use a Personal Access Token (PAT) if you have 2FA enabled

---

## Step 4: Verify

1. Go to: `https://github.com/YOUR_PERSONAL_USERNAME/vacation-management`
2. You should see all your files
3. Verify the repository is in your **personal account**, not company account

---

## 🔐 Authentication Options

### Option A: Personal Access Token (Recommended if you have 2FA)

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Name: `vacation-management-deploy`
4. Select scopes: ✅ `repo` (full control of private repositories)
5. Generate token and **copy it** (you won't see it again!)
6. When pushing, use the token as password:
   ```bash
   git push -u origin main
   # Username: YOUR_PERSONAL_USERNAME
   # Password: YOUR_PERSONAL_ACCESS_TOKEN
   ```

### Option B: SSH Key (Alternative)

If you prefer SSH:
1. Generate SSH key: `ssh-keygen -t ed25519 -C "your-email@example.com"`
2. Add to GitHub: https://github.com/settings/keys
3. Use SSH URL: `git@github.com:YOUR_PERSONAL_USERNAME/vacation-management.git`

---

## ✅ Checklist

Before proceeding:
- [ ] I'm logged into my **personal GitHub account** (not company)
- [ ] I've configured git user.name and user.email for this project
- [ ] I've created the repository on GitHub
- [ ] I've added the remote origin
- [ ] I've pushed the code successfully
- [ ] I've verified the repo is in my personal account

---

**Ready?** Let me know:
1. Your personal GitHub username
2. Your personal GitHub email
3. Whether you want to set git config yourself or want me to help

Then we'll proceed with creating the repo!

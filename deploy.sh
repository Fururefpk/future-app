#!/bin/bash

# Vercel Deployment Script for Future Property Holdings
# Usage: ./deploy.sh

echo "================================"
echo "Future Property Holdings"
echo "Vercel Deployment Script"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo -e "${RED}Error: Not a git repository${NC}"
    echo "Please run: git init"
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
fi

# Check if there are uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}You have uncommitted changes.${NC}"
    echo "Commit changes? (y/n)"
    read -r response
    
    if [ "$response" = "y" ]; then
        echo "Enter commit message:"
        read -r commit_msg
        git add .
        git commit -m "$commit_msg"
        echo -e "${GREEN}Changes committed${NC}"
    else
        echo -e "${RED}Please commit changes before deploying${NC}"
        exit 1
    fi
fi

# Push to git (optional)
echo ""
echo "Push to Git first? (y/n)"
read -r push_response

if [ "$push_response" = "y" ]; then
    echo "Pushing to remote..."
    git push origin main
    echo -e "${GREEN}Pushed to remote${NC}"
fi

# Deploy to Vercel
echo ""
echo "Starting Vercel deployment..."
echo -e "${YELLOW}Note: You may be prompted to authenticate${NC}"
echo ""

vercel deploy --prod

# Check deployment status
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}================================${NC}"
    echo -e "${GREEN}✅ Deployment Successful!${NC}"
    echo -e "${GREEN}================================${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Verify deployment at: vercel.com/dashboard"
    echo "2. Check health: curl https://your-domain.vercel.app/health"
    echo "3. Test API endpoints"
    echo "4. Monitor logs and performance"
    echo ""
else
    echo ""
    echo -e "${RED}================================${NC}"
    echo -e "${RED}❌ Deployment Failed${NC}"
    echo -e "${RED}================================${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check environment variables in Vercel dashboard"
    echo "2. Verify database connection (MONGODB_URI)"
    echo "3. Check build logs: vercel logs"
    echo "4. Ensure all required packages installed"
    exit 1
fi

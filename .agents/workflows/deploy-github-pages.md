---
description: How to deploy Cyberpunk World to GitHub Pages using GitHub Actions
---

# Deploying Cyberpunk World to GitHub Pages

This automated workflow will prepare the Next.js application for a static export and deploy it directly to GitHub Pages using GitHub Actions.

## Prerequisites
1. Ensure your repository is pushed to GitHub.
2. In your GitHub repository settings, navigate to **Pages**, and under **Build and deployment**, change the source to **GitHub Actions**.

## Deployment Steps

// turbo-all
1. Install `gh-pages` if you prefer manual deployment, though we will rely on GitHub Actions for CI/CD.
```bash
npm install -g gh-pages
```

2. Generate the GitHub Actions Workflow file to automate the build and deploy.
```bash
mkdir -p .github/workflows
```

3. Create the `nextjs.yml` file to run the deployment pipeline.
```bash
cat << 'EOF' > .github/workflows/nextjs.yml
name: Deploy Next.js site to Pages

on:
  push:
    branches: ["main", "master"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
      - name: Install dependencies
        run: npm ci
      - name: Build Next.js App
        run: npx next build
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./out

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
EOF
```

4. Configure Next.js for a static export.
```bash
node -e "const fs=require('fs'); let cfg=fs.readFileSync('next.config.ts','utf8'); if(!cfg.includes('output:')) { cfg = cfg.replace('const nextConfig: NextConfig = {', 'const nextConfig: NextConfig = {\n  output: \'export\','); fs.writeFileSync('next.config.ts', cfg); }"
```

5. Push the changes to GitHub. Once committed and pushed to the `main` or `master` branch, GitHub Actions will automatically compile the raw React code and deploy the 3D globe to your live URL!
```bash
git add .
git commit -m "Configure GitHub Pages deployment"
git push origin HEAD
```

# CMS Content Management Design

**Date:** 2026-03-14
**Status:** Approved

## Problem

The site is currently static HTML with hand-edited files. Zach needs to add artworks, blog posts, images, and video from any device (phone, laptop, etc.) without touching code — similar to Squarespace's content management experience.

## Solution: Decap CMS + Eleventy + Cloudflare Pages

### Architecture

- **Decap CMS** — Admin dashboard at `/admin` with WYSIWYG editing, drag-and-drop uploads, form-based artwork entry. Authenticated via GitHub OAuth (single user: Zach only).
- **GitHub repo** — Source of truth. CMS commits content changes directly to the repo.
- **Eleventy (11ty)** — Lightweight static site generator. Reads markdown content files, generates HTML pages using existing CSS/JS design system.
- **Cloudflare Pages** — Watches GitHub repo, rebuilds and deploys on every commit (~30 second turnaround).
- **Cloudflare R2** (future) — If media storage exceeds comfortable Git repo size (~100-200MB), migrate images/video to R2.

### Content Structure

**Artworks** — Individual markdown files in `content/works/`:

```markdown
---
title: "Collapse"
year: 2024
medium: "Intaglio"
dimensions: "20 x 20 in."
category: painting
image: /images/works/collapse.jpg
video_file: null
video_embed: null
featured: true
---
Optional statement text here.
```

**Blog Posts** — Individual markdown files in `content/posts/`:

```markdown
---
title: "On the Problem of the Surface"
date: 2024-03-15
tags: [process, materiality]
---
Full rich text body here.
```

**Media files:**
- `public/images/works/` — artwork photos
- `public/images/posts/` — blog inline images
- `public/video/` — self-hosted short clips

### CMS Admin Interface

Located at `zach-miller-studio.com/admin`.

**Collections:**
- Works — grid with thumbnails, "New Work" button
- Posts — date-sorted list, "New Post" button

**Work form fields:**
- Title (text)
- Year (number)
- Medium (text)
- Dimensions (text)
- Category (dropdown: Painting / Drawing & Print / New Media)
- Image (drag-and-drop upload)
- Video File (file upload, optional, for short self-hosted clips)
- Video Embed (text, optional, for Vimeo/YouTube URL)
- Featured (toggle)
- Statement (optional text area)

**Post editor:**
- Title (text)
- Date (date picker)
- Tags (multi-select)
- Body (WYSIWYG rich text with toolbar: bold, italic, headings, blockquote, links, inline images, video embed blocks)

**Authentication:**
- GitHub OAuth, single user whitelisted

### Day-to-Day Workflow

1. Open `zach-miller-studio.com/admin` on any device
2. Log in with GitHub
3. Click "New Work" or "New Post"
4. Fill in fields / write in editor / drag-drop images
5. Hit "Publish"
6. Decap commits to GitHub, Cloudflare rebuilds, live in ~30 seconds

### Video Strategy

- **Self-hosted clips:** Short 1-2 min clips stored in `public/video/`, served directly
- **Vimeo/YouTube embeds:** Paste URL into "Video Embed" field on artwork form, or use embed block in blog editor
- Artwork gallery grid shows a thumbnail image; video plays on the detail page

### Migration Path

- Convert existing `data/works.json` entries to individual markdown files in `content/works/`
- Convert existing `data/posts.json` entries to markdown files in `content/posts/`
- Move images from `assets/images/works/` to `public/images/works/`
- Replace hand-written HTML pages with Eleventy templates that preserve existing CSS/JS design system
- Existing design tokens, layout, components CSS remain untouched

### Constraints

- Single user (Zach only)
- Free tier: Decap CMS is open source, Cloudflare Pages free, GitHub free
- Video: 1-2 minute clips maximum for self-hosted; longer/polished pieces via Vimeo embed
- Git repo comfortable up to ~100-200MB of media; Cloudflare R2 as future overflow

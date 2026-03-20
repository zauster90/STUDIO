# CMS Content Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Decap CMS admin dashboard with WYSIWYG editing, migrate from hand-written HTML to Eleventy-generated static site, deploy via Cloudflare Pages.

**Architecture:** Eleventy reads markdown content files from `content/works/` and `content/posts/`, applies Nunjucks templates that reuse the existing CSS/JS design system, and outputs static HTML. Decap CMS provides a browser-based admin UI at `/admin` that commits content changes to GitHub. Cloudflare Pages rebuilds on every push.

**Tech Stack:** Eleventy 3.x (static site generator), Decap CMS 3.x (Git-based headless CMS), Nunjucks (templating), Cloudflare Pages (hosting), GitHub (content storage via Git)

---

### Task 1: Initialize Eleventy Project

**Files:**
- Create: `package.json`
- Create: `eleventy.config.js`
- Create: `.gitignore`

**Step 1: Initialize npm and install Eleventy**

Run:
```bash
cd "/c/Users/zachm/source/repos/V2 Artist Website"
npm init -y
npm install @11ty/eleventy --save-dev
```

**Step 2: Create Eleventy config**

Create `eleventy.config.js`:
```javascript
module.exports = function(eleventyConfig) {
  // Pass through static assets
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy("src/video");
  eleventyConfig.addPassthroughCopy("src/admin");

  // Collections
  eleventyConfig.addCollection("works", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/content/works/*.md")
      .sort((a, b) => (b.data.year || 0) - (a.data.year || 0));
  });

  eleventyConfig.addCollection("paintings", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/content/works/*.md")
      .filter(item => item.data.category === "painting")
      .sort((a, b) => (b.data.year || 0) - (a.data.year || 0));
  });

  eleventyConfig.addCollection("drawings", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/content/works/*.md")
      .filter(item => item.data.category === "drawing")
      .sort((a, b) => (b.data.year || 0) - (a.data.year || 0));
  });

  eleventyConfig.addCollection("newmedia", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/content/works/*.md")
      .filter(item => item.data.category === "new-media")
      .sort((a, b) => (b.data.year || 0) - (a.data.year || 0));
  });

  eleventyConfig.addCollection("posts", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/content/posts/*.md")
      .sort((a, b) => new Date(b.data.date) - new Date(a.data.date));
  });

  // Filter: get featured work
  eleventyConfig.addFilter("featured", function(collection) {
    return collection.filter(item => item.data.featured);
  });

  // Filter: limit array
  eleventyConfig.addFilter("limit", function(arr, count) {
    return arr.slice(0, count);
  });

  // Markdown config for rich text
  let markdownIt = require("markdown-it");
  let md = markdownIt({ html: true, linkify: true });
  eleventyConfig.setLibrary("md", md);

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
```

**Step 3: Add build scripts to package.json**

Update the `scripts` section:
```json
{
  "scripts": {
    "dev": "eleventy --serve --port=4403",
    "build": "eleventy",
    "clean": "rm -rf _site"
  }
}
```

**Step 4: Create .gitignore**

```
node_modules/
_site/
.DS_Store
```

**Step 5: Install markdown-it**

Run:
```bash
npm install markdown-it --save-dev
```

**Step 6: Verify Eleventy runs**

Run: `npx eleventy --dryrun`
Expected: No errors (may warn about missing input directory — that's OK, we create it next)

**Step 7: Commit**

```bash
git add package.json package-lock.json eleventy.config.js .gitignore
git commit -m "chore: initialize Eleventy project with config and build scripts"
```

---

### Task 2: Create Source Directory Structure

**Files:**
- Create: `src/` directory tree
- Move: existing assets into `src/`

**Step 1: Create the directory structure**

```bash
mkdir -p src/content/works
mkdir -p src/content/posts
mkdir -p src/_includes/layouts
mkdir -p src/_includes/partials
mkdir -p src/_data
mkdir -p src/images/works
mkdir -p src/images/posts
mkdir -p src/video
mkdir -p src/admin
```

**Step 2: Move existing assets**

```bash
cp -r assets/css src/assets/css
cp -r assets/js src/assets/js
cp -r assets/images/works/* src/images/works/
```

**Step 3: Copy artwork source images (from "artworks for web page" folder)**

```bash
cp "artworks for web page/paintings/"*.jpg src/images/works/
cp "artworks for web page/drawings/"*.jpg src/images/works/
cp "artworks for web page/drawings/"*.tif src/images/works/ 2>/dev/null
cp "artworks for web page/new media/"*.mp4 src/video/
```

**Step 4: Verify structure**

Run: `find src -type f | head -20`
Expected: Files listed under `src/assets/`, `src/images/`, `src/video/`

**Step 5: Commit**

```bash
git add src/
git commit -m "chore: create Eleventy source directory and migrate assets"
```

---

### Task 3: Create Base Layout Template

**Files:**
- Create: `src/_includes/layouts/base.njk`
- Create: `src/_includes/partials/sidebar.njk`
- Create: `src/_includes/partials/gradient-field.njk`

**Step 1: Create the gradient field partial**

Create `src/_includes/partials/gradient-field.njk`:
```html
<div class="gradient-field" aria-hidden="true">
  <div class="gradient" data-hx="50" data-hy="110" data-pull="0.18" data-color="rgba(255, 248, 240, 0.30)" data-spread="55"></div>
  <div class="gradient" data-hx="-5" data-hy="50" data-pull="0.22" data-color="rgba(255, 248, 240, 0.34)" data-spread="52"></div>
  <div class="gradient" data-hx="105" data-hy="45" data-pull="0.14" data-color="rgba(255, 248, 240, 0.26)" data-spread="50"></div>
</div>
```

**Step 2: Create the sidebar partial**

Create `src/_includes/partials/sidebar.njk`:
```html
<aside class="sidebar">
  <div>
    <a class="site-name" href="/">ZACH MILLER</a>
    <div class="site-tagline">STUDIO</div>
  </div>
  <nav aria-label="Site navigation">
    <a class="nav-item{% if activeNav == 'work' %} active{% endif %}" href="/">Work</a>
    <div class="nav-submenu">
      <a class="nav-subitem" href="/work/#painting">Paint</a>
      <a class="nav-subitem" href="/work/#drawing">Draw &amp; Print</a>
      <a class="nav-subitem" href="/work/#new-media">New Media</a>
    </div>
    <a class="nav-item{% if activeNav == 'writing' %} active{% endif %}" href="/writing/">Reflections</a>
    <a class="nav-item{% if activeNav == 'about' %} active{% endif %}" href="/about/">About</a>
    <a class="nav-item{% if activeNav == 'contact' %} active{% endif %}" href="/contact/">Contact</a>
  </nav>
  <div class="sidebar-footer">
    &copy; {{ "now" | date: "%Y" }} Zach Miller<br>
    Oklahoma City
  </div>
</aside>
```

**Step 3: Create the base layout**

Create `src/_includes/layouts/base.njk`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ title }}{% if title %} — {% endif %}Zach Miller Studio</title>
  <meta name="description" content="{{ description | default('Zach Miller is an artist based in Oklahoma City working in painting, drawing, printmaking, and new media.') }}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Karla:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Inconsolata:wght@300;400&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/base.css">
  <link rel="stylesheet" href="/assets/css/layout.css">
  <link rel="stylesheet" href="/assets/css/components.css">
</head>
<body>

{% include "partials/gradient-field.njk" %}

<div class="page">
  {% include "partials/sidebar.njk" %}
  <main class="main">
    {{ content | safe }}
  </main>
</div>

{% block scripts %}
<script src="/assets/js/effects.js" defer></script>
{% endblock %}
</body>
</html>
```

**Step 4: Verify templates parse**

Run: `npx eleventy --dryrun`
Expected: No template parsing errors

**Step 5: Commit**

```bash
git add src/_includes/
git commit -m "feat: add base layout and sidebar/gradient partials"
```

---

### Task 4: Create Content Files from Existing Data

**Files:**
- Create: `src/content/works/*.md` (one per artwork)
- Create: `src/content/posts/*.md` (one per blog post)
- Create: `src/content/works/works.json` (directory data file for defaults)
- Create: `src/content/posts/posts.json` (directory data file for defaults)

**Step 1: Create directory data files**

Create `src/content/works/works.json`:
```json
{
  "layout": "layouts/work-detail.njk",
  "tags": "work",
  "permalink": "/work/{{ title | slugify }}/index.html"
}
```

Create `src/content/posts/posts.json`:
```json
{
  "layout": "layouts/post.njk",
  "tags": "post",
  "permalink": "/writing/{{ title | slugify }}/index.html"
}
```

**Step 2: Create artwork markdown files**

Create one `.md` file per artwork. Example — `src/content/works/untitled-threshold-study-i.md`:
```markdown
---
title: "Untitled (Threshold Study I)"
year: 2024
medium: "Oil and graphite on linen"
dimensions: "182 × 240 cm (71.6 × 94.5 in.)"
category: painting
image: /images/works/work-001.jpg
video_file:
video_embed:
featured: true
---
The Threshold Studies began as an attempt to locate the moment a surface stops being ground and starts being image. Working the linen over many sessions, the painting accumulates a sediment of decisions — marks made and dissolved, forms approached and abandoned. What remains is not resolution but a record of sustained looking.
```

Repeat for each artwork in `data/works.json`, and create entries for the drawing/painting images currently in the gallery. Use the actual artwork filenames from `artworks for web page/` folder where real titles are known (e.g., "Collapse", "Interstice", "River", "Transmission", "Verge", "Smoke", etc.).

**Step 3: Create blog post markdown files**

Example — `src/content/posts/on-the-problem-of-the-surface.md`:
```markdown
---
title: "On the Problem of the Surface"
date: 2024-03-15
tags: [process, materiality]
---
The surface is never where I begin, but it is always where I end up — a record of decisions and their reversals.
```

Create files for all 3 posts in `data/posts.json`.

**Step 4: Commit**

```bash
git add src/content/
git commit -m "feat: add artwork and blog post content as markdown files"
```

---

### Task 5: Create Page Templates

**Files:**
- Create: `src/index.njk` (landing page with featured work)
- Create: `src/work/index.njk` (gallery grid page)
- Create: `src/_includes/layouts/work-detail.njk` (individual artwork page)
- Create: `src/writing/index.njk` (blog listing)
- Create: `src/_includes/layouts/post.njk` (individual post page)
- Create: `src/about/index.njk`
- Create: `src/contact/index.njk`

**Step 1: Create landing page**

Create `src/index.njk`:
```html
---
layout: layouts/base.njk
title: ""
activeNav: work
---

{% set featured = collections.works | featured | first %}
{% if featured %}
<div class="featured-work" data-reveal>
  <div class="featured-image-wrap">
    <a href="{{ featured.url }}">
      <img src="{{ featured.data.image }}"
           alt="{{ featured.data.title }}, {{ featured.data.year }} — {{ featured.data.medium }}"
           width="1200" height="1200"
           loading="eager">
    </a>
  </div>
  <div class="featured-meta">
    <div class="featured-meta-item">
      <span class="featured-meta-key">Featured</span>
      <span class="featured-meta-val"><em>{{ featured.data.title }}</em>, {{ featured.data.year }}</span>
    </div>
    <div class="featured-meta-item">
      <span class="featured-meta-key">Medium</span>
      <span class="featured-meta-val">{{ featured.data.medium }}</span>
    </div>
    <div class="featured-meta-item">
      <span class="featured-meta-key">Dimensions</span>
      <span class="featured-meta-val">{{ featured.data.dimensions }}</span>
    </div>
  </div>
</div>
{% endif %}
```

**Step 2: Create gallery grid page**

Create `src/work/index.njk`:
```html
---
layout: layouts/base.njk
title: Work
activeNav: work
---

<section id="painting" data-reveal>
  <div class="gallery-header">
    <h2 class="gallery-title">Painting</h2>
    <span class="gallery-count">{{ collections.paintings.length }} works</span>
  </div>
  <div class="gallery-grid">
    {% for work in collections.paintings %}
    <a href="{{ work.url }}" class="gallery-item" data-category="painting">
      <img src="{{ work.data.image }}" alt="{{ work.data.title }}, {{ work.data.year }}" width="1200" height="1200" loading="lazy">
      <div class="gallery-overlay">
        <span class="gallery-overlay-title">{{ work.data.title }}</span>
        <span class="gallery-overlay-year">{{ work.data.year }}</span>
      </div>
    </a>
    {% endfor %}
  </div>
</section>

<section id="drawing" data-reveal>
  <div class="gallery-header">
    <h2 class="gallery-title">Drawing &amp; Print</h2>
    <span class="gallery-count">{{ collections.drawings.length }} works</span>
  </div>
  <div class="gallery-grid">
    {% for work in collections.drawings %}
    <a href="{{ work.url }}" class="gallery-item" data-category="drawing">
      <img src="{{ work.data.image }}" alt="{{ work.data.title }}, {{ work.data.year }}" width="1200" height="1200" loading="lazy">
      <div class="gallery-overlay">
        <span class="gallery-overlay-title">{{ work.data.title }}</span>
        <span class="gallery-overlay-year">{{ work.data.year }}</span>
      </div>
    </a>
    {% endfor %}
  </div>
</section>

<section id="new-media" data-reveal>
  <div class="gallery-header">
    <h2 class="gallery-title">New Media</h2>
    <span class="gallery-count">{{ collections.newmedia.length }} works</span>
  </div>
  <div class="gallery-grid">
    {% for work in collections.newmedia %}
    <a href="{{ work.url }}" class="gallery-item" data-category="new-media">
      <img src="{{ work.data.image }}" alt="{{ work.data.title }}, {{ work.data.year }}" width="1200" height="1200" loading="lazy">
      <div class="gallery-overlay">
        <span class="gallery-overlay-title">{{ work.data.title }}</span>
        <span class="gallery-overlay-year">{{ work.data.year }}</span>
      </div>
    </a>
    {% endfor %}
  </div>
</section>

<script src="/assets/js/gallery.js" defer></script>
```

**Step 3: Create work detail layout**

Create `src/_includes/layouts/work-detail.njk`:
```html
---
layout: layouts/base.njk
activeNav: work
---

<a class="back-link" href="/work/">All Work</a>

<div class="work-detail" data-reveal>
  <div class="work-image-wrap">
    {% if video_embed %}
    <div class="video-embed">
      <iframe src="{{ video_embed }}" width="100%" height="450" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>
    </div>
    {% elif video_file %}
    <video controls preload="metadata" poster="{{ image }}">
      <source src="{{ video_file }}" type="video/mp4">
    </video>
    {% else %}
    <img src="{{ image }}"
         alt="{{ title }}, {{ year }} — {{ medium }}"
         data-lightbox
         loading="eager">
    {% endif %}
  </div>

  <div class="work-meta">
    <div class="work-meta-row">
      <span class="work-meta-key">Title</span>
      <span class="work-meta-val"><strong>{{ title }}</strong></span>
    </div>
    <div class="work-meta-row">
      <span class="work-meta-key">Year</span>
      <span class="work-meta-val">{{ year }}</span>
    </div>
    <div class="work-meta-row">
      <span class="work-meta-key">Medium</span>
      <span class="work-meta-val">{{ medium }}</span>
    </div>
    <div class="work-meta-row">
      <span class="work-meta-key">Dimensions</span>
      <span class="work-meta-val">{{ dimensions }}</span>
    </div>
  </div>

  {% if content | trim %}
  <div class="work-statement">
    {{ content | safe }}
  </div>
  {% endif %}
</div>

<!-- Lightbox -->
<div class="lightbox" id="lightbox">
  <img src="" alt="">
</div>
<script src="/assets/js/lightbox.js" defer></script>
```

**Step 4: Create blog listing page**

Create `src/writing/index.njk`:
```html
---
layout: layouts/base.njk
title: Reflections
activeNav: writing
---

<div class="post-list" data-reveal>
  {% for post in collections.posts %}
  <a href="{{ post.url }}" class="post-entry">
    <span class="post-date">{{ post.data.date | date: "%B %Y" }}</span>
    <div>
      <div class="post-title">{{ post.data.title }}</div>
      <div class="post-excerpt">{{ post.data.page.excerpt | default(post.content | striptags | truncate(150)) }}</div>
      {% if post.data.tags %}
      <div class="post-tags">
        {% for tag in post.data.tags %}
        <span class="post-tag">{{ tag }}</span>
        {% endfor %}
      </div>
      {% endif %}
    </div>
  </a>
  {% endfor %}
</div>
```

**Step 5: Create post layout**

Create `src/_includes/layouts/post.njk`:
```html
---
layout: layouts/base.njk
activeNav: writing
---

<a class="back-link" href="/writing/">All Writing</a>

<article>
  <div class="post-header" data-reveal>
    <span class="post-date">{{ date | date: "%B %Y" }}</span>
    <h1>{{ title }}</h1>
  </div>
  <div class="post-body" data-reveal>
    {{ content | safe }}
  </div>
</article>
```

**Step 6: Create about page**

Create `src/about/index.njk` — copy the content from the existing `about/index.html` but use the base layout. Update location to Oklahoma City.

**Step 7: Create contact page**

Create `src/contact/index.njk` — copy the content from the existing `contact/index.html` but use the base layout.

**Step 8: Build and verify**

Run: `npx eleventy --serve --port=4403`
Expected: Site builds, all pages render with existing CSS/JS design

**Step 9: Commit**

```bash
git add src/
git commit -m "feat: add all page templates (landing, gallery, work detail, blog, about, contact)"
```

---

### Task 6: Set Up Decap CMS Admin

**Files:**
- Create: `src/admin/index.html`
- Create: `src/admin/config.yml`

**Step 1: Create admin HTML page**

Create `src/admin/index.html`:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Zach Miller Studio — Admin</title>
  <script src="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js"></script>
</head>
<body>
</body>
</html>
```

**Step 2: Create CMS config**

Create `src/admin/config.yml`:
```yaml
backend:
  name: github
  repo: YOUR_GITHUB_USERNAME/YOUR_REPO_NAME
  branch: main

media_folder: "src/images"
public_folder: "/images"

collections:
  - name: "works"
    label: "Works"
    folder: "src/content/works"
    create: true
    slug: "{{slug}}"
    sortable_fields: ["title", "year", "category"]
    fields:
      - { label: "Title", name: "title", widget: "string" }
      - { label: "Year", name: "year", widget: "number", value_type: "int" }
      - { label: "Medium", name: "medium", widget: "string" }
      - { label: "Dimensions", name: "dimensions", widget: "string" }
      - label: "Category"
        name: "category"
        widget: "select"
        options:
          - { label: "Painting", value: "painting" }
          - { label: "Drawing & Print", value: "drawing" }
          - { label: "New Media", value: "new-media" }
      - { label: "Image", name: "image", widget: "image" }
      - { label: "Video File", name: "video_file", widget: "file", required: false, hint: "Upload a short video clip (1-2 min max)" }
      - { label: "Video Embed URL", name: "video_embed", widget: "string", required: false, hint: "Paste a Vimeo or YouTube embed URL" }
      - { label: "Featured", name: "featured", widget: "boolean", default: false }
      - { label: "Statement", name: "body", widget: "markdown", required: false }

  - name: "posts"
    label: "Blog Posts"
    folder: "src/content/posts"
    create: true
    slug: "{{slug}}"
    sortable_fields: ["title", "date"]
    fields:
      - { label: "Title", name: "title", widget: "string" }
      - { label: "Date", name: "date", widget: "datetime", format: "YYYY-MM-DD" }
      - { label: "Tags", name: "tags", widget: "list", default: [] }
      - { label: "Body", name: "body", widget: "markdown" }
```

**Step 3: Register Vimeo/YouTube embed editor component**

Update `src/admin/index.html` to add a custom editor component for video embeds in blog posts:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Zach Miller Studio — Admin</title>
  <script src="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js"></script>
  <script>
    CMS.registerEditorComponent({
      id: "video-embed",
      label: "Video Embed",
      fields: [
        { name: "url", label: "Video URL", widget: "string", hint: "Paste a Vimeo or YouTube URL" },
        { name: "title", label: "Title", widget: "string", required: false }
      ],
      pattern: /^<div class="video-embed">\s*<iframe src="(.*?)".*?><\/iframe>\s*<\/div>$/ms,
      fromBlock: function(match) {
        return { url: match[1] };
      },
      toBlock: function(obj) {
        return '<div class="video-embed"><iframe src="' + obj.url + '" width="100%" height="450" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="' + (obj.title || '') + '"></iframe></div>';
      },
      toPreview: function(obj) {
        return '<div class="video-embed"><iframe src="' + obj.url + '" width="100%" height="450" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>';
      }
    });
  </script>
</head>
<body>
</body>
</html>
```

**Step 4: Verify admin page loads locally**

Run: `npx eleventy --serve --port=4403`
Navigate to: `http://localhost:4403/admin/`
Expected: Decap CMS login screen appears (GitHub auth won't work locally — that's expected)

**Step 5: Commit**

```bash
git add src/admin/
git commit -m "feat: add Decap CMS admin with works and posts collections"
```

---

### Task 7: Add Video Embed CSS

**Files:**
- Modify: `src/assets/css/components.css`

**Step 1: Add responsive video embed styles**

Add to `components.css`:
```css
/* ══════════════════════════════════════════════════════════════════════════
   VIDEO EMBED
══════════════════════════════════════════════════════════════════════════ */
.video-embed {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 */
  height: 0;
  overflow: hidden;
  max-width: 100%;
}
.video-embed iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
}

/* Self-hosted video on work detail */
.work-image-wrap video {
  max-width: 100%;
  max-height: calc(100vh - 18rem);
  display: block;
}
```

**Step 2: Commit**

```bash
git add src/assets/css/components.css
git commit -m "feat: add video embed and self-hosted video styles"
```

---

### Task 8: Update Gallery JS for New Media Section

**Files:**
- Modify: `src/assets/js/gallery.js`

**Step 1: Update gallery.js to handle the new-media section**

Update the `data-filter` values to include `new-media` — the existing JS already handles arbitrary section IDs via `data-filter`, so this should work as-is. Verify and update the sidebar nav subitem list if needed to include New Media.

**Step 2: Commit if changes needed**

---

### Task 9: Visual Design Review

**Goal:** Present 4 distinct visual design directions for the site. Zach reviews all 4 alongside the current design and picks one (or keeps the current). This is a creative checkpoint — like a graphic designer presenting comps to a client.

**Step 1: Create 4 alternate CSS theme files**

Create `src/assets/css/themes/` directory with 4 variants. Each theme overrides the design tokens in `base.css` (palette, typography, spacing) and adjusts component styles to create a distinct visual identity. The HTML structure stays identical — only CSS changes.

Theme directions to explore:
- **Theme A: "Gallery White"** — High-contrast, stark white background, black type, generous whitespace. Inspired by contemporary gallery websites (Gagosian, Pace). Minimal color, maximum focus on artwork.
- **Theme B: "Warm Studio"** — Earthy tones, cream/parchment background, serif headings, warm accent colors. Feels handmade and intimate, like a studio visit.
- **Theme C: "Editorial"** — Magazine-inspired. Tighter grid, bolder typography hierarchy, subtle use of color accents. Feels like a curated publication.
- **Theme D: "Dark Mode"** — Dark background (#1a1a1a or similar), light text, artwork images pop against the dark field. Cinematic, immersive.

**Step 2: Build a review page**

Create `src/design-review.html` — a standalone page that loads each theme in an iframe or provides a theme switcher, so Zach can toggle between all 5 options (current + 4 themes) side by side.

**Step 3: Review with Zach**

Preview the review page in the browser. Walk through each theme. Zach selects one or keeps the current design.

**Step 4: Apply chosen theme**

Merge the chosen theme's overrides into the main CSS files (or keep current if selected). Remove the unused theme files and the review page.

**Step 5: Commit**

```bash
git add src/assets/css/
git commit -m "style: apply chosen visual design direction"
```

---

### Task 10: Set Up GitHub Repository

(Previously Task 9)

**Step 1: Initialize git repo (if not already)**

```bash
git init
```

**Step 2: Create GitHub repository**

```bash
gh repo create zach-miller-studio-v2 --private --source=. --push
```

**Step 3: Update Decap CMS config with actual repo name**

Edit `src/admin/config.yml` — replace `YOUR_GITHUB_USERNAME/YOUR_REPO_NAME` with the actual GitHub repo path.

**Step 4: Commit**

```bash
git add src/admin/config.yml
git commit -m "chore: set GitHub repo in Decap CMS config"
```

---

### Task 11: Deploy to Cloudflare Pages

**Step 1: Connect Cloudflare Pages to GitHub repo**

- Go to Cloudflare Dashboard > Pages > Create a project
- Connect GitHub account, select the repo
- Build settings:
  - Build command: `npx eleventy`
  - Build output directory: `_site`
  - Environment variable: `NODE_VERSION` = `18`
- Set custom domain: `zach-miller-studio.com`

**Step 2: Configure GitHub OAuth for Decap CMS**

- Go to GitHub Settings > Developer Settings > OAuth Apps > New OAuth App
- Application name: `Zach Miller Studio CMS`
- Homepage URL: `https://zach-miller-studio.com`
- Authorization callback URL: `https://api.netlify.com/auth/done` (Decap uses Netlify's OAuth proxy by default)
- Alternatively, set up a small Cloudflare Worker as an OAuth proxy (avoids Netlify dependency)

**Step 3: Verify deployment**

- Push to `main` branch
- Cloudflare Pages builds and deploys
- Visit `https://zach-miller-studio.com` — site loads
- Visit `https://zach-miller-studio.com/admin/` — CMS login works

**Step 4: Test full workflow**

1. Log into CMS admin
2. Create a test artwork entry with image upload
3. Verify it commits to GitHub
4. Verify Cloudflare rebuilds
5. Verify new artwork appears on the live site

---

### Task 12: Clean Up Old Files

**Step 1: Remove old hand-written HTML files**

Once the Eleventy build is verified working, remove the original files that are now replaced by templates:

```bash
rm index.html
rm -rf work/ writing/ about/ contact/
rm -rf assets/
rm -rf data/
rm -rf "{assets"
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove old static HTML files, replaced by Eleventy templates"
```

---

## Execution Order Summary

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Initialize Eleventy project | — |
| 2 | Create source directory structure | 1 |
| 3 | Create base layout template | 2 |
| 4 | Create content files from existing data | 2 |
| 5 | Create page templates | 3, 4 |
| 6 | Set up Decap CMS admin | 5 |
| 7 | Add video embed CSS | 5 |
| 8 | Update gallery JS | 5 |
| 9 | **Visual design review — 4 theme options** | 6, 7, 8 |
| 10 | Set up GitHub repository | 9 |
| 11 | Deploy to Cloudflare Pages | 10 |
| 12 | Clean up old files | 11 |

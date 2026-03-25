import express from 'express';
import matter from 'gray-matter';
import multer from 'multer';
import { readdir, readFile, writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const WORKS_DIR = join(ROOT, 'src', 'content', 'works');
const POSTS_DIR = join(ROOT, 'src', 'content', 'posts');
const IMAGES_DIR = join(ROOT, 'src', 'images');
const DATA_DIR = join(ROOT, 'src', '_data');
const ORDER_FILE = join(DATA_DIR, 'order.json');
const ABOUT_FILE = join(DATA_DIR, 'about.json');

const app = express();
app.use(express.json());

// Serve admin SPA static files
app.use(express.static(__dirname));

// Image upload config
const upload = multer({
  storage: multer.diskStorage({
    destination: IMAGES_DIR,
    filename: (req, file, cb) => {
      // Sanitize filename
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
      cb(null, safe);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

// --- Helpers ---

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function readMarkdownDir(dir) {
  const files = await readdir(dir);
  const items = [];
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const slug = file.replace('.md', '');
    const raw = await readFile(join(dir, file), 'utf-8');
    const { data, content } = matter(raw);
    items.push({ slug, ...data, body: content.trim() });
  }
  return items;
}

async function readMarkdownFile(dir, slug) {
  const filepath = join(dir, `${slug}.md`);
  const raw = await readFile(filepath, 'utf-8');
  const { data, content } = matter(raw);
  return { slug, ...data, body: content.trim() };
}

async function writeMarkdownFile(dir, slug, data) {
  const { body, ...frontmatter } = data;
  // Remove slug from frontmatter if present
  delete frontmatter.slug;
  const content = matter.stringify(body || '', frontmatter);
  await writeFile(join(dir, `${slug}.md`), content, 'utf-8');
}

async function readJsonFile(filepath) {
  const raw = await readFile(filepath, 'utf-8');
  return JSON.parse(raw);
}

async function writeJsonFile(filepath, data) {
  await writeFile(filepath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

// --- Works API ---

app.get('/api/works', async (req, res) => {
  try {
    const works = await readMarkdownDir(WORKS_DIR);
    res.json(works);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/works/:slug', async (req, res) => {
  try {
    const work = await readMarkdownFile(WORKS_DIR, req.params.slug);
    res.json(work);
  } catch (err) {
    res.status(404).json({ error: 'Work not found' });
  }
});

app.post('/api/works', async (req, res) => {
  try {
    const data = req.body;
    const slug = slugify(data.title);
    const filepath = join(WORKS_DIR, `${slug}.md`);
    if (existsSync(filepath)) {
      return res.status(409).json({ error: 'A work with this title already exists' });
    }
    await writeMarkdownFile(WORKS_DIR, slug, data);

    // Add to order.json
    const order = await readJsonFile(ORDER_FILE);
    const cat = data.category || 'painting';
    if (!order[cat]) order[cat] = [];
    if (!order[cat].includes(slug)) {
      order[cat].unshift(slug); // Add to beginning
    }
    await writeJsonFile(ORDER_FILE, order);

    res.status(201).json({ slug, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/works/:slug', async (req, res) => {
  try {
    const oldSlug = req.params.slug;
    const data = req.body;
    const newSlug = slugify(data.title);

    // If slug changed, handle rename
    if (newSlug !== oldSlug) {
      const oldPath = join(WORKS_DIR, `${oldSlug}.md`);
      if (existsSync(oldPath)) await unlink(oldPath);

      // Update order.json
      const order = await readJsonFile(ORDER_FILE);
      for (const cat of Object.keys(order)) {
        const idx = order[cat].indexOf(oldSlug);
        if (idx !== -1) order[cat][idx] = newSlug;
      }
      await writeJsonFile(ORDER_FILE, order);
    }

    await writeMarkdownFile(WORKS_DIR, newSlug, data);
    res.json({ slug: newSlug, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/works/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    await unlink(join(WORKS_DIR, `${slug}.md`));

    // Remove from order.json
    const order = await readJsonFile(ORDER_FILE);
    for (const cat of Object.keys(order)) {
      order[cat] = order[cat].filter(s => s !== slug);
    }
    await writeJsonFile(ORDER_FILE, order);

    res.json({ deleted: slug });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Posts API ---

app.get('/api/posts', async (req, res) => {
  try {
    const posts = await readMarkdownDir(POSTS_DIR);
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/posts/:slug', async (req, res) => {
  try {
    const post = await readMarkdownFile(POSTS_DIR, req.params.slug);
    res.json(post);
  } catch (err) {
    res.status(404).json({ error: 'Post not found' });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    const data = req.body;
    const slug = slugify(data.title);
    const filepath = join(POSTS_DIR, `${slug}.md`);
    if (existsSync(filepath)) {
      return res.status(409).json({ error: 'A post with this title already exists' });
    }
    await writeMarkdownFile(POSTS_DIR, slug, data);
    res.status(201).json({ slug, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/posts/:slug', async (req, res) => {
  try {
    const oldSlug = req.params.slug;
    const data = req.body;
    const newSlug = slugify(data.title);

    if (newSlug !== oldSlug) {
      const oldPath = join(POSTS_DIR, `${oldSlug}.md`);
      if (existsSync(oldPath)) await unlink(oldPath);
    }

    await writeMarkdownFile(POSTS_DIR, newSlug, data);
    res.json({ slug: newSlug, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/posts/:slug', async (req, res) => {
  try {
    await unlink(join(POSTS_DIR, `${req.params.slug}.md`));
    res.json({ deleted: req.params.slug });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Order API ---

app.get('/api/order', async (req, res) => {
  try {
    const order = await readJsonFile(ORDER_FILE);
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/order', async (req, res) => {
  try {
    await writeJsonFile(ORDER_FILE, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- About API ---

app.get('/api/about', async (req, res) => {
  try {
    const about = await readJsonFile(ABOUT_FILE);
    res.json(about);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/about', async (req, res) => {
  try {
    await writeJsonFile(ABOUT_FILE, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Image Upload ---

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded or invalid file type' });
  }
  res.json({ path: `/images/${req.file.filename}` });
});

// List uploaded images
app.get('/api/images', async (req, res) => {
  try {
    const files = await readdir(IMAGES_DIR);
    const images = files.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
    res.json(images.map(f => `/images/${f}`));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve images from src/images for preview
app.use('/images', express.static(IMAGES_DIR));

// SPA fallback — serve index.html for all non-API routes
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    res.sendFile(join(__dirname, 'index.html'));
  } else {
    next();
  }
});

const PORT = process.env.ADMIN_PORT || 4404;
app.listen(PORT, () => {
  console.log(`\n  Admin CMS running at http://localhost:${PORT}\n`);
});

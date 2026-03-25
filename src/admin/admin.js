/* === Admin SPA === */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// --- API helpers ---
async function api(path, opts = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// --- Toast ---
function toast(message, type = 'success') {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className = `toast ${type} show`;
  setTimeout(() => el.classList.remove('show'), 2500);
}

// --- Router ---
const routes = {
  '/': renderDashboard,
  '/works': renderWorks,
  '/works/new': renderWorkEditor,
  '/works/:slug': renderWorkEditor,
  '/posts': renderPosts,
  '/posts/new': renderPostEditor,
  '/posts/:slug': renderPostEditor,
  '/about': renderAbout,
};

function matchRoute(hash) {
  const path = hash.replace('#', '') || '/';
  // Exact match
  if (routes[path]) return { handler: routes[path], params: {} };
  // Parameterized match
  for (const [pattern, handler] of Object.entries(routes)) {
    const parts = pattern.split('/');
    const pathParts = path.split('/');
    if (parts.length !== pathParts.length) continue;
    const params = {};
    let match = true;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].startsWith(':')) {
        params[parts[i].slice(1)] = pathParts[i];
      } else if (parts[i] !== pathParts[i]) {
        match = false;
        break;
      }
    }
    if (match) return { handler, params };
  }
  return { handler: renderDashboard, params: {} };
}

let currentEasyMDE = null;

function navigate() {
  // Destroy EasyMDE if active
  if (currentEasyMDE) {
    currentEasyMDE.toTextArea();
    currentEasyMDE = null;
  }

  const { handler, params } = matchRoute(location.hash);
  handler(params);

  // Update active nav
  const page = location.hash.replace('#/', '').split('/')[0] || 'dashboard';
  $$('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === page);
  });
}

window.addEventListener('hashchange', navigate);
window.addEventListener('load', navigate);

// --- Dashboard ---
async function renderDashboard() {
  const content = $('#content');
  content.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const [works, posts] = await Promise.all([api('/works'), api('/posts')]);
    const paintings = works.filter(w => w.category === 'painting');
    const drawings = works.filter(w => w.category === 'drawing');
    const newMedia = works.filter(w => w.category === 'new-media');

    content.innerHTML = `
      <div class="page-header">
        <h2>Dashboard</h2>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">${works.length}</div>
          <div class="stat-label">Total Works</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${paintings.length}</div>
          <div class="stat-label">Paintings</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${drawings.length}</div>
          <div class="stat-label">Drawings &amp; Prints</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${newMedia.length}</div>
          <div class="stat-label">New Media</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${posts.length}</div>
          <div class="stat-label">Reflections</div>
        </div>
      </div>
      <div class="page-header">
        <h2>Recent Posts</h2>
        <a href="#/posts/new" class="btn btn-primary">+ New Post</a>
      </div>
      <div class="posts-list">
        ${posts.slice(0, 5).map(p => `
          <a href="#/posts/${p.slug}" class="post-row" style="text-decoration:none;color:inherit">
            <span class="post-date">${formatDate(p.date)}</span>
            <span class="post-title">${esc(p.title)}</span>
            <span class="post-tags">${(p.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</span>
          </a>
        `).join('')}
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><p>Error loading dashboard: ${esc(err.message)}</p></div>`;
  }
}

// --- Works ---
async function renderWorks() {
  const content = $('#content');
  content.innerHTML = '<div class="loading">Loading works...</div>';

  try {
    const [works, order] = await Promise.all([api('/works'), api('/order')]);
    const categories = [
      { key: 'painting', label: 'Painting' },
      { key: 'drawing', label: 'Drawing & Print' },
      { key: 'new-media', label: 'New Media' },
    ];

    content.innerHTML = `
      <div class="page-header">
        <h2>Works</h2>
        <a href="#/works/new" class="btn btn-primary">+ New Work</a>
      </div>
      ${categories.map(cat => {
        const catWorks = sortByOrder(
          works.filter(w => w.category === cat.key),
          order[cat.key] || []
        );
        return `
          <div class="category-section">
            <div class="category-header">
              <h3>${cat.label}</h3>
              <span class="category-count">${catWorks.length} works</span>
            </div>
            <div class="works-grid" data-category="${cat.key}">
              ${catWorks.map(w => workCard(w)).join('')}
            </div>
          </div>
        `;
      }).join('')}
    `;

    // Initialize SortableJS on each category grid
    $$('.works-grid').forEach(grid => {
      new Sortable(grid, {
        animation: 200,
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        onEnd: async () => {
          await saveOrder();
          toast('Order saved');
        }
      });
    });
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><p>Error: ${esc(err.message)}</p></div>`;
  }
}

function workCard(w) {
  const thumb = w.image
    ? `<img class="card-thumb" src="${esc(w.image)}" alt="${esc(w.title)}" loading="lazy">`
    : `<div class="card-thumb-placeholder">No image</div>`;
  return `
    <div class="work-card" data-slug="${esc(w.slug)}">
      ${thumb}
      <div class="card-info">
        <div class="card-title">${esc(w.title)}</div>
        <div class="card-year">${w.year || ''}</div>
      </div>
      <button class="card-edit" onclick="location.hash='#/works/${esc(w.slug)}'">Edit</button>
    </div>
  `;
}

function sortByOrder(items, orderList) {
  if (!orderList.length) return items;
  const orderMap = {};
  orderList.forEach((slug, i) => orderMap[slug] = i);
  return [...items].sort((a, b) => {
    const ai = orderMap[a.slug] ?? 9999;
    const bi = orderMap[b.slug] ?? 9999;
    if (ai !== bi) return ai - bi;
    return (b.year || 0) - (a.year || 0);
  });
}

async function saveOrder() {
  const order = {};
  $$('.works-grid').forEach(grid => {
    const cat = grid.dataset.category;
    order[cat] = $$('.work-card', grid).map(card => card.dataset.slug);
  });
  await api('/order', { method: 'PUT', body: order });
}

// --- Work Editor ---
async function renderWorkEditor(params) {
  const content = $('#content');
  const isNew = !params.slug || params.slug === 'new';
  let work = {
    title: '', year: new Date().getFullYear(), medium: '', dimensions: '',
    category: 'painting', image: '', video_file: '', video_embed: '',
    featured: false, body: ''
  };

  if (!isNew) {
    content.innerHTML = '<div class="loading">Loading...</div>';
    try {
      work = await api(`/works/${params.slug}`);
    } catch {
      content.innerHTML = '<div class="empty-state"><p>Work not found</p></div>';
      return;
    }
  }

  content.innerHTML = `
    <div class="page-header">
      <h2>${isNew ? 'New Work' : `Edit: ${esc(work.title)}`}</h2>
      <a href="#/works" class="btn btn-secondary">Back to Works</a>
    </div>
    <form id="work-form">
      <div class="form-grid">
        <div class="form-group">
          <label>Title</label>
          <input type="text" name="title" value="${esc(work.title)}" required>
        </div>
        <div class="form-group">
          <label>Year</label>
          <input type="number" name="year" value="${work.year || ''}" required>
        </div>
        <div class="form-group">
          <label>Medium</label>
          <input type="text" name="medium" value="${esc(work.medium || '')}">
        </div>
        <div class="form-group">
          <label>Dimensions</label>
          <input type="text" name="dimensions" value="${esc(work.dimensions || '')}" placeholder="e.g. 24 x 36 in.">
        </div>
        <div class="form-group">
          <label>Category</label>
          <select name="category">
            <option value="painting" ${work.category === 'painting' ? 'selected' : ''}>Painting</option>
            <option value="drawing" ${work.category === 'drawing' ? 'selected' : ''}>Drawing &amp; Print</option>
            <option value="new-media" ${work.category === 'new-media' ? 'selected' : ''}>New Media</option>
          </select>
        </div>
        <div class="form-group">
          <label class="toggle-group">
            <input type="checkbox" name="featured" ${work.featured ? 'checked' : ''}>
            Featured
          </label>
        </div>
        <div class="form-group full-width">
          <label>Image</label>
          <input type="text" name="image" value="${esc(work.image || '')}" placeholder="/images/filename.png">
          ${work.image ? `<img class="image-preview" src="${esc(work.image)}" alt="Preview">` : ''}
          <div class="image-upload-area" id="upload-area">
            <p>Click or drag to upload image</p>
            <input type="file" id="image-upload" accept="image/*">
          </div>
        </div>
        <div class="form-group">
          <label>Video File URL</label>
          <input type="text" name="video_file" value="${esc(work.video_file || '')}" placeholder="R2 video URL">
          <div class="hint">Paste the full R2 video URL</div>
        </div>
        <div class="form-group">
          <label>Video Embed URL</label>
          <input type="text" name="video_embed" value="${esc(work.video_embed || '')}" placeholder="Vimeo or YouTube URL">
        </div>
        <div class="form-group full-width">
          <label>Statement</label>
          <textarea name="body" id="editor-body">${esc(work.body || '')}</textarea>
        </div>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">${isNew ? 'Create Work' : 'Save Changes'}</button>
        <a href="#/works" class="btn btn-secondary">Cancel</a>
        ${!isNew ? `<button type="button" class="btn btn-danger" id="delete-btn">Delete</button>` : ''}
      </div>
    </form>
  `;

  // Initialize EasyMDE
  currentEasyMDE = new EasyMDE({
    element: $('#editor-body'),
    spellChecker: false,
    status: false,
    minHeight: '200px',
    toolbar: ['bold', 'italic', 'heading', '|', 'quote', 'unordered-list', 'ordered-list', '|', 'link', 'image', '|', 'preview', 'guide'],
  });

  // Image upload
  setupImageUpload('upload-area', 'image-upload', (path) => {
    $('input[name="image"]').value = path;
    const existing = $('.image-preview');
    if (existing) existing.src = path;
    else {
      const img = document.createElement('img');
      img.className = 'image-preview';
      img.src = path;
      $('input[name="image"]').after(img);
    }
  });

  // Form submit
  $('#work-form').onsubmit = async (e) => {
    e.preventDefault();
    const data = formData(e.target);
    data.body = currentEasyMDE.value();
    data.year = parseInt(data.year) || new Date().getFullYear();
    data.featured = !!e.target.featured.checked;

    try {
      if (isNew) {
        await api('/works', { method: 'POST', body: data });
        toast('Work created');
      } else {
        await api(`/works/${params.slug}`, { method: 'PUT', body: data });
        toast('Work saved');
      }
      location.hash = '#/works';
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  // Delete
  const deleteBtn = $('#delete-btn');
  if (deleteBtn) {
    deleteBtn.onclick = async () => {
      if (!confirm(`Delete "${work.title}"? This cannot be undone.`)) return;
      try {
        await api(`/works/${params.slug}`, { method: 'DELETE' });
        toast('Work deleted');
        location.hash = '#/works';
      } catch (err) {
        toast(err.message, 'error');
      }
    };
  }
}

// --- Posts ---
async function renderPosts() {
  const content = $('#content');
  content.innerHTML = '<div class="loading">Loading posts...</div>';

  try {
    const posts = await api('/posts');
    content.innerHTML = `
      <div class="page-header">
        <h2>Reflections</h2>
        <a href="#/posts/new" class="btn btn-primary">+ New Post</a>
      </div>
      ${posts.length ? `
        <div class="posts-list">
          ${posts.map(p => `
            <a href="#/posts/${p.slug}" class="post-row" style="text-decoration:none;color:inherit">
              <span class="post-date">${formatDate(p.date)}</span>
              <span class="post-title">${esc(p.title)}</span>
              <span class="post-tags">${(p.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</span>
              <span class="btn btn-sm btn-secondary">Edit</span>
            </a>
          `).join('')}
        </div>
      ` : `
        <div class="empty-state">
          <p>No posts yet.</p>
          <a href="#/posts/new" class="btn btn-primary">Write your first post</a>
        </div>
      `}
    `;
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><p>Error: ${esc(err.message)}</p></div>`;
  }
}

// --- Post Editor ---
async function renderPostEditor(params) {
  const content = $('#content');
  const isNew = !params.slug || params.slug === 'new';
  let post = { title: '', date: new Date().toISOString().slice(0, 10), tags: [], body: '' };

  if (!isNew) {
    content.innerHTML = '<div class="loading">Loading...</div>';
    try {
      post = await api(`/posts/${params.slug}`);
    } catch {
      content.innerHTML = '<div class="empty-state"><p>Post not found</p></div>';
      return;
    }
  }

  const tagsStr = (post.tags || []).join(', ');

  content.innerHTML = `
    <div class="page-header">
      <h2>${isNew ? 'New Post' : `Edit: ${esc(post.title)}`}</h2>
      <a href="#/posts" class="btn btn-secondary">Back to Posts</a>
    </div>
    <form id="post-form">
      <div class="form-grid">
        <div class="form-group full-width">
          <label>Title</label>
          <input type="text" name="title" value="${esc(post.title)}" required>
        </div>
        <div class="form-group">
          <label>Date</label>
          <input type="date" name="date" value="${(post.date || '').slice(0, 10)}">
        </div>
        <div class="form-group">
          <label>Tags</label>
          <input type="text" name="tags" value="${esc(tagsStr)}" placeholder="theory, practice">
          <div class="hint">Comma-separated</div>
        </div>
        <div class="form-group full-width">
          <label>Body</label>
          <textarea name="body" id="editor-body">${esc(post.body || '')}</textarea>
        </div>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">${isNew ? 'Publish Post' : 'Save Changes'}</button>
        <a href="#/posts" class="btn btn-secondary">Cancel</a>
        ${!isNew ? `<button type="button" class="btn btn-danger" id="delete-btn">Delete</button>` : ''}
      </div>
    </form>
  `;

  // Initialize EasyMDE
  currentEasyMDE = new EasyMDE({
    element: $('#editor-body'),
    spellChecker: false,
    status: false,
    minHeight: '300px',
    toolbar: ['bold', 'italic', 'heading', 'heading-2', 'heading-3', '|', 'quote', 'unordered-list', 'ordered-list', '|', 'link', 'image', 'horizontal-rule', '|', 'preview', 'side-by-side', 'fullscreen', '|', 'guide'],
  });

  // Form submit
  $('#post-form').onsubmit = async (e) => {
    e.preventDefault();
    const data = formData(e.target);
    data.body = currentEasyMDE.value();
    data.tags = data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    try {
      if (isNew) {
        await api('/posts', { method: 'POST', body: data });
        toast('Post published');
      } else {
        await api(`/posts/${params.slug}`, { method: 'PUT', body: data });
        toast('Post saved');
      }
      location.hash = '#/posts';
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  // Delete
  const deleteBtn = $('#delete-btn');
  if (deleteBtn) {
    deleteBtn.onclick = async () => {
      if (!confirm(`Delete "${post.title}"?`)) return;
      try {
        await api(`/posts/${params.slug}`, { method: 'DELETE' });
        toast('Post deleted');
        location.hash = '#/posts';
      } catch (err) {
        toast(err.message, 'error');
      }
    };
  }
}

// --- About ---
async function renderAbout() {
  const content = $('#content');
  content.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const about = await api('/about');

    content.innerHTML = `
      <div class="page-header">
        <h2>About Page</h2>
      </div>
      <form id="about-form">
        <div class="about-section">
          <h3>Bio</h3>
          <div class="form-group">
            <textarea name="bio" rows="2">${esc(about.bio || '')}</textarea>
          </div>
        </div>

        <div class="about-section">
          <h3>Artist Statement</h3>
          <div id="statement-entries">
            ${(about.artist_statement || []).map((p, i) => `
              <div class="form-group" data-index="${i}">
                <textarea name="statement_${i}" rows="3">${esc(p)}</textarea>
                <button type="button" class="btn-remove" onclick="this.closest('.form-group').remove()">&times;</button>
              </div>
            `).join('')}
          </div>
          <button type="button" class="btn-add-entry" id="add-statement">+ Add Paragraph</button>
        </div>

        <div class="about-section">
          <h3>Education</h3>
          <div class="entry-list" id="education-entries">
            ${(about.education || []).map((e, i) => educationRow(e, i)).join('')}
          </div>
          <button type="button" class="btn-add-entry" id="add-education">+ Add Education</button>
        </div>

        <div class="about-section">
          <h3>Exhibition Record</h3>
          <div class="entry-list" id="exhibition-entries">
            ${(about.exhibitions || []).map((e, i) => exhibitionRow(e, i)).join('')}
          </div>
          <button type="button" class="btn-add-entry" id="add-exhibition">+ Add Exhibition</button>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Save About Page</button>
        </div>
      </form>
    `;

    // Add paragraph
    $('#add-statement').onclick = () => {
      const container = $('#statement-entries');
      const idx = container.children.length;
      const div = document.createElement('div');
      div.className = 'form-group';
      div.dataset.index = idx;
      div.innerHTML = `
        <textarea name="statement_${idx}" rows="3" placeholder="New paragraph..."></textarea>
        <button type="button" class="btn-remove" onclick="this.closest('.form-group').remove()">&times;</button>
      `;
      container.appendChild(div);
    };

    // Add education
    $('#add-education').onclick = () => {
      const container = $('#education-entries');
      const idx = container.children.length;
      const div = document.createElement('div');
      div.className = 'entry-row';
      div.innerHTML = `
        <input type="number" name="edu_year_${idx}" placeholder="Year">
        <input type="text" name="edu_degree_${idx}" placeholder="Degree (e.g. MFA)">
        <input type="text" name="edu_field_${idx}" placeholder="Field">
        <input type="text" name="edu_school_${idx}" placeholder="School">
        <button type="button" class="btn-remove" onclick="this.closest('.entry-row').remove()">&times;</button>
      `;
      container.appendChild(div);
    };

    // Add exhibition
    $('#add-exhibition').onclick = () => {
      const container = $('#exhibition-entries');
      const idx = container.children.length;
      const div = document.createElement('div');
      div.className = 'entry-row exhibition-row';
      div.innerHTML = `
        <input type="number" name="exh_year_${idx}" placeholder="Year">
        <input type="text" name="exh_title_${idx}" placeholder="Exhibition Title">
        <input type="text" name="exh_venue_${idx}" placeholder="Venue">
        <input type="text" name="exh_location_${idx}" placeholder="Location">
        <button type="button" class="btn-remove" onclick="this.closest('.entry-row').remove()">&times;</button>
      `;
      container.appendChild(div);
    };

    // Save
    $('#about-form').onsubmit = async (e) => {
      e.preventDefault();

      const data = {
        bio: $('textarea[name="bio"]').value,
        artist_statement: [],
        education: [],
        exhibitions: [],
      };

      // Collect statement paragraphs
      $$('#statement-entries textarea').forEach(ta => {
        const val = ta.value.trim();
        if (val) data.artist_statement.push(val);
      });

      // Collect education
      $$('#education-entries .entry-row').forEach(row => {
        const inputs = $$('input', row);
        const entry = {
          year: parseInt(inputs[0].value) || 0,
          degree: inputs[1].value.trim(),
          field: inputs[2].value.trim(),
          school: inputs[3].value.trim(),
        };
        if (entry.degree || entry.school) data.education.push(entry);
      });

      // Collect exhibitions
      $$('#exhibition-entries .entry-row').forEach(row => {
        const inputs = $$('input', row);
        const entry = {
          year: parseInt(inputs[0].value) || 0,
          title: inputs[1].value.trim(),
          venue: inputs[2].value.trim(),
          location: inputs[3].value.trim(),
        };
        if (entry.title) data.exhibitions.push(entry);
      });

      try {
        await api('/about', { method: 'PUT', body: data });
        toast('About page saved');
      } catch (err) {
        toast(err.message, 'error');
      }
    };
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><p>Error: ${esc(err.message)}</p></div>`;
  }
}

function educationRow(e, i) {
  return `
    <div class="entry-row">
      <input type="number" name="edu_year_${i}" value="${e.year || ''}" placeholder="Year">
      <input type="text" name="edu_degree_${i}" value="${esc(e.degree || '')}" placeholder="Degree">
      <input type="text" name="edu_field_${i}" value="${esc(e.field || '')}" placeholder="Field">
      <input type="text" name="edu_school_${i}" value="${esc(e.school || '')}" placeholder="School">
      <button type="button" class="btn-remove" onclick="this.closest('.entry-row').remove()">&times;</button>
    </div>
  `;
}

function exhibitionRow(e, i) {
  return `
    <div class="entry-row exhibition-row">
      <input type="number" name="exh_year_${i}" value="${e.year || ''}" placeholder="Year">
      <input type="text" name="exh_title_${i}" value="${esc(e.title || '')}" placeholder="Title">
      <input type="text" name="exh_venue_${i}" value="${esc(e.venue || '')}" placeholder="Venue">
      <input type="text" name="exh_location_${i}" value="${esc(e.location || '')}" placeholder="Location">
      <button type="button" class="btn-remove" onclick="this.closest('.entry-row').remove()">&times;</button>
    </div>
  `;
}

// --- Utilities ---

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formData(form) {
  const data = {};
  new FormData(form).forEach((val, key) => {
    data[key] = val;
  });
  return data;
}

function setupImageUpload(areaId, inputId, onUpload) {
  const area = document.getElementById(areaId);
  const input = document.getElementById(inputId);
  if (!area || !input) return;

  area.onclick = () => input.click();

  area.ondragover = (e) => { e.preventDefault(); area.style.borderColor = 'var(--accent)'; };
  area.ondragleave = () => { area.style.borderColor = ''; };
  area.ondrop = async (e) => {
    e.preventDefault();
    area.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    if (file) await uploadFile(file, onUpload);
  };

  input.onchange = async () => {
    if (input.files[0]) await uploadFile(input.files[0], onUpload);
  };
}

async function uploadFile(file, onUpload) {
  const formData = new FormData();
  formData.append('image', file);
  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.path) {
      onUpload(data.path);
      toast('Image uploaded');
    } else {
      toast(data.error || 'Upload failed', 'error');
    }
  } catch (err) {
    toast('Upload failed', 'error');
  }
}

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchFile, writeFile, deleteFile, uploadImage } from '../api/github';
import { parseFrontmatter, serializeFrontmatter } from '../api/frontmatter';

const CATEGORIES = [
  { value: 'painting', label: 'Painting' },
  { value: 'drawing', label: 'Drawing & Print' },
  { value: 'new-media', label: 'New Media' },
];

export default function WorkEditor({ works, isNew, onSave }) {
  const { slug } = useParams();
  const navigate = useNavigate();

  const existingWork = useMemo(
    () => works.find((w) => w.slug === slug),
    [works, slug]
  );

  const [form, setForm] = useState({
    title: '',
    year: new Date().getFullYear(),
    order: 100,
    medium: '',
    dimensions: '',
    category: 'painting',
    image: '',
    video_file: '',
    video_embed: '',
    featured: false,
    body: '',
  });
  const [sha, setSha] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    if (existingWork && !isNew) {
      setForm({
        title: existingWork.title || '',
        year: existingWork.year || new Date().getFullYear(),
        order: existingWork.order ?? 100,
        medium: existingWork.medium || '',
        dimensions: existingWork.dimensions || '',
        category: existingWork.category || 'painting',
        image: existingWork.image || '',
        video_file: existingWork.video_file || '',
        video_embed: existingWork.video_embed || '',
        featured: existingWork.featured || false,
        body: existingWork.body || '',
      });
      setSha(existingWork.sha);
    }
  }, [existingWork, isNew]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show local preview
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);

    // Upload to GitHub
    const base64Reader = new FileReader();
    base64Reader.onload = async (ev) => {
      const base64 = ev.target.result.split(',')[1];
      try {
        const result = await uploadImage(file.name, base64, `Upload ${file.name}`);
        handleChange('image', result.path);
        setImagePreview(null); // Clear preview, will use the committed URL
      } catch (err) {
        console.error('Upload failed:', err);
        alert('Image upload failed.');
      }
    };
    base64Reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      alert('Title is required.');
      return;
    }

    setSaving(true);
    try {
      const fileSlug = isNew
        ? form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        : slug;
      const path = `src/content/works/${fileSlug}.md`;
      const content = serializeFrontmatter(form, form.body);
      const message = isNew
        ? `Add work: ${form.title}`
        : `Update work: ${form.title}`;

      await writeFile(path, content, message, sha);
      await onSave();
      navigate('/');
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save — check console.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${form.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteFile(`src/content/works/${slug}.md`, `Delete work: ${form.title}`, sha);
      await onSave();
      navigate('/');
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete.');
    } finally {
      setDeleting(false);
    }
  };

  // Resolve image for preview
  const previewImageUrl = imagePreview || (
    form.image
      ? form.image.startsWith('http')
        ? form.image
        : `https://raw.githubusercontent.com/${import.meta.env.VITE_GITHUB_REPO}/${import.meta.env.VITE_GITHUB_BRANCH}/src${form.image}`
      : null
  );

  return (
    <div className="editor">
      <header className="editor-header">
        <button className="btn-back" onClick={() => navigate('/')}>
          &larr; Back to Works
        </button>
        <h2 className="editor-title">
          {isNew ? 'New Work' : `Edit: ${form.title}`}
        </h2>
      </header>

      <div className="editor-layout">
        {/* Form */}
        <div className="editor-form">
          <div className="field">
            <label className="field-label">Title</label>
            <input
              type="text"
              className="field-input"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label className="field-label">Year</label>
              <input
                type="number"
                className="field-input"
                value={form.year}
                onChange={(e) => handleChange('year', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="field">
              <label className="field-label">Display Order</label>
              <input
                type="number"
                className="field-input"
                value={form.order}
                onChange={(e) => handleChange('order', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="field">
            <label className="field-label">Medium</label>
            <input
              type="text"
              className="field-input"
              value={form.medium}
              onChange={(e) => handleChange('medium', e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field-label">Dimensions</label>
            <input
              type="text"
              className="field-input"
              value={form.dimensions}
              onChange={(e) => handleChange('dimensions', e.target.value)}
              placeholder="e.g. 24 x 24 in."
            />
          </div>

          <div className="field">
            <label className="field-label">Category</label>
            <select
              className="field-input"
              value={form.category}
              onChange={(e) => handleChange('category', e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label">Image</label>
            <div className="field-image-upload">
              <input
                type="text"
                className="field-input"
                value={form.image}
                onChange={(e) => handleChange('image', e.target.value)}
                placeholder="/images/filename.jpg or full URL"
              />
              <label className="btn btn-secondary upload-btn">
                Upload
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          <div className="field">
            <label className="field-label">Video File URL</label>
            <input
              type="text"
              className="field-input"
              value={form.video_file}
              onChange={(e) => handleChange('video_file', e.target.value)}
              placeholder="https://media.zach-miller-studio.com/..."
            />
          </div>

          <div className="field">
            <label className="field-label">Video Embed URL</label>
            <input
              type="text"
              className="field-input"
              value={form.video_embed}
              onChange={(e) => handleChange('video_embed', e.target.value)}
              placeholder="Vimeo or YouTube embed URL"
            />
          </div>

          <div className="field field-checkbox">
            <label>
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => handleChange('featured', e.target.checked)}
              />
              <span className="field-label">Featured on Homepage</span>
            </label>
          </div>

          <div className="field">
            <label className="field-label">Artist Statement</label>
            <textarea
              className="field-textarea"
              rows={8}
              value={form.body}
              onChange={(e) => handleChange('body', e.target.value)}
              placeholder="Markdown supported..."
            />
          </div>

          <div className="editor-actions">
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : isNew ? 'Create Work' : 'Save Changes'}
            </button>
            {!isNew && (
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Work'}
              </button>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="editor-preview">
          <h3 className="preview-heading">Preview</h3>
          <div className="preview-card">
            {previewImageUrl ? (
              <img src={previewImageUrl} alt={form.title} className="preview-image" />
            ) : form.video_file ? (
              <video
                src={form.video_file}
                className="preview-image"
                controls
                muted
              />
            ) : (
              <div className="preview-placeholder">No image or video</div>
            )}
            <div className="preview-meta">
              <div className="preview-meta-row">
                <span className="preview-label">Title</span>
                <span className="preview-value">{form.title || '—'}</span>
              </div>
              <div className="preview-meta-row">
                <span className="preview-label">Year</span>
                <span className="preview-value">{form.year}</span>
              </div>
              <div className="preview-meta-row">
                <span className="preview-label">Medium</span>
                <span className="preview-value">{form.medium || '—'}</span>
              </div>
              <div className="preview-meta-row">
                <span className="preview-label">Dimensions</span>
                <span className="preview-value">{form.dimensions || '—'}</span>
              </div>
              <div className="preview-meta-row">
                <span className="preview-label">Category</span>
                <span className="preview-value">
                  {CATEGORIES.find((c) => c.value === form.category)?.label}
                </span>
              </div>
            </div>
            {form.body && (
              <div className="preview-statement">
                <p>{form.body}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

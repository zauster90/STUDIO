import React, { useState, useEffect } from 'react';
import { listFiles, uploadImage } from '../api/github';

export default function MediaLibrary() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState('');

  const loadImages = async () => {
    setLoading(true);
    try {
      const files = await listFiles('src/images');
      const imageFiles = files
        .filter((f) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.name))
        .map((f) => ({
          name: f.name,
          path: `/images/${f.name}`,
          size: f.size,
          sha: f.sha,
          rawUrl: `https://raw.githubusercontent.com/${import.meta.env.VITE_GITHUB_REPO}/${import.meta.env.VITE_GITHUB_BRANCH}/${f.path}`,
        }));
      setImages(imageFiles);
    } catch (err) {
      console.error('Failed to load images:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(',')[1];
      try {
        await uploadImage(file.name, base64);
        await loadImages();
      } catch (err) {
        console.error('Upload failed:', err);
        alert('Upload failed — check console.');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const copyPath = (path) => {
    navigator.clipboard.writeText(path);
  };

  const filteredImages = filter
    ? images.filter((img) => img.name.toLowerCase().includes(filter.toLowerCase()))
    : images;

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="media-library">
      <header className="dashboard-header">
        <div className="dashboard-title-row">
          <h2 className="dashboard-title">Media Library</h2>
          <div className="dashboard-actions">
            <label className={`btn btn-primary ${uploading ? 'disabled' : ''}`}>
              {uploading ? 'Uploading...' : '+ Upload Image'}
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        <div className="media-filter">
          <input
            type="text"
            className="field-input"
            placeholder="Filter images..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <span className="media-count">{filteredImages.length} images</span>
        </div>
      </header>

      {loading ? (
        <div className="cms-loading">
          <p>Loading images from GitHub...</p>
        </div>
      ) : (
        <div className="media-grid">
          {filteredImages.map((img) => (
            <div key={img.name} className="media-card">
              <div className="media-card-image">
                <img src={img.rawUrl} alt={img.name} loading="lazy" />
              </div>
              <div className="media-card-info">
                <span className="media-card-name" title={img.name}>
                  {img.name}
                </span>
                <span className="media-card-size">{formatSize(img.size)}</span>
              </div>
              <button
                className="media-card-copy"
                onClick={() => copyPath(img.path)}
                title="Copy path"
              >
                Copy Path
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function SortableWorkCard({ work, disabled, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: work.slug,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  // Resolve image URL — handle both local and R2 CDN paths
  const imageUrl = work.image
    ? work.image.startsWith('http')
      ? work.image
      : `https://raw.githubusercontent.com/${import.meta.env.VITE_GITHUB_REPO}/${import.meta.env.VITE_GITHUB_BRANCH}/src${work.image}`
    : null;

  const categoryLabel = {
    painting: 'Paint',
    drawing: 'Draw',
    'new-media': 'Media',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`work-card ${isDragging ? 'dragging' : ''} ${disabled ? '' : 'draggable'}`}
      {...attributes}
      {...listeners}
    >
      <div className="work-card-image" onClick={onClick}>
        {imageUrl ? (
          <img src={imageUrl} alt={work.title} loading="lazy" />
        ) : (
          <div className="work-card-placeholder">
            {work.video_file ? 'Video' : 'No image'}
          </div>
        )}
        <div className="work-card-overlay">
          <span className="work-card-title">{work.title}</span>
          <span className="work-card-year">{work.year}</span>
        </div>
      </div>
      <div className="work-card-meta">
        <span className="work-card-order">#{work.order ?? '—'}</span>
        <span className={`work-card-category cat-${work.category}`}>
          {categoryLabel[work.category] || work.category}
        </span>
        {work.featured && <span className="work-card-featured">Featured</span>}
      </div>
    </div>
  );
}

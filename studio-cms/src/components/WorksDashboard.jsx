import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import SortableWorkCard from './SortableWorkCard';
import { batchCommit } from '../api/github';
import { updateOrderInRaw } from '../api/frontmatter';

const CATEGORIES = [
  { key: 'all', label: 'All Works' },
  { key: 'painting', label: 'Painting' },
  { key: 'drawing', label: 'Drawing & Print' },
  { key: 'new-media', label: 'New Media' },
];

export default function WorksDashboard({ works, setWorks, loading, onRefresh }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const navigate = useNavigate();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const filteredWorks = useMemo(() => {
    if (activeCategory === 'all') return works;
    return works.filter((w) => w.category === activeCategory);
  }, [works, activeCategory]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const worksInCategory =
      activeCategory === 'all'
        ? works
        : works.filter((w) => w.category === activeCategory);

    const oldIndex = worksInCategory.findIndex((w) => w.slug === active.id);
    const newIndex = worksInCategory.findIndex((w) => w.slug === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(worksInCategory, oldIndex, newIndex);

    // Assign new sequential order values
    const updatedSlugs = new Map();
    reordered.forEach((work, i) => {
      updatedSlugs.set(work.slug, i + 1);
    });

    // Update the full works array with new order values
    const newWorks = works.map((w) => {
      if (updatedSlugs.has(w.slug)) {
        return { ...w, order: updatedSlugs.get(w.slug) };
      }
      return w;
    });

    // Re-sort the full array
    newWorks.sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return (a.order ?? 100) - (b.order ?? 100);
    });

    setWorks(newWorks);
    setHasChanges(true);
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      // Build file updates for all works that have order changes
      const files = works.map((work) => ({
        path: work.path,
        content: updateOrderInRaw(work.raw, work.order),
      }));

      await batchCommit(files, 'Reorder works via Studio CMS');

      // Update raw content in state
      setWorks(
        works.map((w) => ({
          ...w,
          raw: updateOrderInRaw(w.raw, w.order),
        }))
      );

      setHasChanges(false);
    } catch (err) {
      console.error('Failed to save order:', err);
      alert('Failed to save — check console for details.');
    } finally {
      setSaving(false);
    }
  };

  const counts = useMemo(() => {
    const c = { all: works.length, painting: 0, drawing: 0, 'new-media': 0 };
    works.forEach((w) => { if (c[w.category] !== undefined) c[w.category]++; });
    return c;
  }, [works]);

  if (loading) {
    return (
      <div className="cms-loading">
        <p>Loading works from GitHub...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-title-row">
          <h2 className="dashboard-title">Works</h2>
          <div className="dashboard-actions">
            {hasChanges && (
              <button
                className="btn btn-primary"
                onClick={handleSaveOrder}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Order'}
              </button>
            )}
            <button className="btn btn-secondary" onClick={onRefresh}>
              Refresh
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/work/new')}
            >
              + New Work
            </button>
          </div>
        </div>

        <div className="category-tabs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              className={`category-tab ${activeCategory === cat.key ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.key)}
            >
              {cat.label}
              <span className="category-count">{counts[cat.key]}</span>
            </button>
          ))}
        </div>

        {activeCategory !== 'all' && (
          <p className="drag-hint">
            Drag works to reorder them. Changes are saved when you click "Save Order".
          </p>
        )}
        {activeCategory === 'all' && (
          <p className="drag-hint">
            Select a category to enable drag-and-drop reordering.
          </p>
        )}
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={filteredWorks.map((w) => w.slug)}
          strategy={rectSortingStrategy}
          disabled={activeCategory === 'all'}
        >
          <div className="works-grid">
            {filteredWorks.map((work) => (
              <SortableWorkCard
                key={work.slug}
                work={work}
                disabled={activeCategory === 'all'}
                onClick={() => navigate(`/work/${work.slug}`)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

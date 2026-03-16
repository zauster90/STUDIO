import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated } from './auth/github';
import { listFiles, fetchFile } from './api/github';
import { parseFrontmatter } from './api/frontmatter';
import Layout from './components/Layout';
import LoginScreen from './components/LoginScreen';
import WorksDashboard from './components/WorksDashboard';
import WorkEditor from './components/WorkEditor';
import MediaLibrary from './components/MediaLibrary';

export default function App() {
  const [authed, setAuthed] = useState(isAuthenticated());
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadWorks = useCallback(async () => {
    setLoading(true);
    try {
      const files = await listFiles('src/content/works');
      const mdFiles = files.filter((f) => f.name.endsWith('.md'));

      const worksData = await Promise.all(
        mdFiles.map(async (file) => {
          const { content, sha } = await fetchFile(file.path);
          const { data, body } = parseFrontmatter(content);
          return {
            slug: file.name.replace('.md', ''),
            path: file.path,
            sha,
            raw: content,
            ...data,
            body,
          };
        })
      );

      // Sort by order within each category
      worksData.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
      setWorks(worksData);
    } catch (err) {
      console.error('Failed to load works:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) loadWorks();
  }, [authed, loadWorks]);

  if (!authed) {
    return <LoginScreen onLogin={() => setAuthed(true)} />;
  }

  return (
    <Layout>
      <Routes>
        <Route
          path="/"
          element={
            <WorksDashboard
              works={works}
              setWorks={setWorks}
              loading={loading}
              onRefresh={loadWorks}
            />
          }
        />
        <Route
          path="/work/:slug"
          element={
            <WorkEditor
              works={works}
              onSave={loadWorks}
            />
          }
        />
        <Route
          path="/work/new"
          element={
            <WorkEditor
              works={works}
              isNew
              onSave={loadWorks}
            />
          }
        />
        <Route path="/media" element={<MediaLibrary />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}

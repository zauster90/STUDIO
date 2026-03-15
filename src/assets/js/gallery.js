/* ═══════════════════════════════════════════════════════════════════════════
   gallery.js — Submenu filtering + hash-based navigation for gallery grid
   Zach Miller Studio — v2.0
═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var subItems = document.querySelectorAll('.nav-subitem[data-filter]');
    var sections = document.querySelectorAll('section[id]');

    if (!subItems.length || !sections.length) return;

    function showSection(targetId) {
      // Update active nav state
      subItems.forEach(function (link) {
        if (link.dataset.filter === targetId) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });

      // Show/hide sections
      sections.forEach(function (section) {
        if (section.id === targetId) {
          section.style.display = '';
          section.classList.add('revealed');
        } else {
          section.style.display = 'none';
        }
      });
    }

    function showAll() {
      subItems.forEach(function (link) { link.classList.remove('active'); });
      sections.forEach(function (section) {
        section.style.display = '';
        section.classList.add('revealed');
      });
    }

    // Click handling
    subItems.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var filter = link.dataset.filter;
        window.location.hash = filter;
        showSection(filter);

        // Scroll to the section
        var target = document.getElementById(filter);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    // Apply filter from URL hash on load
    var hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById(hash)) {
      showSection(hash);
    } else {
      showAll();
    }
  });
})();

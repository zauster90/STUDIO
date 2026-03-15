/* ═══════════════════════════════════════════════════════════════════════════
   lightbox.js — Simple image lightbox for work detail pages
   Zach Miller Studio — v2.0
═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var lightbox = document.getElementById('lightbox');
    if (!lightbox) return;

    var lbImg = lightbox.querySelector('img');
    var triggers = document.querySelectorAll('[data-lightbox]');

    triggers.forEach(function (img) {
      img.addEventListener('click', function () {
        lbImg.src = img.src;
        lbImg.alt = img.alt;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
    });

    lightbox.addEventListener('click', function () {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lightbox.classList.contains('active')) {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  });
})();

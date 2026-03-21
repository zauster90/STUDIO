/* ═══════════════════════════════════════════════════════════════════════════
   effects.js — Scroll reveals + cursor-reactive gradient field
   Zach Miller Studio — v2.0
═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Scroll reveal ── */
  function initReveal() {
    var els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });

    els.forEach(function (el) { observer.observe(el); });
  }

  /* ── Gradient field (cursor-reactive background orbs) ── */
  function initGradients() {
    var field = document.querySelector('.gradient-field');
    if (!field) return;

    var gradients = field.querySelectorAll('.gradient');
    if (!gradients.length) return;

    // Initialize orb positions and sizes
    gradients.forEach(function (g) {
      var hx = parseFloat(g.dataset.hx) || 50;
      var hy = parseFloat(g.dataset.hy) || 50;
      var spread = parseFloat(g.dataset.spread) || 50;
      var color = g.dataset.color || 'rgba(255, 248, 240, 0.3)';

      g.style.width = spread + 'vw';
      g.style.height = spread + 'vw';
      g.style.left = hx + '%';
      g.style.top = hy + '%';
      g.style.transform = 'translate(-50%, -50%)';
      g.style.background = 'radial-gradient(circle, ' + color + ', transparent 70%)';
      g.style.filter = 'blur(40px)';
    });

    // Cursor tracking — reduce blur on nearby orbs
    var isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) return; // Skip on mobile for performance

    document.addEventListener('mousemove', function (e) {
      var cx = e.clientX / window.innerWidth;
      var cy = e.clientY / window.innerHeight;

      gradients.forEach(function (g) {
        var hx = (parseFloat(g.dataset.hx) || 50) / 100;
        var hy = (parseFloat(g.dataset.hy) || 50) / 100;
        var pull = parseFloat(g.dataset.pull) || 0.15;

        var dx = cx - hx;
        var dy = cy - hy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var blur = Math.min(dist * 80, 48);

        g.style.filter = 'blur(' + blur + 'px)';

        // Subtle drift toward cursor
        var ox = dx * pull * 30;
        var oy = dy * pull * 30;
        g.style.transform = 'translate(calc(-50% + ' + ox + 'px), calc(-50% + ' + oy + 'px))';
      });
    });
  }

  /* ── Mobile menu toggle ── */
  function initMenuToggle() {
    var btn = document.querySelector('.menu-toggle');
    var nav = document.querySelector('.nav-collapse');
    if (!btn || !nav) return;

    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('open');
    });

    // Close menu when a nav link is clicked
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        btn.setAttribute('aria-expanded', 'false');
        nav.classList.remove('open');
      });
    });
  }

  /* ── Init ── */
  document.addEventListener('DOMContentLoaded', function () {
    initReveal();
    initGradients();
    initMenuToggle();
  });
})();

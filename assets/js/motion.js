/* Motion and pointer polish for acetechlimited.net.
   Everything here is additive. If this file fails to load, or the browser is
   old, or the visitor has asked for reduced motion, the page still renders
   complete and readable, just without the flourishes. */
(function () {
  'use strict';

  var mq = window.matchMedia ? window.matchMedia.bind(window) : null;
  var reduced = mq ? mq('(prefers-reduced-motion: reduce)').matches : false;
  var finePointer = mq ? mq('(pointer: fine)').matches : false;
  var canObserve = 'IntersectionObserver' in window;

  /* ------------------------------------------------------------------
     Scroll reveal

     The hidden state is applied from JavaScript, never from the stylesheet,
     so a broken script can't leave the page blank. A timer forces everything
     visible as a backstop if the observer never fires.
     ------------------------------------------------------------------ */

  var GROUPS = [
    { sel: '.hero-copy > *', step: 85 },
    { sel: '.monitor', step: 0, delay: 320 },
    { sel: '.section > .wrap > .label', step: 0 },
    { sel: '.section > .wrap > h2', step: 0, delay: 70 },
    { sel: '.section > .wrap > .section-lede', step: 0, delay: 130 },
    { sel: '.grid > .card', step: 55 },
    { sel: '.steps > .step', step: 75 },
    { sel: '.stats > .stat', step: 60 },
    { sel: '.arch > .arch-col', step: 75 },
    { sel: '.why-list > li', step: 55 },
    { sel: '.why-copy > *', step: 70 },
    { sel: '.case-head > div', step: 90 },
    { sel: '.cta-inner > *', step: 80 },
    { sel: '.footer-inner > *', step: 90 }
  ];

  function markReveals() {
    var all = [];
    GROUPS.forEach(function (g) {
      var seen = [];
      var counts = [];
      Array.prototype.forEach.call(document.querySelectorAll(g.sel), function (el) {
        if (el.classList.contains('reveal')) return;
        var p = el.parentElement;
        var idx = seen.indexOf(p);
        if (idx === -1) { seen.push(p); counts.push(0); idx = seen.length - 1; }
        var n = counts[idx]++;
        el.style.setProperty('--rd', ((g.delay || 0) + n * (g.step || 0)) + 'ms');
        el.classList.add('reveal');
        all.push(el);
      });
    });
    return all;
  }

  function showAll(els) {
    els.forEach(function (el) { el.classList.add('in'); });
  }

  function setupReveal() {
    if (reduced || !canObserve) return;
    var els = markReveals();
    if (!els.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    els.forEach(function (el) { io.observe(el); });

    /* backstop: nothing stays hidden for longer than this, whatever happens */
    setTimeout(function () { showAll(els); }, 3000);
  }

  /* ------------------------------------------------------------------
     Counting numbers in the proof strip
     ------------------------------------------------------------------ */

  function easeOutExpo(x) { return x === 1 ? 1 : 1 - Math.pow(2, -10 * x); }

  function countUp(el) {
    var raw = el.textContent.trim();
    var m = raw.match(/^([^\d]*)([\d][\d.,]*)(.*)$/);
    if (!m) return;
    var pre = m[1], numStr = m[2].replace(/,/g, ''), suf = m[3];
    var target = parseFloat(numStr);
    if (!isFinite(target)) return;
    var dot = numStr.indexOf('.');
    var decimals = dot === -1 ? 0 : numStr.length - dot - 1;
    var grouped = m[2].indexOf(',') !== -1;

    function fmt(v) {
      var s = v.toFixed(decimals);
      if (grouped) s = Number(s).toLocaleString('en-US', {
        minimumFractionDigits: decimals, maximumFractionDigits: decimals
      });
      return pre + s + suf;
    }

    var dur = 1500, t0 = null;
    el.textContent = fmt(0);
    function frame(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      el.textContent = fmt(target * easeOutExpo(p));
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = raw;
    }
    requestAnimationFrame(frame);
  }

  function setupCounters() {
    if (reduced || !canObserve) return;
    var nums = document.querySelectorAll('.stat-num');
    if (!nums.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { countUp(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    Array.prototype.forEach.call(nums, function (n) { io.observe(n); });
  }

  /* ------------------------------------------------------------------
     Cards light up under the pointer
     ------------------------------------------------------------------ */

  function setupSpotlight() {
    if (!finePointer) return;
    var cards = document.querySelectorAll('.card, .step, .arch-col, .case, .stat');
    if (!cards.length) return;
    var pending = false, queue = [];

    function flush() {
      pending = false;
      queue.forEach(function (j) {
        j.el.style.setProperty('--mx', j.x + '%');
        j.el.style.setProperty('--my', j.y + '%');
      });
      queue.length = 0;
    }

    Array.prototype.forEach.call(cards, function (el) {
      el.classList.add('lit');
      el.addEventListener('pointermove', function (ev) {
        var r = el.getBoundingClientRect();
        queue.push({
          el: el,
          x: Math.round(((ev.clientX - r.left) / r.width) * 100),
          y: Math.round(((ev.clientY - r.top) / r.height) * 100)
        });
        if (!pending) { pending = true; requestAnimationFrame(flush); }
      }, { passive: true });
    });
  }

  /* ------------------------------------------------------------------
     Scroll progress
     ------------------------------------------------------------------ */

  function setupProgress() {
    var bar = document.createElement('div');
    bar.className = 'progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    var ticking = false;
    function update() {
      ticking = false;
      var max = Math.max(1, document.body.scrollHeight - window.innerHeight);
      bar.style.transform = 'scaleX(' + Math.min(1, window.scrollY / max) + ')';
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ------------------------------------------------------------------
     Custom cursor

     Desktop mice only. Touch and trackpad-less browsing keep the native
     cursor, as does anyone who has asked for reduced motion.
     ------------------------------------------------------------------ */

  var HOT = 'a, button, [role="button"], .card, .step, .arch-col, .stat, summary';

  function setupCursor() {
    if (!finePointer || reduced) return;
    if (!mq('(min-width: 900px)').matches) return;

    var dot = document.createElement('div');
    var ring = document.createElement('div');
    dot.className = 'cur-dot';
    ring.className = 'cur-ring';
    dot.setAttribute('aria-hidden', 'true');
    ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring);
    document.body.appendChild(dot);
    document.body.classList.add('has-cursor');

    var tx = window.innerWidth / 2, ty = window.innerHeight / 2;
    var rx = tx, ry = ty;
    var visible = false;

    document.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      tx = e.clientX; ty = e.clientY;
      if (!visible) {
        visible = true;
        rx = tx; ry = ty;
        dot.classList.add('on');
        ring.classList.add('on');
      }
    }, { passive: true });

    document.addEventListener('pointerdown', function () { ring.classList.add('down'); });
    document.addEventListener('pointerup', function () { ring.classList.remove('down'); });

    document.addEventListener('pointerover', function (e) {
      if (e.target && e.target.closest && e.target.closest(HOT)) {
        ring.classList.add('hot');
        dot.classList.add('hot');
      }
    });
    document.addEventListener('pointerout', function (e) {
      if (e.target && e.target.closest && e.target.closest(HOT)) {
        ring.classList.remove('hot');
        dot.classList.remove('hot');
      }
    });

    window.addEventListener('blur', hide);
    document.addEventListener('mouseleave', hide);
    function hide() {
      visible = false;
      dot.classList.remove('on');
      ring.classList.remove('on');
    }

    (function loop() {
      rx += (tx - rx) * 0.18;
      ry += (ty - ry) * 0.18;
      dot.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0) translate(-50%,-50%)';
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0) translate(-50%,-50%)';
      requestAnimationFrame(loop);
    })();
  }

  /* ------------------------------------------------------------------ */

  function init() {
    try { setupReveal(); } catch (e) {}
    try { setupCounters(); } catch (e) {}
    try { setupSpotlight(); } catch (e) {}
    try { setupProgress(); } catch (e) {}
    try { setupCursor(); } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

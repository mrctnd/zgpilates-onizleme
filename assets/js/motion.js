/* mrctndev motion engine — GSAP + ScrollTrigger + SplitText + Lenis
   Hooks (data attributes):
   [data-split]        heading: masked line reveal on scroll
   [data-up]           fade + rise on scroll          (data-delay="0.1")
   [data-stagger]      children rise one after another
   [data-img]          clip-path image reveal with inner zoom
   [data-parallax=.1]  scrubbed vertical drift
   [data-line]         hairline draws from left
   [data-count=17]     number counts up
   .hero-*             intro timeline after the loader
*/
(function () {
  var d = document, html = d.documentElement, w = window;
  var reduce = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = w.matchMedia('(pointer: fine)').matches;
  var loader = d.querySelector('.loader');
  // ?still → show the high-res poster instead of the loop (used for mockup captures)
  if (/[?&]still\b/.test(location.search)) {
    d.querySelectorAll('video').forEach(function (v) {
      v.removeAttribute('autoplay'); v.pause(); v.preload = 'none';
      while (v.firstChild) v.removeChild(v.firstChild);
      v.removeAttribute('src'); v.load();
    });
  }

  function endLoading() { html.classList.remove('is-loading'); html.classList.add('is-ready'); }

  // ---------- fallback: no GSAP or reduced motion ----------
  if (!w.gsap || !w.ScrollTrigger || reduce) {
    html.classList.add('no-motion');
    if (loader) loader.remove();
    endLoading();
    if (reduce) d.querySelectorAll('video[autoplay]').forEach(function (v) { v.removeAttribute('autoplay'); v.pause(); });
    initBasics(null);
    return;
  }

  gsap.registerPlugin(ScrollTrigger, SplitText);
  gsap.config({ nullTargetWarn: false });
  ScrollTrigger.config({ ignoreMobileResize: true });

  // ---------- smooth scroll ----------
  var lenis = null;
  if (w.Lenis) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  var EASE = 'expo.out';
  var heroEls = {
    lines: d.querySelectorAll('.hero [data-hero-split]'),
    fade: d.querySelectorAll('.hero [data-hero-up]'),
    visual: d.querySelector('.hero [data-hero-visual]'),
    nav: d.querySelector('.nav .wrap')
  };

  // hide hero parts before first paint of the intro
  gsap.set(heroEls.fade, { autoAlpha: 0, y: 34 });
  if (heroEls.visual) gsap.set(heroEls.visual, { clipPath: 'inset(14% 10% 14% 10% round 48px)', scale: 1.12, autoAlpha: 0 });
  if (heroEls.nav) gsap.set(heroEls.nav, { autoAlpha: 0, y: -16 });

  (d.fonts && d.fonts.ready ? d.fonts.ready : Promise.resolve()).then(start);

  function start() {
    var splits = [];
    heroEls.lines.forEach(function (el) {
      var s = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'ln' });
      gsap.set(s.lines, { yPercent: 118 });
      splits.push(s);
    });

    var seen = false;
    try { seen = sessionStorage.getItem('mt-intro') === '1'; sessionStorage.setItem('mt-intro', '1'); } catch (e) {}
    var tl = gsap.timeline({ defaults: { ease: EASE } });

    if (loader) {
      var word = loader.querySelector('.lw');
      var bar = loader.querySelector('.lbar i');
      var ws = word ? SplitText.create(word, { type: 'chars', mask: 'chars' }) : null;
      if (ws) tl.from(ws.chars, { yPercent: 120, duration: seen ? .5 : .9, stagger: .025 }, 0);
      if (bar) tl.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: seen ? .45 : .95, ease: 'power2.inOut' }, 0.05);
      tl.to(loader, { yPercent: -100, duration: 1.05, ease: 'expo.inOut' }, seen ? .5 : 1.0);
      tl.set(loader, { display: 'none' });
    }
    var at = loader ? (seen ? .85 : 1.35) : 0.1;
    tl.call(endLoading, null, at - .3);
    if (heroEls.visual) tl.to(heroEls.visual, { clipPath: 'inset(0% 0% 0% 0% round 0px)', scale: 1, autoAlpha: 1, duration: 1.7, ease: 'expo.out' }, at - .15);
    splits.forEach(function (s, i) { tl.to(s.lines, { yPercent: 0, duration: 1.3, stagger: .1 }, at + i * .08); });
    tl.to(heroEls.fade, { autoAlpha: 1, y: 0, duration: 1.2, stagger: .08 }, at + .25);
    if (heroEls.nav) tl.to(heroEls.nav, { autoAlpha: 1, y: 0, duration: 1 }, at + .1);
    tl.call(function () {
      splits.forEach(function (s) { s.revert(); });
      gsap.set(heroEls.visual, { clearProps: 'clipPath,transform' });
      if (lenis) lenis.start();
      ScrollTrigger.refresh();
    });

    initScroll();
    initBasics(lenis);
  }

  // ---------- scroll-driven reveals ----------
  function initScroll() {
    d.querySelectorAll('[data-split]').forEach(function (el) {
      SplitText.create(el, {
        type: 'lines', mask: 'lines', linesClass: 'ln', autoSplit: true,
        onSplit: function (self) {
          return gsap.from(self.lines, { yPercent: 118, duration: 1.25, ease: EASE, stagger: .09,
            scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
        }
      });
    });
    d.querySelectorAll('[data-up]').forEach(function (el) {
      gsap.from(el, { autoAlpha: 0, y: 44, duration: 1.2, ease: EASE, delay: parseFloat(el.dataset.delay || 0),
        scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    d.querySelectorAll('[data-stagger]').forEach(function (box) {
      var kids = box.children;
      var mm = gsap.matchMedia();
      mm.add('(max-width: 980px)', function () {
        if (box.hasAttribute('data-carousel')) {
          gsap.from(kids, { autoAlpha: 0, x: 70, duration: 1.1, ease: EASE, stagger: .08, scrollTrigger: { trigger: box, start: 'top 88%', once: true } });
        } else {
          gsap.from(kids, { autoAlpha: 0, y: 40, duration: 1.1, ease: EASE, stagger: .06, scrollTrigger: { trigger: box, start: 'top 90%', once: true } });
        }
      });
      mm.add('(min-width: 981px)', function () {
        gsap.from(kids, { autoAlpha: 0, y: 60, duration: 1.2, ease: EASE, stagger: { each: .07, grid: 'auto', from: 'start' }, scrollTrigger: { trigger: box, start: 'top 85%', once: true } });
      });
    });
    d.querySelectorAll('[data-img]').forEach(function (wrap) {
      var img = wrap.querySelector('img,video');
      var tl = gsap.timeline({ scrollTrigger: { trigger: wrap, start: 'top 86%', once: true } });
      tl.fromTo(wrap, { clipPath: 'inset(18% 8% 18% 8% round 40px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1.6, ease: 'expo.out', clearProps: 'clipPath' }, 0);
      if (img) tl.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 1.9, ease: 'expo.out' }, 0);
    });
    d.querySelectorAll('[data-parallax]').forEach(function (el) {
      var p = parseFloat(el.dataset.parallax) || .1;
      gsap.fromTo(el, { yPercent: -p * 100 }, { yPercent: p * 100, ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    d.querySelectorAll('[data-line]').forEach(function (el) {
      gsap.fromTo(el, { scaleX: 0 }, { scaleX: 1, transformOrigin: 'left center', duration: 1.4, ease: 'expo.inOut',
        scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
    });
    d.querySelectorAll('[data-count]').forEach(function (el) {
      var o = { v: 0 }, to = parseFloat(el.dataset.count);
      gsap.to(o, { v: to, duration: 1.8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        onUpdate: function () { el.textContent = Math.round(o.v); } });
    });

    // hero exit: visual drifts and softens while leaving
    var hv = d.querySelector('.hero .hero-visual');
    if (hv) {
      gsap.to(hv, { yPercent: 12, scale: .94, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    }
    var hc = d.querySelector('.hero .hero-copy');
    if (hc) gsap.to(hc, { yPercent: -10, autoAlpha: .2, ease: 'none', scrollTrigger: { trigger: '.hero', start: '35% top', end: 'bottom top', scrub: true } });

    // progress rail (e.g. treatment steps)
    d.querySelectorAll('[data-rail]').forEach(function (rail) {
      var fill = rail.querySelector('i');
      var box = d.querySelector(rail.dataset.rail);
      if (!fill || !box) return;
      gsap.fromTo(fill, { scaleY: 0 }, { scaleY: 1, ease: 'none', transformOrigin: 'top', scrollTrigger: { trigger: box, start: 'top 70%', end: 'bottom 60%', scrub: true } });
      box.querySelectorAll('[data-step]').forEach(function (st) {
        ScrollTrigger.create({ trigger: st, start: 'top 68%', end: 'bottom 50%', toggleClass: 'active' });
      });
    });

    // marquee with scroll velocity
    d.querySelectorAll('[data-marquee]').forEach(function (m) {
      var track = m.firstElementChild;
      var loop = gsap.to(track, { xPercent: -50, duration: parseFloat(m.dataset.marquee) || 36, ease: 'none', repeat: -1 });
      var skew = gsap.quickTo(track, 'skewX', { duration: .5, ease: 'power3' });
      ScrollTrigger.create({ trigger: m, start: 'top bottom', end: 'bottom top', onUpdate: function (self) {
        var v = self.getVelocity();
        gsap.to(loop, { timeScale: 1 + Math.min(Math.abs(v) / 350, 5), duration: .25, overwrite: true, onComplete: function () { gsap.to(loop, { timeScale: 1, duration: 1.2 }); } });
        skew(gsap.utils.clamp(-8, 8, v / -260));
      } });
    });
  }

  // ---------- interface: nav, menu, sticky CTA, carousels, magnetic ----------
  function initBasics(lenis) {
    var nav = d.querySelector('.nav');
    var lastY = 0;
    function onScroll(y) {
      if (!nav) return;
      nav.classList.toggle('scrolled', y > 30);
      var menuOpen = html.classList.contains('menu-open');
      if (!menuOpen) nav.classList.toggle('hide', y > 420 && y > lastY + 2);
      if (y < lastY - 2) nav.classList.remove('hide');
      lastY = y;
    }
    if (lenis) lenis.on('scroll', function (e) { onScroll(e.scroll); });
    else w.addEventListener('scroll', function () { onScroll(w.scrollY); }, { passive: true });

    // anchor links
    d.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var t = d.querySelector(id);
        if (!t) return;
        e.preventDefault();
        closeMenu();
        if (lenis) lenis.scrollTo(t, { offset: -64, duration: 1.5, easing: function (x) { return 1 - Math.pow(1 - x, 4); } });
        else t.scrollIntoView({ behavior: 'smooth' });
      });
    });

    // full-screen menu
    var menu = d.querySelector('.mnav'), burger = d.querySelector('.burger');
    var mtl = null;
    if (menu && w.gsap && !reduce) {
      var links = menu.querySelectorAll('.mnav-links a');
      var foot = menu.querySelectorAll('.mnav-foot > *');
      mtl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } })
        .set(menu, { display: 'flex' })
        .fromTo(menu, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: .9, ease: 'expo.inOut' })
        .from(links, { yPercent: 120, duration: 1, stagger: .06 }, '-=.35')
        .from(foot, { autoAlpha: 0, y: 20, duration: .8, stagger: .06 }, '-=.8');
    }
    function openMenu() {
      html.classList.add('menu-open');
      if (burger) burger.setAttribute('aria-expanded', 'true');
      if (lenis) lenis.stop();
      if (mtl) mtl.timeScale(1).play(); else if (menu) menu.style.display = 'flex';
    }
    function closeMenu() {
      if (!html.classList.contains('menu-open')) return;
      html.classList.remove('menu-open');
      if (burger) burger.setAttribute('aria-expanded', 'false');
      if (lenis) lenis.start();
      if (mtl) mtl.timeScale(1.6).reverse(); else if (menu) menu.style.display = 'none';
    }
    if (burger) burger.addEventListener('click', function () { html.classList.contains('menu-open') ? closeMenu() : openMenu(); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

    // sticky mobile action bar
    var bar = d.querySelector('.mbar'), hero = d.querySelector('.hero'), end = d.querySelector('[data-mbar-end]');
    if (bar && hero && 'IntersectionObserver' in w) {
      var heroOut = false, endIn = false;
      var upd = function () { bar.classList.toggle('show', heroOut && !endIn); };
      new IntersectionObserver(function (es) { heroOut = !es[0].isIntersecting; upd(); }, { rootMargin: '-55% 0px 0px 0px' }).observe(hero);
      if (end) new IntersectionObserver(function (es) { endIn = es[0].isIntersecting; upd(); }, { threshold: .15 }).observe(end);
    }

    // carousels: progress + keyboard friendly
    d.querySelectorAll('[data-carousel]').forEach(function (c) {
      var prog = d.querySelector(c.dataset.carousel);
      if (!prog) return;
      var fill = prog.querySelector('i');
      var f = function () {
        var max = c.scrollWidth - c.clientWidth;
        var r = max > 0 ? c.scrollLeft / max : 0;
        var vis = max > 0 ? c.clientWidth / c.scrollWidth : 1;
        fill.style.width = (vis * 100) + '%';
        fill.style.transform = 'translateX(' + (r * (1 / vis - 1) * 100) + '%)';
      };
      c.addEventListener('scroll', f, { passive: true }); w.addEventListener('resize', f); f();
    });

    // magnetic buttons + hero tilt (desktop only)
    if (fine && w.gsap && !reduce) {
      d.querySelectorAll('[data-magnetic]').forEach(function (b) {
        var xT = gsap.quickTo(b, 'x', { duration: .6, ease: 'elastic.out(1,0.45)' });
        var yT = gsap.quickTo(b, 'y', { duration: .6, ease: 'elastic.out(1,0.45)' });
        b.addEventListener('mousemove', function (e) {
          var r = b.getBoundingClientRect();
          xT((e.clientX - r.left - r.width / 2) * .28); yT((e.clientY - r.top - r.height / 2) * .38);
        });
        b.addEventListener('mouseleave', function () { xT(0); yT(0); });
      });
      var tilt = d.querySelector('[data-tilt]');
      if (tilt) {
        var rx = gsap.quickTo(tilt, 'rotationY', { duration: 1.2, ease: 'power3' });
        var ry = gsap.quickTo(tilt, 'rotationX', { duration: 1.2, ease: 'power3' });
        var tx = gsap.quickTo(tilt, 'x', { duration: 1.2, ease: 'power3' });
        gsap.set(tilt, { transformPerspective: 1200 });
        w.addEventListener('mousemove', function (e) {
          var nx = e.clientX / w.innerWidth - .5, ny = e.clientY / w.innerHeight - .5;
          rx(nx * 7); ry(-ny * 5); tx(nx * 18);
        });
      }
    }

    // pause offscreen videos (battery on phones)
    if ('IntersectionObserver' in w && !reduce) {
      d.querySelectorAll('video[autoplay]').forEach(function (v) {
        new IntersectionObserver(function (es) { es[0].isIntersecting ? v.play().catch(function () {}) : v.pause(); }, { threshold: .05 }).observe(v);
      });
    }
    var y = d.getElementById('y'); if (y) y.textContent = new Date().getFullYear();
  }
})();

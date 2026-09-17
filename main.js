/* ================================================================
   VOID XXX — Main Controller
   50 Features: 3D scene, YouTube API, particles, cursor, animations,
   tilt cards, video modal, search, sort, fan board, FAQ, shortcuts...
   ================================================================ */

import { isYouTubeConfigured, fetchChannelStats, fetchLatestVideos } from './youtubeClient.js';

/* ================================================================
   FEATURE 1-3: Config & Constants
   ================================================================ */
window.VOID_CONFIG = window.VOID_CONFIG || {
  youtube: {
    apiKey: 'AIzaSyCw2ENS855lZ6gJCwvzOTBTrNv5T307Dw8',
    channelId: 'UCBW8q5FPFzDv33j6O-__rkg',
    uploadsPlaylistId: 'UUBW8q5FPFzDv33j6O-__rkg'
  }
};
const CFG = window.VOID_CONFIG;
const CHANNEL_ID = CFG.youtube.channelId;
const YT_HANDLE = '@Void-XXX-1';

/* Demo fallback data */
const DEMO_STATS = { subscribers: '26', views: '1537', videos: '7', subscribersFormatted: '26', viewsFormatted: '1.5K' };
const DEMO_VIDEOS = [
  { id: 'bVDc7NIMnIs', title: 'Prove to my dad #Shorts #smallyoutuber #roadto100subs', thumbnail: 'https://img.youtube.com/vi/bVDc7NIMnIs/hqdefault.jpg', url: 'https://www.youtube.com/watch?v=bVDc7NIMnIs', publishedLabel: '3mo ago', views: '214', duration: '0:30', channelTitle: 'VOID XXX' },
  { id: 'hBnS3ShiDE0', title: 'Noob to Pro Roblox Edit', thumbnail: 'https://img.youtube.com/vi/hBnS3ShiDE0/hqdefault.jpg', url: 'https://www.youtube.com/watch?v=hBnS3ShiDE0', publishedLabel: '2mo ago', views: '312', duration: '1:24', channelTitle: 'VOID XXX' },
  { id: 'wHJ9g5YbVfc', title: 'Anime vs Roblox — Fighting Game Edit', thumbnail: 'https://img.youtube.com/vi/wHJ9g5YbVfc/hqdefault.jpg', url: 'https://www.youtube.com/watch?v=wHJ9g5YbVfc', publishedLabel: '1mo ago', views: '187', duration: '2:11', channelTitle: 'VOID XXX' },
  { id: 'b7mD8Oe8f0A', title: 'VOID XXX — Roblox Montage', thumbnail: 'https://img.youtube.com/vi/b7mD8Oe8f0A/hqdefault.jpg', url: 'https://www.youtube.com/watch?v=b7mD8Oe8f0A', publishedLabel: '1mo ago', views: '156', duration: '1:45', channelTitle: 'VOID XXX' },
  { id: 'pZk4gHkS1sI', title: 'Epic Roblox Moments', thumbnail: 'https://img.youtube.com/vi/pZk4gHkS1sI/hqdefault.jpg', url: 'https://www.youtube.com/watch?v=pZk4gHkS1sI', publishedLabel: '2mo ago', views: '198', duration: '1:52', channelTitle: 'VOID XXX' },
];

let allVideos = [];
let currentSort = 'date';
let searchQuery = '';

/* ================================================================
   FEATURE 4: Loading Screen
   ================================================================ */
const loader = document.getElementById('loadingScreen');
const loaderBar = document.getElementById('loaderBar');
let loadProgress = 0;
function setLoadProgress(pct) {
  loadProgress = Math.max(loadProgress, pct);
  if (loaderBar) loaderBar.style.width = loadProgress + '%';
}
function hideLoader() {
  setLoadProgress(100);
  setTimeout(() => { if (loader) loader.classList.add('hidden'); }, 400);
}

/* ================================================================
   FEATURE 5: Custom Cursor
   ================================================================ */
const cursorDot = document.getElementById('cursorDot');
const cursorRing = document.getElementById('cursorRing');
let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

function initCursor() {
  if (window.matchMedia('(hover: none)').matches) return;
  document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
  // Smooth follow
  function animateCursor() {
    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;
    if (cursorDot) { cursorDot.style.left = mouseX + 'px'; cursorDot.style.top = mouseY + 'px'; }
    if (cursorRing) { cursorRing.style.left = ringX + 'px'; cursorRing.style.top = ringY + 'px'; }
    requestAnimationFrame(animateCursor);
  }
  animateCursor();
  // Hover effects
  document.querySelectorAll('a, button, .video-card, .social-icon, .tag, input, textarea').forEach(el => {
    el.addEventListener('mouseenter', () => { cursorDot?.classList.add('hovering'); cursorRing?.classList.add('hovering'); });
    el.addEventListener('mouseleave', () => { cursorDot?.classList.remove('hovering'); cursorRing?.classList.remove('hovering'); });
  });
}

/* ================================================================
   FEATURE 6: Scroll Progress Bar
   ================================================================ */
function initScrollProgress() {
  const bar = document.getElementById('scrollProgress');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = h > 0 ? (window.scrollY / h * 100) + '%' : '0%';
  }, { passive: true });
}

/* ================================================================
   FEATURE 7: Particle Canvas System
   ================================================================ */
function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  const COUNT = 50;
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize(); window.addEventListener('resize', resize);
  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 2 + 0.5, a: Math.random() * 0.5 + 0.1,
      color: Math.random() > 0.5 ? '0,240,255' : '191,0,255'
    });
  }
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.a})`;
      ctx.fill();
    }
    // Connect nearby particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0,240,255,${0.08 * (1 - dist / 150)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

/* ================================================================
   FEATURE 8: Navigation Scroll & Active State
   ================================================================ */
function initNav() {
  const nav = document.getElementById('mainNav');
  const links = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');
  window.addEventListener('scroll', () => {
    nav?.classList.toggle('scrolled', window.scrollY > 50);
    // Active section
    let current = '';
    sections.forEach(s => {
      if (window.scrollY >= s.offsetTop - 200) current = s.id;
    });
    links.forEach(l => {
      l.classList.toggle('active', l.dataset.section === current);
    });
  }, { passive: true });
  // Hamburger
  const hamburger = document.getElementById('navHamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileMenu?.classList.toggle('open');
  });
  // Mobile links close menu
  document.querySelectorAll('.mobile-link').forEach(l => {
    l.addEventListener('click', () => {
      hamburger?.classList.remove('open');
      mobileMenu?.classList.remove('open');
    });
  });
}

/* ================================================================
   FEATURE 9: Theme Toggle (Dark/Light)
   ================================================================ */
function initTheme() {
  const btn = document.getElementById('themeToggle');
  const saved = localStorage.getItem('void-theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  btn?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('void-theme', next);
  });
}

/* ================================================================
   FEATURE 10: Sound Toggle
   ================================================================ */
let soundEnabled = false;
function initSound() {
  const btn = document.getElementById('soundToggle');
  btn?.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    btn.classList.toggle('muted', !soundEnabled);
    showToast(soundEnabled ? '🔊 Sound ON' : '🔇 Sound OFF');
  });
}
function playClick() {
  if (!soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 800; osc.type = 'sine';
    gain.gain.value = 0.1;
    osc.start(); osc.stop(ctx.currentTime + 0.05);
  } catch (e) {}
}

/* ================================================================
   FEATURE 11: Hero Stat Counter Animation
   ================================================================ */
function animateCounters() {
  document.querySelectorAll('.stat-number').forEach(el => {
    const target = parseInt(el.dataset.target);
    if (isNaN(target)) return;
    let current = 0;
    const step = Math.max(1, Math.floor(target / 60));
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { current = target; clearInterval(timer); }
      el.textContent = current.toLocaleString();
    }, 30);
  });
}

/* ================================================================
   FEATURE 12: YouTube API Data Loading
   ================================================================ */
async function bootData() {
  setLoadProgress(20);
  let stats = DEMO_STATS;
  let videos = DEMO_VIDEOS;
  let source = 'demo';
  try {
    if (isYouTubeConfigured()) {
      setLoadProgress(40);
      const [chStats, chVideos] = await Promise.all([
        fetchChannelStats(CHANNEL_ID),
        fetchLatestVideos(12),
      ]);
      stats = chStats;
      videos = chVideos;
      source = 'youtube';
    }
  } catch (e) {
    console.warn('YouTube API failed, using demo:', e.message);
  }
  setLoadProgress(70);
  allVideos = videos;
  renderStats(stats, source);
  renderVideos(videos);
  setLoadProgress(90);
}

function renderStats(stats, source) {
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('statSubscribers', stats.subscribersFormatted || stats.subscribers);
  setEl('statViews', stats.viewsFormatted || stats.views);
  setEl('statVideos', stats.videos || stats.videoCount || '--');
  const avgViews = stats.videos ? Math.round(parseInt(stats.views) / parseInt(stats.videos)).toLocaleString() : '--';
  setEl('statAvgViews', avgViews);
  const statusEl = document.getElementById('heroStatus');
  if (statusEl) statusEl.textContent = source === 'youtube' ? 'LIVE // YOUTUBE SYNC' : 'DEMO MODE';
}

/* ================================================================
   FEATURE 13-18: Video Rendering, Search, Sort, Modal, Share, Load More
   ================================================================ */
function renderVideos(videos) {
  const grid = document.getElementById('videoGrid');
  if (!grid) return;
  grid.innerHTML = '';
  if (videos.length === 0) {
    grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;padding:40px">No videos found</p>';
    return;
  }
  videos.forEach((v, i) => {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.dataset.index = i;
    card.style.animationDelay = (i * 0.08) + 's';
    card.innerHTML = `
      <div class="video-thumb">
        <img src="${v.thumbnail}" alt="${v.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/640x360/111118/00f0ff?text=VOID+XXX'">
        <div class="video-thumb-overlay"><div class="video-play-btn">▶</div></div>
        ${v.duration ? `<span class="video-duration">${v.duration}</span>` : ''}
      </div>
      <button class="video-share-btn" data-url="${v.url}" data-title="${v.title}" aria-label="Share video">↗</button>
      <div class="video-info">
        <div class="video-title">${v.title}</div>
        <div class="video-meta">
          <span>${v.views || '0'} views</span>
          <span>•</span>
          <span>${v.publishedLabel || ''}</span>
        </div>
      </div>
    `;
    // Click to open modal
    card.querySelector('.video-thumb')?.addEventListener('click', () => {
      playClick();
      openVideoModal(v);
    });
    card.querySelector('.video-play-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      playClick();
      openVideoModal(v);
    });
    // Share
    card.querySelector('.video-share-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      shareVideo(v);
    });
    // 3D tilt effect
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `translateY(-6px) perspective(800px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
    grid.appendChild(card);
  });
}

function filterAndSort() {
  let filtered = allVideos;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(v => v.title.toLowerCase().includes(q));
  }
  if (currentSort === 'views') {
    filtered = [...filtered].sort((a, b) => (b.viewsRaw || 0) - (a.viewsRaw || 0));
  }
  renderVideos(filtered);
}

function initSearch() {
  const input = document.getElementById('videoSearch');
  input?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    filterAndSort();
  });
}

function initSort() {
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSort = btn.dataset.sort;
      playClick();
      filterAndSort();
    });
  });
}

/* Feature 19: Video Modal */
function openVideoModal(video) {
  const modal = document.getElementById('videoModal');
  const iframe = document.getElementById('modalIframe');
  const title = document.getElementById('modalTitle');
  const views = document.getElementById('modalViews');
  const date = document.getElementById('modalDate');
  if (!modal || !iframe) return;
  const vid = video.id || video.url?.split('v=')[1];
  iframe.src = `https://www.youtube-nocookie.com/embed/${vid}?autoplay=1&rel=0`;
  if (title) title.textContent = video.title;
  if (views) views.textContent = (video.views || '0') + ' views';
  if (date) date.textContent = video.publishedLabel || '';
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeVideoModal() {
  const modal = document.getElementById('videoModal');
  const iframe = document.getElementById('modalIframe');
  if (modal) modal.style.display = 'none';
  if (iframe) iframe.src = '';
  document.body.style.overflow = '';
}
function initModal() {
  document.getElementById('modalClose')?.addEventListener('click', closeVideoModal);
  document.getElementById('modalBackdrop')?.addEventListener('click', closeVideoModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeVideoModal(); });
}

/* Feature 20: Share Video */
function shareVideo(video) {
  if (navigator.share) {
    navigator.share({ title: video.title, url: video.url });
  } else {
    navigator.clipboard?.writeText(video.url).then(() => showToast('📋 Link copied!'));
  }
}

/* ================================================================
   FEATURE 21: Back to Top Button
   ================================================================ */
function initBackToTop() {
  const btn = document.getElementById('backToTop');
  window.addEventListener('scroll', () => {
    btn?.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  btn?.addEventListener('click', () => {
    playClick();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ================================================================
   FEATURE 22: Scroll Reveal Animations
   ================================================================ */
function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
}

/* ================================================================
   FEATURE 23: Copy Channel Link
   ================================================================ */
function initCopyLink() {
  document.getElementById('copyChannelBtn')?.addEventListener('click', () => {
    navigator.clipboard?.writeText('https://www.youtube.com/@Void-XXX-1').then(() => {
      showToast('📋 Channel link copied!');
      playClick();
    });
  });
}

/* ================================================================
   FEATURE 24: Share Page Button
   ================================================================ */
function initSharePage() {
  document.getElementById('shareBtn')?.addEventListener('click', () => {
    if (navigator.share) {
      navigator.share({ title: 'VOID XXX — Gaming Redefined', url: window.location.href });
    } else {
      navigator.clipboard?.writeText(window.location.href).then(() => showToast('📋 URL copied!'));
    }
  });
}

/* ================================================================
   FEATURE 25: Keyboard Shortcuts
   ================================================================ */
function initShortcuts() {
  const panel = document.getElementById('shortcutsPanel');
  const keyMap = { h: '#home', v: '#videos', a: '#about', s: '#stats', c: '#contact' };
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === '?') { panel.style.display = panel.style.display === 'none' ? 'flex' : 'none'; }
    if (e.key === 't') document.getElementById('themeToggle')?.click();
    if (keyMap[e.key]) { document.querySelector(keyMap[e.key])?.scrollIntoView({ behavior: 'smooth' }); }
  });
  panel?.addEventListener('click', (e) => { if (e.target === panel) panel.style.display = 'none'; });
}

/* ================================================================
   FEATURE 26: Cookie Consent
   ================================================================ */
function initCookieConsent() {
  if (localStorage.getItem('void-cookies')) return;
  const banner = document.getElementById('cookieBanner');
  setTimeout(() => banner?.classList.add('visible'), 2000);
  document.getElementById('cookieAccept')?.addEventListener('click', () => {
    localStorage.setItem('void-cookies', '1');
    banner?.classList.remove('visible');
  });
}

/* ================================================================
   FEATURE 27: Easter Egg (Konami Code)
   ================================================================ */
function initEasterEgg() {
  const code = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let pos = 0;
  document.addEventListener('keydown', e => {
    if (e.key === code[pos]) { pos++; if (pos === code.length) { pos = 0; showEasterEgg(); } }
    else { pos = 0; }
  });
  function showEasterEgg() {
    const el = document.getElementById('easterEgg');
    if (el) { el.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
    document.getElementById('easterEggClose')?.addEventListener('click', () => {
      el.style.display = 'none'; document.body.style.overflow = '';
    });
  }
}

/* ================================================================
   FEATURE 28: Toast Notifications
   ================================================================ */
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/* ================================================================
   FEATURE 29: FAQ Accordion
   ================================================================ */
function initFAQ() {
  document.querySelectorAll('.faq-trigger').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
      btn.setAttribute('aria-expanded', !wasOpen);
      playClick();
    });
  });
}

/* ================================================================
   FEATURE 30: Fan Board (Supabase Integration)
   ================================================================ */
let supabaseClient = null;
async function initFanBoard() {
  try {
    const mod = await import('./supabaseClient.js');
    supabaseClient = mod.default || mod.supabase || mod;
  } catch (e) { console.warn('Supabase not available'); }
  loadFanMessages();
  document.getElementById('fanForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('fanName')?.value?.trim();
    const message = document.getElementById('fanMessage')?.value?.trim();
    if (!name || !message) return;
    if (supabaseClient?.from) {
      try {
        await supabaseClient.from('fan_messages').insert({ name, message });
        showToast('🎉 Message sent!');
        document.getElementById('fanForm').reset();
        loadFanMessages();
      } catch (e) { showToast('Failed to send', 'error'); }
    } else {
      showToast('⚠️ Supabase not connected');
    }
  });
}
async function loadFanMessages() {
  const container = document.getElementById('fanMessages');
  if (!container) return;
  if (supabaseClient?.from) {
    try {
      const { data } = await supabaseClient.from('fan_messages').select('*').order('created_at', { ascending: false }).limit(20);
      if (data?.length) {
        container.innerHTML = data.map(m => `
          <div class="fan-msg">
            <div class="fan-msg-header">
              <span class="fan-msg-name">${escapeHtml(m.name)}</span>
              <span class="fan-msg-date">${timeAgo(m.created_at)}</span>
            </div>
            <div class="fan-msg-text">${escapeHtml(m.message)}</div>
          </div>
        `).join('');
      } else {
        container.innerHTML = '<p style="color:var(--text-muted);padding:16px">No messages yet. Be the first!</p>';
      }
    } catch (e) { container.innerHTML = '<p style="color:var(--text-muted);padding:16px">Messages unavailable</p>'; }
  } else {
    container.innerHTML = '<p style="color:var(--text-muted);padding:16px">Connect Supabase to see messages</p>';
  }
}

/* ================================================================
   FEATURE 31: Three.js 3D Hero Scene
   ================================================================ */
function init3DScene() {
  const container = document.querySelector('.hero-bg');
  if (!container || typeof THREE === 'undefined') return;
  try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    renderer.domElement.style.zIndex = '0';
    container.appendChild(renderer.domElement);

    // Floating hexagons
    const hexGeo = new THREE.IcosahedronGeometry(1, 0);
    const hexMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.15 });
    const hexagons = [];
    for (let i = 0; i < 12; i++) {
      const mesh = new THREE.Mesh(hexGeo, hexMat.clone());
      mesh.position.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 10);
      mesh.scale.setScalar(Math.random() * 0.8 + 0.2);
      mesh.userData = { rx: Math.random() * 0.01, ry: Math.random() * 0.02, rz: Math.random() * 0.005 };
      scene.add(mesh);
      hexagons.push(mesh);
    }

    // Wireframe torus
    const torusGeo = new THREE.TorusGeometry(3, 0.1, 16, 100);
    const torusMat = new THREE.MeshBasicMaterial({ color: 0xbf00ff, wireframe: true, transparent: true, opacity: 0.08 });
    const torus = new THREE.Mesh(torusGeo, torusMat);
    scene.add(torus);

    camera.position.z = 8;

    let scrollY = 0;
    window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });

    function animate() {
      requestAnimationFrame(animate);
      const t = Date.now() * 0.001;
      hexagons.forEach(h => {
        h.rotation.x += h.userData.rx;
        h.rotation.y += h.userData.ry;
        h.rotation.z += h.userData.rz;
        h.position.y += Math.sin(t + h.position.x) * 0.002;
      });
      torus.rotation.x = t * 0.1;
      torus.rotation.y = t * 0.15;
      camera.position.y = -scrollY * 0.002;
      renderer.render(scene, camera);
    }
    animate();
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  } catch (e) { console.warn('3D scene init failed:', e); }
}

/* ================================================================
   FEATURE 32: About Section 3D Avatar
   ================================================================ */
function initAbout3D() {
  const container = document.getElementById('about3d');
  if (!container || typeof THREE === 'undefined') return;
  try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Create VOID logo geometry (hexagonal prism)
    const shape = new THREE.Shape();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const x = Math.cos(angle) * 2; const y = Math.sin(angle) * 2;
      i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
    }
    shape.closePath();
    const extrudeSettings = { depth: 0.5, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05 };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.4 });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    // Orbiting rings
    const ringGeo = new THREE.TorusGeometry(2.8, 0.02, 8, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xbf00ff, transparent: true, opacity: 0.3 });
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    const ring2 = new THREE.Mesh(ringGeo, ringMat.clone());
    ring2.rotation.x = Math.PI / 3;
    scene.add(ring1, ring2);

    camera.position.z = 5;
    function animate() {
      requestAnimationFrame(animate);
      const t = Date.now() * 0.001;
      mesh.rotation.y = t * 0.3;
      mesh.rotation.x = Math.sin(t * 0.2) * 0.2;
      ring1.rotation.z = t * 0.5;
      ring2.rotation.z = -t * 0.3;
      renderer.render(scene, camera);
    }
    animate();
  } catch (e) { console.warn('About 3D failed:', e); }
}

/* ================================================================
   FEATURE 33: Click Burst Particles
   ================================================================ */
function initClickBurst() {
  document.addEventListener('click', (e) => {
    for (let i = 0; i < 8; i++) {
      const dot = document.createElement('div');
      dot.style.cssText = `
        position:fixed;left:${e.clientX}px;top:${e.clientY}px;
        width:4px;height:4px;border-radius:50%;
        background:${Math.random() > 0.5 ? '#00f0ff' : '#bf00ff'};
        pointer-events:none;z-index:99999;
        transition:all 0.6s ease-out;
      `;
      document.body.appendChild(dot);
      const angle = (Math.PI * 2 / 8) * i;
      const dist = 30 + Math.random() * 30;
      requestAnimationFrame(() => {
        dot.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
        dot.style.opacity = '0';
      });
      setTimeout(() => dot.remove(), 600);
    }
  });
}

/* ================================================================
   FEATURE 34: Page Visibility (pause when hidden)
   ================================================================ */
function initVisibility() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      document.body.classList.add('page-hidden');
    } else {
      document.body.classList.remove('page-hidden');
    }
  });
}

/* ================================================================
   FEATURE 35: Stat Bar Reveal Animation
   ================================================================ */
function initStatBars() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  document.querySelectorAll('.stat-big-card').forEach(el => observer.observe(el));
}

/* ================================================================
   HELPERS
   ================================================================ */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  return Math.floor(hrs / 24) + 'd ago';
}

/* ================================================================
   INIT — BOOT SEQUENCE
   ================================================================ */
async function init() {
  setLoadProgress(10);
  initCursor();
  initScrollProgress();
  initParticles();
  initNav();
  initTheme();
  initSound();
  initBackToTop();
  initReveal();
  initCopyLink();
  initSharePage();
  initShortcuts();
  initCookieConsent();
  initEasterEgg();
  initFAQ();
  initSearch();
  initSort();
  initModal();
  init3DScene();
  initAbout3D();
  initClickBurst();
  initVisibility();
  initStatBars();
  await bootData();
  animateCounters();
  initFanBoard();
  hideLoader();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

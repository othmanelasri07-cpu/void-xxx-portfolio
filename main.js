/* ============================================================
   VOID XXX — main.js
   ------------------------------------------------------------
   Three.js scene (neon robot avatar + particles + bloom),
   mouse parallax, scroll/spin loop, and all DOM glue:
   sub counter, video gallery, fan board, reveal animations.
   ============================================================ */
"use strict";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { db } from "./supabaseClient.js";

/* ============================================================
   1. UI helpers
   ============================================================ */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

let toastTimer = null;
function toast(message, kind = "") {
  const el = $("#toast");
  if (!el) return;
  el.textContent = message;
  el.className = `toast show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3400);
}

function fmtCount(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

/* ============================================================
   2. Nav + scroll fx
   ============================================================ */
const nav = $("#nav");
const heroEl = $("#hero");
const scrollReadout = $("#hud-scroll");
const statusReadout = $("#hud-status");

function onScroll() {
  const y = window.scrollY || 0;
  nav.classList.toggle("scrolled", y > 24);
  if (scrollReadout) {
    const total = Math.max(1, document.body.scrollHeight - window.innerHeight);
    scrollReadout.textContent = `SCRL ${String(Math.min(999, Math.round((y / total) * 100))).padStart(3, "0")}%`;
  }
}

/* ============================================================
   3. Reveal animations
   ============================================================ */
function initReveals() {
  const els = $$(".reveal");
  if (!("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  els.forEach((el, i) => {
    el.style.setProperty("--reveal-delay", `${Math.min(i * 70, 350)}ms`);
    io.observe(el);
  });
}

/* ============================================================
   4. Three.js neon scene
   ============================================================ */
function buildStage() {
  const mount = $("#stage");
  if (!mount || typeof WebGLRenderingContext === "undefined") return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: window.devicePixelRatio < 2,
      powerPreference: "high-performance",
      alpha: true
    });
  } catch {
    return null; // WebGL unavailable — site still works
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0a12, 0.035);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(3.6, 2.2, 6.4);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.rotateSpeed = 0.5;
  controls.minPolarAngle = Math.PI / 3.6;
  controls.maxPolarAngle = Math.PI / 1.9;

  /* ---- Group that follows the pointer (parallax) ---- */
  const parallaxGroup = new THREE.Group();
  scene.add(parallaxGroup);

  /* ---- Neon robot avatar (Roblox-blocky vibe) ---- */
  const avatar = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x12121e,
    metalness: 0.75,
    roughness: 0.32,
    emissive: 0x0a1420,
    emissiveIntensity: 0.35
  });
  const neonMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00f0ff,
    emissiveIntensity: 1.6,
    roughness: 0.25,
    metalness: 0.4
  });
  const blueNeonMat = new THREE.MeshStandardMaterial({
    color: 0x4d9fff,
    emissive: 0x4d9fff,
    emissiveIntensity: 1.15,
    roughness: 0.3,
    metalness: 0.35
  });

  const px = 0.5; // block unit

  const makeBlock = (w, h, d, mat, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    return mesh;
  };

  // Torso
  avatar.add(makeBlock(1.05, 1.35, 0.6, bodyMat, 0, 0, 0));
  // Chest core (glowing)
  avatar.add(makeBlock(0.4, 0.3, 0.12, neonMat, 0, 0.12, 0.34));
  // Head
  avatar.add(makeBlock(0.75, 0.75, 0.75, bodyMat, 0, 1.4, 0));
  // Visor
  avatar.add(makeBlock(0.62, 0.2, 0.12, neonMat, 0, 1.46, 0.39));
  // Blue side fins
  avatar.add(makeBlock(0.14, 0.14, 0.14, blueNeonMat, -0.62, 1.4, 0));
  avatar.add(makeBlock(0.14, 0.14, 0.14, blueNeonMat, 0.62, 1.4, 0));
  // Arms
  avatar.add(makeBlock(0.3, 1.05, 0.3, bodyMat, -0.78, -0.18, 0));
  avatar.add(makeBlock(0.3, 1.05, 0.3, bodyMat, 0.78, -0.18, 0));
  // Forearm neon rings
  avatar.add(makeBlock(0.34, 0.14, 0.34, neonMat, -0.78, -0.62, 0));
  avatar.add(makeBlock(0.34, 0.14, 0.34, neonMat, 0.78, -0.62, 0));
  // Legs
  avatar.add(makeBlock(0.38, 1.0, 0.4, bodyMat, -0.26, -1.45, 0));
  avatar.add(makeBlock(0.38, 1.0, 0.4, bodyMat, 0.26, -1.45, 0));
  // Feet neon
  avatar.add(makeBlock(0.44, 0.18, 0.46, blueNeonMat, -0.26, -2.05, 0));
  avatar.add(makeBlock(0.44, 0.18, 0.46, blueNeonMat, 0.26, -2.05, 0));
  // Shoulder pads
  avatar.add(makeBlock(0.4, 0.34, 0.44, blueNeonMat, -0.92, 0.56, 0));
  avatar.add(makeBlock(0.4, 0.34, 0.44, blueNeonMat, 0.92, 0.56, 0));

  avatar.position.y = 0.35;
  parallaxGroup.add(avatar);

  /* ---- Hovering geometric satellites ---- */
  const satMat1 = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00f0ff,
    emissiveIntensity: 0.9,
    roughness: 0.3,
    metalness: 0.6,
    wireframe: false
  });
  const satMat2 = new THREE.MeshStandardMaterial({
    color: 0x1a2a3a,
    emissive: 0x4d9fff,
    emissiveIntensity: 0.55,
    metalness: 0.8,
    roughness: 0.3
  });

  const sat1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), satMat1);
  sat1.position.set(-2.6, 1.6, -1.2);
  const sat2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), satMat2);
  sat2.position.set(2.7, 0.4, -1.6);
  const sat3 = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.12, 12, 40), satMat1);
  sat3.position.set(-1.8, -1.7, -1.4);
  sat3.rotation.x = Math.PI / 2.4;
  const sat4 = new THREE.Mesh(new THREE.TetrahedronGeometry(0.5, 0), satMat2);
  sat4.position.set(2.3, 1.9, -0.8);

  [sat1, sat2, sat3, sat4].forEach((s) => parallaxGroup.add(s));

  /* ---- Ground grid (Tron vibe) ---- */
  const grid = new THREE.GridHelper(16, 24, 0x00f0ff, 0x1d2a3d);
  grid.position.y = -2.45;
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  parallaxGroup.add(grid);

  /* ---- Particles ---- */
  const P_COUNT = reducedMotion ? 300 : 900;
  const positions = new Float32Array(P_COUNT * 3);
  const speeds = new Float32Array(P_COUNT);
  const radii = new Float32Array(P_COUNT);

  for (let i = 0; i < P_COUNT; i++) {
    const r = 2.2 + Math.random() * 7.5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.65;
    positions[i * 3 + 2] = r * Math.cos(phi) - 2;
    speeds[i] = 0.08 + Math.random() * 0.3;
    radii[i] = r;
  }

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  let particleTexture;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d");
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, "rgba(0,240,255,0.9)");
    grad.addColorStop(1, "rgba(0,240,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    particleTexture = new THREE.CanvasTexture(canvas);
  } catch {
    particleTexture = null;
  }

  const pMat = new THREE.PointsMaterial({
    size: 0.11,
    map: particleTexture,
    color: 0x66f4ff,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });

  const particles = new THREE.Points(pGeo, pMat);
  parallaxGroup.add(particles);
  const pAttr = pGeo.attributes.position;

  /* ---- Lights ---- */
  const keyLight = new THREE.PointLight(0x00f0ff, 55, 18);
  keyLight.position.set(3, 4, 4);
  const fillLight = new THREE.PointLight(0x4d9fff, 28, 14);
  fillLight.position.set(-3.5, -1, 2.5);
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
  rimLight.position.set(-2, 3, -3);
  const ambient = new THREE.AmbientLight(0x223344, 0.6);
  scene.add(keyLight, fillLight, rimLight, ambient);

  /* ---- Post-processing: bloom ---- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.15,   // strength
    0.55,   // radius
    0.72    // threshold
  );
  composer.addPass(bloomPass);

  /* ---- Interaction state ---- */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const isTouch = window.matchMedia("(pointer: coarse)").matches;

  if (!isTouch) {
    window.addEventListener("pointermove", (e) => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    });
  }

  const clock = new THREE.Clock();

  /* ---- Resize ---- */
  const onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  };
  window.addEventListener("resize", onResize);

  /* ---- Animation loop ---- */
  let rafId = 0;
  const animate = () => {
    rafId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    pointer.x += (pointer.tx - pointer.x) * 0.045;
    pointer.y += (pointer.ty - pointer.y) * 0.045;

    parallaxGroup.rotation.y += 0.0022;
    parallaxGroup.rotation.x = pointer.y * 0.05;
    parallaxGroup.rotation.z = pointer.x * 0.02;

    avatar.rotation.y = Math.sin(t * 0.45) * 0.16;
    avatar.position.y = 0.35 + Math.sin(t * 0.9) * 0.12;

    // Satellites: orbit + pulse
    const orbit = (mesh, rx, ry, rs, sp) => {
      const a = t * sp;
      mesh.position.x = Math.cos(a) * rx * 1.7 + rs.x;
      mesh.position.z = Math.sin(a) * ry * 1.7 + rs.z;
      mesh.position.y = rs.y + Math.sin(t * sp * 1.4) * 0.25;
      mesh.rotation.x = t * 0.5;
      mesh.rotation.y = t * 0.4;
    };
    orbit(sat1, 1, 1, { x: -2.2, y: 1.6, z: -1.2 }, 0.22);
    orbit(sat2, 1, 1, { x: 2.4, y: 0.4, z: -1.6 }, 0.18);
    orbit(sat3, 1, 1, { x: -1.8, y: -1.7, z: -1.4 }, 0.15);
    orbit(sat4, 1, 1, { x: 2.1, y: 1.9, z: -0.8 }, 0.26);

    // Hermite easing for speeds — only when motion allowed
    const alpha = reducedMotion ? 0 : Math.min(1, t / 3);

    for (let i = 0; i < P_COUNT; i++) {
      const k = i * 3;
      const phase = pAttr.getZ(k + 2);
      const eased = alpha * Math.sin(t * speeds[i] + phase);
      const x = radii[i] * Math.sin(eased);
      const y = radii[i] * 0.55 * Math.cos(eased * 0.75);
      pAttr.setX(k, x);
      pAttr.setY(k, Math.sin(eased) * 0.2 + y);
    }
    pAttr.needsUpdate = true;

    // Lighting flicker for atmosphere
    keyLight.intensity = 52 + Math.sin(t * 2.2) * 8;

    controls.update();
    composer.render();
  };

  animate();

  return {
    dispose() {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => {
            Object.values(m).forEach((v) => v && v.isTexture && v.dispose());
            m.dispose();
          });
        }
      });
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    }
  };
}

/* ============================================================
   5. Sub counter (with count-up animation)
   ============================================================ */
const subEl = $("#sub-count");
let targetSubs = 0;

function animateCount(to, duration = 1400) {
  const el = $("#sub-count");
  if (!el) return;
  const from = targetSubs;
  targetSubs = to;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion) {
    el.textContent = fmtCount(to);
    return;
  }
  const start = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmtCount(Math.round(from + (to - from) * eased));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ============================================================
   6. Video gallery
   ============================================================ */
function renderVideos(videos) {
  const grid = $("#video-grid");
  if (!grid) return;
  grid.innerHTML = "";
  if (!videos || !videos.length) {
    grid.innerHTML = '<div class="board-empty">UPLOAD QUEUE EMPTY — CHECK BACK SOON</div>';
    return;
  }
  videos.forEach((v, i) => {
    const card = document.createElement("article");
    card.className = "video-card";
    card.style.animationDelay = `${Math.min(i * 70, 350)}ms`;

    const thumb = v.thumbnail
      ? `<div class="video-thumb"><img src="${v.thumbnail}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" /></div>`
      : `<div class="video-thumb"><div class="thumb-fallback">V◊</div></div>`;

    card.innerHTML = `
      <a href="${v.url || "https://www.youtube.com/@Void-XXX-1"}" target="_blank" rel="noopener">
        ${thumb}
        ${v.duration ? `<span class="thumb-duration">${v.duration}</span>` : ""}
        <div class="video-info">
          <h3 class="video-title">${v.title}</h3>
          <div class="video-meta">
            <span class="video-views">▲ ${v.views || "—"} views</span>
            <span>${v.date || ""}</span>
          </div>
        </div>
      </a>`;
    grid.appendChild(card);
  });
}

/* ============================================================
   7. Fan message board
   ============================================================ */
function renderMessages(messages, prepend = false) {
  const rows = $("#board-rows");
  if (!rows) return;
  const list = Array.isArray(messages) ? messages : [];

  if (!prepend) {
    rows.innerHTML = "";
    if (!list.length) {
      rows.innerHTML = '<div class="board-empty">NO SIGNALS YET — BE THE FIRST TO TRANSMIT</div>';
      return;
    }
  }

  list.slice(0, 30).forEach((m) => {
    const name = m.name || "anon";
    const text = m.message || "";
    const time = m.created_at || "";
    const el = document.createElement("div");
    el.className = "board-message";
    el.innerHTML = `
      <span class="board-msg-text">${escapeHtml(text)}</span>
      <span class="board-msg-meta"><span class="board-msg-name">@${escapeHtml(name)}</span><span>${escapeHtml(time)}</span></span>`;
    if (prepend) rows.prepend(el); else rows.appendChild(el);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ============================================================
   8. Fan board form
   ============================================================ */
function initBoardForm() {
  const form = $("#board-form");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nameInput = $("#board-name");
    const msgInput = $("#board-message");
    const name = (nameInput && nameInput.value.trim()) || "anon";
    const message = msgInput.value.trim();

    if (!message) {
      toast("Message can't be empty.", "err");
      msgInput.focus();
      return;
    }

    const btn = form.querySelector("button[type='submit']");
    const orig = btn.textContent;
    btn.disabled = true;
    btn.textContent = "…";

    const res = await db.addMessage(name, message);
    if (res.ok) {
      msgInput.value = "";
      if (res.offline) {
        const list = await db.getMessages();
        renderMessages(list, false);
      } else {
        const list = await db.getMessages();
        renderMessages(list, false);
      }
      toast(res.offline ? "Stored locally (offline mode)." : "Transmitted to the void. 📡", "ok");
    } else {
      toast(res.error || "Transmission failed.", "err");
    }

    btn.disabled = false;
    btn.textContent = orig;
  });
}

/* ============================================================
   9. Data bootstrap
   ============================================================ */
async function bootData() {
  const status = await db.status();
  const online = status.enabled && status.online;

  if (statusReadout) {
    statusReadout.textContent = online ? "LIVE // SYNCED" : "OFFLINE MODE // DEMO";
    if (online) statusReadout.style.color = "var(--good)";
  }
  const note = $("#form-note");
  if (note) {
    note.textContent = online
      ? "Signal status: LIVE — connected to Supabase"
      : "Signal status: OFFLINE MODE (demo data — add Supabase keys to go live)";
  }

  const [subs, videos, messages] = await Promise.all([
    db.getSubCount(),
    db.getVideos(),
    db.getMessages()
  ]);

  animateCount(subs);
  renderVideos(videos);
  renderMessages(messages);
}

/* ============================================================
   10. Init
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  buildStage();
  initReveals();
  initBoardForm();
  bootData();
});

window.addEventListener("scroll", onScroll, { passive: true });
onScroll();
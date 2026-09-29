// AI Alo 3D — standalone test build.
// Stack: three.js (WebGL2 + UnrealBloom), GSAP (intro + tweens), Lenis (smooth scroll).
// Every mesh, texture and sound is generated in code: no model or image downloads.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { gsap } from 'gsap';
import Lenis from 'lenis';
import { PROFILE, ORIGIN, DEST, TIMELINE, EXPERIENCE, PROJECTS, DEMOS, SKILLS, STATIONS, IMAGES, ASK_ENDPOINT, SOUNDTRACK } from './content.js';
import { ugandaFlag, usFlag } from './flags.js';
import { buildCorpus, makeIndex, extract, ragPrompt } from './ask.js';

/* ------------------------------------------------------------------ */
/* Environment                                                         */
/* ------------------------------------------------------------------ */
const $ = (s) => document.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(hover: none)').matches;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const GOLD = new THREE.Color(0xe8b54a);
const SIGNAL = new THREE.Color(0x6fe3d6);
const NIGHT = new THREE.Color(0x060a17);

let tier = store.get('aialo3d-tier') || ((touch || (navigator.hardwareConcurrency || 4) <= 4) ? 'low' : 'high');
const HIGH = () => tier === 'high';

const linkHover = {}; // data-open key -> hover(on), filled by the 3D scene
const loaded = {};    // IMAGES key -> HTMLImageElement, only for files that exist
const imgReady = Promise.all(Object.entries(IMAGES).map(([k, v]) => new Promise((res) => {
  const im = new Image(); im.decoding = 'async';
  im.onload = () => { loaded[k] = im; res(); }; im.onerror = () => res(); im.src = v.src;
  setTimeout(res, 4000);
})));
imgReady.then(() => { if (loaded.portrait) { const b = $('#portrait-badge'); b.src = IMAGES.portrait.src; b.hidden = false; } });
const photo = (k) => loaded[k] ? `<figure class="proof"><img src="${IMAGES[k].src}" alt="${esc(IMAGES[k].alt)}">${IMAGES[k].caption ? `<figcaption>${esc(IMAGES[k].caption)}</figcaption>` : ''}</figure>` : '';
const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 3200); };

/* ------------------------------------------------------------------ */
/* DOM content (works with or without WebGL)                           */
/* ------------------------------------------------------------------ */
$('#timeline').innerHTML = TIMELINE.map((t) => `<div><b>${t.year}</b><span>${esc(t.text)}</span></div>`).join('');
$('#exp-list').innerHTML = EXPERIENCE.map((e) => `<li><button class="list-btn" data-open="exp:${e.id}"><strong>${esc(e.org)}</strong><small>${esc(e.title)}</small><span class="mono">${esc(e.when.split('–')[0].trim())}</span></button></li>`).join('');
$('#proj-list').innerHTML = PROJECTS.map((p) => `<li><button class="list-btn" data-open="proj:${p.id}"><strong>${esc(p.name)}</strong><small>${esc(p.badge)}</small><span class="mono">Case ↗</span></button></li>`).join('');
$('#demo-list').innerHTML = DEMOS.map((d) => `<li><button class="list-btn" data-open="demo:${d.id}"><strong>${esc(d.name)}</strong><small>${esc(d.agent)} · ${esc(d.text)}</small><span class="mono">Live</span></button></li>`).join('');
$('#skill-cats').innerHTML = Object.keys(SKILLS).map((k) => `<span>${esc(k)} · ${SKILLS[k].length}</span>`).join('');
$('#email').textContent = PROFILE.email;
$('#linkedin').href = PROFILE.linkedin;
$('#github').href = PROFILE.github;
$('#rail').innerHTML = STATIONS.map((s, i) => `<li><button type="button" data-jump="${s.id}" aria-label="Go to ${esc(s.label)}"><span>${esc(s.label)}</span><i></i></button></li>`).join('');

$('#copy').addEventListener('click', async () => {
  const btn = $('#copy');
  try { await navigator.clipboard.writeText(PROFILE.email); btn.textContent = 'Copied'; }
  catch {
    const r = document.createRange(); r.selectNodeContents($('#email'));
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); btn.textContent = 'Selected, press Ctrl+C';
  }
  setTimeout(() => { btn.textContent = 'Copy email'; }, 2200);
});

/* Drawer ------------------------------------------------------------ */
const drawer = $('#drawer'), scrim = $('#scrim');
let lastFocus = null;
const tagHTML = (tags) => `<div class="tags">${tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>`;
const builders = {
  exp: (id) => {
    const e = EXPERIENCE.find((x) => x.id === id);
    return `${photo(e.id)}<span class="eyebrow">${esc(e.when)} · ${esc(e.where)}</span><h3 id="drawer-title">${esc(e.org)}</h3><p class="sub">${esc(e.title)}</p><p>${esc(e.body)}</p>${tagHTML(e.tags)}`;
  },
  proj: (id) => {
    const p = PROJECTS.find((x) => x.id === id);
    const links = p.links.map((l) => `<a class="cta ghost" href="${l.href}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join('');
    const extra = p.id === 'aialo' ? `<button class="cta" type="button" data-jump="demos" data-close>See the 5 demos</button>` : '';
    return `${photo(p.id)}<span class="eyebrow">${esc(p.when)}</span><h3 id="drawer-title">${esc(p.name)}</h3><p class="sub">${esc(p.badge)}</p>
      <dl><div><dt>Problem</dt><dd>${esc(p.problem)}</dd></div><div><dt>Approach</dt><dd>${esc(p.approach)}</dd></div><div><dt>Result</dt><dd>${esc(p.result)}</dd></div></dl>
      ${tagHTML(p.tags)}<div class="cta-row">${links}${extra}</div>`;
  },
  demo: (id) => {
    const d = DEMOS.find((x) => x.id === id);
    return `<span class="eyebrow">${esc(d.vertical)} · live on Railway</span><h3 id="drawer-title">${esc(d.name)}</h3><p class="sub">Meet ${esc(d.agent)}.</p><p>${esc(d.text)}</p>
      <p>Claude tool-calling with an Ollama fallback, ChromaDB embeddings, an MCP server and an operator dashboard. Guardrails cover 23 prompt-injection patterns.</p>
      <div class="cta-row"><a class="cta" href="${d.href}" target="_blank" rel="noopener">Open ${esc(d.agent)} live ↗</a></div>`;
  },
  journey: () => `${photo('graduation')}<span class="eyebrow">2022 → 2026</span><h3 id="drawer-title">The journey</h3>
      <p>I started as an international student with early applications that went nowhere. Becoming a Student Alumni Ambassador in 2023 put me in rooms with alumni and mentors who helped me rebuild my resume, sharpen my pitch and learn real follow-through.</p>
      <p>That discipline led to internships at banduri and Navy Federal Credit Union, then SyncData.ai and Flatter, Inc. As a Rise Peer Mentor and RA I help other first-generation and international students do the same.</p>
      <p class="sub">Success is rarely a solo journey.</p><div class="timeline">${$('#timeline').innerHTML}</div>`,
};
function openDrawer(key) {
  const [kind, id] = key.split(':');
  $('#drawer-body').innerHTML = builders[kind](id);
  lastFocus = document.activeElement;
  drawer.classList.add('open'); scrim.classList.add('show'); drawer.setAttribute('aria-hidden', 'false');
  $('#drawer-close').focus({ preventScroll: true });
  lenis?.stop();
  audio.ping(kind === 'demo' ? 880 : 660);
}
function closeDrawer() {
  drawer.classList.remove('open'); scrim.classList.remove('show'); drawer.setAttribute('aria-hidden', 'true');
  lenis?.start();
  lastFocus?.focus?.({ preventScroll: true });
}
$('#drawer-close').addEventListener('click', closeDrawer);
scrim.addEventListener('click', closeDrawer);
addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer(); });

document.addEventListener('click', (e) => {
  const open = e.target.closest('[data-open]');
  if (open) { openDrawer(open.dataset.open); return; }
  const jump = e.target.closest('[data-jump]');
  if (jump) {
    e.preventDefault();
    if (jump.hasAttribute('data-close')) closeDrawer();
    goTo(jump.dataset.jump);
  }
});

/* Ask the world ------------------------------------------------------ */
const search = makeIndex(buildCorpus());
const askPanel = $('#ask'), askInput = $('#ask-input'), askOut = $('#ask-out'), askBtn = $('#ask-toggle');
const chipsHTML = askOut.innerHTML;
function openAsk() { askPanel.hidden = false; askBtn.setAttribute('aria-expanded', 'true'); askInput.focus({ preventScroll: true }); }
function closeAsk() { askPanel.hidden = true; askBtn.setAttribute('aria-expanded', 'false'); askBtn.focus({ preventScroll: true }); }
askBtn.addEventListener('click', () => (askPanel.hidden ? openAsk() : closeAsk()));
$('#ask-close').addEventListener('click', closeAsk);
addEventListener('keydown', (e) => {
  const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName || '');
  if ((e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); openAsk(); }
  else if (e.key === 'Escape' && !askPanel.hidden && !drawer.classList.contains('open')) closeAsk();
});
$('#ask-form').addEventListener('submit', (e) => { e.preventDefault(); answer(askInput.value); });
askPanel.addEventListener('click', (e) => { const c = e.target.closest('[data-q]'); if (c) { askInput.value = c.dataset.q; answer(c.dataset.q); } });
let typer = 0, askCtl = null, sampleOff = false;
const samplerP = (window.claude?.use ? window.claude.use('sample').catch(() => null) : Promise.resolve(null));
const citeList = (r) => r.map((x, i) => `[${i + 1}] ${esc(x.d.src)}`).join(' · ');
async function generate(q, r, el, srcEl) {
  // 1) your own serverless endpoint (does retrieval + Claude server-side)
  if (ASK_ENDPOINT) {
    try {
      srcEl.textContent = 'Writing an answer…';
      const res = await fetch(ASK_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q }) });
      if (!res.ok) throw new Error(res.status);
      const j = await res.json();
      el.textContent = j.answer; srcEl.textContent = `Claude · grounded in ${j.sources?.join(' · ') || 'site content'}`;
      return;
    } catch { /* fall through */ }
  }
  // 2) Claude inside claude.ai (viewer's own account, asks consent on first use)
  const sample = sampleOff ? null : await samplerP;
  if (!sample) { srcEl.textContent = `Retrieved · ${citeList(r)}`; return; }
  askCtl?.abort(); askCtl = new AbortController();
  srcEl.textContent = 'Retrieved sources · Claude is writing…';
  try {
    await sample(ragPrompt(q, r), { modelTier: 'quick', signal: askCtl.signal, onText: ({ text }) => { clearInterval(typer); el.textContent = text; } });
    srcEl.textContent = `Claude · grounded in ${citeList(r)}`;
  } catch (e) {
    if (e?.text) el.textContent = e.text;
    if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(e?.code)) sampleOff = true;
    srcEl.textContent = e?.code === 'cancelled' ? '' : `Retrieved · ${citeList(r)}`;
  }
}
function answer(q) {
  q = q.trim(); if (!q) return;
  const r = search(q, 4);
  clearInterval(typer);
  if (!r.length) {
    askOut.innerHTML = `<p class="ask-a">That isn’t covered on this site. Try experience, projects, demos, skills or how to get in touch.</p>${chipsHTML}`;
    return;
  }
  const top = r[0].d, text = extract(top.text, q);
  askOut.innerHTML = `<p class="ask-a" id="ask-a"></p><p class="ask-src" id="ask-src"></p>${top.open ? `<button class="chip-btn" type="button" data-open="${top.open}">Open details</button>` : ''}`;
  const el = $('#ask-a');
  if (reduced) el.textContent = text;
  else { let i = 0; typer = setInterval(() => { i += 3; el.textContent = text.slice(0, i); if (i >= text.length) clearInterval(typer); }, 16); }
  generate(q, r, el, $('#ask-src'));
  goTo(top.station);
  const hv = linkHover[top.open];
  if (hv) { setTimeout(() => hv(true), 1700); setTimeout(() => hv(false), 4800); }
  audio.ping(700);
}

/* ------------------------------------------------------------------ */
/* Ambient sound (Web Audio, generated)                                */
/* ------------------------------------------------------------------ */
// Generative score: a slow pad that changes chord at every station, room reverb, and an
// amadinda-style part (Buganda's interlocking xylophone, pentatonic 5-EDO tuning) that swells
// in over the Uganda globe. Optional SOUNDTRACK file plays on top if you add one.
const CHORDS = [
  [73.42, 110, 146.83, 185], [98, 146.83, 196, 246.94], [82.41, 123.47, 164.81, 196], [110, 164.81, 220, 277.18],
  [123.47, 185, 246.94, 293.66], [98, 146.83, 220, 246.94], [146.83, 220, 293.66, 369.99],
];
const AMADINDA = Array.from({ length: 10 }, (_, k) => 196 * Math.pow(2, k / 5));
const OKUNAGA = [0, 2, 4, 2, 1, 3, 0, 2, 4, 3, 1, 2], OKWAWULA = [5, 7, 6, 8, 5, 6, 7, 9, 6, 8, 7, 5];
const audio = {
  ctx: null, on: false, chord: -1, pluckAmt: 0, track: null,
  init() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain(); master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 3;
    master.connect(comp).connect(ctx.destination);
    const len = Math.floor(ctx.sampleRate * 3.2), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8); }
    const verb = ctx.createConvolver(); verb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.5; verb.connect(wet).connect(master);
    const dry = ctx.createGain(); dry.gain.value = 0.75; dry.connect(master);
    const padBus = ctx.createGain(); padBus.gain.value = 1;
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 650; filter.Q.value = 0.4;
    padBus.connect(filter); filter.connect(dry); filter.connect(verb);
    const voices = [0.15, 0.085, 0.075, 0.045].map((gv, i) => {
      const pair = [0, 7].map((det) => { const o = ctx.createOscillator(); o.type = i % 2 ? 'triangle' : 'sine'; o.detune.value = det; o.frequency.value = CHORDS[0][i]; const g = ctx.createGain(); g.gain.value = det ? gv * 0.55 : gv; o.connect(g).connect(padBus); o.start(); return o; });
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.04 + i * 0.027; const lg = ctx.createGain(); lg.gain.value = 3; lfo.connect(lg); pair.forEach((o) => lg.connect(o.detune)); lfo.start();
      return pair;
    });
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = buf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const wind = ctx.createBufferSource(); wind.buffer = buf; wind.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.5;
    const wg = ctx.createGain(); wg.gain.value = 0.025; wind.connect(bp).connect(wg).connect(dry); wind.start();
    const pluckBus = ctx.createGain(); pluckBus.gain.value = 0; pluckBus.connect(dry); pluckBus.connect(verb);
    Object.assign(this, { ctx, master, filter, voices, padBus, pluckBus, dry, verb });
    this.next = ctx.currentTime + 0.1; this.step = 0;
    this.timer = setInterval(() => this.schedule(), 50);
    if (SOUNDTRACK) {
      const el = new Audio(SOUNDTRACK); el.loop = true; el.preload = 'auto';
      const g = ctx.createGain(); g.gain.value = 0.7; ctx.createMediaElementSource(el).connect(g).connect(master);
      padBus.gain.value = 0.35; this.track = el;
    }
  },
  pluck(freq, t) {
    const { ctx } = this, g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    [[1, 'sine', 1], [2.01, 'triangle', 0.25], [3.9, 'sine', 0.08]].forEach(([m, type, a]) => {
      const o = ctx.createOscillator(), og = ctx.createGain(); o.type = type; o.frequency.value = freq * m; og.gain.value = a;
      o.connect(og).connect(g); o.start(t); o.stop(t + 0.34);
    });
    g.connect(this.pluckBus);
  },
  schedule() {
    if (!this.on) return;
    while (this.next < this.ctx.currentTime + 0.2) {
      if (this.pluckAmt > 0.02) { const k = (this.step >> 1) % 12; this.pluck(AMADINDA[this.step % 2 ? OKWAWULA[k] : OKUNAGA[k]], this.next); }
      this.next += 0.115; this.step++;
    }
  },
  toggle() {
    if (!this.ctx) this.init();
    this.on = !this.on;
    this.ctx.resume();
    this.next = this.ctx.currentTime + 0.1;
    this.master.gain.setTargetAtTime(this.on ? 0.6 : 0, this.ctx.currentTime, 0.6);
    if (this.track) { if (this.on) this.track.play().catch(() => {}); else setTimeout(() => this.track.pause(), 1500); }
    return this.on;
  },
  update(f) {
    if (!this.on) return;
    const t = this.ctx.currentTime, c = Math.round(f);
    if (c !== this.chord) { this.chord = c; this.voices.forEach((pair, k) => pair.forEach((o) => o.frequency.setTargetAtTime(CHORDS[c][k], t, 1.4))); }
    const amt = Math.max(0, 1 - Math.abs(f - 1) * 1.3);
    if (Math.abs(amt - this.pluckAmt) > 0.02) { this.pluckAmt = amt; this.pluckBus.gain.setTargetAtTime(amt * 0.16, t, 0.4); }
    this.filter.frequency.setTargetAtTime(520 + f * 140, t, 0.8);
  },
  ping(freq = 740, level = 0.1) {
    if (!this.on) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.12);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(level, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g); g.connect(this.dry); g.connect(this.verb); o.start(t); o.stop(t + 0.55);
  },
};
$('#sound').addEventListener('click', (e) => {
  try { e.currentTarget.setAttribute('aria-pressed', String(audio.toggle())); } catch { e.currentTarget.disabled = true; }
});

/* ------------------------------------------------------------------ */
/* Smooth scroll + station mapping                                     */
/* ------------------------------------------------------------------ */
const lenis = reduced ? null : new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.9 });
const sections = STATIONS.map((s) => document.querySelector(`[data-station="${s.id}"]`));
let stops = [];
function measureStops() {
  const max = document.documentElement.scrollHeight - innerHeight;
  stops = sections.map((el, i) => (i === 0 ? 0 : Math.min(max, el.offsetTop + el.offsetHeight / 2 - innerHeight / 2)));
}
function stationFloat(y) {
  if (y <= stops[0]) return 0;
  for (let i = 0; i < stops.length - 1; i++) {
    if (y <= stops[i + 1]) return i + (y - stops[i]) / Math.max(1, stops[i + 1] - stops[i]);
  }
  return stops.length - 1;
}
function goTo(id) {
  const i = STATIONS.findIndex((s) => s.id === id);
  if (i < 0) return;
  if (lenis) lenis.scrollTo(stops[i], { duration: 2.2, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else scrollTo({ top: stops[i], behavior: 'auto' });
}
measureStops();
addEventListener('resize', measureStops);

const railBtns = [...document.querySelectorAll('#rail button')];
let activeStation = -1;
function updateHUD(f) {
  const a = Math.round(f);
  if (a !== activeStation) {
    activeStation = a;
    railBtns.forEach((b, i) => b.classList.toggle('active', i === a));
  }
}
addEventListener('scroll', () => { if (scrollY > 60) $('#hint').classList.add('hide'); }, { passive: true });

/* ------------------------------------------------------------------ */
/* WebGL                                                               */
/* ------------------------------------------------------------------ */
const canvas = $('#world');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  if (!renderer.capabilities.isWebGL2) throw new Error('WebGL2 required');
} catch (err) {
  document.documentElement.classList.add('no-webgl');
  document.body.classList.add('no-webgl');
  $('#loader').classList.add('done');
  $('#hint').textContent = 'Your browser could not start WebGL, so this is the text-only version';
  renderer = null;
  if (lenis) (function raf(t) { lenis.raf(t); updateHUD(stationFloat(scrollY)); requestAnimationFrame(raf); })(0);
}

if (renderer) boot();

async function boot() {
  const loaderCount = $('#loader-count'), loaderBar = $('#loader-bar');
  const bootLog = $('#boot');
  const progress = async (p, line) => {
    loaderCount.textContent = String(Math.round(p * 100)).padStart(2, '0'); loaderBar.style.width = `${p * 100}%`;
    if (line) { const d = document.createElement('div'); d.textContent = line; bootLog.append(d); while (bootLog.children.length > 4) bootLog.firstChild.remove(); }
    await nextFrame();
  };

  renderer.setPixelRatio(Math.min(devicePixelRatio, HIGH() ? 2 : 1));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(NIGHT.clone(), 0.0105);
  const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 1400);
  camera.position.set(0, 6, 44);

  const clock = new THREE.Timer();
  const U = { uTime: { value: 0 }, uDawn: { value: 0 }, uPR: { value: renderer.getPixelRatio() } };
  const hits = []; // raycast targets
  const register = (obj, entry) => { obj.userData.hit = entry; hits.push(obj); };

  await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1500))]);
  await Promise.race([imgReady, new Promise((r) => setTimeout(r, 2500))]);
  await progress(0.05, 'Loading type, photos and shaders');

  scene.add(new THREE.HemisphereLight(0x8fa8ff, 0x0a0f24, 0.6));
  const key = new THREE.DirectionalLight(0xffe2b0, 1.2); key.position.set(10, 20, 10); scene.add(key);

  /* ---------- sky + stars ---------- */
  const SUN_POS = new THREE.Vector3(0, 26, -640);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uDawn: U.uDawn, uSun: { value: new THREE.Vector3(0, 0.085, -1).normalize() } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.); gl_Position = p.xyww; }`,
    fragmentShader: `varying vec3 vDir; uniform float uDawn; uniform vec3 uSun;
      void main(){
        float h = vDir.y;
        vec3 nTop = vec3(0.004,0.007,0.025), nHor = vec3(0.025,0.04,0.11);
        vec3 dTop = vec3(0.03,0.04,0.12), dHor = vec3(0.5,0.24,0.14);
        vec3 top = mix(nTop, dTop, uDawn), hor = mix(nHor, dHor, uDawn);
        vec3 c = mix(hor, top, smoothstep(-0.02, 0.45, h));
        float s = max(dot(vDir, uSun), 0.);
        c += vec3(1.0,0.62,0.3) * (pow(s, 40.) * 0.5 + pow(s, 6.) * 0.08) * uDawn;
        c = mix(c, nTop * 0.6, smoothstep(0.0, -0.25, h));
        gl_FragColor = vec4(c, 1.);
      }`,
  }));
  sky.frustumCulled = false; scene.add(sky);

  const pointsMat = (vs, fs, extra = {}) => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { ...U, ...extra }, vertexShader: vs, fragmentShader: fs });
  const starGeo = new THREE.BufferGeometry();
  { const n = HIGH() ? 2600 : 1200, p = new Float32Array(n * 3), s = new Float32Array(n);
    for (let i = 0; i < n; i++) { const v = new THREE.Vector3().randomDirection(); v.y = Math.abs(v.y) * 0.95 + 0.02; v.normalize().multiplyScalar(800); p.set([v.x, v.y, v.z], i * 3); s[i] = Math.random(); }
    starGeo.setAttribute('position', new THREE.BufferAttribute(p, 3)); starGeo.setAttribute('aSeed', new THREE.BufferAttribute(s, 1)); }
  const stars = new THREE.Points(starGeo, pointsMat(
    `attribute float aSeed; uniform float uTime; uniform float uPR; varying float vA;
     void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); gl_Position = projectionMatrix * mv; gl_Position.z = gl_Position.w * 0.9999;
       vA = 0.35 + 0.65 * sin(uTime * (0.6 + aSeed * 2.) + aSeed * 40.) * 0.5 + 0.5; gl_PointSize = (1.0 + aSeed * 2.2) * uPR; }`,
    `uniform float uDawn; varying float vA; void main(){ float d = length(gl_PointCoord - .5); if(d > .5) discard; gl_FragColor = vec4(vec3(0.85,0.9,1.), (1. - d*2.) * vA * (1. - uDawn * 0.92)); }`));
  stars.frustumCulled = false; scene.add(stars);

  /* ---------- ground grid with the river ---------- */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600, 1, 1), new THREE.ShaderMaterial({
    transparent: true, fog: false, uniforms: U,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `varying vec3 vW; uniform float uTime; uniform float uDawn;
      void main(){
        vec2 c = vW.xz / 4.0; vec2 g = abs(fract(c - .5) - .5) / fwidth(c);
        float line = 1. - min(min(g.x, g.y), 1.);
        vec2 c2 = vW.xz / 20.0; vec2 g2 = abs(fract(c2 - .5) - .5) / fwidth(c2);
        float major = 1. - min(min(g2.x, g2.y), 1.);
        float dist = distance(cameraPosition.xz, vW.xz);
        float fade = exp(-dist * 0.016);
        float rx = sin(vW.z * 0.03) * 10. + sin(vW.z * 0.011) * 6. - 2.;
        float river = smoothstep(2.2, 0., abs(vW.x - rx));
        float flow = 0.55 + 0.45 * sin(vW.z * 0.35 + uTime * 2.2);
        vec3 base = mix(vec3(0.02,0.035,0.09), vec3(0.09,0.06,0.07), uDawn);
        vec3 col = base + vec3(0.25,0.35,0.75) * line * 0.22 + vec3(0.9,0.7,0.3) * major * 0.10;
        col += vec3(0.44,0.89,0.84) * river * flow * 0.28;
        gl_FragColor = vec4(col, fade);
      }`,
  }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -4; scene.add(ground);

  /* ---------- drifting data motes ---------- */
  { const n = HIGH() ? 3500 : 1400, p = new Float32Array(n * 3), s = new Float32Array(n);
    for (let i = 0; i < n; i++) { p.set([(Math.random() - 0.5) * 70, Math.random() * 18 - 3, 30 - Math.random() * 430], i * 3); s[i] = Math.random(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(s, 1));
    const motes = new THREE.Points(g, pointsMat(
      `attribute float aSeed; uniform float uTime; uniform float uPR; varying float vS;
       void main(){ vec3 p = position; p.y = mod(p.y + 3. + uTime * (0.15 + aSeed * 0.35), 18.) - 3.; p.x += sin(uTime * 0.3 + aSeed * 20.) * 0.6;
         vec4 mv = modelViewMatrix * vec4(p,1.); gl_Position = projectionMatrix * mv; vS = aSeed; gl_PointSize = min((1.2 + aSeed * 2.4) * (28. / -mv.z), 5.) * uPR; }`,
      `varying float vS; void main(){ float d = length(gl_PointCoord - .5); if(d > .5) discard; vec3 c = mix(vec3(0.91,0.71,0.29), vec3(0.44,0.89,0.84), step(0.55, vS)); gl_FragColor = vec4(c, (1. - d * 2.) * 0.55); }`));
    motes.frustumCulled = false; scene.add(motes); }
  await progress(0.2, 'Painting the sky, the river and the data motes');

  /* ---------- labels ---------- */
  function label(title, sub = '', { accent = '#e8b54a', h = 0.9 } = {}) {
    const dpr = 2, pad = 28 * dpr, c = document.createElement('canvas'), x = c.getContext('2d');
    const tf = `600 ${46 * dpr}px "Bricolage Grotesque", system-ui, sans-serif`, sf = `500 ${22 * dpr}px "IBM Plex Mono", monospace`;
    x.font = tf; const tw = x.measureText(title).width; x.font = sf; const sw = sub ? x.measureText(sub).width : 0;
    c.width = Math.ceil(Math.max(tw, sw) + pad * 2); c.height = (sub ? 128 : 88) * dpr;
    x.fillStyle = 'rgba(8,12,30,0.72)'; x.strokeStyle = 'rgba(154,165,194,0.35)'; x.lineWidth = 2 * dpr;
    x.beginPath(); x.roundRect(dpr, dpr, c.width - 2 * dpr, c.height - 2 * dpr, 16 * dpr); x.fill(); x.stroke();
    x.fillStyle = '#eef1f8'; x.font = tf; x.textBaseline = 'middle'; x.fillText(title, pad, (sub ? 46 : 44) * dpr);
    if (sub) { x.fillStyle = accent; x.font = sf; x.fillText(sub, pad, 94 * dpr); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
    const hh = h * (sub ? 1 : 0.7); s.scale.set(hh * c.width / c.height, hh, 1); s.renderOrder = 10;
    return s;
  }

  /* ---------- simplex noise GLSL (Ashima Arts, MIT) ---------- */
  const NOISE = `vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;} vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
    vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);} vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
    float snoise(vec3 v){ const vec2 C=vec2(1./6.,1./3.); const vec4 D=vec4(0.,.5,1.,2.);
      vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx); vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
      vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy; i=mod289(i);
      vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
      float n_=.142857142857; vec3 ns=n_*D.wyz-D.xzx; vec4 j=p-49.*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.*x_);
      vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.-abs(x)-abs(y); vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
      vec4 s0=floor(b0)*2.+1.; vec4 s1=floor(b1)*2.+1.; vec4 sh=-step(h,vec4(0.)); vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
      vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3))); p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
      vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.); m=m*m;
      return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3))); }`;

  /* ================================================================ */
  /* Station 0 — the signal core                                       */
  /* ================================================================ */
  const P = { // world anchors for each station
    hero: new THREE.Vector3(0, 0.4, 0),
    journey: new THREE.Vector3(7.5, 1.2, -62),
    experience: new THREE.Vector3(-9.5, 0, -124),
    projects: new THREE.Vector3(7, 0.8, -186),
    demos: new THREE.Vector3(-8.5, -1, -248),
    skills: new THREE.Vector3(8, 1.2, -310),
    contact: new THREE.Vector3(6.5, 5.2, -430),
  };

  const core = new THREE.Group(); core.position.copy(P.hero); scene.add(core);
  const coreU = { ...U, uHover: { value: 0 }, uPulse: { value: 0 } };
  const coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, HIGH() ? 56 : 20), new THREE.ShaderMaterial({
    uniforms: coreU,
    vertexShader: `${NOISE} uniform float uTime, uHover, uPulse; varying vec3 vN; varying vec3 vV; varying float vD;
      void main(){ float n = snoise(position * 0.55 + vec3(0., uTime * 0.22, 0.)); float n2 = snoise(position * 1.8 + uTime * 0.5);
        float d = n * (0.28 + uHover * 0.22) + n2 * (0.05 + uPulse * 0.35); vD = d;
        vec3 p = position + normal * d; vec4 mv = modelViewMatrix * vec4(p, 1.); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uTime, uPulse; varying vec3 vN; varying vec3 vV; varying float vD;
      void main(){ float f = pow(1. - abs(dot(normalize(vN), normalize(vV))), 2.2);
        vec3 deep = vec3(0.03, 0.05, 0.16), sig = vec3(0.44, 0.89, 0.84), gold = vec3(0.91, 0.71, 0.29);
        vec3 c = mix(deep, sig * 0.8, f) + gold * smoothstep(0.14, 0.5, vD) * 0.7;
        c += gold * pow(abs(sin(vD * 26. - uTime * 1.5)), 24.) * 0.35 + sig * uPulse * 0.6;
        gl_FragColor = vec4(c, 1.); }`,
  }));
  core.add(coreMesh);
  const shell = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(3.05, 1)), new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.22 }));
  core.add(shell);
  const rings = [[3.5, 0.014, GOLD, [1.2, 0.2, 0]], [4.2, 0.01, SIGNAL, [0.3, 0.9, 0.2]], [5.1, 0.008, GOLD, [1.7, -0.4, 0.5]]].map(([r, t, c, rot]) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 256), new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(1.6), transparent: true, opacity: 0.85 }));
    m.rotation.set(...rot); core.add(m); return m;
  });
  { const n = HIGH() ? 1600 : 700, p = new Float32Array(n * 3), s = new Float32Array(n);
    for (let i = 0; i < n; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(4.3 + Math.random() * 3.8); p.set([v.x, v.y * 0.6, v.z], i * 3); s[i] = Math.random(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(s, 1));
    const orbit = new THREE.Points(g, pointsMat(
      `attribute float aSeed; uniform float uPR; varying float vS; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); gl_Position = projectionMatrix * mv; vS = aSeed; gl_PointSize = min((1. + aSeed * 2.) * (22. / -mv.z), 5.) * uPR; }`,
      `varying float vS; void main(){ float d = length(gl_PointCoord - .5); if(d > .5) discard; gl_FragColor = vec4(mix(vec3(0.91,0.71,0.29), vec3(0.6,0.95,0.9), vS), (1. - d * 2.) * 0.8); }`));
    orbit.name = 'orbit'; core.add(orbit); }
  const coreHit = new THREE.Mesh(new THREE.SphereGeometry(3.2, 16, 12), new THREE.MeshBasicMaterial({ visible: false }));
  core.add(coreHit);
  register(coreHit, {
    label: 'Signal core · click to pulse',
    hover: (on) => gsap.to(coreU.uHover, { value: on ? 1 : 0, duration: 0.6 }),
    click: () => { audio.ping(520); gsap.fromTo(coreU.uPulse, { value: 1 }, { value: 0, duration: 1.6, ease: 'power3.out' }); },
  });
  await progress(0.32, 'Igniting the signal core');

  /* ================================================================ */
  /* Station 1 — globe + Uganda → Fredericksburg arc                   */
  /* ================================================================ */
  const R = 5;
  const ll = (lat, lon, r = R) => { const phi = THREE.MathUtils.degToRad(90 - lat), th = THREE.MathUtils.degToRad(lon + 180); return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th)); };
  const globe = new THREE.Group(); globe.position.copy(P.journey); scene.add(globe);
  const globeInner = new THREE.Group(); globe.add(globeInner);
  { const n = HIGH() ? 2400 : 1100, p = new Float32Array(n * 3), golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) { const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), t = golden * i; p.set([Math.cos(t) * r * R, y * R, Math.sin(t) * r * R], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    globeInner.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x7d93d8, size: 0.075, transparent: true, opacity: 0.9, depthWrite: false }))); }
  globeInner.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.985, 48, 32), new THREE.MeshBasicMaterial({ color: 0x050918, transparent: true, opacity: 0.7 })));
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts = []; for (let lon = -180; lon <= 180; lon += 6) pts.push(ll(lat, lon, R * 1.002));
    globeInner.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: lat === 0 ? GOLD : 0x2a3970, transparent: true, opacity: lat === 0 ? 0.5 : 0.5 })));
  }
  const A = ll(ORIGIN.lat, ORIGIN.lon), B = ll(DEST.lat, DEST.lon);
  const arcPts = []; for (let i = 0; i <= 64; i++) { const t = i / 64; const v = new THREE.Vector3().copy(A).normalize().lerp(B.clone().normalize(), t).normalize(); arcPts.push(v.multiplyScalar(R + Math.sin(Math.PI * t) * 2.6)); }
  const arcCurve = new THREE.CatmullRomCurve3(arcPts);
  const arcU = { ...U, uDraw: { value: 0 } };
  globeInner.add(new THREE.Mesh(new THREE.TubeGeometry(arcCurve, 160, 0.045, 8), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: arcU,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `uniform float uTime, uDraw; varying vec2 vUv; void main(){ if (vUv.x > uDraw) discard;
      vec3 c = mix(vec3(0.91,0.71,0.29), vec3(0.44,0.89,0.84), vUv.x); float dash = smoothstep(0.7, 1., fract(vUv.x * 6. - uTime * 0.5));
      gl_FragColor = vec4(c * (1.2 + dash * 2.), 0.55 + dash * 0.45); }`,
  })));
  const markers = [[A, GOLD, ORIGIN.label, `${ORIGIN.lat.toFixed(2)}°N ${ORIGIN.lon.toFixed(2)}°E`], [B, SIGNAL, DEST.label, `${DEST.lat.toFixed(2)}°N ${Math.abs(DEST.lon).toFixed(2)}°W`]].map(([pos, col, name, sub]) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(2) }));
    m.position.copy(pos); globeInner.add(m);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.26, 40), new THREE.MeshBasicMaterial({ color: col, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    ring.position.copy(pos).multiplyScalar(1.005); ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize()); globeInner.add(ring);
    const l = label(name, sub, { h: 0.85 }); l.position.copy(pos).multiplyScalar(1.5); globeInner.add(l);
    return ring;
  });
  TIMELINE.forEach((t, i) => { const s = label(t.year, '', { h: 0.62 }); s.position.copy(arcCurve.getPoint([0.28, 0.46, 0.62, 0.76][i])).multiplyScalar(1.1); globeInner.add(s); });
  // turn the globe so the arc faces the viewer
  const faceDir = new THREE.Vector3(-0.35, 0.25, 1).normalize();
  globeInner.quaternion.setFromUnitVectors(A.clone().add(B).normalize(), faceDir);
  const globeHit = new THREE.Mesh(new THREE.SphereGeometry(R * 1.1, 16, 12), new THREE.MeshBasicMaterial({ visible: false }));
  globe.add(globeHit);
  register(globeHit, { label: 'The journey · open the story', click: () => openDrawer('journey'), hover: (on) => gsap.to(globe.scale, { x: on ? 1.04 : 1, y: on ? 1.04 : 1, z: on ? 1.04 : 1, duration: 0.6 }) });
  // Waving flags planted at both ends of the arc
  const faceLocal = faceDir.clone().applyQuaternion(globeInner.quaternion.clone().invert());
  function plantFlag(canvasEl, pos) {
    const tex = new THREE.CanvasTexture(canvasEl); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const g = new THREE.Group(), n = pos.clone().normalize();
    g.position.copy(pos); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    const d = faceLocal.clone().applyQuaternion(g.quaternion.clone().invert()); g.rotateY(Math.atan2(d.x, d.z));
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 2, 6), new THREE.MeshBasicMaterial({ color: 0xd6d9e2 }));
    pole.position.y = 1; g.add(pole);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: GOLD.clone().multiplyScalar(2) })); knob.position.y = 2.02; g.add(knob);
    const w = 1.3, hgt = w * canvasEl.height / canvasEl.width;
    const geo = new THREE.PlaneGeometry(w, hgt, 28, 14); geo.translate(w / 2, 0, 0);
    const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      side: THREE.DoubleSide, uniforms: { uTime: U.uTime, uMap: { value: tex }, uW: { value: w } },
      vertexShader: `uniform float uTime, uW; varying vec2 vUv; varying float vS;
        void main(){ vUv = uv; vec3 p = position; float k = p.x / uW;
          float ph = p.x * 4.6 - uTime * 3.1; p.z += (sin(ph) * 0.1 + sin(p.x * 9. + p.y * 3. - uTime * 4.4) * 0.025) * k; p.y -= k * k * 0.05;
          vS = cos(ph) * k; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.); }`,
      fragmentShader: `uniform sampler2D uMap; varying vec2 vUv; varying float vS;
        void main(){ vec3 c = texture2D(uMap, vUv).rgb; c *= 0.72 + vS * 0.28 + 0.12; gl_FragColor = vec4(c, 1.); }`,
    }));
    m.position.y = 2 - hgt / 2; g.add(m);
    globeInner.add(g);
  }
  plantFlag(ugandaFlag(), A);
  plantFlag(usFlag(), B);

  // A comet that makes the crossing again and again
  const comet = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff2d0).multiplyScalar(4) }));
  globeInner.add(comet);
  const TRAIL = 48, trailPos = new Float32Array(TRAIL * 3), trailA = new Float32Array(TRAIL);
  for (let k = 0; k < TRAIL; k++) trailA[k] = 1 - k / TRAIL;
  const trailGeo = new THREE.BufferGeometry(); trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3)); trailGeo.setAttribute('aA', new THREE.BufferAttribute(trailA, 1));
  const trail = new THREE.Points(trailGeo, pointsMat(
    `attribute float aA; uniform float uPR; varying float vA; void main(){ vA = aA; vec4 mv = modelViewMatrix * vec4(position,1.); gl_Position = projectionMatrix * mv; gl_PointSize = min(aA * 30. / -mv.z, 6.) * uPR; }`,
    `varying float vA; void main(){ float d = length(gl_PointCoord - .5); if(d > .5) discard; gl_FragColor = vec4(mix(vec3(0.44,0.89,0.84), vec3(1.,0.85,0.5), vA) * 1.6, (1. - d * 2.) * vA); }`));
  trail.frustumCulled = false; globeInner.add(trail);
  const tmpC = new THREE.Vector3();
  function updateComet(t) {
    const ct = Math.min((t * 0.16) % 1.25, 1), e = ct < 0.5 ? 2 * ct * ct : 1 - Math.pow(-2 * ct + 2, 2) / 2;
    const vis = arcU.uDraw.value >= 0.99 && ct < 1;
    comet.visible = trail.visible = vis;
    if (!vis) return;
    arcCurve.getPoint(e, tmpC); comet.position.copy(tmpC);
    for (let k = 0; k < TRAIL; k++) { arcCurve.getPoint(Math.max(0, e - k * 0.0045), tmpC); trailPos.set([tmpC.x, tmpC.y, tmpC.z], k * 3); }
    trailGeo.attributes.position.needsUpdate = true;
  }

  // Grey crowned crane, Uganda's national bird, circling the globe. Click it.
  const crane = new THREE.Group(); scene.add(crane);
  { const grey = new THREE.MeshStandardMaterial({ color: 0x9aa0ae, roughness: 0.65, flatShading: true });
    const dark = new THREE.MeshStandardMaterial({ color: 0x15171d, roughness: 0.6, flatShading: true });
    const white = new THREE.MeshStandardMaterial({ color: 0xeef0f4, roughness: 0.6, flatShading: true, emissive: 0x222222 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), grey); body.scale.set(0.55, 0.5, 1.15); crane.add(body);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.95, 6), grey); neck.position.set(0, 0.28, 0.78); neck.rotation.x = 1.05; crane.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), dark); head.position.set(0, 0.5, 1.2); crane.add(head);
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), white); cheek.position.set(0.08, 0.5, 1.22); crane.add(cheek);
    const wattle = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff3030 })); wattle.position.set(0, 0.4, 1.24); crane.add(wattle);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.3, 5), dark); beak.position.set(0, 0.47, 1.42); beak.rotation.x = Math.PI / 2; crane.add(beak);
    const crownP = new Float32Array(60 * 3); for (let k = 0; k < 60; k++) { const a = Math.random() * Math.PI * 2, r = Math.random() * 0.16; crownP.set([Math.cos(a) * r, 0.66 + Math.random() * 0.12, 1.16 + Math.sin(a) * r], k * 3); }
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(crownP, 3));
    crane.add(new THREE.Points(cg, new THREE.PointsMaterial({ color: new THREE.Color(0xfcdc04).multiplyScalar(2.2), size: 0.05 })));
    const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 4), dark); legs.position.set(0, -0.12, -1.05); legs.rotation.x = Math.PI / 2; crane.add(legs);
    crane.userData.wings = [-1, 1].map((sd) => {
      const pivot = new THREE.Group(); pivot.position.set(sd * 0.2, 0.08, 0.1); crane.add(pivot);
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.03, 0.72), white); wing.position.x = sd * 0.95; pivot.add(wing);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.035, 0.5), dark); tip.position.x = sd * 1.75; tip.position.z = -0.1; pivot.add(tip);
      pivot.userData.sd = sd; return pivot;
    });
    const craneHit = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); crane.add(craneHit);
    register(craneHit, { label: 'Grey crowned crane · click me', click: () => { audio.ping(1180); setTimeout(() => audio.ping(1480), 140); toast('Grey crowned crane · Uganda’s national bird, the one on the flag'); } });
    crane.scale.setScalar(0.75);
  }
  const craneNext = new THREE.Vector3();
  const cranePath = (a, out) => out.set(P.journey.x + Math.cos(a) * 12, P.journey.y + 5.5 + Math.sin(a * 2) * 1.2, P.journey.z + Math.sin(a) * 8.5);
  function updateCrane(t) {
    const a = t * 0.22;
    cranePath(a, crane.position); cranePath(a + 0.02, craneNext); crane.lookAt(craneNext);
    crane.rotateZ(-0.25);
    crane.userData.wings.forEach((w) => { w.rotation.z = w.userData.sd * Math.sin(t * 5.2) * 0.55; });
  }
  await progress(0.45, 'Plotting Uganda → Fredericksburg · 11,619 km');

  /* ================================================================ */
  /* Station 2 — experience towers                                      */
  /* ================================================================ */
  const towerVS = `varying vec2 vUv; varying vec3 vP; void main(){ vUv = uv; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`;
  const towerFS = `uniform float uTime, uHover, uH, uSeed; uniform vec3 uCol; varying vec2 vUv; varying vec3 vP;
    void main(){ float e = min(min(vUv.x, 1. - vUv.x), min(vUv.y, 1. - vUv.y));
      float edge = smoothstep(0.035, 0., e);
      float y = vP.y / uH + 0.5;
      float floors = smoothstep(0.08, 0., abs(fract(y * uH * 1.2) - 0.5) - 0.42) * 0.12;
      float wx = step(0.3, fract(vUv.x * 4.)) * step(fract(vUv.x * 4.), 0.7);
      float win = wx * step(0.5, fract(sin(floor(y * uH * 1.2) * 12.9898 + floor(vUv.x * 4.) * 78.233 + uSeed) * 43758.5453)) * 0.18;
      float band = smoothstep(0.06, 0., abs(y - fract(uTime * 0.12 + uSeed)));
      vec3 c = vec3(0.025, 0.04, 0.1) + uCol * (edge * (0.9 + uHover * 1.6) + floors + win * (0.6 + uHover) + band * (0.5 + uHover));
      gl_FragColor = vec4(c, 1.); }`;
  const towers = EXPERIENCE.map((e, i) => {
    const h = e.height, g = new THREE.Group();
    const x = P.experience.x - 8 + i * 4, z = P.experience.z + (i % 2 ? -2.5 : 1.5);
    g.position.set(x, -4, z);
    const u = { uTime: U.uTime, uHover: { value: 0 }, uH: { value: h }, uSeed: { value: i * 0.21 }, uCol: { value: (i % 2 ? SIGNAL : GOLD).clone() } };
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.7, h, 1.7), new THREE.ShaderMaterial({ uniforms: u, vertexShader: towerVS, fragmentShader: towerFS }));
    m.position.y = h / 2; g.add(m);
    const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshBasicMaterial({ color: u.uCol.value.clone().multiplyScalar(2) }));
    cap.position.y = h + 0.8; g.add(cap);
    const l = label(e.org, e.when, { h: 0.8 }); l.position.y = h + 1.9; g.add(l);
    scene.add(g);
    const entry = {
      label: `${e.org} · open role`,
      hover: (on) => { gsap.to(u.uHover, { value: on ? 1 : 0, duration: 0.4 }); gsap.to(g.position, { y: on ? -3.6 : -4, duration: 0.6, ease: 'power3.out' }); },
      click: () => openDrawer(`exp:${e.id}`),
    };
    register(m, entry); linkHover[`exp:${e.id}`] = entry.hover;
    return { g, cap };
  });
  await progress(0.58, 'Raising five experience towers');

  /* ================================================================ */
  /* Station 3 — ProofMode sealed document + RAG shard spiral           */
  /* ================================================================ */
  const proof = new THREE.Group(); proof.position.copy(P.projects); proof.rotation.y = -0.35; scene.add(proof);
  const docU = { uTime: U.uTime, uHover: { value: 0 } };
  const doc = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.2, 0.1), new THREE.ShaderMaterial({ uniforms: docU,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `uniform float uTime, uHover; varying vec2 vUv;
      float hash(float n){ return fract(sin(n) * 43758.5453); }
      void main(){ float rows = 24.; float r = floor(vUv.y * rows); float fy = fract(vUv.y * rows);
        float len = 0.3 + 0.55 * hash(r + 3.);
        float bar = step(0.35, fy) * step(fy, 0.65) * step(0.12, vUv.x) * step(vUv.x, 0.12 + len * 0.76) * step(2., r) * step(r, rows - 4.);
        float title = step(rows - 3., r) * step(r, rows - 2.) * step(0.12, vUv.x) * step(vUv.x, 0.6) * step(0.25, fy);
        float scan = fract(1. - uTime * 0.12);
        float sealed = step(scan, vUv.y);
        float sl = smoothstep(0.012, 0., abs(vUv.y - scan));
        float e = min(min(vUv.x, 1. - vUv.x), min(vUv.y, 1. - vUv.y)); float edge = smoothstep(0.018, 0., e);
        vec3 paper = vec3(0.035, 0.05, 0.12);
        vec3 ink = mix(vec3(0.45, 0.5, 0.68), vec3(0.91, 0.71, 0.29), sealed);
        vec3 c = paper + ink * (bar * 0.55 + title * 0.9) + vec3(0.44, 0.89, 0.84) * sl * 1.8 + vec3(0.91, 0.71, 0.29) * edge * (1. + uHover);
        gl_FragColor = vec4(c, 1.); }`,
  }));
  proof.add(doc);
  const seal = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.72, 6), new THREE.MeshBasicMaterial({ color: GOLD.clone().multiplyScalar(2), side: THREE.DoubleSide }));
  seal.position.set(1.15, -1.5, 0.12); proof.add(seal);
  const seal2 = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.46, 6), new THREE.MeshBasicMaterial({ color: GOLD.clone().multiplyScalar(1.5), side: THREE.DoubleSide }));
  seal2.position.copy(seal.position); proof.add(seal2);
  const checkRing = new THREE.Group(); checkRing.rotation.x = 1.2; proof.add(checkRing);
  checkRing.add(new THREE.Mesh(new THREE.TorusGeometry(3, 0.008, 6, 200), new THREE.MeshBasicMaterial({ color: SIGNAL, transparent: true, opacity: 0.6 })));
  for (let i = 0; i < 10; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), new THREE.MeshBasicMaterial({ color: SIGNAL.clone().multiplyScalar(1.8) })); const a = (i / 10) * Math.PI * 2; c.position.set(Math.cos(a) * 3, Math.sin(a) * 3, 0); checkRing.add(c); }
  // The live app floats in front of the sealed proof it produces
  const screenU = { uTime: U.uTime, uHover: docU.uHover, uMap: { value: null } };
  if (loaded.proofmode) {
    const im = loaded.proofmode, W = 1400, H = Math.round(W * im.naturalHeight / im.naturalWidth), bar = 56;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H + bar; const x = cv.getContext('2d');
    x.fillStyle = '#0b1128'; x.fillRect(0, 0, W, bar);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.arc(32 + i * 28, bar / 2, 8, 0, Math.PI * 2); x.fill(); });
    x.fillStyle = '#1a2350'; x.beginPath(); x.roundRect(150, 12, W - 300, bar - 24, 14); x.fill();
    x.fillStyle = '#9aa5c2'; x.font = '500 22px "IBM Plex Mono", monospace'; x.textBaseline = 'middle'; x.fillText('proofmode · live app', 176, bar / 2);
    x.drawImage(im, 0, bar, W, H);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; screenU.uMap.value = tex;
    const sw = 4.6, sh = sw * cv.height / cv.width;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.ShaderMaterial({ uniforms: screenU, side: THREE.DoubleSide,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `uniform sampler2D uMap; uniform float uTime, uHover; varying vec2 vUv;
        void main(){ vec3 c = texture2D(uMap, vUv).rgb * 0.82;
          c *= 0.94 + 0.06 * sin(vUv.y * 700.);
          float e = min(min(vUv.x, 1. - vUv.x), min(vUv.y, 1. - vUv.y)); c += vec3(0.44, 0.89, 0.84) * smoothstep(0.01, 0., e) * (0.8 + uHover);
          c += vec3(0.44, 0.89, 0.84) * smoothstep(0.02, 0., abs(vUv.y - fract(uTime * 0.09))) * 0.12;
          gl_FragColor = vec4(c, 1.); }` }));
    screen.position.set(-1.7, -0.7, 1.2); screen.rotation.y = 0.3; proof.add(screen);
    doc.position.set(1.5, 0.7, -0.6); seal.position.set(2.65, -0.8, -0.48); seal2.position.copy(seal.position);
    checkRing.position.copy(doc.position);
  }
  const proofLabel = label('ProofMode', '2nd Place · UMW Eagle Egg Pitch'); proofLabel.position.set(0, 3.4, 0); proof.add(proofLabel);
  const proofHit = new THREE.Mesh(new THREE.BoxGeometry(loaded.proofmode ? 7.4 : 3.6, 5.2, 2.6), new THREE.MeshBasicMaterial({ visible: false })); proof.add(proofHit);
  const proofEntry = { label: 'ProofMode · open case study', click: () => openDrawer('proj:proofmode'),
    hover: (on) => { gsap.to(docU.uHover, { value: on ? 1 : 0, duration: 0.4 }); gsap.to(proof.rotation, { y: on ? -0.15 : -0.35, duration: 0.8 }); } };
  register(proofHit, proofEntry); linkHover['proj:proofmode'] = proofEntry.hover;

  const rag = new THREE.Group(); rag.position.set(P.projects.x + 7.5, -0.6, P.projects.z - 8); scene.add(rag);
  const shardGeo = new THREE.PlaneGeometry(0.8, 1.05);
  const shards = [];
  for (let i = 0; i < 44; i++) {
    const m = new THREE.Mesh(shardGeo, new THREE.MeshBasicMaterial({ color: SIGNAL, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    const a = i * 0.5, y = i * 0.14 - 3; m.userData = { a, y, r: 2.3, out: 0 };
    m.position.set(Math.cos(a) * 2.3, y, Math.sin(a) * 2.3); m.lookAt(0, y, 0);
    rag.add(m); shards.push(m);
    const ed = new THREE.LineSegments(new THREE.EdgesGeometry(shardGeo), new THREE.LineBasicMaterial({ color: SIGNAL, transparent: true, opacity: 0.35 })); m.add(ed);
  }
  const query = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshBasicMaterial({ color: GOLD.clone().multiplyScalar(2.2) }));
  query.position.set(0, 4, 0); rag.add(query);
  const beamGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const beam = new THREE.Line(beamGeo, new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.9 })); rag.add(beam);
  const ragLabel = label('Emergency Alerting RAG', 'NCUR 2026 · Pinecone', { accent: '#6fe3d6' }); ragLabel.position.set(0, 5.2, 0); rag.add(ragLabel);
  const ragHit = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 8, 12), new THREE.MeshBasicMaterial({ visible: false })); ragHit.position.y = 0.5; rag.add(ragHit);
  let ragHover = 0;
  const ragEntry = { label: 'RAG research · open case study', click: () => openDrawer('proj:rag'), hover: (on) => { ragHover = on ? 1 : 0; } };
  register(ragHit, ragEntry); linkHover['proj:rag'] = ragEntry.hover;
  await progress(0.7, 'Sealing ProofMode · indexing RAG shards');

  /* ================================================================ */
  /* Station 4 — five live demo pedestals                               */
  /* ================================================================ */
  const demoGroup = new THREE.Group(); demoGroup.position.copy(P.demos); scene.add(demoGroup);
  const gems = DEMOS.map((d, i) => {
    const a = THREE.MathUtils.degToRad(-64 + i * 32), col = new THREE.Color(d.color);
    const g = new THREE.Group(); g.position.set(Math.sin(a) * 6.2, 0, -Math.cos(a) * 6.2 + 4); demoGroup.add(g);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.95, 3.2, 6), new THREE.MeshStandardMaterial({ color: 0x0c1330, metalness: 0.75, roughness: 0.3, emissive: col, emissiveIntensity: 0.05, flatShading: true }));
    ped.position.y = -1.4; g.add(ped);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.02, 6, 64), new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(2) }));
    halo.rotation.x = Math.PI / 2; halo.position.y = 0.22; g.add(halo);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 0), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.4, metalness: 0.2, roughness: 0.25, flatShading: true }));
    gem.position.y = 1.4; g.add(gem);
    if (HIGH()) { const pl = new THREE.PointLight(col, 8, 9, 1.6); pl.position.y = 1.4; g.add(pl); }
    const l = label(d.name, `${d.agent} · ${d.vertical}`, { accent: `#${col.getHexString()}`, h: 0.62 }); l.position.y = 2.8 + (i % 2) * 0.8; g.add(l);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 5.4, 8), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 0; g.add(hit);
    const entry = { label: `${d.agent} · ${d.name}`, click: () => openDrawer(`demo:${d.id}`),
      hover: (on) => { gsap.to(gem.scale, { x: on ? 1.35 : 1, y: on ? 1.35 : 1, z: on ? 1.35 : 1, duration: 0.5, ease: 'back.out(2)' }); gsap.to(gem.material, { emissiveIntensity: on ? 2.6 : 1.4, duration: 0.4 }); } };
    register(hit, entry); linkHover[`demo:${d.id}`] = entry.hover;
    return { gem, halo, i };
  });
  await progress(0.8, 'Waking Aria, Scout, Luna, Rex and Vera');

  /* ================================================================ */
  /* Station 5 — skill constellation                                    */
  /* ================================================================ */
  const cons = new THREE.Group(); cons.position.copy(P.skills); scene.add(cons);
  const catCols = [GOLD, SIGNAL, new THREE.Color(0x8fa8ff), new THREE.Color(0xe98fc0)];
  const catDirs = [new THREE.Vector3(-1, 0.6, 0.3), new THREE.Vector3(1, 0.5, -0.2), new THREE.Vector3(-0.6, -0.8, -0.3), new THREE.Vector3(0.7, -0.7, 0.4)].map((v) => v.normalize());
  const nodes = [];
  Object.entries(SKILLS).forEach(([cat, list], ci) => list.forEach((name, j) => {
    const v = catDirs[ci].clone().multiplyScalar(4.6).add(new THREE.Vector3().randomDirection().multiplyScalar(1.4 + (j % 3) * 1.0));
    nodes.push({ name, ci, pos: v });
  }));
  const idx = Object.fromEntries(nodes.map((n, i) => [n.name, i]));
  const edges = [];
  nodes.forEach((n, i) => {
    const near = nodes.map((m, j) => [j, m.ci === n.ci && j !== i ? n.pos.distanceTo(m.pos) : Infinity]).sort((a, b) => a[1] - b[1]).slice(0, 2);
    near.forEach(([j]) => { if (!edges.some(([a, b]) => (a === j && b === i))) edges.push([i, j]); });
  });
  [['RAG Pipelines', 'Pinecone'], ['RAG Pipelines', 'Embeddings'], ['ChromaDB', 'Embeddings'], ['Claude API', 'MCP'], ['FastAPI', 'Claude API'], ['Python', 'FastAPI'], ['Python', 'PySpark'],
    ['AWS Bedrock', 'Ollama'], ['Docker', 'Railway'], ['PII/PHI Redaction', 'PostgreSQL'], ['LLM Evaluation', 'Statistics'], ['Mentorship', 'Leadership'], ['Stakeholder Comms', 'Power BI'], ['Agentic AI', 'MCP']]
    .forEach(([a, b]) => { if (a in idx && b in idx) edges.push([idx[a], idx[b]]); });
  const nodeMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.16, 2), new THREE.MeshBasicMaterial({ color: 0xffffff }), nodes.length);
  const dummy = new THREE.Object3D();
  nodes.forEach((n, i) => { dummy.position.copy(n.pos); dummy.updateMatrix(); nodeMesh.setMatrixAt(i, dummy.matrix); nodeMesh.setColorAt(i, catCols[n.ci].clone().multiplyScalar(1.8)); });
  cons.add(nodeMesh);
  const lp = new Float32Array(edges.length * 6), lc = new Float32Array(edges.length * 6);
  edges.forEach(([a, b], k) => { lp.set([...nodes[a].pos.toArray(), ...nodes[b].pos.toArray()], k * 6); });
  const lineGeo = new THREE.BufferGeometry(); lineGeo.setAttribute('position', new THREE.BufferAttribute(lp, 3)); lineGeo.setAttribute('color', new THREE.BufferAttribute(lc, 3));
  const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  cons.add(lines);
  function paintEdges(focus = -1) {
    edges.forEach(([a, b], k) => {
      const on = focus < 0 || a === focus || b === focus;
      const c = catCols[nodes[a].ci], s = focus < 0 ? 0.28 : on ? 1.4 : 0.05;
      for (let q = 0; q < 2; q++) lc.set([c.r * s, c.g * s, c.b * s], k * 6 + q * 3);
    });
    lineGeo.attributes.color.needsUpdate = true;
  }
  paintEdges();
  const nodeLabels = nodes.map((n) => { const s = label(n.name, '', { h: 0.46 }); s.position.copy(n.pos).add(new THREE.Vector3(0, 0.4, 0)); s.material.opacity = 0.6; cons.add(s); return s; });
  Object.keys(SKILLS).forEach((cat, ci) => { const s = label(cat, `${SKILLS[cat].length} skills`, { h: 0.8, accent: `#${catCols[ci].getHexString()}` }); s.position.copy(catDirs[ci]).multiplyScalar(8.4); cons.add(s); });
  let consFocus = -1;
  register(nodeMesh, {
    instanced: true,
    label: (hit) => { const n = nodes[hit.instanceId]; return `${n.name} · ${Object.keys(SKILLS)[n.ci]}`; },
    hover: (on, hit) => {
      consFocus = on ? hit.instanceId : -1; paintEdges(consFocus);
      nodeLabels.forEach((s, i) => { s.material.opacity = consFocus < 0 ? 0.6 : (i === consFocus || edges.some(([a, b]) => (a === consFocus && b === i) || (b === consFocus && a === i))) ? 1 : 0.15; });
    },
    click: (hit) => audio.ping(600 + nodes[hit.instanceId].ci * 120),
  });
  await progress(0.88, 'Linking the skill constellation');

  /* ================================================================ */
  /* Station 6 — first light                                             */
  /* ================================================================ */
  const sun = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, uniforms: U,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `uniform float uDawn; varying vec2 vUv; void main(){ float d = length(vUv - .5) * 2.;
      float disc = smoothstep(0.2, 0.19, d); float glow = pow(max(1. - d, 0.), 3.) * 0.8;
      vec3 c = vec3(1.0, 0.72, 0.38) * disc * 1.1 + vec3(0.9, 0.45, 0.2) * glow * 0.35; gl_FragColor = vec4(c * uDawn, 1.); }`,
  }));
  sun.position.copy(SUN_POS); scene.add(sun);
  const ridge = new THREE.Mesh(new THREE.PlaneGeometry(1800, 160), new THREE.ShaderMaterial({
    transparent: true, fog: false, uniforms: U,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `${NOISE} uniform float uDawn; varying vec2 vUv; void main(){
      float h1 = 0.22 + snoise(vec3(vUv.x * 7., 0., 0.)) * 0.08 + snoise(vec3(vUv.x * 23., 1., 0.)) * 0.025;
      float h2 = 0.14 + snoise(vec3(vUv.x * 11., 5., 0.)) * 0.06;
      float a1 = step(vUv.y, h1), a2 = step(vUv.y, h2);
      float rim = smoothstep(0.012, 0., abs(vUv.y - h1)) * uDawn;
      vec3 far = mix(vec3(0.04,0.06,0.15), vec3(0.28,0.16,0.2), uDawn), near = mix(vec3(0.02,0.03,0.08), vec3(0.1,0.06,0.1), uDawn);
      vec3 c = mix(far, near, a2) + vec3(1.,0.6,0.3) * rim * 0.8;
      gl_FragColor = vec4(c, max(a1, rim)); }`,
  }));
  ridge.position.set(0, 57, -560); scene.add(ridge);
  // Portrait hologram at first light (falls back to a monogram if no photo is supplied)
  await Promise.race([imgReady, new Promise((r) => setTimeout(r, 2500))]);
  const holoCanvas = document.createElement('canvas'); holoCanvas.width = 640; holoCanvas.height = 800;
  { const x = holoCanvas.getContext('2d');
    if (loaded.portrait) {
      const im = loaded.portrait, s = Math.max(640 / im.naturalWidth, 800 / im.naturalHeight), w = im.naturalWidth * s, h2 = im.naturalHeight * s;
      x.drawImage(im, (640 - w) / 2, (800 - h2) / 2 * 0.6, w, h2);
    } else {
      const g = x.createRadialGradient(320, 360, 40, 320, 400, 420); g.addColorStop(0, '#1b2a5c'); g.addColorStop(1, '#060a17');
      x.fillStyle = g; x.fillRect(0, 0, 640, 800);
      x.strokeStyle = 'rgba(232,181,74,0.8)'; x.lineWidth = 3; x.beginPath(); x.arc(320, 380, 190, 0, Math.PI * 2); x.stroke();
      x.fillStyle = '#eef1f8'; x.font = '800 210px "Bricolage Grotesque", system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('AK', 320, 392);
    } }
  const holoTex = new THREE.CanvasTexture(holoCanvas); holoTex.colorSpace = THREE.SRGBColorSpace;
  const holoU = { uTime: U.uTime, uDawn: U.uDawn, uMap: { value: holoTex }, uHover: { value: 0 } };
  const holo = new THREE.Group(); holo.position.copy(P.contact); scene.add(holo);
  const holoPlane = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.25, 1, 1), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: holoU,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `uniform sampler2D uMap; uniform float uTime, uHover, uDawn; varying vec2 vUv;
      float h(float n){ return fract(sin(n) * 43758.5453); }
      void main(){
        vec2 uv = vUv; float glitch = step(0.985 - uHover * 0.05, h(floor(uTime * 9.) + floor(uv.y * 40.)));
        uv.x += glitch * (h(floor(uv.y * 40.) + uTime) - .5) * 0.04;
        float sp = 0.004 + uHover * 0.01;
        vec3 c = vec3(texture2D(uMap, uv + vec2(sp, 0.)).r, texture2D(uMap, uv).g, texture2D(uMap, uv - vec2(sp, 0.)).b);
        float scan = 0.82 + 0.18 * sin(uv.y * 520. - uTime * 6.);
        float band = smoothstep(0.03, 0., abs(uv.y - fract(uTime * 0.18))) * 0.35;
        float e = min(min(uv.x, 1. - uv.x), min(uv.y, 1. - uv.y));
        float edge = smoothstep(0.012, 0., e);
        float fade = smoothstep(0., 0.25, uv.y);
        vec3 tint = mix(vec3(0.6, 0.95, 0.92), vec3(1.0, 0.86, 0.66), uDawn);
        vec3 col = c * tint * scan * 1.05 + tint * band + vec3(0.91, 0.71, 0.29) * edge * 1.4;
        gl_FragColor = vec4(col, (0.9 * fade + edge) * (0.92 + 0.08 * sin(uTime * 30.)));
      }`,
  }));
  holo.add(holoPlane);
  const beamCone = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 0.5, 2.2, 32, 1, true), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: U,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `uniform float uTime; varying vec2 vUv; void main(){ float a = pow(1. - vUv.y, 1.6) * 0.25 * (0.8 + 0.2 * sin(vUv.x * 60. + uTime * 3.)); gl_FragColor = vec4(vec3(0.44,0.89,0.84) * a, a); }`,
  }));
  beamCone.position.y = -3.2; beamCone.rotation.x = Math.PI; holo.add(beamCone);
  const pad = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.03, 8, 64), new THREE.MeshBasicMaterial({ color: SIGNAL.clone().multiplyScalar(2) }));
  pad.rotation.x = Math.PI / 2; pad.position.y = -4.3; holo.add(pad);
  const holoLabel = label(PROFILE.name, PROFILE.mantra, { h: 0.9 }); holoLabel.position.y = 2.8; holo.add(holoLabel);
  const holoHit = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.25), new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })); holo.add(holoHit);
  register(holoHit, { label: 'Aloysious Kabonge · first light', hover: (on) => gsap.to(holoU.uHover, { value: on ? 1 : 0, duration: 0.4 }), click: () => audio.ping(880) });
  await progress(0.95, 'Waiting for first light');

  /* ================================================================ */
  /* Camera path                                                         */
  /* ================================================================ */
  let posCurve, lookCurve, narrow;
  function buildPath() {
    narrow = innerWidth < 720;
    camera.fov = narrow ? 62 : 46; camera.updateProjectionMatrix();
    // side = where the HTML panel is, so the object sits on the opposite half of the screen.
    const st = [
      { p: P.hero, off: [0, 0.4, narrow ? 15 : 10.5], side: -1, shift: 3.4, y: narrow ? 3.4 : 0 },
      { p: P.journey, off: [-7.5, 2.2, narrow ? 24 : 23], side: -1, shift: 5.2, y: narrow ? -2.4 : 0 },
      { p: P.experience, off: [9.5, 4.5, 29], side: 1, shift: 6.5, y: narrow ? -1 : 0 },
      { p: P.projects, off: [-7, 1.6, 17], side: -1, shift: 2.2, y: narrow ? -2.2 : 0 },
      { p: P.demos, off: [8.5, 3.8, 21], side: 1, shift: 5.2, y: narrow ? -1.8 : 0 },
      { p: P.skills, off: [-8, 0.2, 23], side: -1, shift: 5.5, y: narrow ? -2.5 : 0 },
      { p: P.contact, off: [-6.5, -0.6, narrow ? 17 : 13], side: -1, shift: 4, y: narrow ? -1.6 : 0 },
    ];
    posCurve = new THREE.CatmullRomCurve3(st.map((s) => s.p.clone().add(new THREE.Vector3(...s.off))), false, 'centripetal');
    lookCurve = new THREE.CatmullRomCurve3(st.map((s) => s.p.clone().add(new THREE.Vector3(narrow ? 0 : s.side * s.shift, s.y, 0))), false, 'centripetal');
  }
  buildPath();

  /* ---------- post-processing ---------- */
  const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: HIGH() ? 4 : 0 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.85, 0.55, 0.62);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: U.uTime, uCA: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uCA; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){ vec2 d = vUv - .5; float r = dot(d, d); vec2 o = d * r * 0.02 * uCA;
        vec3 c = vec3(texture2D(tDiffuse, vUv + o).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - o).b);
        c *= 1. - smoothstep(0.1, 0.6, r) * 0.42;
        c = mix(c, c * c * (3. - 2. * c), 0.18);
        c += (h(vUv * 900. + fract(uTime) * 91.) - .5) * 0.03;
        gl_FragColor = vec4(c, 1.); }`,
  });
  composer.addPass(grade);
  function applyTier() {
    renderer.setPixelRatio(Math.min(devicePixelRatio, HIGH() ? 2 : 1));
    U.uPR.value = renderer.getPixelRatio();
    bloom.enabled = true; bloom.strength = HIGH() ? 0.85 : 0.6;
    composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(innerWidth, innerHeight);
    $('#quality').textContent = HIGH() ? 'HQ' : 'LQ';
  }
  applyTier();
  $('#quality').addEventListener('click', () => { tier = HIGH() ? 'low' : 'high'; store.set('aialo3d-tier', tier); applyTier(); });

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
    if ((innerWidth < 720) !== narrow) buildPath(); else camera.updateProjectionMatrix();
  });

  /* ---------- pointer: parallax, drag-to-look, raycast ---------- */
  const mouse = new THREE.Vector2(), ndc = new THREE.Vector2(-9, -9), look = { x: 0, y: 0, tx: 0, ty: 0 };
  const ray = new THREE.Raycaster();
  const cursor = $('#cursor'), cLabel = $('#cursor-label');
  let drag = null, hovered = null, hoveredHit = null, needsPick = false;
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, moved: 0, lx: look.tx, ly: look.ty }; });
  addEventListener('pointermove', (e) => {
    mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    cLabel.style.transform = `translate(${e.clientX + 26}px, ${e.clientY + 18}px)`;
    if (e.target === canvas) { ndc.copy(mouse); needsPick = true; } else if (hovered) { setHover(null); }
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
      if (e.pointerType !== 'touch' || Math.abs(dx) > Math.abs(dy)) { look.tx = THREE.MathUtils.clamp(drag.lx - dx * 0.004, -0.9, 0.9); look.ty = THREE.MathUtils.clamp(drag.ly + dy * 0.003, -0.5, 0.5); }
    }
  });
  addEventListener('pointerup', (e) => {
    if (drag && drag.moved < 6 && e.target === canvas) {
      ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); const h = pick();
      if (h) h.entry.click?.(h.hit);
    }
    drag = null; look.tx = 0; look.ty = 0;
  });
  canvas.addEventListener('pointerleave', () => setHover(null));
  addEventListener('pointercancel', () => { drag = null; look.tx = 0; look.ty = 0; });
  function pick() {
    ray.setFromCamera(ndc, camera);
    const list = ray.intersectObjects(hits, false);
    return list.length ? { entry: list[0].object.userData.hit, hit: list[0] } : null;
  }
  function setHover(h) {
    const same = h && hovered === h.entry && (!h.entry.instanced || hoveredHit?.instanceId === h.hit.instanceId);
    if (same) return;
    if (hovered) hovered.hover?.(false, hoveredHit);
    hovered = h ? h.entry : null; hoveredHit = h ? h.hit : null;
    if (hovered) { hovered.hover?.(true, hoveredHit); audio.ping(990, 0.05); }
    cursor.classList.toggle('hot', !!hovered);
    canvas.style.cursor = hovered ? 'pointer' : '';
    cLabel.textContent = hovered ? (typeof hovered.label === 'function' ? hovered.label(hoveredHit) : hovered.label) : '';
    cLabel.classList.toggle('show', !!hovered);
  }
  // DOM list hover lights up the matching 3D object
  document.querySelectorAll('[data-open]').forEach((b) => {
    const fn = () => linkHover[b.dataset.open];
    b.addEventListener('pointerenter', () => fn()?.(true)); b.addEventListener('pointerleave', () => fn()?.(false));
    b.addEventListener('focus', () => fn()?.(true)); b.addEventListener('blur', () => fn()?.(false));
  });

  /* ---------- intro ---------- */
  await progress(1, 'Ready');
  let camT = 0; // smoothed path progress
  const intro = { k: reduced ? 1 : 0 };
  const startPos = new THREE.Vector3(0, 9, 48);
  $('#loader').classList.add('done');
  if (!reduced) {
    gsap.to(intro, { k: 1, duration: 3.2, ease: 'power3.inOut' });
    gsap.from('.hero-copy > *', { y: 28, opacity: 0, duration: 1.1, stagger: 0.09, delay: 0.9, ease: 'power3.out' });
  }

  /* ---------- loop ---------- */
  const fogNight = NIGHT.clone(), fogDawn = new THREE.Color(0x24141f);
  const tmpP = new THREE.Vector3(), tmpL = new THREE.Vector3();
  let frames = 0, slow = 0, watched = false, arcDrawn = false, lastKm = -1;
  const kmEl = $('#km-n');
  const ease = (x) => { const s = THREE.MathUtils.smoothstep(x, 0.12, 0.88); return s; };

  renderer.setAnimationLoop(() => {
    clock.update(); const raw = clock.getDelta(), dt = Math.min(raw, 0.05), dtCam = Math.min(raw, 0.25), t = clock.getElapsed();
    U.uTime.value = t;
    if (lenis) lenis.raf(performance.now());
    const y = lenis ? lenis.scroll : scrollY;
    const f = stationFloat(y);
    updateHUD(f);
    audio.update(f);

    // eased station progress with a short dwell at every station
    const i = Math.min(Math.floor(f), STATIONS.length - 2), frac = f - i;
    const target = (i + ease(frac)) / (STATIONS.length - 1);
    camT += (target - camT) * (1 - Math.exp(-dtCam * (reduced ? 12 : 3.2)));

    posCurve.getPoint(THREE.MathUtils.clamp(camT, 0, 1), tmpP);
    lookCurve.getPoint(THREE.MathUtils.clamp(camT, 0, 1), tmpL);
    if (intro.k < 1) tmpP.lerpVectors(startPos, tmpP, intro.k);
    look.x += (look.tx - look.x) * (1 - Math.exp(-dt * 5)); look.y += (look.ty - look.y) * (1 - Math.exp(-dt * 5));
    const par = reduced ? 0 : 1;
    camera.position.set(tmpP.x + mouse.x * 0.7 * par, tmpP.y + mouse.y * 0.35 * par, tmpP.z);
    tmpL.x += look.x * 12; tmpL.y += look.y * 8;
    camera.lookAt(tmpL);
    sky.position.copy(camera.position); stars.position.copy(camera.position);

    const km = Math.round(THREE.MathUtils.clamp(camT, 0, 1) * 11619 / 10) * 10;
    if (km !== lastKm) { lastKm = km; kmEl.textContent = km.toLocaleString('en-US').padStart(6, '0'); }
    // dawn at the end of the journey
    const dawn = THREE.MathUtils.smoothstep(f, 4.9, 6);
    U.uDawn.value = dawn;
    scene.fog.color.copy(fogNight).lerp(fogDawn, dawn * 0.8);
    scene.fog.density = 0.0105 - dawn * 0.003;
    renderer.toneMappingExposure = 1.0;

    // animate only what is near the camera
    const near = (p, r = 90) => Math.abs(camera.position.z - p.z) < r;
    if (near(P.hero)) {
      core.rotation.y += dt * 0.12; shell.rotation.y -= dt * 0.05; shell.rotation.x += dt * 0.03;
      rings[0].rotation.z += dt * 0.25; rings[1].rotation.x += dt * 0.18; rings[2].rotation.y += dt * 0.12;
      core.getObjectByName('orbit').rotation.y -= dt * 0.06;
    }
    if (near(P.journey)) {
      updateComet(t); updateCrane(t);
      globe.rotation.y = Math.sin(t * 0.25) * 0.18;
      markers.forEach((m, k) => { const s = 1 + ((t * 0.8 + k * 0.5) % 1) * 1.6; m.scale.setScalar(s); m.material.opacity = 1 - ((t * 0.8 + k * 0.5) % 1); });
      if (!arcDrawn && f > 0.4) { arcDrawn = true; arcU.uDraw.value = 0; gsap.to(arcU.uDraw, { value: 1, duration: reduced ? 0 : 2.4, ease: 'power2.inOut' }); }
    }
    if (near(P.experience)) towers.forEach(({ cap }, k) => { cap.rotation.y += dt * 0.8; cap.position.y = EXPERIENCE[k].height + 0.8 + Math.sin(t * 1.4 + k) * 0.15; });
    if (near(P.projects)) {
      seal.rotation.z -= dt * 0.5; seal2.rotation.z += dt * 0.8; checkRing.rotation.z += dt * 0.2;
      proof.position.y = P.projects.y + Math.sin(t * 0.8) * 0.15;
      const active = Math.floor(t * (ragHover ? 1.6 : 0.8)) % shards.length;
      shards.forEach((s, k) => {
        const on = k === active; s.userData.out += ((on ? 1 : 0) - s.userData.out) * (1 - Math.exp(-dt * 6));
        const a = s.userData.a + t * 0.12, r = s.userData.r + s.userData.out * 1.6;
        s.position.set(Math.cos(a) * r, s.userData.y, Math.sin(a) * r); s.lookAt(0, s.userData.y, 0);
        s.material.opacity = 0.14 + s.userData.out * 0.7 + ragHover * 0.1;
        if (on) { const b = beamGeo.attributes.position; b.setXYZ(0, query.position.x, query.position.y, query.position.z); b.setXYZ(1, s.position.x, s.position.y, s.position.z); b.needsUpdate = true; }
      });
    }
    if (near(P.demos)) gems.forEach(({ gem, halo, i: k }) => { gem.rotation.y += dt * 0.9; gem.position.y = 1.4 + Math.sin(t * 1.3 + k) * 0.18; halo.scale.setScalar(1 + Math.sin(t * 2 + k) * 0.05); });
    if (near(P.skills) && consFocus < 0 && !reduced) cons.rotation.y += dt * 0.08;
    if (near(P.contact, 120)) { holo.position.y = P.contact.y + Math.sin(t * 0.9) * 0.12; pad.scale.setScalar(1 + Math.sin(t * 2.4) * 0.08); }

    if (needsPick && !drag) { needsPick = false; setHover(pick()); }

    composer.render(dt);

    // performance watchdog: drop to LQ once if the device struggles
    if (!watched && t > 4) {
      frames++; if (dt > 1 / 36) slow++;
      if (frames === 150) { watched = true; if (slow > 90 && HIGH() && !store.get('aialo3d-tier')) { tier = 'low'; applyTier(); } }
    }
  });
}

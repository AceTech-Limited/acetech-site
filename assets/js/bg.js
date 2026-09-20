/* Animated background for acetechlimited.net.
   Two fixed layers behind the page: a WebGL aurora and a 2D starfield.
   No dependencies. Degrades to the plain dark background if WebGL is missing,
   and goes still when the visitor has asked for reduced motion. */
(function () {
  'use strict';

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobile = window.matchMedia && window.matchMedia('(max-width: 720px)').matches;
  var maxDpr = mobile ? 1 : 1.5;

  function makeCanvas(z) {
    var c = document.createElement('canvas');
    c.setAttribute('aria-hidden', 'true');
    c.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:' + z;
    document.body.insertBefore(c, document.body.firstChild);
    return c;
  }

  function size(c) {
    var dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    var w = Math.floor(window.innerWidth * dpr);
    var h = Math.floor(window.innerHeight * dpr);
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    return dpr;
  }

  /* ---------------- layer 1: aurora ---------------- */

  var VERT = [
    'attribute vec2 a;',
    'void main(){ gl_Position = vec4(a, 0.0, 1.0); }'
  ].join('\n');

  var FRAG = [
    'precision highp float;',
    'uniform vec2 u_res;',
    'uniform float u_time;',
    'uniform float u_scroll;',

    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }',

    'float vnoise(vec2 p){',
    '  vec2 i = floor(p); vec2 f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),',
    '             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);',
    '}',

    /* smooth fbm, used only to bend space so the shape flows */
    'float fbm(vec2 p){',
    '  float v = 0.0; float a = 0.5;',
    '  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);',
    '  for (int i = 0; i < 4; i++){ v += a * vnoise(p); p = rot * p * 2.02 + 0.031; a *= 0.5; }',
    '  return v;',
    '}',

    /* ridged fbm, which is what produces thin bright filaments instead of fog */
    'float ridged(vec2 p){',
    '  float v = 0.0; float a = 0.5; float w = 1.0;',
    '  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);',
    '  for (int i = 0; i < 5; i++){',
    '    float n = 1.0 - abs(vnoise(p) * 2.0 - 1.0);',
    '    n *= n; n *= w; w = clamp(n * 1.9, 0.0, 1.0);',
    '    v += a * n; p = rot * p * 2.06 + 0.021; a *= 0.52;',
    '  }',
    '  return v;',
    '}',

    'void main(){',
    '  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;',
    '  p.y += u_scroll * 0.55;',
    '  float t = u_time * 0.022;',

    /* two-stage domain warp gives the drifting, smoke-like motion */
    '  vec2 q = vec2(fbm(p * 1.25 + vec2(0.0, t)), fbm(p * 1.25 + vec2(4.2, -t * 0.8)));',
    '  vec2 r = vec2(fbm(p * 1.5 + 2.2 * q + vec2(1.7, 9.2) + t * 0.6),',
    '                fbm(p * 1.5 + 2.2 * q + vec2(8.3, 2.8) - t * 0.45));',
    '  float g = ridged(p * 2.1 + 2.6 * r);',

    /* hard contrast so the gaps go properly black and the veins stand out */
    '  g = smoothstep(0.30, 0.92, g);',

    /* a diagonal ribbon keeps it a sweep across the page rather than even haze */
    '  float axis = p.x * 0.62 + p.y * 0.95 - 0.30 + 0.32 * sin(p.y * 1.15 + t * 1.6);',
    '  float band = smoothstep(0.78, 0.04, abs(axis));',
    '  band = pow(band, 1.5);',
    '  g *= band;',

    '  float vig = smoothstep(1.35, 0.08, length(p * vec2(0.80, 1.0)));',
    '  g *= vig;',

    /* keep the veins off the text. On landscape the copy sits in the left column,
       so fade them out of it. On portrait the copy spans the width, so the only
       honest answer is to drop the whole thing to atmosphere level. */
    '  float ux = gl_FragCoord.x / u_res.x;',
    '  float wide = step(1.0, u_res.x / u_res.y);',
    '  g *= mix(1.0, smoothstep(0.06, 0.54, ux), wide);',
    '  g *= mix(0.34, 1.0, wide);',

    /* green carries the body, gold only lights the hottest cores, so they never mix to olive */
    '  vec3 green = vec3(0.129, 0.549, 0.404);',
    '  vec3 gold  = vec3(1.000, 0.804, 0.361);',
    '  vec3 col = green * pow(g, 1.40) * 0.98;',
    '  col += gold * pow(g, 3.0) * 1.35;',

    '  float a = clamp(pow(g, 1.20) * 1.05, 0.0, 1.0);',
    '  gl_FragColor = vec4(col, a);',
    '}'
  ].join('\n');

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function startAurora() {
    var c = makeCanvas(-2);
    var gl;
    try {
      gl = c.getContext('webgl', { alpha: true, antialias: false, depth: false, powerPreference: 'low-power' })
        || c.getContext('experimental-webgl', { alpha: true, antialias: false, depth: false });
    } catch (e) { gl = null; }
    if (!gl) { c.remove(); return null; }

    var vs = compile(gl, gl.VERTEX_SHADER, VERT);
    var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { c.remove(); return null; }

    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { c.remove(); return null; }
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var uRes = gl.getUniformLocation(prog, 'u_res');
    var uTime = gl.getUniformLocation(prog, 'u_time');
    var uScroll = gl.getUniformLocation(prog, 'u_scroll');

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    function draw(t, scroll) {
      size(c);
      gl.viewport(0, 0, c.width, c.height);
      gl.uniform2f(uRes, c.width, c.height);
      gl.uniform1f(uTime, t);
      gl.uniform1f(uScroll, scroll);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    return draw;
  }

  /* ---------------- layer 2: starfield ---------------- */

  function startStars() {
    var c = makeCanvas(-1);
    var ctx = c.getContext('2d');
    if (!ctx) { c.remove(); return null; }

    var stars = [];
    var count = mobile ? 70 : 150;

    function seed() {
      stars = [];
      for (var i = 0; i < count; i++) {
        var depth = 0.35 + Math.random() * 0.65;
        stars.push({
          x: Math.random(),
          y: Math.random(),
          d: depth,
          r: depth * (Math.random() * 0.9 + 0.45),
          tw: Math.random() * Math.PI * 2,
          sp: 0.4 + Math.random() * 0.9,
          gold: Math.random() < 0.18
        });
      }
    }
    seed();

    function draw(t, scroll) {
      var dpr = size(c);
      var w = c.width, h = c.height;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var y = (s.y - scroll * s.d * 0.12) % 1;
        if (y < 0) y += 1;
        var alpha = 0.22 + 0.5 * (0.5 + 0.5 * Math.sin(t * s.sp + s.tw));
        ctx.globalAlpha = alpha * s.d;
        ctx.fillStyle = s.gold ? '#e9b949' : '#dbe3f0';
        ctx.beginPath();
        ctx.arc(s.x * w, y * h, s.r * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    window.addEventListener('resize', seed);
    return draw;
  }

  /* ---------------- loop ---------------- */

  function init() {
    var aurora = startAurora();
    var stars = startStars();
    if (!aurora && !stars) return;

    var scroll = 0;
    var raf = 0;
    var running = true;

    function onScroll() {
      var max = Math.max(1, document.body.scrollHeight - window.innerHeight);
      scroll = window.scrollY / max;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    function frame(ms) {
      var t = ms / 1000;
      if (aurora) aurora(t, scroll);
      if (stars) stars(t, scroll);
      if (running) raf = requestAnimationFrame(frame);
    }

    if (reduced) {
      /* one still frame, no loop */
      if (aurora) aurora(8, 0);
      if (stars) stars(0, 0);
      window.addEventListener('resize', function () {
        if (aurora) aurora(8, scroll);
        if (stars) stars(0, scroll);
      });
      return;
    }

    raf = requestAnimationFrame(frame);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

(() => {
  const ui = window.WxGameUi.createGameUi();
  const { canvas, ctx, panel, primaryButton } = ui;
  const plankLabel = document.getElementById("plankCount");
  const coinLabel = document.getElementById("coinCount");

  const state = {
    status: "ready",
    width: 0,
    height: 0,
    dpr: 1,
    time: 0,
    last: 0,
    player: { x: 0, targetX: 0, z: 0, bob: 0 },
    cameraZ: 0,
    planks: 0,
    coins: 0,
    speed: 7.2,
    drag: false,
    level: null,
    particles: [],
    message: "",
  };

  const COLORS = {
    roadTop: "#f5f3ee",
    roadSide: "#b9aa99",
    roadUnderside: "#7f756c",
    roadLine: "#cbc2b6",
    edge: "#ffffff",
    wood: "#b96c34",
    woodDark: "#73411f",
    woodLight: "#e0a05d",
    shirt: "#38a66b",
    shorts: "#5b7b7a",
    skin: "#d99a68",
    gateGood: "#4bc288",
    gateGreat: "#7658d8",
    gateBad: "#e86c5f",
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function resize() {
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.width = Math.floor(window.innerWidth);
    state.height = Math.floor(window.innerHeight);
    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  }

  function makeLevel() {
    const planks = [];
    for (let z = 7; z < 84; z += 3.25) {
      const lane = Math.sin(z * 0.78) * 1.05;
      planks.push({ x: lane, z, taken: false });
      if (z % 13 > 6) planks.push({ x: -lane * 0.68, z: z + 1.15, taken: false });
    }

    return {
      finishZ: 98,
      planks,
      gates: [
        makeGate(15, "+8", "add", 8, "x2", "mul", 2),
        makeGate(32, "-4", "add", -4, "+10", "add", 10),
        makeGate(51, "x2", "mul", 2, "+6", "add", 6),
        makeGate(71, "+12", "add", 12, "-8", "add", -8),
      ],
      gaps: [
        { z: 23.5, length: 5.3, required: 9, placed: 0, placedAt: [], built: false, failed: false },
        { z: 41.8, length: 6.1, required: 11, placed: 0, placedAt: [], built: false, failed: false },
        { z: 61.7, length: 7.1, required: 14, placed: 0, placedAt: [], built: false, failed: false },
        { z: 84.5, length: 5.8, required: 12, placed: 0, placedAt: [], built: false, failed: false },
      ],
    };
  }

  function makeGate(z, leftLabel, leftOp, leftValue, rightLabel, rightOp, rightValue) {
    return {
      z,
      used: false,
      left: { x: -0.75, label: leftLabel, op: leftOp, value: leftValue },
      right: { x: 0.75, label: rightLabel, op: rightOp, value: rightValue },
    };
  }

  function resetGame() {
    state.status = "playing";
    state.time = 0;
    state.last = performance.now();
    state.player.x = 0;
    state.player.targetX = 0;
    state.player.z = 0;
    state.cameraZ = 0;
    state.planks = 5;
    state.coins = 0;
    state.speed = 7.2;
    state.level = makeLevel();
    state.particles = [];
    state.message = "";
    ui.hideOverlay();
    updateHud();
  }

  function updateHud() {
    plankLabel.textContent = String(Math.max(0, Math.floor(state.planks)));
    coinLabel.textContent = String(Math.max(0, Math.floor(state.coins)));
  }

  function screenPoint(x, z, yLift = 0) {
    const h = state.height;
    const w = state.width;
    const horizon = h * 0.16;
    const bottom = h * 0.88;
    const dz = Math.max(0.04, z - state.cameraZ);
    const t = 1 / (1 + dz * 0.24);
    const sx = w * 0.5 + x * Math.min(w * 0.28, 112) * t;
    const sy = horizon + (bottom - horizon) * t - yLift * t;
    return { x: sx, y: sy, s: t };
  }

  function roadWidth(z) {
    const p = screenPoint(0, z);
    return Math.min(state.width * 0.36, 156) * p.s;
  }

  function drawBackground() {
    const w = state.width;
    const h = state.height;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#2460a7");
    g.addColorStop(0.42, "#5fb3ec");
    g.addColorStop(0.72, "#d9f4ff");
    g.addColorStop(1, "#ffffff");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    drawSunRays();
    drawCloudBank(h * 0.14, 0.82, 0.78);
    drawCloudBank(h * 0.68, 1.2, 0.62);
    drawTemplePillars();

    ctx.save();
    ctx.globalAlpha = 0.48;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, h * 0.79, w, h * 0.21);
    ctx.restore();
    drawForegroundMist();
  }

  function drawForegroundMist() {
    const w = state.width;
    const h = state.height;
    const mist = ctx.createLinearGradient(0, h * 0.64, 0, h);
    mist.addColorStop(0, "rgba(255,255,255,0)");
    mist.addColorStop(0.62, "rgba(225,247,255,0.42)");
    mist.addColorStop(1, "rgba(255,255,255,0.66)");
    ctx.fillStyle = mist;
    ctx.fillRect(0, h * 0.64, w, h * 0.36);

    ctx.save();
    ctx.globalAlpha = 0.42;
    for (let i = 0; i < 7; i += 1) {
      const x = ((i * 97 + state.time * 9) % (w + 160)) - 80;
      const y = h * (0.78 + (i % 3) * 0.055);
      const r = 32 + (i % 4) * 11;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.arc(x + r * 0.86, y + 5, r * 0.72, 0, Math.PI * 2);
      ctx.arc(x - r * 0.72, y + 8, r * 0.66, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSunRays() {
    const w = state.width;
    const h = state.height;
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#ffffff";
    ctx.translate(w * 0.72, h * 0.05);
    for (let i = 0; i < 4; i += 1) {
      ctx.rotate(0.16);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w * 0.13, h);
      ctx.lineTo(w * 0.24, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCloudBank(baseY, scale, alpha) {
    const w = state.width;
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let i = 0; i < 12; i += 1) {
      const x = ((i * 91 - state.time * 7 * scale) % (w + 180)) - 90;
      const y = baseY + Math.sin(i * 1.7) * 22 * scale;
      const r = (24 + (i % 4) * 10) * scale;
      ctx.fillStyle = i % 3 === 0 ? "#ffffff" : "#dff5ff";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.arc(x + r * 0.85, y + r * 0.1, r * 0.8, 0, Math.PI * 2);
      ctx.arc(x - r * 0.75, y + r * 0.16, r * 0.72, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawTemplePillars() {
    const w = state.width;
    const h = state.height;
    ctx.save();
    ctx.globalAlpha = 0.22;
    for (let i = 0; i < 9; i += 1) {
      const x = w * (-0.08 + i * 0.145);
      const y = h * (0.22 + (i % 3) * 0.05);
      drawPillar(x, y, 0.28 + (i % 4) * 0.06);
    }
    ctx.restore();

    const specs = [
      [-0.08, 0.33, 0.62],
      [0.13, 0.39, 0.48],
      [0.32, 0.35, 0.82],
      [0.57, 0.42, 0.5],
      [0.78, 0.34, 0.68],
      [1.05, 0.28, 0.9],
    ];
    for (const [nx, ny, s] of specs) {
      drawPillar(w * nx, h * ny, s);
    }
    drawBridgeArc(w * 0.03, h * 0.5, w * 0.5, h * 0.48);
    drawBridgeArc(w * 0.53, h * 0.52, w * 0.95, h * 0.5);

    ctx.save();
    ctx.globalAlpha = 0.24;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.1, h * 0.56);
    ctx.bezierCurveTo(w * 0.3, h * 0.48, w * 0.62, h * 0.5, w * 0.92, h * 0.43);
    ctx.stroke();
    ctx.restore();
  }

  function drawPillar(x, y, s) {
    const h = state.height;
    const colW = 20 * s;
    const colH = h * 0.42 * s;
    ctx.save();
    ctx.globalAlpha = 0.42 + 0.28 * s;
    ctx.fillStyle = "#f6dfc3";
    ctx.strokeStyle = "rgba(102, 129, 177, 0.28)";
    ctx.lineWidth = Math.max(1, 2 * s);
    roundRect(x - colW / 2, y, colW, colH, 4 * s, "#f5e5d4");
    ctx.fillStyle = "#fff6e8";
    ctx.fillRect(x - colW * 0.18, y + 8 * s, colW * 0.36, colH - 16 * s);
    ctx.fillStyle = "rgba(178, 139, 105, 0.22)";
    for (let i = 0; i < 5; i += 1) {
      ctx.fillRect(x - colW * 0.42 + i * colW * 0.2, y + 10 * s, colW * 0.045, colH - 20 * s);
    }
    roundRect(x - colW * 0.9, y - 12 * s, colW * 1.8, 12 * s, 4 * s, "#fff0d7");
    roundRect(x - colW * 0.65, y - 25 * s, colW * 1.3, 10 * s, 4 * s, "#f8d8b7");
    roundRect(x - colW * 0.75, y + colH, colW * 1.5, 12 * s, 4 * s, "#d7b89f");
    ctx.restore();
  }

  function drawBridgeArc(x1, y1, x2, y2) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = "#f6e5d2";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.lineWidth = 2;
    for (let i = 0; i < 7; i += 1) {
      const t = i / 6;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 58);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawTrack() {
    const gaps = state.level.gaps;
    const start = Math.max(0, state.cameraZ - 2);
    const end = state.cameraZ + 72;
    let z = end;
    while (z > start) {
      const next = Math.max(start, z - 1.4);
      if (!isOpenGap((z + next) * 0.5, gaps)) {
        drawRoadSlice(next, z);
      }
      z = next;
    }

    drawTrackMotion(gaps, start, end);

    for (const gap of gaps) {
      if (gap.z + gap.length < state.cameraZ || gap.z > state.cameraZ + 68) continue;
      drawGap(gap);
    }
  }

  function isOpenGap(z, gaps) {
    return gaps.some((gap) => z > gap.z && z < gap.z + gap.length && !gap.built);
  }

  function drawTrackMotion(gaps, start, end) {
    const tile = 2.35;
    const first = Math.floor(start / tile) * tile;

    ctx.save();
    ctx.lineCap = "round";
    for (let z = first; z < end; z += tile) {
      if (z < start || isOpenGap(z, gaps)) continue;

      const p = screenPoint(0, z);
      const w = roadWidth(z);
      const near = clamp(p.s * 1.45, 0, 1);
      const seamAlpha = 0.11 + near * 0.24;

      ctx.globalAlpha = seamAlpha;
      ctx.strokeStyle = "#a99f94";
      ctx.lineWidth = Math.max(0.7, 1.6 * p.s);
      ctx.beginPath();
      ctx.moveTo(p.x - w * 0.78, p.y + 1.5 * p.s);
      ctx.lineTo(p.x + w * 0.78, p.y + 1.5 * p.s);
      ctx.stroke();

      if (near > 0.28) {
        ctx.globalAlpha = 0.09 + near * 0.18;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = Math.max(1, 2.2 * p.s);
        ctx.beginPath();
        ctx.moveTo(p.x - w * 0.58, p.y - 1.2 * p.s);
        ctx.lineTo(p.x + w * 0.58, p.y - 1.2 * p.s);
        ctx.stroke();
      }
    }

    for (let i = 0; i < 18; i += 1) {
      const z1 = state.cameraZ + 1.2 + i * 3.15;
      const z2 = z1 + 1.55;
      if (z2 > end || isOpenGap((z1 + z2) * 0.5, gaps)) continue;

      const p1 = screenPoint(0, z1);
      const p2 = screenPoint(0, z2);
      const w1 = roadWidth(z1);
      const w2 = roadWidth(z2);
      const alpha = clamp(p1.s * 0.52, 0.06, 0.28);

      ctx.globalAlpha = alpha;
      ctx.strokeStyle = i % 2 ? "#d8d1c8" : "#ffffff";
      ctx.lineWidth = Math.max(1, 2.4 * p1.s);
      ctx.beginPath();
      ctx.moveTo(p1.x - w1 * 0.9, p1.y + 2 * p1.s);
      ctx.lineTo(p2.x - w2 * 0.74, p2.y + 2 * p2.s);
      ctx.moveTo(p1.x + w1 * 0.9, p1.y + 2 * p1.s);
      ctx.lineTo(p2.x + w2 * 0.74, p2.y + 2 * p2.s);
      ctx.stroke();
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawRoadSlice(z1, z2) {
    const p1 = screenPoint(0, z1);
    const p2 = screenPoint(0, z2);
    const w1 = roadWidth(z1);
    const w2 = roadWidth(z2);

    const drop1 = 22 * p1.s;
    const drop2 = 28 * p2.s;
    const top = ctx.createLinearGradient(0, p2.y, 0, p1.y);
    top.addColorStop(0, "#ffffff");
    top.addColorStop(0.5, COLORS.roadTop);
    top.addColorStop(1, "#ddd5cb");
    const leftSide = ctx.createLinearGradient(p1.x - w1, p1.y, p1.x, p1.y + drop1);
    leftSide.addColorStop(0, "#d7cabc");
    leftSide.addColorStop(1, COLORS.roadUnderside);
    const rightSide = ctx.createLinearGradient(p1.x + w1, p1.y, p1.x, p1.y + drop1);
    rightSide.addColorStop(0, "#cbbbaa");
    rightSide.addColorStop(1, "#756a61");

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#315f77";
    ctx.beginPath();
    ctx.moveTo(p1.x - w1 * 1.05, p1.y + drop1 + 9 * p1.s);
    ctx.lineTo(p1.x + w1 * 1.05, p1.y + drop1 + 9 * p1.s);
    ctx.lineTo(p2.x + w2 * 1.1, p2.y + drop2 + 12 * p2.s);
    ctx.lineTo(p2.x - w2 * 1.1, p2.y + drop2 + 12 * p2.s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = leftSide;
    ctx.beginPath();
    ctx.moveTo(p1.x - w1, p1.y);
    ctx.lineTo(p2.x - w2, p2.y);
    ctx.lineTo(p2.x - w2, p2.y + drop2);
    ctx.lineTo(p1.x - w1, p1.y + drop1);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = rightSide;
    ctx.beginPath();
    ctx.moveTo(p1.x + w1, p1.y);
    ctx.lineTo(p2.x + w2, p2.y);
    ctx.lineTo(p2.x + w2, p2.y + drop2);
    ctx.lineTo(p1.x + w1, p1.y + drop1);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.moveTo(p1.x - w1, p1.y);
    ctx.lineTo(p1.x + w1, p1.y);
    ctx.lineTo(p2.x + w2, p2.y);
    ctx.lineTo(p2.x - w2, p2.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = COLORS.edge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p1.x - w1, p1.y);
    ctx.lineTo(p2.x - w2, p2.y);
    ctx.moveTo(p1.x + w1, p1.y);
    ctx.lineTo(p2.x + w2, p2.y);
    ctx.stroke();

    ctx.save();
    ctx.globalAlpha = 0.24;
    ctx.strokeStyle = COLORS.roadLine;
    ctx.lineWidth = Math.max(0.7, 1.25 * p1.s);
    ctx.beginPath();
    ctx.moveTo(p1.x - w1 * 0.42, p1.y + 1 * p1.s);
    ctx.lineTo(p2.x - w2 * 0.42, p2.y + 1 * p2.s);
    ctx.moveTo(p1.x + w1 * 0.42, p1.y + 1 * p1.s);
    ctx.lineTo(p2.x + w2 * 0.42, p2.y + 1 * p2.s);
    ctx.stroke();
    ctx.restore();

    if (Math.floor(z1 * 1.4) % 4 === 0) {
      ctx.save();
      ctx.globalAlpha = 0.36;
      ctx.strokeStyle = "#bdb1a5";
      ctx.lineWidth = Math.max(0.7, 1.15 * p1.s);
      ctx.beginPath();
      ctx.moveTo(p1.x - w1 * 0.68, p1.y + 2 * p1.s);
      ctx.lineTo(p1.x + w1 * 0.68, p1.y + 2 * p1.s);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = "#fff8e9";
    ctx.lineWidth = Math.max(0.8, 1.4 * p1.s);
    ctx.beginPath();
    ctx.moveTo(p1.x - w1 * 0.86, p1.y + 2 * p1.s);
    ctx.lineTo(p2.x - w2 * 0.86, p2.y + 2 * p2.s);
    ctx.moveTo(p1.x + w1 * 0.86, p1.y + 2 * p1.s);
    ctx.lineTo(p2.x + w2 * 0.86, p2.y + 2 * p2.s);
    ctx.stroke();
    ctx.restore();
  }

  function drawGap(gap) {
    if (!gap.built) drawGapVoid(gap);
    const pieces = gap.built ? gap.required : gap.placed;
    for (let i = 0; i < pieces; i += 1) {
      const z = gap.z + 0.34 + (i / gap.required) * (gap.length - 0.55);
      const age = state.time - (gap.placedAt[i] || 0);
      const lift = clamp(1 - age * 3.6, 0, 1) * 0.68;
      drawBridgePlank(0, z, lift);
    }
  }

  function drawGapVoid(gap) {
    const near = screenPoint(0, gap.z);
    const far = screenPoint(0, gap.z + gap.length);
    const nearW = roadWidth(gap.z);
    const farW = roadWidth(gap.z + gap.length);

    ctx.save();
    ctx.globalAlpha = 0.26;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(near.x, near.y + 42 * near.s, nearW * 0.72, 16 * near.s, 0, 0, Math.PI * 2);
    ctx.ellipse(far.x, far.y + 22 * far.s, farW * 0.8, 12 * far.s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(90, 69, 52, 0.34)";
    ctx.lineWidth = Math.max(1, 3 * near.s);
    ctx.beginPath();
    ctx.moveTo(near.x - nearW, near.y);
    ctx.lineTo(near.x + nearW, near.y);
    ctx.moveTo(far.x - farW, far.y);
    ctx.lineTo(far.x + farW, far.y);
    ctx.stroke();

    drawBridgeRope(gap, -0.62);
    drawBridgeRope(gap, 0.62);

    ctx.fillStyle = "#76502e";
    for (const z of [gap.z, gap.z + gap.length]) {
      for (const x of [-0.62, 0.62]) {
        const p = screenPoint(x, z, -4);
        const r = Math.max(2.6, 8.5 * p.s);
        ctx.fillStyle = "#76502e";
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 226, 171, 0.5)";
        ctx.lineWidth = Math.max(1, 1.4 * p.s);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawBridgeRope(gap, x) {
    const a = screenPoint(x, gap.z, -3);
    const b = screenPoint(x, gap.z + gap.length, -3);
    const midX = (a.x + b.x) * 0.5;
    const midY = (a.y + b.y) * 0.5 + 24 * a.s;

    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(47, 31, 20, 0.36)";
    ctx.lineWidth = Math.max(3, 8 * a.s);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y + 3 * a.s);
    ctx.quadraticCurveTo(midX, midY + 4 * a.s, b.x, b.y + 3 * b.s);
    ctx.stroke();

    ctx.strokeStyle = "rgba(104, 62, 26, 0.95)";
    ctx.lineWidth = Math.max(2.1, 5.4 * a.s);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(midX, midY, b.x, b.y);
    ctx.stroke();

    ctx.strokeStyle = "rgba(245, 187, 98, 0.9)";
    ctx.lineWidth = Math.max(1, 2.1 * a.s);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y - 1.4 * a.s);
    ctx.quadraticCurveTo(midX, midY - 1.4 * a.s, b.x, b.y - 1.4 * b.s);
    ctx.stroke();

    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = "#3c2718";
    ctx.lineWidth = Math.max(0.9, 1.5 * a.s);
    for (let i = 1; i < 8; i += 1) {
      const t = i / 8;
      const x1 = a.x + (b.x - a.x) * t;
      const y1 = a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * 24 * a.s;
      ctx.beginPath();
      ctx.moveTo(x1 - 4 * a.s, y1 - 2.4 * a.s);
      ctx.lineTo(x1 + 4 * a.s, y1 + 3.5 * a.s);
      ctx.stroke();
    }
    ctx.restore();
  }

  function buildProgress(gap) {
    if (state.player.z < gap.z) return 0;
    if (state.player.z > gap.z + gap.length) return 1;
    return clamp((state.player.z - gap.z) / gap.length, 0, 1);
  }

  function drawBridgePlank(x, z, lift = 0) {
    const p = screenPoint(x, z, lift * 80);
    const len = 112 * p.s;
    const thick = 14 * p.s;
    const squash = 1 + Math.max(0, 0.22 - lift) * 0.35;
    const g = ctx.createLinearGradient(0, -thick, 0, thick);
    g.addColorStop(0, COLORS.woodLight);
    g.addColorStop(0.5, COLORS.wood);
    g.addColorStop(1, COLORS.woodDark);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.sin(z * 2.7) * 0.13 * clamp(lift * 2.1, 0, 1));
    ctx.scale(1, squash);
    ctx.shadowColor = "rgba(74, 36, 12, 0.22)";
    ctx.shadowBlur = (7 + lift * 16) * p.s;
    ctx.shadowOffsetY = (5 + lift * 18) * p.s;
    roundRect(-len / 2, -thick / 2, len, thick, Math.max(2, 5 * p.s), g);
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "rgba(92, 45, 18, 0.32)";
    ctx.fillRect(-len / 2 + 5 * p.s, thick * 0.2, len - 10 * p.s, Math.max(1, thick * 0.16));
    ctx.fillStyle = "#6b3d1d";
    ctx.beginPath();
    ctx.ellipse(-len / 2 + 6 * p.s, 0, 3.5 * p.s, thick * 0.44, 0, 0, Math.PI * 2);
    ctx.ellipse(len / 2 - 6 * p.s, 0, 3.5 * p.s, thick * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawCollectibles() {
    for (const plank of state.level.planks) {
      if (plank.taken || plank.z < state.cameraZ - 1 || plank.z > state.cameraZ + 54) continue;
      drawLoosePlank(plank.x, plank.z, 0.15 + Math.sin(state.time * 4 + plank.z) * 0.04);
    }
  }

  function drawLoosePlank(x, z, lift) {
    const p = screenPoint(x, z, lift * 80);
    const len = 60 * p.s;
    const thick = 15 * p.s;
    const g = ctx.createLinearGradient(0, -thick / 2, 0, thick / 2);
    g.addColorStop(0, COLORS.woodLight);
    g.addColorStop(0.52, COLORS.wood);
    g.addColorStop(1, COLORS.woodDark);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(-0.28);
    ctx.shadowColor = "rgba(57, 34, 19, 0.24)";
    ctx.shadowBlur = 8 * p.s;
    ctx.shadowOffsetY = 4 * p.s;
    roundRect(-len / 2, -thick / 2, len, thick, Math.max(2, 6 * p.s), g);
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "rgba(255,244,201,0.42)";
    ctx.fillRect(-len * 0.34, -thick * 0.32, len * 0.46, Math.max(1, 2 * p.s));
    ctx.fillStyle = "#6b3d1d";
    ctx.beginPath();
    ctx.ellipse(-len / 2 + 4 * p.s, 0, 4 * p.s, thick * 0.38, 0, 0, Math.PI * 2);
    ctx.ellipse(len / 2 - 4 * p.s, 0, 4 * p.s, thick * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawGates() {
    for (const gate of state.level.gates) {
      if (gate.z < state.cameraZ - 1 || gate.z > state.cameraZ + 55) continue;
      drawGatePanel(gate.left, gate.z, gate.used);
      drawGatePanel(gate.right, gate.z, gate.used);
    }
  }

  function drawGatePanel(option, z, used) {
    const p = screenPoint(option.x, z, 58);
    const w = 84 * p.s;
    const h = 106 * p.s;
    const isBad = option.value < 0;
    const baseColor = isBad ? COLORS.gateBad : option.op === "mul" ? COLORS.gateGreat : COLORS.gateGood;
    const glass = ctx.createLinearGradient(p.x - w / 2, p.y - h, p.x + w / 2, p.y);
    glass.addColorStop(0, isBad ? "rgba(255,145,128,0.82)" : option.op === "mul" ? "rgba(151,120,255,0.86)" : "rgba(100,224,171,0.86)");
    glass.addColorStop(0.52, baseColor);
    glass.addColorStop(1, isBad ? "rgba(160,46,52,0.84)" : option.op === "mul" ? "rgba(77,57,173,0.88)" : "rgba(32,137,99,0.88)");
    ctx.save();
    ctx.globalAlpha = used ? 0.28 : 0.9;

    ctx.fillStyle = "rgba(26, 53, 74, 0.16)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 8 * p.s, w * 0.62, 8 * p.s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(226, 255, 255, 0.82)";
    ctx.lineWidth = Math.max(2, 4 * p.s);
    ctx.beginPath();
    ctx.moveTo(p.x - w / 2 - 5 * p.s, p.y);
    ctx.lineTo(p.x - w / 2 - 5 * p.s, p.y - h - 9 * p.s);
    ctx.moveTo(p.x + w / 2 + 5 * p.s, p.y);
    ctx.lineTo(p.x + w / 2 + 5 * p.s, p.y - h - 9 * p.s);
    ctx.stroke();

    ctx.fillStyle = glass;
    ctx.strokeStyle = "rgba(255,255,255,0.88)";
    ctx.lineWidth = Math.max(1, 2.4 * p.s);
    roundedPath(p.x - w / 2, p.y - h, w, h, Math.max(4, 8 * p.s));
    ctx.fill();
    ctx.stroke();

    ctx.globalAlpha = used ? 0.18 : 0.34;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(p.x - w * 0.42, p.y - h * 0.92);
    ctx.lineTo(p.x - w * 0.14, p.y - h * 0.92);
    ctx.lineTo(p.x + w * 0.36, p.y - h * 0.14);
    ctx.lineTo(p.x + w * 0.12, p.y - h * 0.14);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = used ? 0.28 : 0.95;
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.24)";
    ctx.shadowBlur = 4 * p.s;
    ctx.font = `900 ${Math.max(13, 31 * p.s)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(option.label, p.x, p.y - h * 0.48);
    ctx.restore();
  }

  function drawFinish() {
    const z = state.level.finishZ;
    if (z < state.cameraZ - 1 || z > state.cameraZ + 60) return;
    const p = screenPoint(0, z, 54);
    const r = 48 * p.s;
    ctx.save();
    ctx.shadowColor = "rgba(138, 87, 15, 0.28)";
    ctx.shadowBlur = 14 * p.s;
    ctx.fillStyle = "#f4ba3a";
    ctx.strokeStyle = "#a86817";
    ctx.lineWidth = Math.max(2, 5 * p.s);
    ctx.beginPath();
    ctx.arc(p.x, p.y - r * 0.3, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "rgba(255, 246, 170, 0.9)";
    ctx.lineWidth = Math.max(1, 3 * p.s);
    ctx.beginPath();
    ctx.arc(p.x, p.y - r * 0.3, r * 0.76, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.54)";
    ctx.beginPath();
    ctx.ellipse(p.x - r * 0.28, p.y - r * 0.68, r * 0.18, r * 0.08, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff3a0";
    ctx.font = `900 ${Math.max(11, 21 * p.s)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("金币", p.x, p.y - r * 0.3);
    ctx.restore();
  }

  function drawPlayer() {
    const p = screenPoint(state.player.x, state.player.z, 34 + Math.sin(state.time * 11) * 3);
    const s = Math.max(0.52, p.s * 1.35);
    const stack = Math.min(state.planks, 28);

    ctx.fillStyle = "rgba(42,55,42,0.18)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 27 * s, 25 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < stack; i += 1) {
      const yy = p.y - 43 * s - i * 4.1 * s;
      const width = 58 * s + Math.sin(i * 0.8) * 2 * s;
      const g = ctx.createLinearGradient(0, yy, 0, yy + 7 * s);
      g.addColorStop(0, COLORS.woodLight);
      g.addColorStop(0.55, i % 2 ? "#b86732" : COLORS.wood);
      g.addColorStop(1, COLORS.woodDark);
      roundRect(p.x - width / 2, yy, width, 6.5 * s, 2.5 * s, g);
      ctx.fillStyle = "rgba(255, 235, 189, 0.28)";
      ctx.fillRect(p.x - width * 0.34, yy + 1.3 * s, width * 0.36, Math.max(1, 1.1 * s));
    }

    if (state.planks > 12) {
      ctx.save();
      ctx.fillStyle = "rgba(64, 35, 17, 0.92)";
      ctx.font = `900 ${Math.max(10, 13 * s)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      roundRect(p.x + 25 * s, p.y - 47 * s - stack * 4.1 * s, 28 * s, 18 * s, 9 * s, "rgba(255, 241, 206, 0.92)");
      ctx.fillText(String(Math.floor(state.planks)), p.x + 39 * s, p.y - 38 * s - stack * 4.1 * s);
      ctx.restore();
    }

    ctx.fillStyle = COLORS.skin;
    ctx.beginPath();
    ctx.arc(p.x, p.y - 36 * s, 11 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#30342c";
    ctx.beginPath();
    ctx.arc(p.x - 3 * s, p.y - 44 * s, 10 * s, Math.PI * 0.05, Math.PI * 1.12);
    ctx.fill();

    roundRect(p.x - 15 * s, p.y - 27 * s, 30 * s, 34 * s, 8 * s, COLORS.shirt);
    ctx.fillStyle = COLORS.shorts;
    ctx.fillRect(p.x - 13 * s, p.y + 2 * s, 26 * s, 14 * s);

    ctx.strokeStyle = COLORS.skin;
    ctx.lineWidth = 5 * s;
    ctx.lineCap = "round";
    const swing = Math.sin(state.time * 10) * 7 * s;
    ctx.beginPath();
    ctx.moveTo(p.x - 11 * s, p.y - 13 * s);
    ctx.lineTo(p.x - 24 * s, p.y - 1 * s + swing);
    ctx.moveTo(p.x + 11 * s, p.y - 13 * s);
    ctx.lineTo(p.x + 23 * s, p.y - 2 * s - swing);
    ctx.moveTo(p.x - 8 * s, p.y + 14 * s);
    ctx.lineTo(p.x - 15 * s, p.y + 29 * s - swing * 0.4);
    ctx.moveTo(p.x + 8 * s, p.y + 14 * s);
    ctx.lineTo(p.x + 15 * s, p.y + 29 * s + swing * 0.4);
    ctx.stroke();
  }

  function drawParticles() {
    for (const particle of state.particles) {
      const a = clamp(particle.life / particle.max, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.r * a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function update(dt) {
    if (state.status !== "playing") return;
    state.time += dt;
    state.player.z += state.speed * dt;
    state.player.x += (state.player.targetX - state.player.x) * Math.min(1, dt * 10);
    state.cameraZ = Math.max(0, state.player.z - 3.2);

    collectPlanks();
    applyGates();
    handleGaps();
    updateParticles(dt);

    if (state.player.z >= state.level.finishZ) {
      state.coins += 50 + state.planks * 2;
      endGame(true, "通关成功");
    }

    updateHud();
  }

  function collectPlanks() {
    for (const plank of state.level.planks) {
      if (plank.taken) continue;
      if (Math.abs(plank.z - state.player.z) < 0.58 && Math.abs(plank.x - state.player.x) < 0.52) {
        plank.taken = true;
        state.planks += 1;
        addBurst("#f4ba3a");
      }
    }
  }

  function applyGates() {
    for (const gate of state.level.gates) {
      if (gate.used || state.player.z < gate.z) continue;
      gate.used = true;
      const option = state.player.x < 0 ? gate.left : gate.right;
      if (option.op === "mul") state.planks = Math.max(0, Math.floor(state.planks * option.value));
      if (option.op === "add") state.planks = Math.max(0, Math.floor(state.planks + option.value));
      addFloatingText(option.label, option.value < 0 ? COLORS.gateBad : "#30a66a");
    }
  }

  function handleGaps() {
    for (const gap of state.level.gaps) {
      if (gap.built || gap.failed || state.player.z < gap.z) continue;

      const progress = buildProgress(gap);
      const targetPlaced = Math.min(gap.required, Math.ceil(progress * gap.required));

      while (gap.placed < targetPlaced) {
        if (state.planks <= 0) {
          gap.failed = true;
          endGame(false, "木板不够");
          return;
        }

        state.planks -= 1;
        gap.placed += 1;
        gap.placedAt.push(state.time);
        addPlankSnap(gap, gap.placed - 1);
        addBurst(COLORS.wood);
      }

      if (gap.placed >= gap.required && state.player.z >= gap.z + gap.length) {
        gap.built = true;
      }
    }
  }

  function updateParticles(dt) {
    for (const p of state.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 160 * dt;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
  }

  function addBurst(color) {
    const p = screenPoint(state.player.x, state.player.z, 60);
    for (let i = 0; i < 8; i += 1) {
      state.particles.push({
        x: p.x,
        y: p.y,
        vx: (Math.random() - 0.5) * 130,
        vy: -80 - Math.random() * 90,
        r: 4 + Math.random() * 3,
        color,
        life: 0.45 + Math.random() * 0.25,
        max: 0.7,
      });
    }
  }

  function addPlankSnap(gap, index) {
    const z = gap.z + 0.34 + (index / gap.required) * (gap.length - 0.55);
    const p = screenPoint(0, z, 8);
    for (let i = 0; i < 7; i += 1) {
      state.particles.push({
        x: p.x + (Math.random() - 0.5) * 62 * p.s,
        y: p.y + (Math.random() - 0.5) * 12 * p.s,
        vx: (Math.random() - 0.5) * 92,
        vy: -28 - Math.random() * 56,
        r: (2.2 + Math.random() * 2.4) * Math.max(0.7, p.s),
        color: i % 2 ? COLORS.woodLight : "rgba(255, 238, 202, 0.92)",
        life: 0.32 + Math.random() * 0.16,
        max: 0.46,
      });
    }
  }

  function addFloatingText(text, color) {
    const p = screenPoint(state.player.x, state.player.z, 90);
    state.particles.push({
      text,
      color,
      x: p.x,
      y: p.y,
      vx: 0,
      vy: -70,
      r: 0,
      life: 0.7,
      max: 0.7,
    });
  }

  function renderFloatingText() {
    for (const p of state.particles) {
      if (!p.text) continue;
      const a = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.font = "900 30px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  function endGame(won, message) {
    state.status = won ? "won" : "lost";
    state.message = message;
    updateHud();
    ui.showOverlay();
    ui.setPanel(`
      <p class="kicker">${won ? "挑战完成" : "再试一次"}</p>
      <h1>${message}</h1>
      <p class="hint">${won ? `金币 +${50 + state.planks * 2}，剩余木板 ${state.planks}` : "多收集木板，优先选择加成更高的门。"}</p>
      <button id="primaryButton" type="button">${won ? "再玩一局" : "重新开始"}</button>
    `);
    panel.querySelector("button").addEventListener("click", resetGame);
  }

  function draw() {
    drawBackground();
    if (!state.level) state.level = makeLevel();
    drawTrack();
    drawFinish();
    drawCollectibles();
    drawGates();
    drawPlayer();
    drawParticles();
    renderFloatingText();
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - state.last) / 1000 || 0);
    state.last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function pointerToTargetX(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const normalized = (x / rect.width - 0.5) * 3.4;
    state.player.targetX = clamp(normalized, -1.35, 1.35);
  }

  function bindInput() {
    canvas.addEventListener("pointerdown", (event) => {
      state.drag = true;
      canvas.setPointerCapture(event.pointerId);
      pointerToTargetX(event);
    });
    canvas.addEventListener("pointermove", (event) => {
      if (state.drag) pointerToTargetX(event);
    });
    canvas.addEventListener("pointerup", () => {
      state.drag = false;
    });
    canvas.addEventListener("pointercancel", () => {
      state.drag = false;
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        state.player.targetX = clamp(state.player.targetX - 0.35, -1.35, 1.35);
      }
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        state.player.targetX = clamp(state.player.targetX + 0.35, -1.35, 1.35);
      }
      if (event.key === " " && state.status !== "playing") resetGame();
    });
  }

  function roundRect(x, y, w, h, r, fill) {
    ctx.fillStyle = fill;
    roundedPath(x, y, w, h, r);
    ctx.fill();
  }

  function roundedPath(x, y, w, h, r) {
    const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  resize();
  bindInput();
  primaryButton.addEventListener("click", resetGame);
  window.addEventListener("resize", resize);
  state.level = makeLevel();
  state.last = performance.now();
  requestAnimationFrame(loop);
})();

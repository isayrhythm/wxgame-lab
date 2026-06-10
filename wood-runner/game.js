(() => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const plankLabel = document.getElementById("plankCount");
  const coinLabel = document.getElementById("coinCount");
  const overlay = document.getElementById("overlay");
  const primaryButton = document.getElementById("primaryButton");
  const panel = overlay.querySelector(".panel");

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
    roadTop: "#ead7c1",
    roadSide: "#b79b83",
    edge: "#fff1d9",
    wood: "#b96c34",
    woodDark: "#73411f",
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
        { z: 23.5, length: 5.3, required: 9, built: false, failed: false },
        { z: 41.8, length: 6.1, required: 11, built: false, failed: false },
        { z: 61.7, length: 7.1, required: 14, built: false, failed: false },
        { z: 84.5, length: 5.8, required: 12, built: false, failed: false },
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
    overlay.classList.add("hidden");
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

    for (const gap of gaps) {
      if (gap.z + gap.length < state.cameraZ || gap.z > state.cameraZ + 68) continue;
      drawGap(gap);
    }
  }

  function isOpenGap(z, gaps) {
    return gaps.some((gap) => z > gap.z && z < gap.z + gap.length && !gap.built);
  }

  function drawRoadSlice(z1, z2) {
    const p1 = screenPoint(0, z1);
    const p2 = screenPoint(0, z2);
    const w1 = roadWidth(z1);
    const w2 = roadWidth(z2);
    ctx.fillStyle = COLORS.roadSide;
    ctx.beginPath();
    ctx.moveTo(p1.x - w1, p1.y + 10 * p1.s);
    ctx.lineTo(p1.x + w1, p1.y + 10 * p1.s);
    ctx.lineTo(p2.x + w2, p2.y + 12 * p2.s);
    ctx.lineTo(p2.x - w2, p2.y + 12 * p2.s);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = COLORS.roadTop;
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
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = "#9d745e";
    ctx.lineWidth = Math.max(0.6, 1.1 * p1.s);
    ctx.beginPath();
    ctx.moveTo(p1.x - w1 * 0.42, p1.y + 1 * p1.s);
    ctx.lineTo(p2.x - w2 * 0.42, p2.y + 1 * p2.s);
    ctx.moveTo(p1.x + w1 * 0.42, p1.y + 1 * p1.s);
    ctx.lineTo(p2.x + w2 * 0.42, p2.y + 1 * p2.s);
    ctx.stroke();
    ctx.restore();

    if (Math.floor(z1 * 1.4) % 4 === 0) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = "#b48c72";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p1.x - w1 * 0.68, p1.y + 2 * p1.s);
      ctx.lineTo(p1.x + w1 * 0.68, p1.y + 2 * p1.s);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawGap(gap) {
    const pieces = gap.built ? gap.required : Math.max(1, Math.floor(gap.required * buildProgress(gap)));
    for (let i = 0; i < pieces; i += 1) {
      const z = gap.z + 0.34 + (i / gap.required) * (gap.length - 0.55);
      drawBridgePlank(0, z);
    }
  }

  function buildProgress(gap) {
    if (state.player.z < gap.z) return 0;
    if (state.player.z > gap.z + gap.length) return 1;
    return clamp((state.player.z - gap.z) / gap.length, 0, 1);
  }

  function drawBridgePlank(x, z) {
    const p = screenPoint(x, z);
    const len = 88 * p.s;
    const thick = 12 * p.s;
    roundRect(p.x - len / 2, p.y - thick / 2, len, thick, Math.max(2, 4 * p.s), COLORS.wood);
    ctx.fillStyle = "rgba(90,45,16,0.22)";
    ctx.fillRect(p.x - len / 2 + 3 * p.s, p.y + thick * 0.18, len - 6 * p.s, thick * 0.18);
  }

  function drawCollectibles() {
    for (const plank of state.level.planks) {
      if (plank.taken || plank.z < state.cameraZ - 1 || plank.z > state.cameraZ + 54) continue;
      drawLoosePlank(plank.x, plank.z, 0.15 + Math.sin(state.time * 4 + plank.z) * 0.04);
    }
  }

  function drawLoosePlank(x, z, lift) {
    const p = screenPoint(x, z, lift * 80);
    const len = 52 * p.s;
    const thick = 13 * p.s;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(-0.2);
    roundRect(-len / 2, -thick / 2, len, thick, Math.max(2, 5 * p.s), COLORS.wood);
    ctx.fillStyle = "rgba(255,244,201,0.34)";
    ctx.fillRect(-len * 0.32, -thick * 0.3, len * 0.42, Math.max(1, 2 * p.s));
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
    const w = 74 * p.s;
    const h = 92 * p.s;
    const isBad = option.value < 0;
    ctx.save();
    ctx.globalAlpha = used ? 0.28 : 0.9;
    ctx.fillStyle = isBad ? COLORS.gateBad : option.op === "mul" ? COLORS.gateGreat : COLORS.gateGood;
    ctx.strokeStyle = "rgba(255,255,255,0.78)";
    ctx.lineWidth = Math.max(1, 2 * p.s);
    roundedPath(p.x - w / 2, p.y - h, w, h, Math.max(4, 8 * p.s));
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 ${Math.max(12, 28 * p.s)}px system-ui, sans-serif`;
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
    ctx.fillStyle = "#f4ba3a";
    ctx.strokeStyle = "#a86817";
    ctx.lineWidth = Math.max(2, 5 * p.s);
    ctx.beginPath();
    ctx.arc(p.x, p.y - r * 0.3, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
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
    for (let i = 0; i < stack; i += 1) {
      const yy = p.y - 43 * s - i * 4.1 * s;
      roundRect(p.x - 28 * s, yy, 56 * s, 5.5 * s, 2 * s, i % 2 ? "#b86732" : COLORS.wood);
    }

    ctx.fillStyle = "rgba(42,55,42,0.18)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 27 * s, 25 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.fill();

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
      if (state.planks >= gap.required) {
        state.planks -= gap.required;
        gap.built = true;
        addFloatingText(`-${gap.required}`, COLORS.wood);
      } else {
        gap.failed = true;
        endGame(false, "木板不够");
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
    overlay.classList.remove("hidden");
    panel.innerHTML = `
      <p class="kicker">${won ? "挑战完成" : "再试一次"}</p>
      <h1>${message}</h1>
      <p class="hint">${won ? `金币 +${50 + state.planks * 2}，剩余木板 ${state.planks}` : "多收集木板，优先选择加成更高的门。"}</p>
      <button id="primaryButton" type="button">${won ? "再玩一局" : "重新开始"}</button>
    `;
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

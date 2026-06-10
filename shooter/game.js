(() => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const monsterLabel = document.getElementById("monsterCount");
  const squadLabel = document.getElementById("squadCount");
  const overlay = document.getElementById("overlay");
  const panel = overlay.querySelector(".panel");
  const primaryButton = document.getElementById("primaryButton");
  const pauseButton = document.getElementById("pauseButton");

  const BOSS_AFTER_WAVE = 4;

  const weapons = {
    rifle: { name: "Rifle", icon: "R", color: "#ffe071", damage: 7, delay: 0.17, shots: 1, spread: 0, speed: 640, size: 4 },
    shotgun: { name: "Shotgun", icon: "S", color: "#ff9f43", damage: 5, delay: 0.26, shots: 5, spread: 175, speed: 570, size: 4 },
    laser: { name: "Laser", icon: "L", color: "#57e5ff", damage: 0.25, delay: 0.018, shots: 1, spread: 0, speed: 0, size: 5 },
    rocket: { name: "Rocket", icon: "B", color: "#ff5d6f", damage: 32, delay: 0.4, shots: 1, spread: 0, speed: 480, size: 8, splash: 50 },
  };

  const state = {
    status: "ready",
    phase: "combat",
    width: 0,
    height: 0,
    dpr: 1,
    time: 0,
    last: 0,
    x: 0,
    targetX: 0,
    drag: false,
    squad: 2,
    wave: 0,
    cleared: 0,
    waveHp: 0,
    scroll: 0,
    runSpeed: 134,
    fireTimer: 0,
    weaponKey: "rifle",
    weaponTimer: 0,
    rewardIndex: 0,
    bullets: [],
    enemies: [],
    gates: [],
    supplies: [],
    sparks: [],
  };

  window.__shooterState = state;

  const colors = {
    ink: "#172425",
    road: "#dfe8e4",
    roadSide: "#aebdb8",
    grassA: "#68a66d",
    grassB: "#3f8462",
    green: "#35b979",
    violet: "#6755d7",
    red: "#d94d62",
    yellow: "#ffe071",
    penguinBlack: "#2f3038",
    penguinBelly: "#f7f2ed",
    beak: "#f0a13b",
    heron: "#3d4555",
    heronWing: "#232936",
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

  function laneX(lane) {
    return state.width * 0.5 + lane * Math.min(158, state.width * 0.38);
  }

  function worldY(y) {
    return y + state.scroll;
  }

  function currentWeapon() {
    return weapons[state.weaponKey] || weapons.rifle;
  }

  function resetGame() {
    state.status = "playing";
    state.phase = "combat";
    state.time = 0;
    state.last = performance.now();
    state.x = 0;
    state.targetX = 0;
    state.squad = 2;
    state.wave = 0;
    state.cleared = 0;
    state.waveHp = 0;
    state.scroll = 0;
    state.runSpeed = 134;
    state.fireTimer = 0;
    state.weaponKey = "rifle";
    state.weaponTimer = 0;
    state.rewardIndex = 0;
    state.bullets = [];
    state.enemies = [];
    state.gates = [];
    state.supplies = [];
    state.sparks = [];
    spawnBugWave();
    overlay.classList.add("hidden");
    pauseButton.textContent = "Ⅱ";
    updateHud();
  }

  function updateHud() {
    monsterLabel.textContent = String(Math.max(0, Math.ceil(state.waveHp)));
    squadLabel.textContent = String(Math.max(0, Math.floor(state.squad)));
  }

  function spawnBugWave() {
    state.phase = "combat";
    state.wave += 1;
    state.enemies = [];
    state.gates = [];
    state.supplies = [];

    const count = Math.min(18 + state.wave * 5, 52);
    const hpEach = 10 + state.wave * 4;
    const spread = Math.min(270, state.width * 0.72);
    state.waveHp = count * hpEach;

    for (let i = 0; i < count; i += 1) {
      const row = Math.floor(i / 8);
      const col = i % 8;
      const usedCols = Math.min(8, count - row * 8);
      state.enemies.push({
        type: "bug",
        x: state.width * 0.5 + (col - (usedCols - 1) / 2) * (spread / 7) + (Math.random() - 0.5) * 12,
        y: -130 - row * 42 - Math.random() * 32,
        hp: hpEach,
        maxHp: hpEach,
        phase: Math.random() * Math.PI * 2,
        kind: (i + state.wave) % 5,
      });
    }
    addText(state.width * 0.5, 92, `Bug Wave ${state.wave}`, colors.violet);
  }

  function spawnBoss() {
    state.phase = "boss";
    state.enemies = [{
      type: "heron",
      x: state.width * 0.5,
      y: -150,
      hp: 2200 + state.squad * 22,
      maxHp: 2200 + state.squad * 22,
      phase: 0,
    }];
    state.gates = [];
    state.supplies = [];
    state.waveHp = state.enemies[0].hp;
    addText(state.width * 0.5, 92, "Night Heron", colors.red);
  }

  function spawnRewardSegment() {
    state.phase = "reward";
    state.rewardIndex += 1;
    state.enemies = [];
    state.bullets = [];
    state.waveHp = 0;

    const y = -180 - state.scroll;
    state.gates = [];
    state.supplies = [];

    if (state.rewardIndex % 2 === 1) {
      const choices = [
        ["x2", "mul", 2, "+5", "add", 5],
        ["+8", "add", 8, "x3", "mul", 3],
        ["-4", "add", -4, "+14", "add", 14],
      ][state.rewardIndex % 3];
      state.gates.push(makeGate(y, ...choices));
      addText(state.width * 0.5, 108, "Squad Gate", colors.green);
    } else {
      const left = ["shotgun", "laser", "rocket"][state.rewardIndex % 3];
      const right = ["laser", "rocket", "shotgun"][state.rewardIndex % 3];
      state.supplies.push(makeSupply(y, -0.46, left));
      state.supplies.push(makeSupply(y, 0.46, right));
      addText(state.width * 0.5, 108, "Weapon Crate", colors.yellow);
    }
  }

  function makeGate(y, leftLabel, leftOp, leftValue, rightLabel, rightOp, rightValue) {
    return {
      y,
      used: false,
      left: { x: -0.55, label: leftLabel, op: leftOp, value: leftValue },
      right: { x: 0.55, label: rightLabel, op: rightOp, value: rightValue },
    };
  }

  function makeSupply(y, x, weaponKey) {
    return { y, x, weaponKey, taken: false };
  }

  function update(dt) {
    if (state.status !== "playing") return;

    state.time += dt;
    state.scroll += state.runSpeed * dt;
    state.x += (state.targetX - state.x) * Math.min(1, dt * 22);
    state.fireTimer -= dt;

    if (state.weaponTimer > 0) {
      state.weaponTimer -= dt;
      if (state.weaponTimer <= 0) {
        state.weaponKey = "rifle";
        addText(state.width * 0.5, state.height - 172, "Rifle", colors.yellow);
      }
    }

    if (state.fireTimer <= 0) {
      fire();
      state.fireTimer = currentWeapon().delay;
    }

    updateEnemies(dt);
    updateBullets(dt);
    updateGates();
    updateSupplies();
    updateRewardFlow();
    updateSparks(dt);
    updateHud();
  }

  function fire() {
    const weapon = currentWeapon();
    const shooters = Math.min(24, state.squad);
    const baseY = state.height - 112;
    const step = Math.max(1, Math.ceil(shooters / Math.min(shooters, 10)));

    for (let i = 0; i < shooters; i += step) {
      const offset = formationOffset(i, shooters);
      for (let shot = 0; shot < weapon.shots; shot += 1) {
        const spreadIndex = shot - (weapon.shots - 1) / 2;
        const isLaser = weapon.name === "Laser";
        state.bullets.push({
          type: isLaser ? "laser" : "bullet",
          x: laneX(state.x) + offset.x,
          y: baseY + offset.y - 30,
          vx: spreadIndex * weapon.spread,
          vy: isLaser ? 0 : -weapon.speed,
          damage: weapon.damage + (isLaser ? Math.min(3, state.squad * 0.05) : Math.min(13, state.squad * 0.2)),
          color: weapon.color,
          size: weapon.size,
          splash: weapon.splash || 0,
          life: isLaser ? 0.055 : 1.55,
        });
      }
    }
  }

  function formationOffset(index, total) {
    const cols = Math.min(6, Math.ceil(Math.sqrt(total)));
    const col = index % cols;
    const row = Math.floor(index / cols);
    const usedCols = Math.min(cols, total - row * cols);
    return {
      x: (col - (usedCols - 1) / 2) * 20,
      y: row * 22,
    };
  }

  function updateEnemies(dt) {
    if (state.phase !== "combat" && state.phase !== "boss") return;

    const attackLine = state.height - 188;

    for (const enemy of state.enemies) {
      if (enemy.type === "bug") {
        enemy.y += (24 + state.wave * 2.4) * dt;
        enemy.x += Math.sin(state.time * 2.7 + enemy.phase) * 7 * dt;
      } else {
        enemy.phase += dt;
        enemy.y += (18 + state.wave * 1.2) * dt;
        enemy.x = state.width * 0.5 + Math.sin(enemy.phase * 1.8) * Math.min(92, state.width * 0.24);
      }
    }

    const reached = state.enemies.filter((enemy) => enemy.y > attackLine);
    if (reached.length > 0) {
      const boss = reached.find((enemy) => enemy.type === "heron");
      const loss = boss ? 16 * dt : Math.max(1, Math.ceil(reached.length * (1 + state.wave * 0.08)));
      state.squad -= loss;
      if (!boss) {
        state.enemies = state.enemies.filter((enemy) => enemy.y <= attackLine + 24);
        state.waveHp = Math.max(0, state.waveHp - reached.reduce((sum, enemy) => sum + enemy.hp, 0));
      }
      addText(state.width * 0.5, attackLine - 18, `-${Math.ceil(loss)}`, colors.red);
      if (state.squad <= 0) endGame(false, "Squad Down");
    }

    if (state.enemies.length === 0 && state.status === "playing") {
      if (state.phase === "boss") {
        endGame(true, "Boss Down");
        return;
      }
      state.cleared += 1;
      state.runSpeed = Math.min(156, state.runSpeed + 2);
      spawnRewardSegment();
    }
  }

  function updateBullets(dt) {
    for (const bullet of state.bullets) {
      if (bullet.type === "laser") {
        bullet.life -= dt;
        const hit = nearestEnemyOnLaser(bullet.x, bullet.y);
        if (hit) {
          damageEnemy(hit, bullet.damage);
          if (Math.random() < 0.35) addSpark(hit.x, hit.y, bullet.color, 1);
        }
        continue;
      }

      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;

      const hit = nearestEnemy(bullet.x, bullet.y, bullet.splash ? 28 : 19);
      if (!hit) continue;

      bullet.life = -1;
      damageEnemy(hit, bullet.damage);
      addSpark(bullet.x, bullet.y, bullet.color, bullet.splash ? 10 : 3);

      if (bullet.splash) {
        for (const enemy of state.enemies) {
          if (enemy === hit) continue;
          if (Math.hypot(enemy.x - hit.x, enemy.y - hit.y) < bullet.splash) {
            damageEnemy(enemy, bullet.damage * 0.42);
          }
        }
      }
    }

    state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
    state.bullets = state.bullets.filter((bullet) => bullet.life > 0 && bullet.y > -100 && bullet.x > -100 && bullet.x < state.width + 100);
  }

  function nearestEnemy(x, y, radius) {
    let best = null;
    let bestDist = Infinity;
    for (const enemy of state.enemies) {
      if (enemy.y < 18) continue;
      const hitRadius = enemy.type === "heron" ? Math.max(56, radius) : radius;
      const dist = Math.hypot(enemy.x - x, enemy.y - y);
      if (dist < hitRadius && dist < bestDist) {
        best = enemy;
        bestDist = dist;
      }
    }
    return best;
  }

  function nearestEnemyOnLaser(x, gunY) {
    let best = null;
    let bestY = -Infinity;
    for (const enemy of state.enemies) {
      if (enemy.y < 18 || enemy.y > gunY) continue;
      const halfWidth = enemy.type === "heron" ? 44 : 17;
      if (Math.abs(enemy.x - x) <= halfWidth && enemy.y > bestY) {
        best = enemy;
        bestY = enemy.y;
      }
    }
    return best;
  }

  function damageEnemy(enemy, amount) {
    const actual = Math.min(enemy.hp, amount);
    enemy.hp -= actual;
    state.waveHp = Math.max(0, state.waveHp - actual);
    if (enemy.hp <= 0) addSpark(enemy.x, enemy.y, colors.yellow, enemy.type === "heron" ? 26 : 6);
  }

  function updateGates() {
    const playerY = state.height - 120;
    for (const gate of state.gates) {
      if (gate.used) continue;
      const gy = worldY(gate.y);
      if (Math.abs(gy - playerY) < 32) {
        gate.used = true;
        const option = state.x < 0 ? gate.left : gate.right;
        if (option.op === "mul") state.squad = Math.floor(state.squad * option.value);
        if (option.op === "add") state.squad = Math.floor(state.squad + option.value);
        state.squad = clamp(state.squad, 1, 140);
        addText(laneX(state.x), playerY - 64, option.label, option.value < 0 ? colors.red : colors.green);
      }
    }
  }

  function updateSupplies() {
    const playerY = state.height - 120;
    for (const supply of state.supplies) {
      if (supply.taken) continue;
      const sy = worldY(supply.y);
      if (Math.abs(sy - playerY) < 42 && Math.abs(supply.x - state.x) < 0.42) {
        supply.taken = true;
        state.weaponKey = supply.weaponKey;
        state.weaponTimer = supply.weaponKey === "rocket" ? 8 : 10;
        const weapon = currentWeapon();
        addText(laneX(state.x), playerY - 78, weapon.name, weapon.color);
        addSpark(laneX(state.x), playerY - 30, weapon.color, 18);
      }
    }
  }

  function updateRewardFlow() {
    if (state.phase !== "reward") return;
    const maxY = Math.max(
      ...state.gates.map((gate) => worldY(gate.y)),
      ...state.supplies.map((supply) => worldY(supply.y)),
      -999
    );
    const allDone = state.gates.every((gate) => gate.used) && state.supplies.every((supply) => supply.taken);
    if (allDone || maxY > state.height + 90) {
      if (state.cleared >= BOSS_AFTER_WAVE) spawnBoss();
      else spawnBugWave();
    }
  }

  function updateSparks(dt) {
    for (const spark of state.sparks) {
      spark.life -= dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vy += 100 * dt;
    }
    state.sparks = state.sparks.filter((spark) => spark.life > 0);
  }

  function addSpark(x, y, color, amount) {
    for (let i = 0; i < amount; i += 1) {
      state.sparks.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 170,
        vy: -80 - Math.random() * 100,
        r: 3 + Math.random() * 4,
        color,
        life: 0.34 + Math.random() * 0.2,
        max: 0.54,
      });
    }
  }

  function addText(x, y, text, color) {
    state.sparks.push({ x, y, text, vx: 0, vy: -78, r: 0, color, life: 0.76, max: 0.76 });
  }

  function togglePause() {
    if (state.status === "ready") return;
    if (state.status === "paused") {
      state.status = "playing";
      state.last = performance.now();
      overlay.classList.add("hidden");
      pauseButton.textContent = "Ⅱ";
      return;
    }
    if (state.status === "playing") {
      state.status = "paused";
      pauseButton.textContent = "▶";
      showPause();
    }
  }

  function showPause() {
    overlay.classList.remove("hidden");
    panel.innerHTML = `
      <p class="kicker">Paused</p>
      <h1>暂停</h1>
      <p class="hint">当前武器 ${currentWeapon().name}，企鹅小队 ${Math.max(0, Math.floor(state.squad))} 只。</p>
      <button id="resumeButton" type="button">继续</button>
      <button id="restartButton" class="secondary-button" type="button">重新开始</button>
      <a class="panel-link" href="../">返回大厅</a>
    `;
    panel.querySelector("#resumeButton").addEventListener("click", togglePause);
    panel.querySelector("#restartButton").addEventListener("click", resetGame);
  }

  function endGame(won, title) {
    state.status = won ? "won" : "lost";
    pauseButton.textContent = "Ⅱ";
    updateHud();
    overlay.classList.remove("hidden");
    panel.innerHTML = `
      <p class="kicker">${won ? "Victory" : "Game Over"}</p>
      <h1>${title}</h1>
      <p class="hint">${won ? `Cleared ${state.cleared} bug waves and the night heron boss. Penguins left: ${Math.max(0, Math.floor(state.squad))}.` : "战斗段和补给段交替出现，人数门不会给武器，武器只从箱子获得。"}</p>
      <button id="primaryButton" type="button">${won ? "再打一局" : "重新开始"}</button>
    `;
    panel.querySelector("button").addEventListener("click", resetGame);
  }

  function draw() {
    drawBackground();
    drawRoad();
    drawGates();
    drawSupplies();
    drawEnemies();
    drawBullets();
    drawSquad();
    drawWeaponBadge();
    drawSparks();
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, state.height);
    g.addColorStop(0, "#aee0ef");
    g.addColorStop(0.52, "#d8efdf");
    g.addColorStop(1, "#d8c08a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, state.width, state.height);

    ctx.save();
    ctx.globalAlpha = 0.78;
    for (let i = 0; i < 30; i += 1) {
      const x = ((i * 79 - state.scroll * 0.18) % (state.width + 100)) - 50;
      const y = state.height * 0.25 + (i % 6) * 58;
      const r = 22 + (i % 4) * 9;
      ctx.fillStyle = i % 2 ? colors.grassA : colors.grassB;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.arc(x + r * 0.76, y + 5, r * 0.82, 0, Math.PI * 2);
      ctx.arc(x - r * 0.62, y + 8, r * 0.76, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawRoad() {
    const center = state.width * 0.5;
    const topW = Math.min(112, state.width * 0.32);
    const botW = Math.min(260, state.width * 0.72);
    ctx.fillStyle = colors.roadSide;
    ctx.beginPath();
    ctx.moveTo(center - topW, 80);
    ctx.lineTo(center + topW, 80);
    ctx.lineTo(center + botW, state.height + 20);
    ctx.lineTo(center - botW, state.height + 20);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = colors.road;
    ctx.beginPath();
    ctx.moveTo(center - topW + 10, 80);
    ctx.lineTo(center + topW - 10, 80);
    ctx.lineTo(center + botW - 16, state.height + 20);
    ctx.lineTo(center - botW + 16, state.height + 20);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.82)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(center - topW + 10, 80);
    ctx.lineTo(center - botW + 16, state.height + 20);
    ctx.moveTo(center + topW - 10, 80);
    ctx.lineTo(center + botW - 16, state.height + 20);
    ctx.stroke();
  }

  function drawGates() {
    for (const gate of state.gates) {
      const y = worldY(gate.y);
      if (y < -80 || y > state.height + 80) continue;
      drawGate(gate.left, y, gate.used);
      drawGate(gate.right, y, gate.used);
    }
  }

  function drawGate(option, y, used) {
    const x = laneX(option.x);
    const w = Math.min(118, state.width * 0.28);
    const h = 58;
    ctx.save();
    ctx.globalAlpha = used ? 0.28 : 0.94;
    roundedRect(x - w / 2, y - h / 2, w, h, 8, option.value < 0 ? colors.red : option.op === "mul" ? colors.violet : colors.green);
    ctx.strokeStyle = "rgba(255,255,255,0.86)";
    ctx.lineWidth = 2;
    roundedPath(x - w / 2, y - h / 2, w, h, 8);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "900 28px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(option.label, x, y);
    ctx.restore();
  }

  function drawSupplies() {
    for (const supply of state.supplies) {
      if (supply.taken) continue;
      const y = worldY(supply.y);
      if (y < -70 || y > state.height + 70) continue;
      const x = laneX(supply.x);
      const weapon = weapons[supply.weaponKey];
      roundedRect(x - 27, y - 25, 54, 50, 8, "rgba(255,255,255,0.92)");
      ctx.strokeStyle = weapon.color;
      ctx.lineWidth = 3;
      roundedPath(x - 27, y - 25, 54, 50, 8);
      ctx.stroke();
      ctx.fillStyle = weapon.color;
      ctx.font = "900 18px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(weapon.icon, x, y - 3);
      ctx.font = "800 11px system-ui, sans-serif";
      ctx.fillText(weapon.name, x, y + 17);
    }
  }

  function drawEnemies() {
    const sorted = [...state.enemies].sort((a, b) => a.y - b.y);
    for (const enemy of sorted) {
      if (enemy.type === "heron") drawNightHeron(enemy);
      else drawBug(enemy);
    }
  }

  function drawBug(enemy) {
    const bodyColors = ["#6d4aa8", "#31966e", "#c65372", "#5775c9", "#8d6a2d"];
    const scale = clamp(0.74 + enemy.y / state.height * 0.42, 0.62, 1.14);
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "rgba(20,30,35,0.16)";
    ctx.beginPath();
    ctx.ellipse(0, 24, 21, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bodyColors[enemy.kind % bodyColors.length];
    ctx.beginPath();
    ctx.ellipse(0, 3, 22, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.24)";
    ctx.beginPath();
    ctx.ellipse(0, 2, 13, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#2f1e38";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-8, -15);
    ctx.lineTo(-17, -25);
    ctx.moveTo(8, -15);
    ctx.lineTo(17, -25);
    for (let i = 0; i < 3; i += 1) {
      const yy = -3 + i * 8;
      ctx.moveTo(-15, yy);
      ctx.lineTo(-28, yy + 8);
      ctx.moveTo(15, yy);
      ctx.lineTo(28, yy + 8);
    }
    ctx.stroke();

    ctx.fillStyle = "#21172a";
    ctx.beginPath();
    ctx.arc(-7, -7, 3, 0, Math.PI * 2);
    ctx.arc(7, -7, 3, 0, Math.PI * 2);
    ctx.fill();

    if (enemy.hp < enemy.maxHp) drawSmallHp(enemy.hp / enemy.maxHp, -16, -36, 32);
    ctx.restore();
  }

  function drawNightHeron(enemy) {
    const flap = Math.sin(state.time * 5) * 0.18;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.scale(1.05, 1.05);

    ctx.fillStyle = "rgba(20,30,35,0.18)";
    ctx.beginPath();
    ctx.ellipse(0, 64, 54, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.heronWing;
    ctx.beginPath();
    ctx.ellipse(-36, 12, 18, 60, -0.75 - flap, 0, Math.PI * 2);
    ctx.ellipse(36, 12, 18, 60, 0.75 + flap, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.heron;
    ctx.beginPath();
    ctx.ellipse(0, 16, 30, 48, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#d8dde2";
    ctx.beginPath();
    ctx.ellipse(0, 24, 18, 34, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.heron;
    ctx.beginPath();
    ctx.arc(0, -36, 19, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#eff4f7";
    ctx.beginPath();
    ctx.arc(-7, -39, 7, 0, Math.PI * 2);
    ctx.arc(7, -39, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#141820";
    ctx.beginPath();
    ctx.arc(-5, -39, 2.4, 0, Math.PI * 2);
    ctx.arc(5, -39, 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f0b33d";
    ctx.beginPath();
    ctx.moveTo(-8, -29);
    ctx.lineTo(10, -29);
    ctx.lineTo(0, -15);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#e49335";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-8, 56);
    ctx.lineTo(-14, 80);
    ctx.moveTo(8, 56);
    ctx.lineTo(14, 80);
    ctx.stroke();

    drawSmallHp(enemy.hp / enemy.maxHp, -48, -76, 96);
    ctx.restore();
  }

  function drawSmallHp(ratio, x, y, w) {
    roundedRect(x, y, w, 5, 3, "rgba(255,255,255,0.82)");
    roundedRect(x, y, w * clamp(ratio, 0, 1), 5, 3, colors.red);
  }

  function drawBullets() {
    const weapon = currentWeapon();
    ctx.lineCap = "round";
    for (const bullet of state.bullets) {
      ctx.strokeStyle = bullet.color;
      ctx.lineWidth = bullet.size;
      ctx.beginPath();
      if (bullet.type === "laser") {
        ctx.globalAlpha = 0.78;
        ctx.lineWidth = bullet.size + 4;
        ctx.strokeStyle = "rgba(180, 248, 255, 0.28)";
        ctx.moveTo(bullet.x, bullet.y);
        ctx.lineTo(bullet.x, 0);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.strokeStyle = bullet.color;
        ctx.lineWidth = bullet.size;
        ctx.moveTo(bullet.x, bullet.y);
        ctx.lineTo(bullet.x, 0);
      } else {
        ctx.moveTo(bullet.x, bullet.y + 12);
        ctx.lineTo(bullet.x - bullet.vx * 0.018, bullet.y - 12);
      }
      ctx.stroke();
    }
  }

  function drawSquad() {
    const total = Math.min(30, state.squad);
    const baseX = laneX(state.x);
    const baseY = state.height - 108;
    for (let i = total - 1; i >= 0; i -= 1) {
      const offset = formationOffset(i, total);
      drawHeroPenguin(baseX + offset.x, baseY + offset.y, 0.64);
    }
    if (state.squad > 30) {
      roundedRect(baseX - 36, baseY + 76, 72, 28, 8, "rgba(255,255,255,0.88)");
      ctx.fillStyle = colors.ink;
      ctx.font = "900 16px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`x${Math.floor(state.squad)}`, baseX, baseY + 90);
    }
  }

  function drawHeroPenguin(x, y, s) {
    ctx.fillStyle = "rgba(30,45,43,0.16)";
    ctx.beginPath();
    ctx.ellipse(x, y + 36 * s, 18 * s, 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.penguinBlack;
    ctx.beginPath();
    ctx.ellipse(x, y, 21 * s, 32 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.penguinBelly;
    ctx.beginPath();
    ctx.ellipse(x, y + 8 * s, 14 * s, 22 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x - 7 * s, y - 16 * s, 6 * s, 0, Math.PI * 2);
    ctx.arc(x + 7 * s, y - 16 * s, 6 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1d2128";
    ctx.beginPath();
    ctx.arc(x - 5 * s, y - 15 * s, 2.2 * s, 0, Math.PI * 2);
    ctx.arc(x + 5 * s, y - 15 * s, 2.2 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.beak;
    ctx.beginPath();
    ctx.moveTo(x - 7 * s, y - 8 * s);
    ctx.lineTo(x + 8 * s, y - 8 * s);
    ctx.lineTo(x, y + 2 * s);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#6b4b32";
    ctx.lineWidth = 4 * s;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + 1 * s, y - 1 * s);
    ctx.lineTo(x + 27 * s, y - 15 * s);
    ctx.stroke();

    ctx.fillStyle = "#e49335";
    ctx.beginPath();
    ctx.ellipse(x - 8 * s, y + 34 * s, 8 * s, 4 * s, -0.18, 0, Math.PI * 2);
    ctx.ellipse(x + 8 * s, y + 34 * s, 8 * s, 4 * s, 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawWeaponBadge() {
    const weapon = currentWeapon();
    const x = state.width * 0.5;
    const y = state.height - 44;
    roundedRect(x - 76, y - 16, 152, 32, 8, "rgba(255,255,255,0.82)");
    ctx.fillStyle = weapon.color;
    ctx.font = "900 15px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const suffix = state.weaponTimer > 0 ? ` ${Math.ceil(state.weaponTimer)}s` : "";
    ctx.fillText(`${weapon.name}${suffix}`, x, y);
  }

  function drawSparks() {
    for (const spark of state.sparks) {
      const alpha = clamp(spark.life / spark.max, 0, 1);
      ctx.globalAlpha = alpha;
      if (spark.text) {
        ctx.fillStyle = spark.color;
        ctx.font = "900 28px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(spark.text, spark.x, spark.y);
      } else {
        ctx.fillStyle = spark.color;
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, spark.r * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function pointerToTargetX(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    state.targetX = clamp((x / rect.width - 0.5) * 2.55, -1.02, 1.02);
    if (event.pointerType === "mouse") state.x += (state.targetX - state.x) * 0.72;
  }

  function bindInput() {
    canvas.addEventListener("pointerdown", (event) => {
      if (state.status !== "playing") return;
      state.drag = true;
      canvas.setPointerCapture(event.pointerId);
      pointerToTargetX(event);
    });
    canvas.addEventListener("pointermove", (event) => {
      if (state.drag && state.status === "playing") pointerToTargetX(event);
    });
    canvas.addEventListener("pointerup", () => {
      state.drag = false;
    });
    canvas.addEventListener("pointercancel", () => {
      state.drag = false;
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" || event.key.toLowerCase() === "p") togglePause();
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") state.targetX = clamp(state.targetX - 0.34, -1.02, 1.02);
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") state.targetX = clamp(state.targetX + 0.34, -1.02, 1.02);
      if (event.key === " " && state.status !== "playing") resetGame();
    });
  }

  function roundedRect(x, y, w, h, r, fill) {
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

  function loop(now) {
    const dt = Math.min(0.033, (now - state.last) / 1000 || 0);
    state.last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  resize();
  bindInput();
  primaryButton.addEventListener("click", resetGame);
  pauseButton.addEventListener("click", togglePause);
  window.addEventListener("resize", resize);
  window.__shooterDebug = { state, step: update };
  state.last = performance.now();
  requestAnimationFrame(loop);
})();

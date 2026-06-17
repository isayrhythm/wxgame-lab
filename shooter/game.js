(() => {
  const ui = window.WxGameUi.createGameUi();
  const { canvas, ctx, panel, primaryButton, pauseButton } = ui;
  const monsterLabel = document.getElementById("monsterCount");
  const squadLabel = document.getElementById("squadCount");

  const weapons = {
    rifle: { name: "Rifle", icon: "R", color: "#ffbf2f", damage: 7, delay: 0.17, shots: 1, spread: 0, speed: 640, size: 5 },
    shotgun: { name: "Shotgun", icon: "S", color: "#ff9f43", damage: 5, delay: 0.26, shots: 5, spread: 175, speed: 570, size: 4 },
    laser: { name: "Laser", icon: "L", color: "#57e5ff", damage: 0.25, delay: 0.018, shots: 1, spread: 0, speed: 0, size: 5 },
    rocket: { name: "Rocket", icon: "B", color: "#ff5d6f", damage: 32, delay: 0.4, shots: 1, spread: 0, speed: 480, size: 8, splash: 50 },
    cat: { name: "Yellow Cat", icon: "CAT", color: "#ffd34d", damage: 11, delay: 0.07, shots: 3, spread: 62, speed: 760, size: 7, pierce: 1 },
  };

  const catSupplyImage = new Image();
  catSupplyImage.src = "./assets/winking-cat.jpg";

  const heronBossImage = new Image();
  heronBossImage.src = "./assets/night-heron-boss.png";

  const levelConfigs = [
    { name: "云端虫潮", miniBoss: "毒虫王", boss: "夜鹭", hpScale: 1, countScale: 1, rewardPool: ["shotgun", "laser", "cat"] },
    { name: "白塔虫巢", miniBoss: "甲壳虫", boss: "机械夜鹭", hpScale: 1.35, countScale: 1.18, rewardPool: ["laser", "rocket", "cat"] },
    { name: "高空围猎", miniBoss: "飞虫队长", boss: "AI 夜鹭群", hpScale: 1.72, countScale: 1.34, rewardPool: ["shotgun", "rocket", "cat"] },
    { name: "终末云庭", miniBoss: "夜鹭幼体", boss: "夜鹭女王", hpScale: 2.1, countScale: 1.48, rewardPool: ["laser", "rocket", "cat"] },
  ];

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
    levelIndex: 0,
    levelStep: 0,
    bossRank: "",
    bossKind: "",
    wave: 0,
    cleared: 0,
    waveHp: 0,
    scroll: 0,
    runSpeed: 134,
    fireTimer: 0,
    weaponKey: "rifle",
    weaponTimer: 0,
    catTimer: 0,
    damageBoost: 0,
    fireRateBoost: 0,
    bulletSizeBoost: 0,
    pierceBonus: 0,
    formationBonus: 0,
    rewardIndex: 0,
    rewardPrimed: false,
    primedRewardIndex: 0,
    kills: 0,
    bossDamage: 0,
    combo: 0,
    maxCombo: 0,
    score: 0,
    scoreStartedAt: 0,
    bullets: [],
    enemies: [],
    gates: [],
    supplies: [],
    sparks: [],
  };

  window.__shooterState = state;

  const colors = {
    ink: "#172425",
    road: "#f6f4ee",
    roadSide: "#b9aa99",
    grassA: "#ffffff",
    grassB: "#dff5ff",
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
    const base = state.catTimer > 0 ? weapons.cat : weapons[state.weaponKey] || weapons.rifle;
    return {
      ...base,
      damage: base.damage * (1 + state.damageBoost),
      delay: Math.max(0.025, base.delay * (1 - state.fireRateBoost)),
      size: base.size * (1 + state.bulletSizeBoost),
      pierce: (base.pierce || 0) + state.pierceBonus,
    };
  }

  function currentLevel() {
    return levelConfigs[Math.min(state.levelIndex, levelConfigs.length - 1)];
  }

  function resetGame() {
    state.status = "playing";
    state.phase = "combat";
    state.time = 0;
    state.last = performance.now();
    state.x = 0;
    state.targetX = 0;
    state.squad = 2;
    state.levelIndex = 0;
    state.levelStep = 0;
    state.bossRank = "";
    state.bossKind = "";
    state.wave = 0;
    state.cleared = 0;
    state.waveHp = 0;
    state.scroll = 0;
    state.runSpeed = 134;
    state.fireTimer = 0;
    state.weaponKey = "rifle";
    state.weaponTimer = 0;
    state.catTimer = 0;
    state.damageBoost = 0;
    state.fireRateBoost = 0;
    state.bulletSizeBoost = 0;
    state.pierceBonus = 0;
    state.formationBonus = 0;
    state.rewardIndex = 0;
    state.rewardPrimed = false;
    state.primedRewardIndex = 0;
    state.kills = 0;
    state.bossDamage = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.score = 0;
    state.scoreStartedAt = state.time;
    state.bullets = [];
    state.enemies = [];
    state.gates = [];
    state.supplies = [];
    state.sparks = [];
    spawnBugWave();
    ui.hideOverlay();
    pauseButton.textContent = "Ⅱ";
    updateHud();
  }

  function updateHud() {
    monsterLabel.textContent = String(Math.max(0, Math.ceil(state.waveHp)));
    squadLabel.textContent = String(Math.max(0, Math.floor(state.squad)));
  }

  function spawnBugWave() {
    const level = currentLevel();
    const isRush = state.levelStep >= 2;
    state.phase = "combat";
    state.wave += 1;
    state.bossRank = "";
    state.bossKind = "";
    state.rewardPrimed = false;
    state.primedRewardIndex = 0;
    state.enemies = [];
    state.gates = [];
    state.supplies = [];

    const cols = 12;
    const count = Math.min(168, Math.floor((72 + state.levelIndex * 22 + (isRush ? 32 : 0)) * level.countScale));
    const hpEach = Math.round((7 + state.levelIndex * 4 + (isRush ? 4 : 0)) * level.hpScale);
    const spread = Math.min(344, state.width * 0.9);
    state.waveHp = 0;

    for (let i = 0; i < count; i += 1) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const usedCols = Math.min(cols, count - row * cols);
      const elite = isRush && i % 17 === 0;
      const hp = elite ? hpEach * 2.2 : hpEach;
      state.waveHp += hp;
      state.enemies.push({
        type: "bug",
        x: state.width * 0.5 + (col - (usedCols - 1) / 2) * (spread / Math.max(1, cols - 1)) + (Math.random() - 0.5) * 16,
        y: (isRush ? 18 : 6) - row * 22 - Math.random() * 13,
        hp,
        maxHp: hp,
        phase: Math.random() * Math.PI * 2,
        kind: (i + state.wave) % 5,
        elite,
      });
    }
    addText(state.width * 0.5, 92, `${level.name} - 虫潮 ${isRush ? "II" : "I"}`, colors.violet);
  }

  function spawnMiniBoss() {
    const level = currentLevel();
    const hp = Math.round((560 + state.levelIndex * 230 + state.squad * 10) * level.hpScale);
    state.phase = "boss";
    state.bossRank = "mini";
    state.bossKind = level.miniBoss;
    state.rewardPrimed = false;
    state.primedRewardIndex = 0;
    state.enemies = [{
      type: "miniBoss",
      bossKind: level.miniBoss,
      x: state.width * 0.5,
      y: 58,
      hp,
      maxHp: hp,
      phase: 0,
      kind: state.levelIndex % 5,
    }];
    state.gates = [];
    state.supplies = [];
    state.waveHp = hp;
    addText(state.width * 0.5, 92, level.miniBoss, colors.red);
  }

  function spawnBoss() {
    const level = currentLevel();
    const hp = Math.round((1700 + state.levelIndex * 620 + state.squad * 24) * level.hpScale);
    state.phase = "boss";
    state.bossRank = "big";
    state.bossKind = level.boss;
    state.rewardPrimed = false;
    state.primedRewardIndex = 0;
    state.enemies = [{
      type: "heron",
      bossKind: level.boss,
      x: state.width * 0.5,
      y: 88,
      hp,
      maxHp: hp,
      phase: 0,
      bossStage: 0,
      facing: 1,
      lastX: state.width * 0.5,
    }];
    state.gates = [];
    state.supplies = [];
    state.waveHp = state.enemies[0].hp;
    addText(state.width * 0.5, 92, level.boss, colors.red);
  }

  function spawnRewardSegment() {
    const usePrimed = state.rewardPrimed && state.primedRewardIndex === state.rewardIndex + 1;
    const level = currentLevel();
    state.phase = "reward";
    if (usePrimed) state.rewardIndex = state.primedRewardIndex;
    else state.rewardIndex += 1;
    state.enemies = [];
    state.bullets = [];
    state.waveHp = 0;
    state.runSpeed = 420 + state.levelIndex * 18;

    if (usePrimed) {
      keepRewardAhead();
      state.rewardPrimed = false;
      state.primedRewardIndex = 0;
      return;
    }

    state.rewardPrimed = false;
    state.primedRewardIndex = 0;
    const y = rewardStartY();
    buildRewardRun(level, state.rewardIndex, y, true);
  }

  function primeRewardSegment() {
    if (state.rewardPrimed || state.phase === "reward") return;
    const level = currentLevel();
    const rewardIndex = state.rewardIndex + 1;
    const y = rewardStartY();
    buildRewardRun(level, rewardIndex, y, false);
    state.rewardPrimed = true;
    state.primedRewardIndex = rewardIndex;
  }

  function buildRewardRun(level, rewardIndex, y, announce) {
    state.gates = [];
    state.supplies = [];

    if (rewardIndex % 2 === 1) {
      const rows = 2;
      for (let row = 0; row < rows; row += 1) {
        state.gates.push(makeGate(y - row * 190, ...gateChoices(rewardIndex + row)));
      }
      if (announce) addText(state.width * 0.5, 108, "Gate Rush", colors.green);
    } else {
      const pool = level.rewardPool;
      for (let row = 0; row < 3; row += 1) {
        const rowY = y - row * 170;
        if (row === 1) {
          state.gates.push(makeGate(rowY, ...gateChoices(rewardIndex + row)));
          continue;
        }
        const left = pool[(rewardIndex + row) % pool.length];
        const right = pool[(rewardIndex + row + 1) % pool.length];
        state.supplies.push(makeSupply(rowY, -0.46, left));
        state.supplies.push(makeSupply(rowY, 0.46, right));
      }
      if (announce) addText(state.width * 0.5, 108, "Supply Run", colors.yellow);
    }
  }

  function gateChoices(index) {
    return [
      ["x2", "mul", 2, "+5", "add", 5],
      ["+8", "add", 8, "x3", "mul", 3],
      ["-4", "add", -4, "+14", "add", 14],
      ["+10", "add", 10, "x2", "mul", 2],
    ][index % 4];
  }

  function rewardStartY() {
    const farWorldY = -Math.max(280, Math.min(420, state.height * 0.5));
    return farWorldY - state.scroll;
  }

  function rewardMaxY() {
    return Math.max(
      ...state.gates.map((gate) => worldY(gate.y)),
      ...state.supplies.map((supply) => worldY(supply.y)),
      -999
    );
  }

  function rewardMinY() {
    return Math.min(
      ...state.gates.map((gate) => worldY(gate.y)),
      ...state.supplies.map((supply) => worldY(supply.y)),
      999
    );
  }

  function shiftRewards(delta) {
    for (const gate of state.gates) gate.y += delta;
    for (const supply of state.supplies) supply.y += delta;
  }

  function keepRewardAhead() {
    const maxY = rewardMaxY();
    const playerY = state.height - 120;
    if (maxY > playerY - 140) shiftRewards(playerY - 140 - maxY);
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

    if (state.catTimer > 0) {
      state.catTimer -= dt;
      if (state.catTimer <= 0) addText(state.width * 0.5, state.height - 172, "企鹅归队", colors.yellow);
    }

    if (state.fireTimer <= 0) {
      fire();
      state.fireTimer = currentWeapon().delay;
    }

    updateEnemies(dt);
    updateBullets(dt);
    maybePrimeRewardSegment();
    updateGates();
    updateSupplies();
    updateRewardFlow();
    updateSparks(dt);
    updateHud();
  }

  function fire() {
    const weapon = currentWeapon();
    const shooters = Math.min((state.catTimer > 0 ? 34 : 24) + state.formationBonus, state.squad);
    const baseY = state.height - 112;
    const step = Math.max(1, Math.ceil(shooters / Math.min(shooters, 10)));

    for (let i = 0; i < shooters; i += step) {
      const offset = formationOffset(i, shooters);
      for (let shot = 0; shot < weapon.shots; shot += 1) {
        const spreadIndex = shot - (weapon.shots - 1) / 2;
        const isLaser = weapon.name === "Laser";
        state.bullets.push({
          type: state.catTimer > 0 ? "cat" : isLaser ? "laser" : "bullet",
          x: laneX(state.x) + offset.x,
          y: baseY + offset.y - 30,
          vx: spreadIndex * weapon.spread,
          vy: isLaser ? 0 : -weapon.speed,
          damage: weapon.damage + (isLaser ? Math.min(3, state.squad * 0.05) : Math.min(13, state.squad * 0.2)),
          color: weapon.color,
          size: weapon.size,
          splash: weapon.splash || 0,
          pierce: weapon.pierce || 0,
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
        enemy.y += (48 + state.wave * 3.2 + state.levelIndex * 4.2 + (enemy.elite ? 12 : 0)) * dt;
        enemy.x += Math.sin(state.time * 3.1 + enemy.phase) * (enemy.elite ? 13 : 8) * dt;
      } else if (enemy.type === "miniBoss") {
        enemy.phase += dt;
        enemy.y += (28 + state.levelIndex * 1.8) * dt;
        enemy.x = state.width * 0.5 + Math.sin(enemy.phase * 2.5) * Math.min(118, state.width * 0.3);
      } else {
        enemy.phase += dt;
        const ratio = enemy.hp / enemy.maxHp;
        enemy.y += (20 + state.levelIndex * 1.6 + (ratio < 0.4 ? 10 : 0) + enemy.bossStage * 2.8) * dt;
        const nextX = state.width * 0.5 + Math.sin(enemy.phase * (1.8 + state.levelIndex * 0.18 + enemy.bossStage * 0.22)) * Math.min(108 + enemy.bossStage * 12, state.width * 0.34);
        if (Math.abs(nextX - enemy.x) > 0.4) enemy.facing = nextX < enemy.x ? 1 : -1;
        enemy.lastX = enemy.x;
        enemy.x = nextX;
      }
    }

    handleEnemyBreakthroughs(attackLine, dt);

    if (state.enemies.length === 0 && state.status === "playing") {
      if (state.phase === "boss") {
        if (state.bossRank === "mini") {
          state.levelStep = 2;
          spawnRewardSegment();
        } else {
          finishLevel();
        }
        return;
      }
      state.cleared += 1;
      state.runSpeed = Math.min(184, state.runSpeed + 8);
      if (state.levelStep === 0) state.levelStep = 1;
      else if (state.levelStep === 2) state.levelStep = 3;
      spawnRewardSegment();
    }
  }

  function handleEnemyBreakthroughs(attackLine, dt) {
    const breached = state.enemies.filter((enemy) => enemy.y > attackLine);
    if (breached.length === 0) return;

    let loss = 0;
    const escaped = new Set();

    for (const enemy of breached) {
      if (enemy.type === "bug") {
        loss += enemy.elite ? 2 : 1;
        escaped.add(enemy);
        addSpark(enemy.x, attackLine, colors.red, enemy.elite ? 8 : 4);
      } else if (enemy.type === "miniBoss") {
        loss += 8 + state.levelIndex * 2;
        escaped.add(enemy);
        addSpark(enemy.x, attackLine, colors.red, 18);
      } else if (enemy.type === "heron") {
        const drain = (6 + state.levelIndex * 1.5 + (enemy.bossStage || 0) * 1.5) * dt;
        loss += drain;
        enemy.y = Math.min(enemy.y, attackLine + 4);
        enemy.bumpTextTimer = (enemy.bumpTextTimer || 0) - dt;
        if (enemy.bumpTextTimer <= 0) {
          addSpark(enemy.x, attackLine, colors.red, 12);
          addText(state.width * 0.5, attackLine - 22, `-${Math.ceil(drain * 8)}`, colors.red);
          enemy.bumpTextTimer = 0.45;
        }
      }
    }

    if (loss <= 0) return;

    state.squad -= loss;
    if (escaped.size > 0) {
      const escapedHp = [...escaped].reduce((sum, enemy) => sum + enemy.hp, 0);
      state.waveHp = Math.max(0, state.waveHp - escapedHp);
      state.enemies = state.enemies.filter((enemy) => !escaped.has(enemy));
    }

    const visibleLoss = Math.max(1, Math.ceil(loss));
    if (!breached.some((enemy) => enemy.type === "heron")) {
      addText(state.width * 0.5, attackLine - 18, `-${visibleLoss}`, colors.red);
    }

    if (state.squad <= 0) endGame(false, "Squad Down");
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

      if (bullet.pierce > 0) bullet.pierce -= 1;
      else bullet.life = -1;
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
      const hitRadius = enemy.type === "heron" ? Math.max(56, radius) : enemy.type === "miniBoss" ? Math.max(42, radius) : radius;
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
      const halfWidth = enemy.type === "heron" ? 44 : enemy.type === "miniBoss" ? 34 : 17;
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
    if (enemy.type === "heron" || enemy.type === "miniBoss") state.bossDamage += actual;
    state.score += Math.ceil(actual * (enemy.type === "bug" ? 0.8 : 1.4));
    if (enemy.type === "heron" && enemy.hp > 0) updateBossStage(enemy);
    if (enemy.hp <= 0) {
      state.kills += 1;
      state.combo += 1;
      state.maxCombo = Math.max(state.maxCombo, state.combo);
      state.score += enemy.type === "bug" ? (enemy.elite ? 32 : 14) : enemy.type === "miniBoss" ? 500 : 1800;
      addSpark(enemy.x, enemy.y, colors.yellow, enemy.type === "heron" ? 34 : enemy.type === "miniBoss" ? 22 : 6);
    }
  }

  function updateBossStage(enemy) {
    const ratio = enemy.hp / enemy.maxHp;
    const nextStage = ratio <= 0.3 ? 2 : ratio <= 0.7 ? 1 : 0;
    for (let stage = (enemy.bossStage || 0) + 1; stage <= nextStage; stage += 1) {
      enemy.bossStage = stage;
      addText(state.width * 0.5, 118, "别的鸟做得到吗？", colors.red);
      addSpark(enemy.x, enemy.y, colors.red, 18 + stage * 8);
      spawnBossMinions(enemy, stage);
    }
  }

  function spawnBossMinions(enemy, stage) {
    const amount = 8 + stage * 6;
    const hp = Math.round((8 + state.levelIndex * 3 + stage * 3) * currentLevel().hpScale);
    const spread = Math.min(320, state.width * 0.84);
    for (let i = 0; i < amount; i += 1) {
      const t = amount === 1 ? 0.5 : i / (amount - 1);
      state.enemies.push({
        type: "bug",
        x: state.width * 0.5 - spread / 2 + spread * t + Math.sin(i * 1.7) * 9,
        y: Math.max(-20, enemy.y + 44 + Math.floor(i / 8) * 30),
        hp,
        maxHp: hp,
        phase: Math.random() * Math.PI * 2,
        kind: (i + stage + state.levelIndex) % 5,
        elite: stage >= 3 && i % 4 === 0,
      });
      state.waveHp += hp;
    }
  }

  function maybePrimeRewardSegment() {
    if (state.status !== "playing" || state.rewardPrimed || state.phase === "reward") return;

    if (state.phase === "combat") {
      const fewEnemiesLeft = state.enemies.length <= Math.max(8, Math.ceil(state.wave * 0.35));
      const lowWaveHp = state.waveHp <= 42 + state.levelIndex * 18;
      if (fewEnemiesLeft || lowWaveHp) primeRewardSegment();
      return;
    }

    if (state.phase === "boss" && state.bossRank === "mini") {
      const miniBoss = state.enemies.find((enemy) => enemy.type === "miniBoss");
      if (miniBoss && miniBoss.hp / miniBoss.maxHp <= 0.24) primeRewardSegment();
    }
  }

  function updateGates() {
    if (state.phase !== "reward") return;
    const playerY = state.height - 120;
    for (const gate of state.gates) {
      if (gate.used) continue;
      const gy = worldY(gate.y);
      if (Math.abs(gy - playerY) < 54) {
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
    if (state.phase !== "reward") return;
    const playerY = state.height - 120;
    for (const supply of state.supplies) {
      if (supply.taken) continue;
      const sy = worldY(supply.y);
      if (Math.abs(sy - playerY) < 58 && Math.abs(supply.x - state.x) < 0.48) {
        supply.taken = true;
        if (supply.weaponKey === "cat") {
          state.catTimer = 8;
          addText(laneX(state.x), playerY - 78, "黄色耄耋猫", colors.yellow);
          addSpark(laneX(state.x), playerY - 30, colors.yellow, 26);
          continue;
        }
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
    const minY = rewardMinY();
    const gatesDone = state.gates.length > 0 && state.supplies.length === 0 && state.gates.every((gate) => gate.used);
    if (gatesDone || minY > state.height - 160) {
      state.runSpeed = 150 + state.levelIndex * 8;
      if (state.levelStep === 1) spawnMiniBoss();
      else if (state.levelStep >= 3) spawnBoss();
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

  function finishLevel() {
    const level = currentLevel();
    const bonus = 700 + state.levelIndex * 350 + Math.floor(state.squad) * 35;
    state.score += bonus;
    state.levelIndex += 1;

    if (state.levelIndex >= levelConfigs.length) {
      endGame(true, "通关完成");
      return;
    }

    state.status = "levelClear";
    pauseButton.textContent = "Ⅱ";
    updateHud();
    const choices = levelUpgradeChoices();
    ui.showOverlay();
    ui.setPanel(`
      <p class="kicker">Level Clear</p>
      <h1>${level.name}</h1>
      <p class="hint">奖励 +${bonus} 分。选一个升级进入：${currentLevel().name}</p>
      <div class="upgrade-grid">
        ${choices.map((choice) => `
          <button class="upgrade-card" type="button" data-upgrade="${choice.id}">
            <span>${choice.icon}</span>
            <strong>${choice.name}</strong>
            <small>${choice.desc}</small>
          </button>
        `).join("")}
      </div>
      <button id="restartButton" class="secondary-button" type="button">重新开始</button>
    `);
    panel.querySelectorAll(".upgrade-card").forEach((button) => {
      button.addEventListener("click", () => {
        const choice = choices.find((item) => item.id === button.dataset.upgrade);
        if (choice) applyLevelUpgrade(choice.id);
        startNextLevel();
      });
    });
    panel.querySelector("#restartButton").addEventListener("click", resetGame);
  }

  function levelUpgradeChoices() {
    const pool = [
      { id: "fireRate", icon: "⚡", name: "攻速 +20%", desc: "所有武器射得更快" },
      { id: "damage", icon: "✦", name: "火力 +18%", desc: "子弹和激光伤害提高" },
      { id: "bigBullet", icon: "●", name: "子弹变大", desc: "命中更稳，哈字更显眼" },
      { id: "pierce", icon: "➜", name: "穿透 +1", desc: "普通弹和哈字多穿一个敌人" },
      { id: "squad", icon: "+", name: "企鹅 +8", desc: "队伍人数直接增加" },
      { id: "formation", icon: "▦", name: "阵型扩大", desc: "更多单位能同时开火" },
      { id: "cat", icon: "猫", name: "猫猫开局", desc: "下一关开场变身 8 秒" },
    ];
    const offset = (state.levelIndex * 2 + state.kills) % pool.length;
    return [0, 2, 4].map((n) => pool[(offset + n) % pool.length]);
  }

  function applyLevelUpgrade(id) {
    if (id === "fireRate") state.fireRateBoost = Math.min(0.55, state.fireRateBoost + 0.2);
    if (id === "damage") state.damageBoost = Math.min(1.2, state.damageBoost + 0.18);
    if (id === "bigBullet") state.bulletSizeBoost = Math.min(0.9, state.bulletSizeBoost + 0.25);
    if (id === "pierce") state.pierceBonus = Math.min(3, state.pierceBonus + 1);
    if (id === "squad") state.squad = clamp(state.squad + 8, 1, 160);
    if (id === "formation") state.formationBonus = Math.min(12, state.formationBonus + 4);
    if (id === "cat") state.catTimer = 8;
    state.score += 260;
  }

  function startNextLevel() {
    state.status = "playing";
    state.phase = "combat";
    state.levelStep = 0;
    state.bossRank = "";
    state.bossKind = "";
    state.waveHp = 0;
    state.scroll = 0;
    state.runSpeed = 134 + state.levelIndex * 8;
    state.fireTimer = 0;
    state.weaponKey = "rifle";
    state.weaponTimer = 0;
    if (state.catTimer <= 0) state.catTimer = 0;
    state.rewardIndex = 0;
    state.rewardPrimed = false;
    state.primedRewardIndex = 0;
    state.bullets = [];
    state.enemies = [];
    state.gates = [];
    state.supplies = [];
    state.sparks = [];
    ui.hideOverlay();
    spawnBugWave();
    updateHud();
  }

  function finalScore(won) {
    const elapsed = Math.max(1, state.time - state.scoreStartedAt);
    const survival = Math.max(0, Math.floor(state.squad)) * 100;
    const combo = state.maxCombo * 8;
    const speed = won ? Math.max(0, Math.floor((360 - elapsed) * 3)) : 0;
    const levelFactor = 1 + Math.min(state.levelIndex, levelConfigs.length - 1) * 0.22;
    return Math.max(0, Math.floor((state.score + survival + combo + speed) * levelFactor));
  }

  function scoreGrade(score) {
    if (score >= 50000) return "S";
    if (score >= 28000) return "A";
    if (score >= 14000) return "B";
    return "C";
  }

  function loadLeaderboard() {
    try {
      return JSON.parse(localStorage.getItem("wxgame-shooter-leaderboard") || "[]");
    } catch {
      return [];
    }
  }

  function saveLeaderboard(entry) {
    const board = [...loadLeaderboard(), entry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    localStorage.setItem("wxgame-shooter-leaderboard", JSON.stringify(board));
    return board;
  }

  function leaderboardHtml(board) {
    if (board.length === 0) return "<p class=\"hint\">暂无本地记录。</p>";
    return `<ol class="leaderboard">${board.map((item) => `
      <li><span>${item.grade}</span><strong>${item.score}</strong><small>第 ${item.level} 关 · ${item.kills} 杀</small></li>
    `).join("")}</ol>`;
  }

  function togglePause() {
    if (state.status === "ready" || state.status === "levelClear") return;
    if (state.status === "paused") {
      state.status = "playing";
      state.last = performance.now();
      ui.hideOverlay();
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
    ui.showOverlay();
    ui.setPanel(`
      <p class="kicker">Paused</p>
      <h1>暂停</h1>
      <p class="hint">第 ${state.levelIndex + 1} 关 ${currentLevel().name}，当前武器 ${currentWeapon().name}，企鹅小队 ${Math.max(0, Math.floor(state.squad))} 只。</p>
      <button id="resumeButton" type="button">继续</button>
      <button id="restartButton" class="secondary-button" type="button">重新开始</button>
      <a class="panel-link" href="../">返回大厅</a>
    `);
    panel.querySelector("#resumeButton").addEventListener("click", togglePause);
    panel.querySelector("#restartButton").addEventListener("click", resetGame);
  }

  function endGame(won, title) {
    state.status = won ? "won" : "lost";
    pauseButton.textContent = "Ⅱ";
    updateHud();
    const score = finalScore(won);
    const grade = scoreGrade(score);
    const entry = {
      score,
      grade,
      level: Math.max(1, Math.min(state.levelIndex + (won ? 1 : 0), levelConfigs.length)),
      kills: state.kills,
      combo: state.maxCombo,
      at: Date.now(),
    };
    const board = saveLeaderboard(entry);
    ui.showOverlay();
    ui.setPanel(`
      <p class="kicker">${won ? "Victory" : "Game Over"}</p>
      <h1>${title}</h1>
      <p class="hint">评级 ${grade} · 总分 ${score} · 击杀 ${state.kills} · 最高连击 ${state.maxCombo} · 到达第 ${entry.level} 关</p>
      ${leaderboardHtml(board)}
      <button id="primaryButton" type="button">${won ? "再打一局" : "重新开始"}</button>
    `);
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
    g.addColorStop(0, "#2460a7");
    g.addColorStop(0.42, "#5fb3ec");
    g.addColorStop(0.72, "#d9f4ff");
    g.addColorStop(1, "#ffffff");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, state.width, state.height);

    drawSkyRays();
    drawSkyClouds(state.height * 0.14, 0.82, 0.78);
    drawTempleRuins();
    drawSkyClouds(state.height * 0.7, 1.15, 0.62);

    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, state.height * 0.8, state.width, state.height * 0.2);
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
      const x = ((i * 97 + state.scroll * 0.08) % (w + 160)) - 80;
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

  function drawSkyRays() {
    const w = state.width;
    const h = state.height;
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#ffffff";
    ctx.translate(w * 0.72, h * 0.04);
    for (let i = 0; i < 4; i += 1) {
      ctx.rotate(0.15);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w * 0.12, h);
      ctx.lineTo(w * 0.23, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSkyClouds(baseY, scale, alpha) {
    const w = state.width;
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let i = 0; i < 12; i += 1) {
      const x = ((i * 91 - state.scroll * 0.06 * scale) % (w + 180)) - 90;
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

  function drawTempleRuins() {
    const w = state.width;
    const h = state.height;
    ctx.save();
    ctx.globalAlpha = 0.22;
    for (let i = 0; i < 9; i += 1) {
      const x = w * (-0.08 + i * 0.145);
      const y = h * (0.22 + (i % 3) * 0.05);
      drawTempleColumn(x, y, 0.28 + (i % 4) * 0.06);
    }
    ctx.restore();

    const specs = [
      [-0.05, 0.34, 0.56],
      [0.18, 0.41, 0.44],
      [0.36, 0.32, 0.78],
      [0.61, 0.42, 0.5],
      [0.79, 0.35, 0.66],
      [1.03, 0.28, 0.86],
    ];
    for (const [nx, ny, s] of specs) drawTempleColumn(w * nx, h * ny, s);
    drawTempleBridge(w * 0.02, h * 0.51, w * 0.45, h * 0.49);
    drawTempleBridge(w * 0.56, h * 0.53, w * 0.97, h * 0.5);

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

  function drawTempleColumn(x, y, s) {
    const h = state.height;
    const colW = 20 * s;
    const colH = h * 0.42 * s;
    ctx.save();
    ctx.globalAlpha = 0.42 + 0.28 * s;
    roundedRect(x - colW / 2, y, colW, colH, 4 * s, "#f5e5d4");
    ctx.fillStyle = "#fff6e8";
    ctx.fillRect(x - colW * 0.18, y + 8 * s, colW * 0.36, colH - 16 * s);
    ctx.fillStyle = "rgba(178, 139, 105, 0.22)";
    for (let i = 0; i < 5; i += 1) {
      ctx.fillRect(x - colW * 0.42 + i * colW * 0.2, y + 10 * s, colW * 0.045, colH - 20 * s);
    }
    roundedRect(x - colW * 0.9, y - 12 * s, colW * 1.8, 12 * s, 4 * s, "#fff0d7");
    roundedRect(x - colW * 0.65, y - 25 * s, colW * 1.3, 10 * s, 4 * s, "#f8d8b7");
    roundedRect(x - colW * 0.75, y + colH, colW * 1.5, 12 * s, 4 * s, "#d7b89f");
    ctx.restore();
  }

  function drawTempleBridge(x1, y1, x2, y2) {
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

  function drawRoad() {
    const center = state.width * 0.5;
    const topW = Math.min(92, state.width * 0.24);
    const botW = Math.min(238, state.width * 0.64);
    const side = ctx.createLinearGradient(0, 80, 0, state.height);
    side.addColorStop(0, "#d6cabc");
    side.addColorStop(1, "#83766b");
    ctx.fillStyle = side;
    ctx.beginPath();
    ctx.moveTo(center - topW, 80);
    ctx.lineTo(center + topW, 80);
    ctx.lineTo(center + botW, state.height + 20);
    ctx.lineTo(center - botW, state.height + 20);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#6f5c55";
    ctx.beginPath();
    ctx.moveTo(center - botW, state.height + 20);
    ctx.lineTo(center - botW + 16, state.height + 20);
    ctx.lineTo(center - topW + 10, 80);
    ctx.lineTo(center - topW, 80);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(center + botW, state.height + 20);
    ctx.lineTo(center + botW - 16, state.height + 20);
    ctx.lineTo(center + topW - 10, 80);
    ctx.lineTo(center + topW, 80);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const top = ctx.createLinearGradient(0, 80, 0, state.height);
    top.addColorStop(0, "#ffffff");
    top.addColorStop(0.58, colors.road);
    top.addColorStop(1, "#ded8cf");
    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.moveTo(center - topW + 10, 80);
    ctx.lineTo(center + topW - 10, 80);
    ctx.lineTo(center + botW - 16, state.height + 20);
    ctx.lineTo(center - botW + 16, state.height + 20);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(center - topW + 10, 80);
    ctx.lineTo(center - botW + 16, state.height + 20);
    ctx.moveTo(center + topW - 10, 80);
    ctx.lineTo(center + botW - 16, state.height + 20);
    ctx.stroke();

    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = "#bdb1a5";
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i += 1) {
      const t = i / 7;
      const y = 100 + (state.height - 110) * t;
      const half = topW + (botW - topW) * t;
      ctx.beginPath();
      ctx.moveTo(center - half + 18, y);
      ctx.lineTo(center + half - 18, y);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = "#9d745e";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(center - botW * 0.34, state.height + 20);
    ctx.lineTo(center - topW * 0.28, 86);
    ctx.moveTo(center + botW * 0.34, state.height + 20);
    ctx.lineTo(center + topW * 0.28, 86);
    ctx.stroke();
    ctx.restore();
  }

  function drawGates() {
    for (const gate of state.gates) {
      const y = worldY(gate.y);
      if (y < -80 || y > state.height + 80) continue;
      drawGate(gate, y);
    }
  }

  function drawGate(gate, y) {
    const used = gate.used;
    const h = 76;
    const left = gate.left;
    const right = gate.right;
    const leftX = laneX(left.x);
    const rightX = laneX(right.x);
    const halfWidth = Math.min(214, state.width * 0.46);
    const leftEdge = state.width * 0.5 - halfWidth;
    const rightEdge = state.width * 0.5 + halfWidth;
    const centerX = (leftX + rightX) / 2;
    const leftColor = gateColor(left);
    const rightColor = gateColor(right);
    ctx.save();

    ctx.globalAlpha = used ? 0.22 : 1;
    drawGatePanel(leftEdge + 7, centerX - 6, y, h, leftColor, left.label, leftX, used);
    drawGatePanel(centerX + 6, rightEdge - 7, y, h, rightColor, right.label, rightX, used);

    ctx.shadowBlur = used ? 0 : 14;
    drawGatePillar(leftEdge, y, h, leftColor);
    drawGatePillar(centerX, y, h, "#eaf9ff");
    drawGatePillar(rightEdge, y, h, rightColor);

    ctx.save();
    ctx.globalAlpha = used ? 0.12 : 0.32;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i += 1) {
      const yy = y + i * 10 + Math.sin(state.time * 4 + i) * 1.3;
      ctx.beginPath();
      ctx.moveTo(leftEdge + 12, yy);
      ctx.lineTo(rightEdge - 12, yy);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }

  function drawGatePanel(x1, x2, y, h, color, label, textX, used) {
    const w = x2 - x1;
    const pulse = 0.72 + Math.sin(state.time * 6 + textX * 0.01) * 0.12;
    const beam = ctx.createLinearGradient(x1, y, x2, y);
    beam.addColorStop(0, "rgba(255,255,255,0.08)");
    beam.addColorStop(0.24, hexToRgba(color, 0.44));
    beam.addColorStop(0.5, hexToRgba(color, 0.2 + pulse * 0.16));
    beam.addColorStop(0.76, hexToRgba(color, 0.44));
    beam.addColorStop(1, "rgba(255,255,255,0.08)");

    ctx.shadowColor = color;
    ctx.shadowBlur = used ? 0 : 14;
    roundedRect(x1, y - h / 2 + 10, w, h - 20, 9, beam);

    ctx.shadowBlur = 8;
    ctx.strokeStyle = hexToRgba(color, 0.9);
    ctx.lineWidth = 2;
    roundedPath(x1, y - h / 2 + 10, w, h - 20, 9);
    ctx.stroke();

    ctx.globalAlpha = used ? 0.32 : 1;
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#fff";
    ctx.font = "900 25px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, textX, y);
    ctx.globalAlpha = used ? 0.22 : 1;
  }

  function gateColor(option) {
    return option.value < 0 ? colors.red : option.op === "mul" ? colors.violet : colors.green;
  }

  function drawGatePillar(x, y, h, color) {
    const pillarW = 12;
    const capW = 22;
    const top = y - h / 2;
    const bottom = y + h / 2;
    const body = ctx.createLinearGradient(x - pillarW / 2, y, x + pillarW / 2, y);
    body.addColorStop(0, "#eaf9ff");
    body.addColorStop(0.5, color);
    body.addColorStop(1, "#eaf9ff");
    roundedRect(x - pillarW / 2, top + 8, pillarW, h - 16, 6, body);
    roundedRect(x - capW / 2, top, capW, 13, 5, "#f7fbff");
    roundedRect(x - capW / 2, bottom - 13, capW, 13, 5, "#dcecff");

    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, top + 17);
    ctx.lineTo(x, bottom - 17);
    ctx.stroke();
    ctx.restore();
  }

  function hexToRgba(hex, alpha) {
    const value = hex.replace("#", "");
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
      if (supply.weaponKey === "cat" && catSupplyImage.complete && catSupplyImage.naturalWidth > 0) {
        drawCatSupplyImage(x, y);
      } else {
        ctx.fillText(weapon.icon, x, y - 3);
        ctx.font = "800 11px system-ui, sans-serif";
        ctx.fillText(weapon.name, x, y + 17);
      }
    }
  }

  function drawCatSupplyImage(x, y) {
    ctx.save();
    roundedPath(x - 25, y - 24, 50, 42, 8);
    ctx.clip();
    ctx.drawImage(catSupplyImage, x - 25, y - 24, 50, 42);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(255, 211, 77, 0.92)";
    ctx.lineWidth = 2;
    roundedPath(x - 25, y - 24, 50, 42, 8);
    ctx.stroke();
    ctx.fillStyle = "#5b3511";
    ctx.font = "900 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("猫猫", x, y + 20);
    ctx.restore();
  }

  function drawEnemies() {
    const sorted = [...state.enemies].sort((a, b) => a.y - b.y);
    for (const enemy of sorted) {
      if (enemy.type === "heron") drawNightHeron(enemy);
      else if (enemy.type === "miniBoss") drawMiniBoss(enemy);
      else drawBug(enemy);
    }
  }

  function drawBug(enemy) {
    const bodyColors = ["#6d4aa8", "#31966e", "#c65372", "#5775c9", "#8d6a2d"];
    const scale = clamp((enemy.elite ? 0.92 : 0.74) + enemy.y / state.height * 0.42, 0.62, enemy.elite ? 1.28 : 1.14);
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

    if (enemy.elite) {
      ctx.strokeStyle = "#ffe071";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 2, 24, 0, Math.PI * 2);
      ctx.stroke();
    }

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

  function drawMiniBoss(enemy) {
    const pulse = 1 + Math.sin(state.time * 5) * 0.04;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.scale(pulse, pulse);

    ctx.fillStyle = "rgba(20,30,35,0.18)";
    ctx.beginPath();
    ctx.ellipse(0, 48, 48, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = enemy.bossKind === "甲壳虫" ? "#5c6474" : enemy.bossKind === "飞虫队长" ? "#3f79c8" : "#7b4bc2";
    ctx.beginPath();
    ctx.ellipse(0, 4, 44, 36, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.ellipse(-12, -4, 14, 16, -0.3, 0, Math.PI * 2);
    ctx.ellipse(12, -4, 14, 16, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#26172e";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i < 4; i += 1) {
      const yy = -18 + i * 14;
      ctx.moveTo(-30, yy);
      ctx.lineTo(-56, yy + 12);
      ctx.moveTo(30, yy);
      ctx.lineTo(56, yy + 12);
    }
    ctx.stroke();

    ctx.fillStyle = "#fff4c4";
    ctx.beginPath();
    ctx.arc(-14, -14, 8, 0, Math.PI * 2);
    ctx.arc(14, -14, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#141820";
    ctx.beginPath();
    ctx.arc(-11, -14, 3, 0, Math.PI * 2);
    ctx.arc(11, -14, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(enemy.bossKind, 0, -52);
    drawSmallHp(enemy.hp / enemy.maxHp, -52, -42, 104);
    ctx.restore();
  }

  function drawNightHeron(enemy) {
    const stage = enemy.bossStage || 0;
    const facing = enemy.facing || 1;
    const bossScale = 1 + stage * 0.06;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    ctx.fillStyle = "rgba(20,30,35,0.18)";
    ctx.beginPath();
    ctx.ellipse(0, 84 * bossScale, 62 * bossScale, 13 * bossScale, 0, 0, Math.PI * 2);
    ctx.fill();

    if (stage > 0) {
      ctx.globalAlpha = 0.18 + stage * 0.08;
      ctx.fillStyle = colors.red;
      ctx.beginPath();
      ctx.arc(0, 8, 70 + stage * 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (heronBossImage.complete && heronBossImage.naturalWidth > 0) {
      const imgRatio = heronBossImage.naturalWidth / heronBossImage.naturalHeight;
      const drawH = (158 + stage * 10) * bossScale;
      const drawW = drawH * imgRatio;
      ctx.save();
      ctx.scale(facing, 1);
      ctx.drawImage(heronBossImage, -drawW / 2, -66 * bossScale, drawW, drawH);
      ctx.restore();
    } else {
      drawNightHeronFallback(stage, bossScale);
    }

    drawSmallHp(enemy.hp / enemy.maxHp, -54, -78, 108);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 14px system-ui, \"Microsoft YaHei\", sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(enemy.bossKind || "夜鹭", 0, -82);
    ctx.restore();
  }

  function drawNightHeronFallback(stage, bossScale) {
    ctx.save();
    ctx.scale(bossScale, bossScale);
    ctx.fillStyle = stage >= 2 ? "#171923" : colors.heronWing;
    ctx.beginPath();
    ctx.ellipse(-36, 12, 18 + stage * 3, 60 + stage * 8, -0.75, 0, Math.PI * 2);
    ctx.ellipse(36, 12, 18 + stage * 3, 60 + stage * 8, 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.heron;
    ctx.beginPath();
    ctx.ellipse(0, 16, 30, 48, 0, 0, Math.PI * 2);
    ctx.arc(0, -36, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSmallHp(ratio, x, y, w) {
    roundedRect(x, y, w, 5, 3, "rgba(255,255,255,0.82)");
    roundedRect(x, y, w * clamp(ratio, 0, 1), 5, 3, colors.red);
  }

  function drawBullets() {
    ctx.lineCap = "round";
    for (const bullet of state.bullets) {
      if (bullet.type === "laser") {
        ctx.save();
        ctx.globalAlpha = 0.92;
        ctx.shadowColor = "#49eaff";
        ctx.shadowBlur = 12;
        ctx.strokeStyle = "rgba(23, 97, 130, 0.34)";
        ctx.lineWidth = bullet.size + 8;
        ctx.beginPath();
        ctx.moveTo(bullet.x, bullet.y);
        ctx.lineTo(bullet.x, 0);
        ctx.stroke();
        ctx.strokeStyle = "rgba(230, 255, 255, 0.95)";
        ctx.lineWidth = Math.max(2, bullet.size * 0.55);
        ctx.beginPath();
        ctx.moveTo(bullet.x, bullet.y);
        ctx.lineTo(bullet.x, 0);
        ctx.stroke();
        ctx.strokeStyle = bullet.color;
        ctx.lineWidth = bullet.size;
        ctx.beginPath();
        ctx.moveTo(bullet.x, bullet.y);
        ctx.lineTo(bullet.x, 0);
        ctx.stroke();
        ctx.restore();
      } else if (bullet.type === "cat") {
        const size = Math.max(18, bullet.size * 5.1);
        ctx.save();
        ctx.translate(bullet.x, bullet.y - 12);
        ctx.rotate(Math.sin((bullet.x + bullet.y) * 0.03) * 0.18);
        ctx.shadowColor = "#ffd34d";
        ctx.shadowBlur = 14;
        ctx.lineWidth = Math.max(3, size * 0.12);
        ctx.strokeStyle = "rgba(93, 54, 14, 0.68)";
        ctx.fillStyle = "#ffe45f";
        ctx.font = `900 ${size}px system-ui, "Microsoft YaHei", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.strokeText("哈", 0, 0);
        ctx.fillText("哈", 0, 0);
        ctx.restore();
      } else {
        ctx.strokeStyle = "rgba(34, 35, 38, 0.5)";
        ctx.lineWidth = bullet.size + 4;
        ctx.beginPath();
        ctx.moveTo(bullet.x, bullet.y + 12);
        ctx.lineTo(bullet.x - bullet.vx * 0.018, bullet.y - 12);
        ctx.stroke();

        ctx.shadowColor = bullet.color;
        ctx.shadowBlur = 8;
        ctx.strokeStyle = bullet.color;
        ctx.lineWidth = bullet.size;
        ctx.beginPath();
        ctx.moveTo(bullet.x, bullet.y + 12);
        ctx.lineTo(bullet.x - bullet.vx * 0.018, bullet.y - 12);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
  }

  function drawSquad() {
    const total = Math.min(30 + state.formationBonus, state.squad);
    const baseX = laneX(state.x);
    const baseY = state.height - 108;
    for (let i = total - 1; i >= 0; i -= 1) {
      const offset = formationOffset(i, total);
      if (state.catTimer > 0) drawHeroCat(baseX + offset.x, baseY + offset.y, 0.62);
      else drawHeroPenguin(baseX + offset.x, baseY + offset.y, 0.64);
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

  function drawHeroCat(x, y, s) {
    ctx.fillStyle = "rgba(30,45,43,0.16)";
    ctx.beginPath();
    ctx.ellipse(x, y + 37 * s, 23 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(x, y);

    ctx.strokeStyle = "#d4942e";
    ctx.lineWidth = 6 * s;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(15 * s, 16 * s);
    ctx.quadraticCurveTo(34 * s, 10 * s, 28 * s, -6 * s);
    ctx.stroke();

    ctx.fillStyle = "#f2c24a";
    ctx.beginPath();
    ctx.ellipse(0, 13 * s, 22 * s, 25 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff4cf";
    ctx.beginPath();
    ctx.ellipse(0, 18 * s, 13 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f2c24a";
    ctx.beginPath();
    ctx.moveTo(-19 * s, -15 * s);
    ctx.lineTo(-10 * s, -34 * s);
    ctx.lineTo(-2 * s, -16 * s);
    ctx.lineTo(3 * s, -16 * s);
    ctx.lineTo(13 * s, -34 * s);
    ctx.lineTo(20 * s, -13 * s);
    ctx.ellipse(0, -5 * s, 22 * s, 20 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff4cf";
    ctx.beginPath();
    ctx.ellipse(0, 1 * s, 12 * s, 10 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1d2128";
    ctx.beginPath();
    ctx.arc(-7 * s, -8 * s, 2.6 * s, 0, Math.PI * 2);
    ctx.arc(7 * s, -8 * s, 2.6 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#b96a2e";
    ctx.beginPath();
    ctx.arc(0, -1 * s, 2.5 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#8a5c22";
    ctx.lineWidth = 1.8 * s;
    ctx.beginPath();
    ctx.moveTo(-5 * s, 1 * s);
    ctx.lineTo(-22 * s, -1 * s);
    ctx.moveTo(-4 * s, 6 * s);
    ctx.lineTo(-21 * s, 10 * s);
    ctx.moveTo(5 * s, 1 * s);
    ctx.lineTo(22 * s, -1 * s);
    ctx.moveTo(4 * s, 6 * s);
    ctx.lineTo(21 * s, 10 * s);
    ctx.stroke();

    ctx.fillStyle = "#d4942e";
    ctx.beginPath();
    ctx.ellipse(-9 * s, 37 * s, 8 * s, 4 * s, -0.15, 0, Math.PI * 2);
    ctx.ellipse(9 * s, 37 * s, 8 * s, 4 * s, 0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#6b4b32";
    ctx.lineWidth = 4 * s;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(3 * s, 5 * s);
    ctx.lineTo(27 * s, -12 * s);
    ctx.stroke();
    ctx.restore();
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
    const cat = state.catTimer > 0 ? ` 猫 ${Math.ceil(state.catTimer)}s` : "";
    ctx.fillText(`${weapon.name}${suffix}${cat}`, x, y);
  }

  function drawSparks() {
    for (const spark of state.sparks) {
      const alpha = clamp(spark.life / spark.max, 0, 1);
      ctx.globalAlpha = alpha;
      if (spark.text) {
        ctx.fillStyle = spark.color;
        ctx.font = "900 28px system-ui, \"Microsoft YaHei\", \"Noto Sans CJK SC\", sans-serif";
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

(() => {
  const canvas = document.getElementById("gameCanvas");
  const overlay = document.getElementById("overlay");
  const panel = overlay.querySelector(".panel");
  const primaryButton = document.getElementById("primaryButton");
  const pauseButton = document.getElementById("pauseButton");
  const monsterLabel = document.getElementById("monsterCount");
  const squadLabel = document.getElementById("squadCount");

  const weapons = {
    rifle: { name: "Rifle", color: 0xffbf2f, damage: 7, delay: 170, shots: 1, spread: 0, speed: 650, size: 8, life: 1400 },
    shotgun: { name: "Shotgun", color: 0xff9f43, damage: 5, delay: 260, shots: 5, spread: 150, speed: 570, size: 7, life: 1250 },
    laser: { name: "Laser", color: 0x57e5ff, damage: 0.44, delay: 38, shots: 1, spread: 0, speed: 0, size: 8, life: 55 },
    rocket: { name: "Rocket", color: 0xff5d6f, damage: 30, delay: 420, shots: 1, spread: 0, speed: 480, size: 12, life: 1500, splash: 58 },
  };

  const levels = [
    { name: "Cloud Bugs", miniBoss: "Toxic Beetle", boss: "Night Heron", hpScale: 1, countScale: 1, rewardPool: ["shotgun", "laser", "cat"] },
    { name: "White Tower", miniBoss: "Iron Bug", boss: "Mecha Heron", hpScale: 1.28, countScale: 1.12, rewardPool: ["laser", "rocket", "cat"] },
    { name: "High Hunt", miniBoss: "Bug Captain", boss: "AI Herons", hpScale: 1.62, countScale: 1.26, rewardPool: ["shotgun", "rocket", "cat"] },
    { name: "Final Garden", miniBoss: "Young Heron", boss: "Heron Queen", hpScale: 2, countScale: 1.42, rewardPool: ["laser", "rocket", "cat"] },
  ];

  const colors = {
    ink: 0x172425,
    road: 0xf6f4ee,
    roadEdge: 0xb9aa99,
    green: 0x35b979,
    violet: 0x6755d7,
    red: 0xd94d62,
    yellow: 0xffd34d,
    white: 0xffffff,
  };

  class ShooterScene extends Phaser.Scene {
    constructor() {
      super("ShooterScene");
      this.state = {};
    }

    preload() {
      this.load.image("agentPenguin", "./assets/agent-penguin.png");
      this.load.image("catSupply", "./assets/winking-cat.jpg");
      this.load.image("heronBoss", "./assets/night-heron-boss.png");
    }

    create() {
      this.makeTextures();
      this.resetState();

      this.road = this.add.graphics().setDepth(0);
      this.rewardGroup = this.add.group();
      this.enemyGroup = this.physics.add.group();
      this.bulletGroup = this.physics.add.group();
      this.squadGroup = this.add.group();
      this.fxGroup = this.add.group();
      this.bossBar = this.add.graphics().setDepth(8);
      this.squadBadge = this.add.text(0, 0, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "15px",
        fontStyle: "900",
        color: "#172425",
        backgroundColor: "rgba(255,255,255,0.82)",
        padding: { x: 8, y: 4 },
      }).setOrigin(0.5).setDepth(7).setVisible(false);
      this.badge = this.add.text(0, 0, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "15px",
        fontStyle: "900",
        color: "#172425",
        align: "center",
      }).setOrigin(0.5).setDepth(8).setVisible(false);

      this.input.on("pointermove", (pointer) => this.setTargetFromPointer(pointer));
      this.input.on("pointerdown", (pointer) => this.setTargetFromPointer(pointer));
      this.input.keyboard.on("keydown-LEFT", () => this.nudgeTarget(-0.24));
      this.input.keyboard.on("keydown-A", () => this.nudgeTarget(-0.24));
      this.input.keyboard.on("keydown-RIGHT", () => this.nudgeTarget(0.24));
      this.input.keyboard.on("keydown-D", () => this.nudgeTarget(0.24));
      this.input.keyboard.on("keydown-ESC", () => togglePause());
      this.input.keyboard.on("keydown-P", () => togglePause());

      this.physics.add.overlap(this.bulletGroup, this.enemyGroup, (bullet, enemy) => {
        this.hitEnemyWithBullet(bullet, enemy);
      });

      window.__shooterState = this.state;
      window.__shooterScene = this;
      this.scale.on("resize", (size) => this.resize(size.width, size.height));
      this.resize(this.scale.width, this.scale.height);
      this.spawnBugWave();
      this.setPaused(true);
      this.updateHud();
    }

    resetState() {
      this.state.status = "ready";
      this.state.phase = "combat";
      this.state.levelIndex = 0;
      this.state.levelStep = 0;
      this.state.wave = 0;
      this.state.squad = 2;
      this.state.x = 0;
      this.state.targetX = 0;
      this.state.runSpeed = 128;
      this.state.fireTimer = 0;
      this.state.weaponKey = "rifle";
      this.state.weaponTimer = 0;
      this.state.catTimer = 0;
      this.state.damageBoost = 0;
      this.state.fireRateBoost = 0;
      this.state.bulletSizeBoost = 0;
      this.state.pierceBonus = 0;
      this.state.formationBonus = 0;
      this.state.rewardActive = false;
      this.state.rewardIndex = 0;
      this.state.rewardKind = "";
      this.state.exitQueued = false;
      this.state.exitPhase = "";
      this.state.bossRank = "";
      this.state.waveHp = 0;
      this.state.kills = 0;
      this.state.score = 0;
      this.state.gameOver = false;
    }

    startGame() {
      this.clearWorld();
      this.resetState();
      this.state.status = "playing";
      this.setPaused(false);
      this.spawnBugWave();
      hideOverlay();
      this.updateHud();
    }

    restartLevelAfterUpgrade() {
      this.clearWorld();
      this.state.status = "playing";
      this.state.phase = "combat";
      this.state.levelStep = 0;
      this.state.waveHp = 0;
      this.state.rewardActive = false;
      this.state.exitQueued = false;
      this.state.exitPhase = "";
      this.state.weaponKey = "rifle";
      this.state.weaponTimer = 0;
      this.state.runSpeed = 132 + this.state.levelIndex * 9;
      this.state.fireTimer = 0;
      this.spawnBugWave();
      hideOverlay();
      this.setPaused(false);
      this.updateHud();
    }

    clearWorld() {
      for (const group of [this.enemyGroup, this.bulletGroup, this.rewardGroup, this.squadGroup, this.fxGroup]) {
        if (group) group.clear(true, true);
      }
      if (this.bossBar) this.bossBar.clear();
      if (this.squadBadge) this.squadBadge.setVisible(false);
    }

    makeTextures() {
      const g = this.make.graphics({ x: 0, y: 0, add: false });

      g.clear();
      g.fillStyle(0x2f3038, 1).fillEllipse(24, 30, 34, 46);
      g.fillStyle(0xf7f2ed, 1).fillEllipse(24, 36, 22, 30);
      g.fillStyle(0xffffff, 1).fillCircle(17, 18, 5).fillCircle(31, 18, 5);
      g.fillStyle(0x1d2128, 1).fillCircle(18, 18, 2).fillCircle(30, 18, 2);
      g.fillStyle(0xf0a13b, 1).fillTriangle(18, 25, 31, 25, 24, 33);
      g.lineStyle(4, 0x6b4b32, 1).lineBetween(27, 30, 44, 18);
      g.generateTexture("penguin", 52, 64);

      g.clear();
      g.fillStyle(0xf2c24a, 1).fillEllipse(26, 34, 38, 42);
      g.fillStyle(0xf2c24a, 1).fillTriangle(10, 16, 18, 0, 25, 18).fillTriangle(28, 18, 38, 0, 43, 16);
      g.fillStyle(0xfff4cf, 1).fillEllipse(26, 34, 23, 24);
      g.fillStyle(0x1d2128, 1).fillCircle(19, 20, 3).fillCircle(33, 20, 3);
      g.fillStyle(0xb96a2e, 1).fillCircle(26, 27, 3);
      g.lineStyle(4, 0x6b4b32, 1).lineBetween(30, 34, 49, 20);
      g.generateTexture("catHero", 56, 68);

      g.clear();
      g.fillStyle(0x6d4aa8, 1).fillEllipse(24, 24, 38, 34);
      g.fillStyle(0xffffff, 0.25).fillEllipse(24, 22, 24, 18);
      g.lineStyle(3, 0x2f1e38, 1);
      for (let i = 0; i < 3; i += 1) {
        const y = 16 + i * 8;
        g.lineBetween(10, y, 0, y + 8).lineBetween(38, y, 48, y + 8);
      }
      g.fillStyle(0x21172a, 1).fillCircle(17, 15, 3).fillCircle(31, 15, 3);
      g.generateTexture("bug", 50, 50);

      g.clear();
      g.fillStyle(0x5c6474, 1).fillEllipse(48, 48, 78, 66);
      g.fillStyle(0xffffff, 0.24).fillEllipse(34, 42, 24, 28).fillEllipse(62, 42, 24, 28);
      g.lineStyle(5, 0x26172e, 1);
      for (let i = 0; i < 4; i += 1) {
        const y = 26 + i * 13;
        g.lineBetween(22, y, 0, y + 10).lineBetween(74, y, 96, y + 10);
      }
      g.fillStyle(0xfff4c4, 1).fillCircle(36, 30, 7).fillCircle(60, 30, 7);
      g.generateTexture("miniBoss", 100, 96);

      g.clear();
      g.fillStyle(0xffbf2f, 1).fillRoundedRect(0, 0, 10, 24, 5);
      g.generateTexture("bullet", 10, 24);

      g.clear();
      g.fillStyle(0xff5d6f, 1).fillRoundedRect(0, 0, 18, 30, 8);
      g.fillStyle(0xffd34d, 1).fillTriangle(3, 30, 15, 30, 9, 44);
      g.generateTexture("rocket", 18, 46);

      g.destroy();
    }

    resize(width, height) {
      this.width = width;
      this.height = height;
      this.physics.world.setBounds(-120, -220, width + 240, height + 420);
      if (this.badge) this.badge.setPosition(width * 0.5, height - 42);
    }

    level() {
      return levels[Math.min(this.state.levelIndex, levels.length - 1)];
    }

    laneX(value) {
      return this.width * 0.5 + value * Math.min(158, this.width * 0.38);
    }

    setTargetFromPointer(pointer) {
      if (this.state.status !== "playing") return;
      this.state.targetX = Phaser.Math.Clamp((pointer.x / this.width - 0.5) * 2.55, -1.02, 1.02);
    }

    nudgeTarget(amount) {
      if (this.state.status !== "playing") return;
      this.state.targetX = Phaser.Math.Clamp(this.state.targetX + amount, -1.02, 1.02);
    }

    currentWeapon() {
      const base = weapons[this.state.weaponKey] || weapons.rifle;
      return {
        ...base,
        damage: base.damage * (1 + this.state.damageBoost),
        delay: Math.max(28, base.delay * (1 - this.state.fireRateBoost)),
        size: base.size * (1 + this.state.bulletSizeBoost),
        pierce: (base.pierce || 0) + this.state.pierceBonus,
      };
    }

    update(time, delta) {
      if (this.state.status !== "playing" || this.game.loop.sleeping) return;
      const dt = Math.min(delta, 34) / 1000;
      this.state.x += (this.state.targetX - this.state.x) * Math.min(1, dt * 20);
      this.state.fireTimer -= delta;
      this.state.weaponTimer = Math.max(0, this.state.weaponTimer - delta);
      this.state.catTimer = Math.max(0, this.state.catTimer - delta);
      if (this.state.weaponTimer <= 0 && this.state.weaponKey !== "rifle") this.state.weaponKey = "rifle";

      this.drawRoad(time);
      this.updateEnemies(delta);
      this.updateRewards(delta);
      this.updateBullets(delta);
      this.updateSquad();
      this.updateBossBar();
      this.maybeStartReward();
      this.updateHud();

      if (this.state.fireTimer <= 0) {
        this.fire();
        this.state.fireTimer = this.currentWeapon().delay;
      }
    }

    drawRoad(time) {
      const center = this.width * 0.5;
      const roadW = Math.min(360, this.width * 0.88);
      const scroll = (time * 0.18) % 44;
      this.road.clear();
      this.road.fillStyle(0xdff5ff, 1).fillRect(0, 0, this.width, this.height);
      this.road.fillStyle(colors.road, 1).fillRoundedRect(center - roadW / 2, -20, roadW, this.height + 40, 18);
      this.road.lineStyle(5, colors.roadEdge, 0.75);
      this.road.lineBetween(center - roadW / 2 + 8, 0, center - roadW / 2 + 8, this.height);
      this.road.lineBetween(center + roadW / 2 - 8, 0, center + roadW / 2 - 8, this.height);
      this.road.lineStyle(2, 0xd7cbb9, 0.45);
      for (let y = -44 + scroll; y < this.height + 44; y += 44) this.road.lineBetween(center - roadW * 0.26, y, center + roadW * 0.26, y);
    }

    updateSquad() {
      const totalSquad = Math.max(1, Math.floor(this.state.squad));
      const visible = Math.min(totalSquad, Math.max(1, Math.ceil(Math.sqrt(totalSquad))));
      const baseX = this.laneX(this.state.x);
      const baseY = this.height - 108;
      let existing = this.squadGroup.getChildren();
      while (existing.length < visible) {
        const sprite = this.add.image(0, 0, "agentPenguin").setDepth(5).setScale(0.38);
        this.squadGroup.add(sprite);
        existing = this.squadGroup.getChildren();
      }
      while (existing.length > visible) {
        existing.pop().destroy();
        existing = this.squadGroup.getChildren();
      }
      for (let i = 0; i < existing.length; i += 1) {
        const offset = this.formationOffset(i, visible);
        const sprite = existing[i];
        sprite.setTexture(this.state.catTimer > 0 ? "catHero" : "agentPenguin");
        sprite.setScale(this.state.catTimer > 0 ? 0.72 : 0.38);
        sprite.setPosition(baseX + offset.x, baseY + offset.y);
      }
      if (totalSquad > visible) {
        this.squadBadge.setText(`x${totalSquad}`);
        this.squadBadge.setPosition(baseX, baseY + 74);
        this.squadBadge.setVisible(true);
      } else {
        this.squadBadge.setVisible(false);
      }
    }

    formationOffset(index, total) {
      const cols = Math.min(6, Math.ceil(Math.sqrt(total)));
      const col = index % cols;
      const row = Math.floor(index / cols);
      const usedCols = Math.min(cols, total - row * cols);
      return { x: (col - (usedCols - 1) / 2) * 22, y: row * 20 };
    }

    fire() {
      const weapon = this.currentWeapon();
      const shooters = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, Math.floor(this.state.squad)))));
      const baseY = this.height - 138;
      for (let i = 0; i < shooters; i += 1) {
        const offset = this.formationOffset(i, shooters);
        for (let shot = 0; shot < weapon.shots; shot += 1) {
          const spreadIndex = shot - (weapon.shots - 1) / 2;
          const x = this.laneX(this.state.x) + offset.x;
          const y = baseY + offset.y;
          if (weapon.name === "Laser") this.spawnLaser(x, y, weapon);
          else this.spawnProjectile(x, y, spreadIndex, weapon, i, shot);
        }
      }
    }

    spawnProjectile(x, y, spreadIndex, weapon, shooterIndex = 0, shotIndex = 0) {
      const isCat = this.state.catTimer > 0;
      const isRocket = weapon.name === "Rocket";
      const catSpread = isCat ? ((shooterIndex % 7) - 3) * 12 + Phaser.Math.Between(-14, 14) : 0;
      const catLift = isCat ? Phaser.Math.Between(-12, 12) : 0;
      const obj = isCat
        ? this.add.text(x + catSpread, y + catLift, "哈", {
            fontFamily: "Microsoft YaHei, system-ui, sans-serif",
            fontSize: `${Math.max(22, weapon.size * 3.7)}px`,
            fontStyle: "900",
            color: "#ffe45f",
            stroke: "#5d360e",
            strokeThickness: 4,
          }).setOrigin(0.5)
        : this.add.image(x, y, isRocket ? "rocket" : "bullet").setTint(weapon.color);
      obj.setDepth(4);
      if (isCat) obj.setAngle(Phaser.Math.Between(-16, 16));
      this.physics.add.existing(obj);
      this.bulletGroup.add(obj);
      obj.body.setVelocity(spreadIndex * weapon.spread + (isCat ? catSpread * 3.8 : 0), -weapon.speed + (isCat ? Phaser.Math.Between(-34, 18) : 0));
      obj.body.setSize(Math.max(12, weapon.size * 1.7), Math.max(18, weapon.size * 2.4), true);
      obj.damage = weapon.damage + Math.min(12, this.state.squad * 0.18);
      obj.pierce = isCat ? Math.max(1, weapon.pierce || 0) : weapon.pierce || 0;
      obj.splash = weapon.splash || 0;
      obj.expiresAt = this.time.now + weapon.life;
      obj.kind = isCat ? "cat" : isRocket ? "rocket" : "bullet";
    }

    spawnLaser(x, y, weapon) {
      const beam = this.add.rectangle(x, y / 2, Math.max(8, weapon.size), y, weapon.color, 0.48).setDepth(3);
      beam.setStrokeStyle(3, 0xeaffff, 0.86);
      this.physics.add.existing(beam);
      beam.body.setAllowGravity(false);
      beam.body.setImmovable(true);
      beam.damage = weapon.damage + Math.min(3, this.state.squad * 0.05);
      beam.expiresAt = this.time.now + weapon.life;
      beam.kind = "laser";
      beam.hitIds = new Set();
      this.bulletGroup.add(beam);
    }

    spawnBugWave(options = {}) {
      const deferred = Boolean(options.deferred);
      const level = this.level();
      const isRush = this.state.levelStep >= 2;
      this.state.phase = deferred ? this.state.phase : "combat";
      this.state.bossRank = "";
      this.state.wave += 1;
      const count = Math.min(136, Math.floor((58 + this.state.levelIndex * 18 + (isRush ? 24 : 0)) * level.countScale));
      const hpEach = Math.round((7 + this.state.levelIndex * 4 + (isRush ? 4 : 0)) * level.hpScale);
      const cols = 10;
      const spread = Math.min(330, this.width * 0.86);
      this.state.waveHp = 0;
      for (let i = 0; i < count; i += 1) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const usedCols = Math.min(cols, count - row * cols);
        const elite = isRush && i % 17 === 0;
        const x = this.width * 0.5 + (col - (usedCols - 1) / 2) * (spread / Math.max(1, cols - 1)) + Phaser.Math.Between(-8, 8);
        const y = -40 - row * 26 - Phaser.Math.Between(0, 12) - (deferred ? 120 : 0);
        const enemy = this.enemyGroup.create(x, y, "bug").setDepth(2).setScale(elite ? 1.06 : 0.86);
        this.setupEnemy(enemy, {
          type: "bug",
          hp: elite ? hpEach * 2.2 : hpEach,
          speed: 50 + this.state.wave * 2.2 + this.state.levelIndex * 4 + (elite ? 12 : 0),
          elite,
          wobble: Math.random() * Math.PI * 2,
          score: elite ? 32 : 14,
        });
      }
      this.floatText(`${level.name} ${isRush ? "II" : "I"}`, this.width * 0.5, 88, "#6755d7");
    }

    spawnMiniBoss(options = {}) {
      const deferred = Boolean(options.deferred);
      const level = this.level();
      this.state.phase = deferred ? this.state.phase : "boss";
      this.state.bossRank = "mini";
      const hp = Math.round((520 + this.state.levelIndex * 220 + this.state.squad * 10) * level.hpScale);
      const enemy = this.enemyGroup.create(this.width * 0.5, deferred ? -36 : 70, "miniBoss").setDepth(2).setScale(0.9);
      this.setupEnemy(enemy, { type: "miniBoss", hp, speed: 46 + this.state.levelIndex * 2, wobble: 0, wobbleRange: Math.min(105, this.width * 0.27), score: 500 });
      this.floatText(level.miniBoss, this.width * 0.5, 88, "#d94d62");
    }

    spawnBoss(options = {}) {
      const deferred = Boolean(options.deferred);
      const level = this.level();
      this.state.phase = deferred ? this.state.phase : "boss";
      this.state.bossRank = "big";
      const hp = Math.round((1650 + this.state.levelIndex * 610 + this.state.squad * 24) * level.hpScale);
      const enemy = this.enemyGroup.create(this.width * 0.5, deferred ? -38 : 92, "heronBoss").setDepth(2).setScale(0.24);
      this.setupEnemy(enemy, {
        type: "boss",
        hp,
        speed: 40 + this.state.levelIndex * 2,
        wobble: 0,
        wobbleRange: Math.min(72, this.width * 0.18),
        moveSpeed: 72,
        score: 1800,
      });
      enemy.rage70 = false;
      enemy.rage30 = false;
      enemy.body.setSize(enemy.displayWidth * 1.58, enemy.displayHeight * 1.08, true);
      this.floatText(level.boss, this.width * 0.5, 88, "#d94d62");
    }

    setupEnemy(enemy, data) {
      enemy.kind = data.type;
      enemy.hp = data.hp;
      enemy.maxHp = data.hp;
      enemy.speed = data.speed;
      enemy.wobble = data.wobble;
      enemy.wobbleRange = data.wobbleRange || Math.min(115, this.width * 0.3);
      enemy.moveSpeed = data.moveSpeed || 70;
      enemy.moveTargetX = enemy.x;
      enemy.nextMoveAt = 0;
      enemy.lastX = enemy.x;
      enemy.scoreValue = data.score;
      enemy.body.setVelocityY(data.speed);
      enemy.body.setAllowGravity(false);
      enemy.body.setSize(enemy.displayWidth * 0.72, enemy.displayHeight * 0.72, true);
      this.state.waveHp += data.hp;
    }

    updateEnemies(delta) {
      const dt = delta / 1000;
      const attackLine = this.height - 184;
      const enemies = this.enemyGroup.getChildren();
      for (const enemy of enemies) {
        if (!enemy.active) continue;
        if (enemy.kind === "bug") {
          enemy.x += Math.sin(this.time.now * 0.004 + enemy.wobble) * 16 * dt;
        } else if (enemy.kind === "boss") {
          this.updateBossMovement(enemy, dt);
        } else {
          const nextX = this.width * 0.5 + Math.sin(this.time.now * 0.0018 + enemy.wobble) * enemy.wobbleRange;
          enemy.lastX = enemy.x;
          enemy.x = nextX;
        }

        if (enemy.y > attackLine) {
          const loss = enemy.kind === "bug" ? (enemy.scaleX > 1 ? 2 : 1) : enemy.kind === "miniBoss" ? 8 : 12 * dt;
          this.state.squad -= loss;
          this.state.waveHp = Math.max(0, this.state.waveHp - Math.max(0, enemy.hp));
          if (enemy.kind === "boss") enemy.y = attackLine;
          else enemy.destroy();
          if (this.state.squad <= 0) this.endGame(false, "Squad Down");
        }
      }

      if (this.enemyGroup.countActive(true) === 0 && !this.state.rewardActive && this.state.status === "playing") {
        if (this.state.phase === "boss") {
          if (this.state.bossRank === "mini") {
            this.state.levelStep = 2;
            this.startReward();
          } else {
            this.finishLevel();
          }
        } else {
          this.advanceCombatStep();
          this.startReward();
        }
      }
    }

    updateBossMovement(enemy, dt) {
      const now = this.time.now;
      const minX = this.width * 0.5 - enemy.wobbleRange;
      const maxX = this.width * 0.5 + enemy.wobbleRange;
      const needsNewTarget = now >= enemy.nextMoveAt || Math.abs(enemy.moveTargetX - enemy.x) < 4;
      if (needsNewTarget) {
        enemy.moveTargetX = Phaser.Math.Between(Math.round(minX), Math.round(maxX));
        enemy.nextMoveAt = now + Phaser.Math.Between(520, 1350);
      }

      const dx = enemy.moveTargetX - enemy.x;
      const step = Math.sign(dx) * Math.min(Math.abs(dx), enemy.moveSpeed * dt);
      const nextX = enemy.x + step;
      if (Math.abs(step) > 0.2) enemy.setFlipX(step > 0);
      enemy.lastX = enemy.x;
      enemy.x = nextX;
    }

    maybeStartReward() {
      if (this.state.rewardActive || this.state.phase === "boss") return;
      const enemies = this.enemyGroup.countActive(true);
      const fewEnemies = enemies <= Math.max(5, Math.ceil(8 + this.state.wave * 0.18));
      const lowHp = this.state.waveHp <= 36 + this.state.levelIndex * 16;
      if (fewEnemies || lowHp) {
        this.advanceCombatStep();
        this.startReward();
      }
    }

    advanceCombatStep() {
      if (this.state.levelStep === 0) this.state.levelStep = 1;
      else if (this.state.levelStep === 2) this.state.levelStep = 3;
    }

    startReward() {
      if (this.state.rewardActive || this.state.status !== "playing") return;
      this.state.rewardActive = true;
      this.state.rewardIndex += 1;
      this.state.rewardKind = this.state.rewardIndex % 2 === 1 ? "gate" : "supply";
      this.state.exitQueued = false;
      this.state.runSpeed = 390 + this.state.levelIndex * 16;
      const y = -120;
      if (this.state.rewardKind === "gate") this.createGate(y);
      else this.createSupplyPair(y);
    }

    createGate(y) {
      const choices = [
        ["x2", "mul", 2, "+5", "add", 5],
        ["+8", "add", 8, "x3", "mul", 3],
        ["-4", "add", -4, "+14", "add", 14],
        ["+10", "add", 10, "x2", "mul", 2],
      ][this.state.rewardIndex % 4];
      const gate = this.add.container(this.width * 0.5, y).setDepth(3);
      gate.kind = "gate";
      gate.used = false;
      gate.left = { label: choices[0], op: choices[1], value: choices[2] };
      gate.right = { label: choices[3], op: choices[4], value: choices[5] };
      this.drawGateHalf(gate, -70, gate.left);
      this.drawGateHalf(gate, 70, gate.right);
      this.rewardGroup.add(gate);
      this.floatText("Gate Choice", this.width * 0.5, 108, "#35b979");
    }

    drawGateHalf(gate, x, option) {
      const color = option.value < 0 ? 0xd94d62 : option.op === "mul" ? 0x6755d7 : 0x35b979;
      const rect = this.add.rectangle(x, 0, 112, 86, color, 0.34).setStrokeStyle(3, color, 0.9);
      const label = this.add.text(x, 0, option.label, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "28px",
        fontStyle: "900",
        color: "#ffffff",
      }).setOrigin(0.5);
      gate.add([rect, label]);
    }

    createSupplyPair(y) {
      const pool = this.level().rewardPool;
      const left = pool[this.state.rewardIndex % pool.length];
      const right = pool[(this.state.rewardIndex + 1) % pool.length];
      this.createSupply(y, -0.46, left);
      this.createSupply(y, 0.46, right);
      this.floatText("Supply Choice", this.width * 0.5, 108, "#ffd34d");
    }

    createSupply(y, lane, weaponKey) {
      const x = this.laneX(lane);
      const box = this.add.container(x, y).setDepth(3);
      box.kind = "supply";
      box.weaponKey = weaponKey;
      box.lane = lane;
      box.taken = false;
      const bg = this.add.rectangle(0, 0, 64, 56, 0xffffff, 0.9).setStrokeStyle(3, weaponKey === "cat" ? 0xffd34d : weapons[weaponKey].color, 1);
      let icon;
      if (weaponKey === "cat") {
        icon = this.add.image(0, -2, "catSupply").setDisplaySize(54, 42);
      } else {
        icon = this.add.text(0, -2, weapons[weaponKey].name[0], {
          fontFamily: "system-ui, sans-serif",
          fontSize: "22px",
          fontStyle: "900",
          color: Phaser.Display.Color.IntegerToColor(weapons[weaponKey].color).rgba,
        }).setOrigin(0.5);
      }
      box.add([bg, icon]);
      this.rewardGroup.add(box);
    }

    updateRewards(delta) {
      if (!this.state.rewardActive) return;
      const dy = (this.state.runSpeed * delta) / 1000;
      const playerY = this.height - 120;
      const rewards = this.rewardGroup.getChildren();
      for (const reward of rewards) {
        reward.y += dy;
        if (reward.kind === "gate" && !reward.used && Math.abs(reward.y - playerY) < 56) {
          reward.used = true;
          const option = this.state.x < 0 ? reward.left : reward.right;
          if (option.op === "mul") this.state.squad = Math.floor(this.state.squad * option.value);
          if (option.op === "add") this.state.squad = Math.floor(this.state.squad + option.value);
          this.state.squad = Phaser.Math.Clamp(this.state.squad, 1, 160);
          this.floatText(option.label, this.laneX(this.state.x), playerY - 70, option.value < 0 ? "#d94d62" : "#35b979");
          reward.destroy();
        }
        if (reward.kind === "supply" && !reward.taken && Math.abs(reward.y - playerY) < 58 && Math.abs(reward.lane - this.state.x) < 0.5) {
          reward.taken = true;
          this.takeSupply(reward.weaponKey);
          reward.destroy();
        }
        if (reward.y > this.height + 90) reward.destroy();
      }

      if (!this.state.exitQueued && this.enemyGroup.countActive(true) === 0 && rewards.some((item) => item.y > this.height * 0.22)) {
        this.queueNextEncounter(true);
      }

      const done = this.rewardGroup.countActive(true) === 0 || rewards.every((item) => item.kind === "gate" ? item.used : item.taken);
      if (done) {
        this.state.rewardActive = false;
        this.state.runSpeed = 140 + this.state.levelIndex * 9;
        if (!this.state.exitQueued) this.queueNextEncounter(false);
        this.activateQueuedEncounter();
      }
    }

    queueNextEncounter(deferred) {
      this.state.exitQueued = true;
      if (this.state.levelStep === 1) {
        this.state.exitPhase = "boss";
        this.spawnMiniBoss({ deferred });
      } else if (this.state.levelStep >= 3) {
        this.state.exitPhase = "boss";
        this.spawnBoss({ deferred });
      } else {
        this.state.exitPhase = "combat";
        this.spawnBugWave({ deferred });
      }
    }

    activateQueuedEncounter() {
      if (!this.state.exitQueued) return;
      this.state.phase = this.state.exitPhase || (this.state.bossRank ? "boss" : "combat");
      this.state.exitQueued = false;
      this.state.exitPhase = "";
    }

    takeSupply(weaponKey) {
      const x = this.laneX(this.state.x);
      const y = this.height - 190;
      if (weaponKey === "cat") {
        this.state.catTimer = 8000;
        this.floatText("CAT", x, y, "#ffd34d");
        return;
      }
      this.state.weaponKey = weaponKey;
      this.state.weaponTimer = weaponKey === "rocket" ? 8000 : 10000;
      this.floatText(weapons[weaponKey].name, x, y, "#172425");
    }

    updateBullets(delta) {
      for (const bullet of this.bulletGroup.getChildren()) {
        if (!bullet.active) continue;
        if (bullet.expiresAt <= this.time.now || bullet.y < -140 || bullet.x < -140 || bullet.x > this.width + 140) {
          bullet.destroy();
          continue;
        }
        this.checkBossVisualHits(bullet);
      }
    }

    checkBossVisualHits(bullet) {
      for (const boss of this.enemyGroup.getChildren()) {
        if (!bullet.active || !boss.active || boss.kind !== "boss") continue;
        const halfW = boss.displayWidth * 0.78;
        const top = boss.y - boss.displayHeight * 0.48;
        const bottom = boss.y + boss.displayHeight * 0.52;
        if (bullet.kind === "laser") {
          const beamBottom = bullet.y + bullet.displayHeight / 2;
          if (Math.abs(bullet.x - boss.x) <= halfW && beamBottom >= top) this.hitEnemyWithBullet(bullet, boss);
          continue;
        }
        if (Math.abs(bullet.x - boss.x) <= halfW && bullet.y >= top && bullet.y <= bottom) {
          this.hitEnemyWithBullet(bullet, boss);
        }
      }
    }

    hitEnemyWithBullet(bullet, enemy) {
      if (!bullet.active || !enemy.active) return;
      if (bullet.kind === "laser") {
        if (bullet.hitIds.has(enemy)) return;
        bullet.hitIds.add(enemy);
        this.damageEnemy(enemy, bullet.damage);
        this.time.delayedCall(18, () => bullet.active && bullet.hitIds.delete(enemy));
        return;
      }

      this.damageEnemy(enemy, bullet.damage);
      if (bullet.splash) this.splashDamage(enemy, bullet);
      if (bullet.pierce > 0) bullet.pierce -= 1;
      else bullet.destroy();
    }

    splashDamage(center, bullet) {
      for (const enemy of this.enemyGroup.getChildren()) {
        if (!enemy.active || enemy === center) continue;
        if (Phaser.Math.Distance.Between(enemy.x, enemy.y, center.x, center.y) <= bullet.splash) {
          this.damageEnemy(enemy, bullet.damage * 0.42);
        }
      }
    }

    damageEnemy(enemy, amount) {
      if (!enemy.active) return;
      const actual = Math.min(enemy.hp, amount);
      enemy.hp -= actual;
      this.state.waveHp = Math.max(0, this.state.waveHp - actual);
      this.state.score += Math.ceil(actual * (enemy.kind === "bug" ? 0.8 : 1.35));
      if (enemy.hp <= 0) {
        this.state.kills += 1;
        this.state.score += enemy.scoreValue || 10;
        this.pop(enemy.x, enemy.y, enemy.kind === "bug" ? 0xffd34d : 0xd94d62, enemy.kind === "bug" ? 8 : 22);
        enemy.destroy();
      } else if (enemy.kind !== "bug") {
        if (enemy.kind === "boss") this.updateBossRage(enemy);
        enemy.setTint(0xffd8d8);
        this.time.delayedCall(50, () => enemy.active && enemy.clearTint());
      }
    }

    updateBossRage(enemy) {
      const ratio = enemy.hp / enemy.maxHp;
      if (!enemy.rage70 && ratio <= 0.7) {
        enemy.rage70 = true;
        this.triggerBossRage(enemy);
      }
      if (!enemy.rage30 && ratio <= 0.3) {
        enemy.rage30 = true;
        this.triggerBossRage(enemy);
      }
    }

    triggerBossRage(enemy) {
      enemy.speed += 8;
      enemy.moveSpeed += 26;
      enemy.body.setVelocityY(enemy.speed);
      enemy.wobbleRange = Math.min(enemy.wobbleRange + 12, this.width * 0.22);
      this.floatText("其他鸟做得到吗？", this.width * 0.5, Math.max(92, enemy.y + 46), "#d94d62");
      this.pop(enemy.x, enemy.y, 0xd94d62, 28);
      this.tweens.add({
        targets: enemy,
        alpha: 0.58,
        yoyo: true,
        repeat: 3,
        duration: 90,
      });
    }

    pop(x, y, color, amount) {
      for (let i = 0; i < amount; i += 1) {
        const dot = this.add.circle(x, y, Phaser.Math.Between(2, 5), color, 0.85).setDepth(6);
        this.fxGroup.add(dot);
        this.tweens.add({
          targets: dot,
          x: x + Phaser.Math.Between(-34, 34),
          y: y + Phaser.Math.Between(-36, 20),
          alpha: 0,
          duration: 360,
          onComplete: () => dot.destroy(),
        });
      }
    }

    floatText(text, x, y, color) {
      const label = this.add.text(x, y, text, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "22px",
        fontStyle: "900",
        color,
        stroke: "#ffffff",
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(9);
      this.fxGroup.add(label);
      this.tweens.add({ targets: label, y: y - 42, alpha: 0, duration: 760, onComplete: () => label.destroy() });
    }

    updateWeaponBadge() {
      const weapon = this.currentWeapon();
      const weaponTime = this.state.weaponTimer > 0 ? ` ${Math.ceil(this.state.weaponTimer / 1000)}s` : "";
      const cat = this.state.catTimer > 0 ? ` CAT ${Math.ceil(this.state.catTimer / 1000)}s` : "";
      this.badge.setText(`${weapon.name}${weaponTime}${cat}`);
      this.badge.setPosition(this.width * 0.5, this.height - 42);
    }

    updateBossBar() {
      this.bossBar.clear();
      const boss = this.enemyGroup.getChildren().find((enemy) => enemy.active && enemy.kind === "boss");
      if (!boss) return;

      const w = Math.min(132, boss.displayWidth * 0.9);
      const h = 9;
      const x = boss.x - w / 2;
      const y = Math.max(54, boss.y - boss.displayHeight * 0.42);
      const ratio = Phaser.Math.Clamp(boss.hp / boss.maxHp, 0, 1);
      this.bossBar.fillStyle(0xffffff, 0.82).fillRoundedRect(x, y, w, h, 6);
      this.bossBar.fillStyle(0xd94d62, 0.96).fillRoundedRect(x, y, w * ratio, h, 6);
      this.bossBar.lineStyle(2, 0x6d3b48, 0.8).strokeRoundedRect(x, y, w, h, 6);
    }

    updateHud() {
      monsterLabel.textContent = String(Math.max(0, Math.ceil(this.state.waveHp)));
      squadLabel.textContent = String(Math.max(0, Math.floor(this.state.squad)));
    }

    finishLevel() {
      this.state.levelIndex += 1;
      if (this.state.levelIndex >= levels.length) {
        this.endGame(true, "Victory");
        return;
      }
      this.state.status = "levelClear";
      this.setPaused(true);
      const choices = this.levelUpgradeChoices();
      showPanel(`
        <p class="kicker">Level Clear</p>
        <h1>${this.level().name}</h1>
        <p class="hint">Pick one upgrade and keep moving.</p>
        <div class="upgrade-grid">
          ${choices.map((choice) => `
            <button class="upgrade-card" type="button" data-upgrade="${choice.id}">
              <span>${choice.icon}</span>
              <strong>${choice.name}</strong>
              <small>${choice.desc}</small>
            </button>
          `).join("")}
        </div>
        <button id="restartButton" class="secondary-button" type="button">Restart</button>
      `);
      panel.querySelectorAll(".upgrade-card").forEach((button) => {
        button.addEventListener("click", () => {
          this.applyUpgrade(button.dataset.upgrade);
          this.restartLevelAfterUpgrade();
        });
      });
      panel.querySelector("#restartButton").addEventListener("click", () => this.startGame());
    }

    levelUpgradeChoices() {
      const pool = [
        { id: "fireRate", icon: "F", name: "Fire Rate +20%", desc: "All weapons shoot faster." },
        { id: "damage", icon: "D", name: "Damage +18%", desc: "Bullets and lasers hit harder." },
        { id: "bigBullet", icon: "B", name: "Bigger Shots", desc: "Projectiles are easier to land." },
        { id: "pierce", icon: "P", name: "Pierce +1", desc: "Bullets and HA shots pass through more enemies." },
        { id: "squad", icon: "+", name: "Squad +8", desc: "More penguins join immediately." },
        { id: "formation", icon: "W", name: "Wider Formation", desc: "More units fire at the same time." },
        { id: "cat", icon: "C", name: "Cat Start", desc: "Start the next level in cat mode." },
      ];
      const offset = (this.state.levelIndex * 2 + this.state.kills) % pool.length;
      return [0, 2, 4].map((n) => pool[(offset + n) % pool.length]);
    }

    applyUpgrade(id) {
      if (id === "fireRate") this.state.fireRateBoost = Math.min(0.55, this.state.fireRateBoost + 0.2);
      if (id === "damage") this.state.damageBoost = Math.min(1.2, this.state.damageBoost + 0.18);
      if (id === "bigBullet") this.state.bulletSizeBoost = Math.min(0.9, this.state.bulletSizeBoost + 0.25);
      if (id === "pierce") this.state.pierceBonus = Math.min(3, this.state.pierceBonus + 1);
      if (id === "squad") this.state.squad = Phaser.Math.Clamp(this.state.squad + 8, 1, 160);
      if (id === "formation") this.state.formationBonus = Math.min(12, this.state.formationBonus + 4);
      if (id === "cat") this.state.catTimer = 8000;
    }

    endGame(won, title) {
      this.state.status = "ended";
      this.state.gameOver = true;
      this.setPaused(true);
      showPanel(`
        <p class="kicker">${won ? "Complete" : "Game Over"}</p>
        <h1>${title}</h1>
        <p class="hint">Score ${Math.floor(this.state.score)} · Kills ${this.state.kills}</p>
        <button id="primaryButton" type="button">Restart</button>
      `);
      panel.querySelector("#primaryButton").addEventListener("click", () => this.startGame());
    }

    setPaused(paused) {
      if (paused) {
        this.physics.pause();
        this.tweens.pauseAll();
        this.scene.pause();
      } else {
        this.scene.resume();
        this.physics.resume();
        this.tweens.resumeAll();
      }
      if (pauseButton) pauseButton.textContent = paused ? "▶" : "Ⅱ";
    }
  }

  function showPanel(html) {
    panel.innerHTML = html;
    overlay.classList.remove("hidden");
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  function togglePause() {
    const scene = game.scene.getScene("ShooterScene");
    if (!scene || scene.state.status !== "playing") return;
    if (scene.scene.isPaused()) {
      hideOverlay();
      scene.setPaused(false);
    } else {
      scene.setPaused(true);
      showPanel(`
        <p class="kicker">Paused</p>
        <h1>Penguin Squad</h1>
        <p class="hint">Take a breath, then keep the lane moving.</p>
        <button id="resumeButton" type="button">Resume</button>
        <button id="restartButton" class="secondary-button" type="button">Restart</button>
      `);
      panel.querySelector("#resumeButton").addEventListener("click", togglePause);
      panel.querySelector("#restartButton").addEventListener("click", () => scene.startGame());
    }
  }

  if (!window.Phaser) {
    showPanel(`
      <p class="kicker">Missing Engine</p>
      <h1>Phaser</h1>
      <p class="hint">Phaser 3 did not load. Check the network and refresh.</p>
      <button id="primaryButton" type="button">Retry</button>
    `);
    panel.querySelector("#primaryButton").addEventListener("click", () => window.location.reload());
    return;
  }

  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    canvas,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: "#bee6ee",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: "arcade",
      arcade: { debug: false },
    },
    scene: ShooterScene,
  });

  primaryButton.addEventListener("click", () => {
    const scene = game.scene.getScene("ShooterScene");
    if (scene) scene.startGame();
  });

  pauseButton.addEventListener("click", togglePause);
})();

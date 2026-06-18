(() => {
  const canvas = document.getElementById("gameCanvas");
  const overlay = document.getElementById("overlay");
  const panel = overlay.querySelector(".panel");
  const primaryButton = document.getElementById("primaryButton");
  const pauseButton = document.getElementById("pauseButton");
  const coinLabel = document.getElementById("monsterCount");
  const pigLabel = document.getElementById("squadCount");

  const colors = {
    ink: 0x2d2320,
    road: 0x6e6c67,
    roadShade: 0x4f4d49,
    roadLine: 0x8b8780,
    rail: 0x9a3457,
    field: 0xd29552,
    fieldDark: 0x7e4d31,
    pig: 0xffa7bf,
    pigDark: 0xc46b81,
    blue: 0x2789df,
    gateQty: 0x41d79a,
    gateAtk: 0x7768f1,
    coin: 0xf3c43b,
    enemy: 0x603b31,
  };

  class PigChargeScene extends Phaser.Scene {
    constructor() {
      super("PigChargeScene");
      this.state = {};
    }

    preload() {
      this.load.image("pigCharacter", "assets/pig-character.png");
    }

    create() {
      this.makeTextures();
      this.resetState();

      this.road = this.add.graphics().setDepth(0);
      this.gateGroup = this.add.group();
      this.coinGroup = this.add.group();
      this.enemyGroup = this.add.group();
      this.penGroup = this.add.group();
      this.obstacleGroup = this.add.group();
      this.playerShotGroup = this.add.group();
      this.enemyShotGroup = this.add.group();
      this.pigGroup = this.add.group();
      this.fxGroup = this.add.group();
      this.hpBars = this.add.graphics().setDepth(7);
      this.joystick = this.add.graphics().setDepth(8);

      this.input.on("pointerdown", (pointer) => this.setMoveInput(pointer));
      this.input.on("pointermove", (pointer) => {
        if (pointer.isDown) this.setMoveInput(pointer);
      });
      this.input.on("pointerup", () => this.clearMoveInput());
      this.input.on("pointerupoutside", () => this.clearMoveInput());
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys("W,A,S,D");
      this.input.keyboard.on("keydown-ESC", () => togglePause());
      this.input.keyboard.on("keydown-P", () => togglePause());

      window.__pigChargeState = this.state;
      window.__pigChargeScene = this;
      this.scale.on("resize", (size) => this.resize(size.width, size.height));
      this.resize(this.scale.width, this.scale.height);
      this.setPaused(true);
      this.updateHud();
    }

    resetState() {
      this.state.status = "ready";
      this.state.x = 0;
      this.state.playerY = this.height ? this.height - 118 : 0;
      this.state.moveX = 0;
      this.state.moveY = 0;
      this.state.moveSpeed = 390;
      this.state.lastX = 0;
      this.state.moveLean = 0;
      this.state.pigs = 1;
      this.state.attack = 3;
      this.state.attackSpeed = 2;
      this.state.coins = 0;
      this.state.level = 1;
      this.state.segment = 0;
      this.state.gatePairId = 0;
      this.state.spawnTimer = 0;
      this.state.fireTimer = 35;
      this.state.obstacleTimer = 1800;
      this.state.runSpeed = 318;
      this.state.combo = 0;
      this.state.bossCount = 0;
      this.state.nextContactDamageAt = 0;
      this.state.roadOffset = 0;
      this.state.forwardInput = 0;
    }

    startGame() {
      this.clearWorld();
      this.resetState();
      this.state.status = "playing";
      hideOverlay();
      this.setPaused(false);
      this.spawnSegment();
      this.updateHud();
    }

    clearWorld() {
      for (const group of [this.gateGroup, this.coinGroup, this.enemyGroup, this.penGroup, this.obstacleGroup, this.playerShotGroup, this.enemyShotGroup, this.pigGroup, this.fxGroup]) {
        group.clear(true, true);
      }
      if (this.hpBars) this.hpBars.clear();
      if (this.countBadge) this.countBadge.setVisible(false);
    }

    makeTextures() {
      const g = this.make.graphics({ x: 0, y: 0, add: false });

      g.clear();
      g.fillStyle(0x6b3d43, 0.18).fillEllipse(32, 68, 38, 12);
      g.fillStyle(colors.pig, 1).fillEllipse(32, 42, 34, 52);
      g.fillStyle(0xffbdd0, 1).fillEllipse(32, 20, 31, 24);
      g.fillStyle(colors.pigDark, 1).fillTriangle(20, 12, 13, 2, 25, 18).fillTriangle(44, 12, 51, 2, 39, 18);
      g.fillStyle(0xffc7d6, 1).fillEllipse(32, 21, 17, 12);
      g.fillStyle(0x8c4a5c, 1).fillCircle(28, 21, 2).fillCircle(36, 21, 2);
      g.fillStyle(0x5d302d, 1).fillCircle(24, 15, 2).fillCircle(40, 15, 2);
      g.fillStyle(colors.pigDark, 1);
      g.fillRoundedRect(18, 55, 7, 14, 3).fillRoundedRect(39, 55, 7, 14, 3);
      g.fillRoundedRect(18, 28, 6, 12, 3).fillRoundedRect(40, 28, 6, 12, 3);
      g.lineStyle(3, colors.pigDark, 1).beginPath().arc(45, 48, 7, -0.4, 1.8).strokePath();
      g.generateTexture("pig", 64, 76);

      g.clear();
      g.fillStyle(0x161212, 0.34).fillEllipse(28, 61, 38, 10);
      g.fillStyle(0x661d24, 1).fillTriangle(16, 26, 3, 58, 24, 50).fillTriangle(40, 26, 53, 58, 32, 50);
      g.fillStyle(0x221817, 1).fillRoundedRect(16, 24, 24, 32, 7);
      g.fillStyle(0x2e1c1a, 1).fillRoundedRect(20, 48, 7, 13, 3).fillRoundedRect(31, 48, 7, 13, 3);
      g.fillStyle(0x141111, 1).fillCircle(28, 18, 13);
      g.fillStyle(0x8b2430, 1);
      g.fillTriangle(14, 12, 9, 0, 24, 10).fillTriangle(24, 8, 28, 0, 33, 9).fillTriangle(32, 10, 47, 1, 42, 14);
      g.fillStyle(0xffd454, 1).fillRoundedRect(7, 22, 42, 5, 2);
      g.fillStyle(0xf8f2b2, 0.95).fillCircle(24, 17, 2).fillCircle(33, 17, 2);
      g.lineStyle(3, 0x171111, 1).lineBetween(18, 35, 7, 46).lineBetween(38, 35, 49, 46);
      g.lineStyle(3, 0xb07c35, 1).lineBetween(49, 21, 50, 57);
      g.generateTexture("guard", 56, 68);

      g.clear();
      g.fillStyle(0x261817, 0.34).fillEllipse(40, 88, 58, 14);
      g.fillStyle(0x181414, 1).fillTriangle(33, 35, 2, 76, 32, 70).fillTriangle(47, 35, 78, 76, 48, 70);
      g.fillStyle(0x8b2b2d, 1).fillRoundedRect(22, 30, 36, 52, 12);
      g.fillStyle(0x5d1f25, 1).fillTriangle(22, 40, 8, 88, 35, 76).fillTriangle(58, 40, 72, 88, 45, 76);
      g.fillStyle(0x1b1718, 1).fillCircle(40, 23, 16);
      g.fillStyle(0xc58a3a, 1).fillRoundedRect(10, 28, 60, 7, 3);
      g.fillStyle(0xd8b470, 0.7).fillCircle(40, 18, 9);
      g.lineStyle(4, 0x1b1718, 1).lineBetween(24, 48, 8, 65).lineBetween(56, 48, 72, 65);
      g.generateTexture("boss", 80, 100);

      g.clear();
      g.fillStyle(colors.coin, 1).fillCircle(13, 13, 11);
      g.lineStyle(3, 0x9d6b19, 1).strokeCircle(13, 13, 8);
      g.generateTexture("coin", 26, 26);

      g.clear();
      g.fillStyle(0x5f5b52, 1).fillEllipse(26, 30, 42, 32);
      g.fillStyle(0x7c776b, 1).fillEllipse(18, 25, 20, 18).fillEllipse(35, 23, 23, 22);
      g.fillStyle(0x494640, 1).fillEllipse(29, 37, 31, 14);
      g.fillStyle(0xb3aa97, 0.55).fillEllipse(20, 20, 12, 7).fillEllipse(38, 18, 9, 6);
      g.generateTexture("rock", 54, 48);

      g.clear();
      g.fillStyle(0x48ff3f, 1).fillEllipse(12, 20, 16, 36);
      g.lineStyle(3, 0x0a7f26, 1).strokeEllipse(12, 20, 16, 36);
      g.fillStyle(0xcaffb4, 0.75).fillEllipse(9, 12, 5, 13);
      g.generateTexture("greenShot", 24, 42);

      g.destroy();
    }

    resize(width, height) {
      this.width = width;
      this.height = height;
    }

    laneX(value) {
      return this.width * 0.5 + value * Math.min(150, this.width * 0.38);
    }

    playerY() {
      return this.state.playerY || this.height - 118;
    }

    activeCombatZone() {
      return this.penGroup.getChildren().find((zone) => zone.active && zone.activeCombat && !zone.breaking);
    }

    clampPlayerY(value) {
      return Phaser.Math.Clamp(value, 86, this.height - 92);
    }

    combatPullLine() {
      return this.height * 0.33;
    }

    setMoveInput(pointer) {
      if (this.state.status !== "playing") return;
      const baseX = this.width * 0.5;
      const baseY = this.height - 86;
      const dx = pointer.x - baseX;
      const dy = pointer.y - baseY;
      const len = Math.hypot(dx, dy);
      if (len < 12) {
        this.clearMoveInput();
        return;
      }
      const strength = Phaser.Math.Clamp(len / 28, 0.72, 1);
      this.state.moveX = (dx / len) * strength;
      this.state.moveY = (dy / len) * strength;
    }

    clearMoveInput() {
      this.state.moveX = 0;
      this.state.moveY = 0;
    }

    updateKeyboardInput() {
      if (!this.cursors || !this.keys) return;
      const left = this.cursors.left.isDown || this.keys.A.isDown;
      const right = this.cursors.right.isDown || this.keys.D.isDown;
      const up = this.cursors.up.isDown || this.keys.W.isDown;
      const down = this.cursors.down.isDown || this.keys.S.isDown;
      const x = (right ? 1 : 0) - (left ? 1 : 0);
      const y = (down ? 1 : 0) - (up ? 1 : 0);
      if (x === 0 && y === 0) return;
      const len = Math.hypot(x, y) || 1;
      this.state.moveX = x / len;
      this.state.moveY = y / len;
    }

    update(time, delta) {
      if (this.state.status !== "playing" || this.scene.isPaused()) return;
      const dt = Math.min(delta, 34) / 1000;
      const combatActive = Boolean(this.activeCombatZone());
      this.updateKeyboardInput();
      const forwardInput = combatActive ? 0 : Math.max(0, -this.state.moveY);
      this.state.forwardInput = forwardInput;
      const beforeX = this.state.x;
      const laneSpan = Math.min(150, this.width * 0.38);
      this.state.x = Phaser.Math.Clamp(this.state.x + (this.state.moveX * this.state.moveSpeed * dt) / laneSpan, -1.04, 1.04);
      let nextPlayerY = this.clampPlayerY(this.state.playerY + this.state.moveY * this.state.moveSpeed * dt);
      if (!combatActive) nextPlayerY = Math.max(nextPlayerY, this.combatPullLine());
      this.state.playerY = nextPlayerY;
      this.state.moveLean += ((this.state.x - beforeX) * 180 - this.state.moveLean) * Math.min(1, dt * 10);
      this.state.moveLean = Phaser.Math.Clamp(this.state.moveLean, -14, 14);
      this.state.lastX = beforeX;
      this.state.spawnTimer -= delta * (combatActive ? 0 : forwardInput);
      this.state.fireTimer -= delta;
      this.state.obstacleTimer -= delta;
      if (!combatActive) this.state.roadOffset += delta * 0.18 * forwardInput;
      this.drawRoad(time);
      this.updateObjects(delta);
      this.updatePenCombat(delta);
      this.autoThrowCoins(delta);
      this.updateCoinShots(delta);
      this.updatePigs();
      this.drawEnemyHpBars();
      this.drawJoystick();
      this.updateHud();
      if (this.state.spawnTimer <= 0) {
        if (this.hasLiveCombatSequence()) this.state.spawnTimer = 180;
        else this.spawnSegment();
      }
    }

    hasLiveCombatSequence() {
      const hasZone = this.penGroup.getChildren().some((zone) => zone.active && !zone.breaking);
      const hasEnemy = this.enemyGroup.getChildren().some((enemy) => enemy.active);
      return hasZone || hasEnemy;
    }

    drawRoad(time) {
      const center = this.width * 0.5;
      const bottomW = Math.min(360, this.width * 0.9);
      const topW = Math.min(260, bottomW * 0.68);
      const scroll = this.state.roadOffset % 54;
      this.road.clear();
      this.road.fillStyle(0xd1914b, 1).fillRect(0, 0, this.width, this.height);
      this.road.fillStyle(0xb9703d, 0.5).fillCircle(center - bottomW * 0.72, this.height * 0.3, 120);
      this.road.fillStyle(0xe3a35a, 0.52).fillCircle(center + bottomW * 0.7, this.height * 0.72, 140);
      this.road.fillStyle(colors.road, 1);
      this.road.fillPoints([
        new Phaser.Geom.Point(center - topW / 2, -24),
        new Phaser.Geom.Point(center + topW / 2, -24),
        new Phaser.Geom.Point(center + bottomW / 2, this.height + 28),
        new Phaser.Geom.Point(center - bottomW / 2, this.height + 28),
      ], true, true);
      this.road.fillStyle(0x3f3d38, 0.08);
      for (let i = 0; i < 28; i += 1) {
        const y = ((i * 67 + scroll * 1.7) % (this.height + 120)) - 60;
        const p = Phaser.Math.Clamp(y / Math.max(1, this.height), 0, 1);
        const w = Phaser.Math.Linear(topW * 0.42, bottomW * 0.78, p);
        const x = center + Math.sin(i * 7.31) * w * 0.42;
        this.road.fillEllipse(x, y, 22 + (i % 4) * 10, 7 + (i % 3) * 3);
      }
      this.road.fillStyle(0xb9b2a5, 0.12);
      for (let i = 0; i < 18; i += 1) {
        const y = ((i * 91 + scroll * 1.25) % (this.height + 160)) - 80;
        const p = Phaser.Math.Clamp(y / Math.max(1, this.height), 0, 1);
        const w = Phaser.Math.Linear(topW * 0.5, bottomW * 0.82, p);
        const x = center + Math.cos(i * 5.9) * w * 0.36;
        this.road.fillEllipse(x, y, 14 + (i % 3) * 6, 4 + (i % 2) * 4);
      }
      this.road.fillStyle(0x8b8882, 0.16);
      for (let y = -40 + scroll; y < this.height + 70; y += 70) {
        const p = Phaser.Math.Clamp(y / Math.max(1, this.height), 0, 1);
        const w = Phaser.Math.Linear(topW * 0.56, bottomW * 0.86, p);
        this.road.fillRect(center - w * 0.48, y, w * 0.96, 2);
      }
      this.road.lineStyle(2, 0xa8a39a, 0.42);
      for (let i = -2; i <= 2; i += 1) {
        const bottomX = center + i * bottomW * 0.16;
        const topX = center + i * topW * 0.1;
        this.road.lineBetween(topX, -24, bottomX, this.height + 28);
      }
      for (const side of [-1, 1]) {
        this.road.lineStyle(8, 0x5d4e53, 0.95);
        this.road.lineBetween(center + side * (topW / 2 + 8), -24, center + side * (bottomW / 2 + 10), this.height + 28);
        this.road.lineStyle(6, colors.rail, 1);
        this.road.lineBetween(center + side * (topW / 2 + 26), -24, center + side * (bottomW / 2 + 44), this.height + 28);
        for (let y = -38 + scroll * 1.4; y < this.height + 90; y += 84) {
          const p = Phaser.Math.Clamp(y / Math.max(1, this.height), 0, 1);
          const edge = Phaser.Math.Linear(topW / 2 + 26, bottomW / 2 + 44, p);
          const x = center + side * edge;
          this.road.fillStyle(colors.rail, 1).fillCircle(x, y, 7);
          this.road.fillStyle(0xc35b79, 1).fillTriangle(x - 7, y - 4, x + 7, y - 4, x, y - 18);
          if (Math.floor(y / 84) % 3 === 0) {
            const rockX = x + side * 34;
            this.road.fillStyle(0x6f6658, 0.55).fillEllipse(rockX, y + 24, 24, 15);
            this.road.fillStyle(0xb2a18b, 0.36).fillEllipse(rockX - side * 4, y + 19, 14, 7);
          }
        }
      }
    }

    updatePigs() {
      const totalPigs = Math.max(1, Math.floor(this.state.pigs));
      const visible = Math.min(totalPigs, 24, Math.max(1, Math.ceil(Math.sqrt(totalPigs) * 2.4)));
      const baseX = this.laneX(this.state.x);
      const baseY = this.playerY() - 6;
      const runPhase = this.time.now * 0.012;
      const baseScale = totalPigs <= 1 ? 0.24 : totalPigs <= 4 ? 0.205 : totalPigs <= 10 ? 0.178 : 0.155;
      let existing = this.pigGroup.getChildren();
      while (existing.length < visible) {
        const pig = this.add.image(0, 0, "pigCharacter").setDepth(5).setScale(baseScale);
        pig.seed = Math.random() * Math.PI * 2;
        this.pigGroup.add(pig);
        existing = this.pigGroup.getChildren();
      }
      while (existing.length > visible) {
        existing.pop().destroy();
        existing = this.pigGroup.getChildren();
      }
      for (let i = 0; i < existing.length; i += 1) {
        const pos = this.formationOffset(i, visible);
        const pig = existing[i];
        const bob = Math.sin(runPhase + pig.seed + i * 0.75) * 3.2;
        const sway = Math.sin(runPhase * 0.68 + pig.seed) * 2.1;
        const lean = this.state.moveLean * 0.55;
        pig.setPosition(baseX + pos.x + sway, baseY + pos.y + bob);
        pig.setAngle(lean + Math.sin(runPhase + i) * 2.5);
        pig.setScale(baseScale + Math.sin(runPhase + pig.seed) * 0.006);
      }
      if (this.countBadge) this.countBadge.destroy();
      if (totalPigs > visible) {
        this.countBadge = this.add.text(baseX, baseY + 78, `x${totalPigs}`, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "16px",
          fontStyle: "900",
          color: "#2d2320",
          backgroundColor: "rgba(255,255,255,0.82)",
          padding: { x: 8, y: 4 },
        }).setOrigin(0.5).setDepth(7);
      }
    }

    formationOffset(index, total) {
      const cols = Math.min(6, Math.ceil(Math.sqrt(total)));
      const col = index % cols;
      const row = Math.floor(index / cols);
      const usedCols = Math.min(cols, total - row * cols);
      return { x: (col - (usedCols - 1) / 2) * 25, y: row * 22 };
    }

    drawJoystick() {
      const baseX = this.width * 0.5;
      const baseY = this.height - 86;
      const knobX = baseX + this.state.moveX * 42;
      const knobY = baseY + this.state.moveY * 42;
      this.joystick.clear();
      this.joystick.lineStyle(3, 0x2d2320, 0.38).strokeCircle(baseX, baseY, 54);
      this.joystick.fillStyle(colors.blue, 0.88).fillCircle(knobX, knobY, 19);
    }

    spawnSegment() {
      this.state.segment += 1;
      this.state.spawnTimer = Math.max(980, 1650 - this.state.segment * 18 - (this.state.level - 1) * 75);
      const mod = this.state.segment % 6;
      if (this.state.segment >= 14 && this.state.segment % 14 === 0) this.spawnBoss();
      else if (mod === 1 || mod === 3) this.spawnGateRush();
      else if (mod === 2) {
        this.spawnCoins(undefined, this.spawnTopY() + 80);
        if (this.state.segment > 2) this.spawnEnemyPack(this.spawnTopY() - 430);
      }
      else if (mod === 4) {
        this.spawnCoins(-0.62, this.spawnTopY() + 80);
        this.spawnCoins(0.62, this.spawnTopY() - 160);
      }
      else this.spawnEnemyPack();
    }

    spawnTopY() {
      return -Math.max(320, this.height * 0.62);
    }

    spawnGateRush() {
      const gateY = this.spawnTopY() + 130;
      this.spawnGatePairV2(gateY);
      this.spawnEnemyPack(gateY - 520);
    }

    spawnGatePairV2(y = -70) {
      const choices = [
        [{ label: "攻速x2", kind: "speedMul", value: 2 }, { label: "数量+3", kind: "qty", value: 3 }],
        [{ label: "数量+5", kind: "qty", value: 5 }, { label: "攻击力x3", kind: "atkMul", value: 3 }],
        [{ label: "数量+5", kind: "qty", value: 5 }, { label: "攻击力x3", kind: "atkMul", value: 3 }],
        [{ label: "数量x2", kind: "qtyMul", value: 2 }, { label: "转世为人", kind: "atkMul", value: 2 }],
        [{ label: "攻击力x2", kind: "atkMul", value: 2 }, { label: "攻速x2", kind: "speedMul", value: 2 }],
        [{ label: "数量x2", kind: "qtyMul", value: 2 }, { label: "数量+10", kind: "qty", value: 10 }],
      ][Phaser.Math.Wrap(this.state.segment - 1, 0, 6)];
      const pairId = ++this.state.gatePairId;
      this.createGate(y, -0.48, choices[0], pairId);
      this.createGate(y, 0.48, choices[1], pairId);
      this.createGateDivider(y, pairId);
    }

    createGateDivider(y, pairId) {
      const divider = this.add.container(this.width * 0.5, y).setDepth(4);
      divider.kind = "gateDivider";
      divider.pairId = pairId;
      divider.used = false;
      divider.add(this.add.rectangle(0, 0, 12, 104, colors.rail, 1));
      divider.add(this.add.circle(0, -54, 9, 0xb43d62, 1));
      divider.add(this.add.circle(0, 54, 9, 0xb43d62, 1));
      this.gateGroup.add(divider);
    }

    spawnGatePair() {
      const choices = [
        [{ label: "数量+5", kind: "qty", value: 5 }, { label: "攻击x3", kind: "atkMul", value: 3 }],
        [{ label: "数量+2", kind: "qty", value: 2 }, { label: "数量-8", kind: "qty", value: -8 }],
        [{ label: "攻击x2", kind: "atkMul", value: 2 }, { label: "步入童门", kind: "qty", value: 12 }],
        [{ label: "数量+10", kind: "qty", value: 10 }, { label: "攻击+2", kind: "atkAdd", value: 2 }],
      ][this.state.segment % 4];
      const pairId = ++this.state.gatePairId;
      this.createGate(-70, -0.48, choices[0], pairId);
      this.createGate(-70, 0.48, choices[1], pairId);
    }

    createGate(y, lane, option, pairId = 0) {
      const x = this.laneX(lane);
      const color = option.kind.startsWith("atk") || option.kind.startsWith("speed") ? colors.gateAtk : colors.gateQty;
      const gate = this.add.container(x, y).setDepth(3);
      gate.kind = "gate";
      gate.lane = lane;
      gate.option = option;
      gate.pairId = pairId;
      gate.side = lane < 0 ? -1 : 1;
      gate.used = false;
      gate.add(this.add.rectangle(0, 0, 176, 78, color, 0.14));
      gate.add(this.add.rectangle(0, 0, 170, 70, color, 0.3).setStrokeStyle(3, 0xfff4d2, 0.78));
      gate.add(this.add.rectangle(0, -18, 164, 8, 0xffffff, 0.16));
      gate.add(this.add.rectangle(0, 18, 164, 8, 0xffffff, 0.11));
      for (let i = -2; i <= 2; i += 1) gate.add(this.add.rectangle(i * 30, 0, 2, 68, 0xffffff, 0.08));
      gate.add(this.add.rectangle(lane < 0 ? -89 : 89, 0, 10, 96, colors.rail, 1));
      gate.add(this.add.circle(lane < 0 ? -89 : 89, -50, 9, 0xb43d62, 1));
      gate.add(this.add.circle(lane < 0 ? -89 : 89, 50, 9, 0xb43d62, 1));
      gate.add(this.add.text(0, -2, option.label, {
        fontFamily: "Microsoft YaHei, system-ui, sans-serif",
        fontSize: "22px",
        fontStyle: "900",
        color: "#ffffff",
        stroke: "#14100e",
        strokeThickness: 5,
      }).setOrigin(0.5));
      this.gateGroup.add(gate);
    }

    spawnCoins(lane = Math.random() < 0.5 ? -0.42 : 0.42, yOffset = null) {
      if (yOffset === null || yOffset === undefined) yOffset = this.spawnTopY() + 80;
      const curve = Math.random() < 0.5 ? -1 : 1;
      for (let i = 0; i < 28; i += 1) {
        const wave = Math.sin(i * 0.62) * 32 * curve;
        const fan = (i % 4 - 1.5) * 10;
        const coin = this.add.image(this.laneX(lane) + wave + fan, yOffset - 42 - i * 20, "coin").setDepth(2).setScale(0.82);
        coin.kind = "coin";
        coin.value = 1;
        this.coinGroup.add(coin);
      }
    }

    spawnEnemyPack(yOffset = null) {
      if (yOffset === null || yOffset === undefined) yOffset = this.spawnTopY();
      const amount = Math.min(42, 6 + Math.floor(this.state.segment * 0.95) + (this.state.level - 1) * 3);
      const penId = `zone-${this.state.segment}-${this.time.now}`;
      const cols = 6;
      const rows = Math.max(1, Math.ceil(amount / cols));
      const pen = this.createCombatZone(this.width * 0.5, yOffset - 98 - (rows - 1) * 25, Math.min(326, this.width * 0.82), 128 + rows * 36, penId, false);
      for (let i = 0; i < amount; i += 1) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const usedCols = Math.min(cols, amount - row * cols);
        const x = this.laneX((col - (usedCols - 1) / 2) * 0.14) + Phaser.Math.Between(-5, 5);
      const hp = 8 + this.state.segment * 2.15 + row * 1.5 + (this.state.level - 1) * 7;
        this.createEnemy(x, yOffset - 42 - row * 44 - Phaser.Math.Between(0, 8), "guard", hp, 1, penId);
      }
      return pen;
    }

    spawnBoss() {
      this.state.bossCount += 1;
      const penId = `boss-zone-${this.state.bossCount}-${this.time.now}`;
      const playerY = this.playerY();
      const penHeight = Math.max(420, playerY - 70);
      this.createCombatZone(this.width * 0.5, (playerY + 130) / 2, Math.min(326, this.width * 0.84), penHeight, penId, true);
      this.createEnemy(this.width * 0.5, -92, "boss", 260 + this.state.bossCount * 170 + this.state.segment * 18 + (this.state.level - 1) * 260, 4 + this.state.level - 1, penId);
      this.floatText(`第${this.state.level}关 Boss`, this.width * 0.5, 90, "#db6a55");
    }

    createEnemy(x, y, texture, hp, power, penId = "") {
      const enemy = this.add.image(x, y, texture).setDepth(4).setScale(texture === "boss" ? 1.08 : 0.86);
      enemy.kind = "enemy";
      enemy.type = texture === "boss" ? "boss" : "guard";
      enemy.penId = penId;
      enemy.hp = hp;
      enemy.maxHp = hp;
      enemy.power = power;
      enemy.nextWaveAt = this.time.now + Phaser.Math.Between(900, 1500);
      enemy.movePhase = Math.random() * Math.PI * 2;
      enemy.moveAmp = texture === "boss" ? Math.min(70, this.width * 0.18) : Phaser.Math.Between(8, 22);
      enemy.baseX = x;
      this.enemyGroup.add(enemy);
    }

    createCombatZone(x, y, width, height, penId, isBoss) {
      const pen = this.add.container(x, y).setDepth(2);
      pen.kind = "zone";
      pen.penId = penId;
      pen.widthValue = width;
      pen.heightValue = height;
      pen.isBoss = isBoss;
      pen.activeCombat = false;
      pen.nextAttackAt = 0;
      this.penGroup.add(pen);
      return pen;
    }

    moveEnemyInsideZone(enemy, zone, playerX, playerY, delta) {
      const dt = delta / 1000;
      const targetY = playerY;
      const dx = playerX - enemy.x;
      const dy = targetY - enemy.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const entryBoost = enemy.y < this.combatPullLine() - 64 ? (enemy.type === "boss" ? 110 : 150) : 0;
      const speed = (enemy.type === "boss" ? 44 : 34) + Math.min(16, this.state.segment * 1.05) + entryBoost;
      enemy.x += (dx / distance) * speed * dt;
      enemy.y += (dy / distance) * speed * dt;
      enemy.x += Math.sin(this.time.now * 0.004 + enemy.movePhase) * 0.35;
      const paddingX = enemy.type === "boss" ? 54 : 26;
      enemy.x = Phaser.Math.Clamp(enemy.x, this.laneX(-1.02) + paddingX, this.laneX(1.02) - paddingX);
      enemy.y = Phaser.Math.Clamp(enemy.y, 72, this.height - (enemy.type === "boss" ? 150 : 86));
      enemy.baseX = enemy.x;
    }

    updateObjects(delta) {
      const combatActive = Boolean(this.activeCombatZone());
      const dy = combatActive ? 0 : (this.state.runSpeed * this.state.forwardInput * delta) / 1000;
      const playerX = this.laneX(this.state.x);
      const playerY = this.playerY();

      for (const group of [this.gateGroup, this.obstacleGroup]) {
        for (const obj of group.getChildren()) obj.y += dy;
      }

      for (const pen of this.penGroup.getChildren()) {
        if (pen.breaking) continue;
        if (pen.isBoss) continue;
        if (pen.activeCombat) {
          pen.y += 0;
        } else {
          pen.y += dy;
        }
      }

      for (const enemy of this.enemyGroup.getChildren()) {
        const pen = this.penGroup.getChildren().find((item) => item.penId === enemy.penId && !item.breaking);
        if (enemy.type === "boss") {
          if (pen && pen.activeCombat) {
            this.moveEnemyInsideZone(enemy, pen, playerX, playerY, delta);
            this.updateBossWave(enemy, playerX, playerY);
          } else {
            enemy.y += Math.min(dy, Math.max(0, 130 - enemy.y) * 0.08);
            enemy.x = this.width * 0.5 + Math.sin(this.time.now * 0.0014 + enemy.movePhase) * enemy.moveAmp;
          }
          if (pen) pen.x = this.width * 0.5;
        } else {
          if (pen && pen.activeCombat) {
            this.moveEnemyInsideZone(enemy, pen, playerX, playerY, delta);
          } else {
            enemy.y += dy;
            enemy.x = enemy.baseX + Math.sin(this.time.now * 0.003 + enemy.movePhase) * enemy.moveAmp;
          }
        }
      }

      for (const gate of this.gateGroup.getChildren()) {
        const playerSide = playerX <= this.width * 0.5 ? -1 : 1;
        if (!gate.used && Math.abs(gate.y - playerY) < 78 && gate.side === playerSide) {
          this.consumeGatePair(gate);
        } else if (gate.y > this.height + 80) gate.destroy();
      }

      this.updateCoins(delta, playerX, playerY, dy);
      this.updateObstacles(playerX, playerY);
      this.updateBossWaves(delta, playerX, playerY, dy);

      for (const enemy of this.enemyGroup.getChildren()) {
        if (Phaser.Math.Distance.Between(enemy.x, enemy.y, playerX, playerY) < (enemy.type === "boss" ? 82 : 42)) {
          this.hurtPigs(enemy);
        } else if (enemy.y > this.height + 90) {
          enemy.destroy();
        }
      }
    }

    updateBossWave(enemy, playerX, playerY) {
      if (enemy.type !== "boss" || this.time.now < enemy.nextWaveAt) return;
      const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y + 22, playerX, playerY - 12);
      const wave = this.add.image(enemy.x, enemy.y + 22, "greenShot").setDepth(6).setScale(1.16);
      const speed = 170 + Math.min(70, this.state.bossCount * 10);
      wave.kind = "bossWave";
      wave.vx = Math.cos(angle) * speed;
      wave.vy = Math.sin(angle) * speed;
      wave.damage = Math.max(1, Math.ceil(enemy.power * 0.65));
      wave.expiresAt = this.time.now + 3600;
      wave.angle = Phaser.Math.RadToDeg(angle) + 90;
      this.enemyShotGroup.add(wave);
      enemy.nextWaveAt = this.time.now + Phaser.Math.Between(1250, 1850);
    }

    updateBossWaves(delta, playerX, playerY, dy) {
      const dt = delta / 1000;
      for (const wave of this.enemyShotGroup.getChildren()) {
        if (!wave.active) continue;
        wave.x += wave.vx * dt;
        wave.y += wave.vy * dt + dy;
        wave.angle += 70 * dt;
        if (wave.expiresAt <= this.time.now || wave.y > this.height + 90 || wave.x < -90 || wave.x > this.width + 90) {
          wave.destroy();
          continue;
        }
        if (Phaser.Math.Distance.Between(wave.x, wave.y, playerX, playerY) < 38) {
          const loss = wave.damage || 1;
          this.state.pigs -= loss;
          this.floatText(`-${loss}`, playerX, playerY - 62, "#db6a55");
          this.pop(wave.x, wave.y, 0x48ff3f, 10);
          wave.destroy();
          if (this.state.pigs <= 0) this.endGame(false);
        }
      }
    }

    consumeGatePair(selectedGate) {
      if (selectedGate.used) return;
      const selectedPairId = selectedGate.pairId;
      const pair = this.gateGroup.getChildren().filter((gate) => gate.active && gate.pairId === selectedPairId);
      for (const gate of pair) gate.used = true;
      this.applyGate(selectedGate.option);
      for (const gate of pair) {
        if (gate === selectedGate) {
          this.flashGate(gate);
        } else {
          gate.destroy();
        }
      }
    }

    flashGate(gate) {
      const x = gate.x;
      const y = gate.y;
      const glow = this.add.rectangle(x, y, 136, 62, 0xffffff, 0.42).setDepth(6).setStrokeStyle(4, 0xffffff, 0.78);
      this.fxGroup.add(glow);
      this.tweens.add({
        targets: glow,
        scaleX: 1.3,
        scaleY: 1.35,
        alpha: 0,
        duration: 220,
        onComplete: () => glow.destroy(),
      });
      gate.destroy();
    }

    updateCoins(delta, playerX, playerY, dy) {
      const dt = delta / 1000;
      for (const coin of this.coinGroup.getChildren()) {
        if (!coin.active) continue;
        coin.y += dy;
        if (coin.vx || coin.vy) {
          coin.x += coin.vx * dt;
          coin.y += coin.vy * dt;
          coin.vx *= 0.92;
          coin.vy *= 0.9;
        }
        const distance = Phaser.Math.Distance.Between(coin.x, coin.y, playerX, playerY);
        if (distance < 170) {
          coin.magnet = true;
          coin.x += (playerX - coin.x) * Math.min(1, dt * 5.8);
          coin.y += (playerY - coin.y) * Math.min(1, dt * 5.8);
          coin.setScale(Math.min(1, (coin.scaleX || 0.8) + dt * 0.7));
        }
        if (distance < 42) {
          this.state.coins += coin.value || 1;
          this.pop(coin.x, coin.y, colors.coin, 5);
          coin.destroy();
        } else if (coin.y > this.height + 70) {
          coin.destroy();
        }
      }
    }

    updateObstacles(playerX, playerY) {
      for (const rock of this.obstacleGroup.getChildren()) {
        if (!rock.active) continue;
        if (!rock.hit && Phaser.Math.Distance.Between(rock.x, rock.y, playerX, playerY) < 50) {
          rock.hit = true;
          const loss = Math.min(Math.max(1, Math.ceil(this.state.pigs * 0.08)), 6);
          this.state.pigs -= loss;
          this.floatText(`-${loss}`, playerX, playerY - 72, "#db6a55");
          this.pop(rock.x, rock.y, 0x7c776b, 12);
          rock.destroy();
          if (this.state.pigs <= 0) this.endGame(false);
        } else if (rock.y > this.height + 80) {
          rock.destroy();
        }
      }
    }

    updatePenCombat(delta) {
      const playerX = this.laneX(this.state.x);
      const playerY = this.playerY();
      const hasOpenGate = this.gateGroup.getChildren().some((gate) => gate.active && gate.kind === "gate" && !gate.used);
      for (const pen of this.penGroup.getChildren()) {
        if (!pen.active) continue;
        if (pen.breaking) continue;
        const enemies = this.enemyGroup.getChildren().filter((enemy) => enemy.active && enemy.penId === pen.penId);
        if (enemies.length === 0) {
          this.breakPigPen(pen, pen.isBoss);
          continue;
        }

        if (!pen.activeCombat) {
          const pullLineReached = !hasOpenGate && playerY <= this.combatPullLine();
          const waveIsInView = enemies.some((enemy) => enemy.y > 76) || pen.y > 76;
          if (pullLineReached || waveIsInView) {
            pen.activeCombat = true;
          } else if (!pen.isBoss && pen.y > this.height + 120) {
            pen.destroy();
          }
        }
      }
    }

    applyGate(option) {
      if (option.kind === "qty") this.state.pigs = Math.max(1, this.state.pigs + option.value);
      if (option.kind === "qtyMul") this.state.pigs = Math.max(1, Math.floor(this.state.pigs * option.value));
      if (option.kind === "atkMul") this.state.attack = Math.min(999, Math.floor(this.state.attack * option.value));
      if (option.kind === "atkAdd") this.state.attack = Math.min(999, this.state.attack + option.value);
      if (option.kind === "speedMul") this.state.attackSpeed = Math.min(12, this.state.attackSpeed * option.value);
      if (option.kind === "speedAdd") this.state.attackSpeed = Math.min(12, this.state.attackSpeed + option.value);
      if (option.value > 0) this.state.combo += 1;
      this.floatText(option.label, this.laneX(this.state.x), this.height - 190, option.value < 0 ? "#db6a55" : "#4f9c5f");
      this.floatText(`COMBO x${Math.max(1, this.state.combo)}`, this.width * 0.5, this.height - 238, "#f3c43b");
    }

    hurtPigs(enemy) {
      if (this.time.now < this.state.nextContactDamageAt) return;
      if (enemy.lastBiteAt && this.time.now - enemy.lastBiteAt < 520) return;
      enemy.lastBiteAt = this.time.now;
      this.state.nextContactDamageAt = this.time.now + (enemy.type === "boss" ? 700 : 880);
      const loss = Math.max(1, enemy.type === "boss" ? Math.ceil(enemy.power * 0.5) : 1);
      const penId = enemy.penId;
      const wasBoss = enemy.type === "boss";
      this.state.pigs -= loss;
      this.floatText(`-${loss}`, this.laneX(this.state.x), this.playerY() - 62, "#db6a55");
      this.pop(this.laneX(this.state.x), this.playerY() - 10, colors.pigDark, 8);
      if (enemy.type !== "boss") {
        enemy.destroy();
        this.checkPenCleared(penId, wasBoss);
      }
      if (this.state.pigs <= 0) this.endGame(false);
    }

    shotCount() {
      return Math.max(1, Math.ceil(Math.sqrt(Math.max(1, Math.floor(this.state.pigs)))) + 1);
    }

    autoThrowCoins(delta) {
      if (this.state.fireTimer > 0) return;
      const delay = Math.max(115, 330 / Math.max(0.35, this.state.attackSpeed));
      const shooters = this.shotCount();
      const baseX = this.laneX(this.state.x);
      const baseY = this.playerY() - 32;
      const volley = [];
      for (let i = 0; i < shooters; i += 1) {
        const offset = this.formationOffset(i, shooters);
        const target = this.nearestThrowTarget(baseX + offset.x, baseY);
        if (target) volley.push({ offset, target, index: i });
      }
      if (volley.length === 0) {
        this.state.fireTimer = 72;
        return;
      }
      this.state.fireTimer = delay;
      for (const shot of volley) {
        this.throwCoinShot(baseX + shot.offset.x, baseY + shot.offset.y, shot.target, shot.index, shooters);
      }
    }

    nearestThrowTarget(x, y) {
      let best = null;
      let bestScore = Infinity;
      for (const enemy of this.enemyGroup.getChildren()) {
        if (!enemy.active) continue;
        const zone = this.penGroup.getChildren().find((item) => item.active && item.penId === enemy.penId);
        if (!zone || !zone.activeCombat) continue;
        const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
        if (distance > Math.min(245, this.height * 0.3)) continue;
        const dx = Math.abs(enemy.x - x);
        const dy = Math.abs(y - enemy.y);
        const score = dx * 1.15 + dy * 0.72;
        if (score < bestScore) {
          bestScore = score;
          best = enemy;
        }
      }
      return best;
    }

    throwCoinShot(x, y, target, index, total) {
      const shot = this.add.image(x, y, "coin").setDepth(6).setScale(total > 12 ? 0.38 : 0.46);
      const spread = (index - (total - 1) / 2) * 10;
      let vx = spread;
      let vy = -680;
      if (target) {
        const tx = target.x + Phaser.Math.Between(-18, 18);
        const ty = target.y + Phaser.Math.Between(-22, 12);
        const angle = Phaser.Math.Angle.Between(x, y, tx, ty);
        const speed = 560 + Math.min(130, this.state.attackSpeed * 24);
        vx = Math.cos(angle) * speed + spread * 0.28;
        vy = Math.sin(angle) * speed;
      }
      shot.kind = "coinShot";
      shot.vx = vx;
      shot.vy = vy;
      shot.gravity = 0;
      shot.target = target;
      shot.damage = Math.max(2, Math.round(this.state.attack * 1.15));
      shot.expiresAt = this.time.now + 560;
      this.playerShotGroup.add(shot);
    }

    updateCoinShots(delta) {
      const dt = delta / 1000;
      for (const shot of this.playerShotGroup.getChildren()) {
        if (!shot.active) continue;
        shot.vy += (shot.gravity || 0) * dt;
        shot.x += shot.vx * dt;
        shot.y += shot.vy * dt;
        shot.angle += 720 * dt;
        if (shot.expiresAt <= this.time.now || shot.y < -80 || shot.x < -80 || shot.x > this.width + 80) {
          shot.destroy();
          continue;
        }
        for (const enemy of this.enemyGroup.getChildren()) {
          if (!enemy.active) continue;
          const radius = enemy.type === "boss" ? 72 : 37;
          if (Phaser.Math.Distance.Between(shot.x, shot.y, enemy.x, enemy.y) <= radius) {
            this.damageEnemy(enemy, shot.damage);
            this.pop(shot.x, shot.y, colors.coin, 4);
            shot.destroy();
            break;
          }
        }
      }
    }

    damageEnemy(enemy, amount) {
      enemy.hp -= amount;
      this.pop(enemy.x, enemy.y, colors.coin, enemy.type === "boss" ? 8 : 4);
      if (enemy.hp > 0) return;
      const reward = enemy.type === "boss" ? 36 : 5;
      const penId = enemy.penId;
      const wasBoss = enemy.type === "boss";
      this.floatText(`+${reward}`, enemy.x, enemy.y, "#f3c43b");
      this.dropCoins(enemy.x, enemy.y, reward, enemy.type === "boss");
      enemy.destroy();
      this.checkPenCleared(penId, wasBoss);
    }

    checkPenCleared(penId, wasBoss) {
      if (!penId) return;
      const hasEnemies = this.enemyGroup.getChildren().some((enemy) => enemy.active && enemy.penId === penId);
      if (hasEnemies) return;
      const pen = this.penGroup.getChildren().find((item) => item.active && item.penId === penId);
      if (!pen) return;
      this.breakPigPen(pen, wasBoss);
    }

    breakPigPen(pen, wasBoss) {
      if (!pen || !pen.active || pen.breaking) return;
      pen.breaking = true;
      pen.activeCombat = false;
      const text = wasBoss ? "Boss 倒下！" : "清空！";
      const color = wasBoss ? "#db6a55" : "#f3c43b";
      this.floatText(text, pen.x, Math.max(88, pen.y - pen.heightValue * 0.35), color);
      this.pop(pen.x, pen.y, wasBoss ? colors.gateAtk : colors.coin, wasBoss ? 28 : 18);
      if (wasBoss) {
        const bonus = 10 + this.state.bossCount * 2;
        this.state.pigs = Math.min(maxSquad, this.state.pigs + bonus);
        this.floatText(`猪群+${bonus}`, this.width * 0.5, this.height - 238, "#4f9c5f");
        this.playerShotGroup.clear(true, true);
        this.enemyShotGroup.clear(true, true);
        for (const zone of this.penGroup.getChildren()) {
          if (zone !== pen) zone.destroy();
        }
        this.tweens.add({
          targets: pen,
          scaleX: 1.08,
          scaleY: 1.08,
          alpha: 0,
          duration: 260,
          onComplete: () => {
            pen.destroy();
            this.advanceLevel();
          },
        });
        return;
      }
      for (const child of pen.list || []) {
        this.tweens.add({
          targets: child,
          x: child.x + Phaser.Math.Between(-34, 34),
          y: child.y + Phaser.Math.Between(-24, 24),
          angle: Phaser.Math.Between(-35, 35),
          alpha: 0,
          duration: 320,
        });
      }
      this.tweens.add({
        targets: pen,
        scaleX: 1.08,
        scaleY: 1.08,
        alpha: 0,
        duration: 340,
        onComplete: () => pen.destroy(),
      });
      this.state.spawnTimer = wasBoss ? 0 : Math.min(Math.max(this.state.spawnTimer, 180), 360);
    }

    advanceLevel() {
      this.state.level += 1;
      this.state.segment = 0;
      this.state.combo = 0;
      this.state.runSpeed = Math.min(430, this.state.runSpeed + 18);
      this.state.fireTimer = Math.min(this.state.fireTimer, 80);
      this.state.spawnTimer = 999999;
      this.gateGroup.clear(true, true);
      this.enemyGroup.clear(true, true);
      this.penGroup.clear(true, true);
      this.obstacleGroup.clear(true, true);
      this.playerShotGroup.clear(true, true);
      this.enemyShotGroup.clear(true, true);
      this.floatText(`第${this.state.level}关`, this.width * 0.5, this.height * 0.38, "#ffffff");
      this.floatText("新的虫群来了", this.width * 0.5, this.height * 0.38 + 44, "#f3c43b");
      this.time.delayedCall(700, () => {
        if (this.state.status !== "playing") return;
        this.spawnSegment();
      });
    }

    dropCoins(x, y, amount, isBoss = false) {
      for (let i = 0; i < amount; i += 1) {
        const coin = this.add.image(x + Phaser.Math.Between(-24, 24), y + Phaser.Math.Between(-14, 14), "coin").setDepth(2).setScale(isBoss ? 0.72 : 0.78);
        coin.kind = "coin";
        coin.value = 1;
        coin.vx = Phaser.Math.Between(-80, 80);
        coin.vy = Phaser.Math.Between(isBoss ? 10 : 20, isBoss ? 160 : 110);
        this.coinGroup.add(coin);
      }
    }

    drawEnemyHpBars() {
      this.hpBars.clear();
      for (const enemy of this.enemyGroup.getChildren()) {
        if (!enemy.active) continue;
        const w = enemy.type === "boss" ? 104 : 44;
        const h = enemy.type === "boss" ? 8 : 6;
        const x = enemy.x - w / 2;
        const y = enemy.y - enemy.displayHeight * 0.45 - 11;
        const ratio = Phaser.Math.Clamp(enemy.hp / enemy.maxHp, 0, 1);
        this.hpBars.fillStyle(0x271b18, 0.7).fillRoundedRect(x, y, w, h, h / 2);
        this.hpBars.fillStyle(ratio < 0.35 ? 0xffd24a : 0x9dff4e, 0.95).fillRoundedRect(x, y, w * ratio, h, h / 2);
      }
    }

    pop(x, y, color, amount) {
      for (let i = 0; i < amount; i += 1) {
        const dot = this.add.circle(x, y, Phaser.Math.Between(2, 5), color, 0.9).setDepth(7);
        this.fxGroup.add(dot);
        this.tweens.add({
          targets: dot,
          x: x + Phaser.Math.Between(-26, 26),
          y: y + Phaser.Math.Between(-28, 18),
          alpha: 0,
          duration: 320,
          onComplete: () => dot.destroy(),
        });
      }
    }

    floatText(text, x, y, color) {
      const label = this.add.text(x, y, text, {
        fontFamily: "Microsoft YaHei, system-ui, sans-serif",
        fontSize: "22px",
        fontStyle: "900",
        color,
        stroke: "#ffffff",
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(9);
      this.fxGroup.add(label);
      this.tweens.add({ targets: label, y: y - 44, alpha: 0, duration: 760, onComplete: () => label.destroy() });
    }

    updateHud() {
      coinLabel.textContent = String(this.state.coins);
      pigLabel.textContent = String(Math.floor(this.state.pigs));
    }

    endGame(won) {
      this.state.status = "ended";
      this.setPaused(true);
      showPanel(`
        <p class="kicker">${won ? "突围成功" : "猪群倒下"}</p>
        <h1>${won ? "胜利" : "失败"}</h1>
        <p class="hint">第 ${this.state.level} 关 · 金币 ${this.state.coins} · 攻击 ${this.state.attack}</p>
        <button id="primaryButton" type="button">重新开始</button>
      `);
      panel.querySelector("#primaryButton").addEventListener("click", () => this.startGame());
    }

    setPaused(paused) {
      if (paused) this.scene.pause();
      else this.scene.resume();
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
    const scene = game.scene.getScene("PigChargeScene");
    if (!scene || scene.state.status !== "playing") return;
    if (scene.scene.isPaused()) {
      hideOverlay();
      scene.setPaused(false);
    } else {
      scene.setPaused(true);
      showPanel(`
        <p class="kicker">Paused</p>
        <h1>猪群突围</h1>
        <p class="hint">调整一下手感，再继续冲锋。</p>
        <button id="resumeButton" type="button">继续</button>
        <button id="restartButton" class="secondary-button" type="button">重新开始</button>
      `);
      panel.querySelector("#resumeButton").addEventListener("click", togglePause);
      panel.querySelector("#restartButton").addEventListener("click", () => scene.startGame());
    }
  }

  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    canvas,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: "#d49767",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: PigChargeScene,
  });

  primaryButton.addEventListener("click", () => {
    const scene = game.scene.getScene("PigChargeScene");
    if (scene) scene.startGame();
  });

  pauseButton.addEventListener("click", togglePause);
})();

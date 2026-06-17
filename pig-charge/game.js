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
    road: 0x9d8d83,
    roadLine: 0xcbbdb4,
    rail: 0xad4464,
    pig: 0xffa7bf,
    pigDark: 0xc46b81,
    blue: 0x2789df,
    gateQty: 0x8a58d8,
    gateAtk: 0xdb6a55,
    coin: 0xf3c43b,
    enemy: 0x603b31,
  };

  class PigChargeScene extends Phaser.Scene {
    constructor() {
      super("PigChargeScene");
      this.state = {};
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

      this.input.on("pointerdown", (pointer) => this.setTarget(pointer));
      this.input.on("pointermove", (pointer) => this.setTarget(pointer));
      this.input.keyboard.on("keydown-LEFT", () => this.nudgeTarget(-0.28));
      this.input.keyboard.on("keydown-A", () => this.nudgeTarget(-0.28));
      this.input.keyboard.on("keydown-RIGHT", () => this.nudgeTarget(0.28));
      this.input.keyboard.on("keydown-D", () => this.nudgeTarget(0.28));
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
      this.state.targetX = 0;
      this.state.lastX = 0;
      this.state.moveLean = 0;
      this.state.pigs = 3;
      this.state.attack = 1;
      this.state.attackSpeed = 1;
      this.state.coins = 0;
      this.state.segment = 0;
      this.state.gatePairId = 0;
      this.state.spawnTimer = 0;
      this.state.fireTimer = 180;
      this.state.obstacleTimer = 1800;
      this.state.runSpeed = 280;
      this.state.combo = 0;
      this.state.bossCount = 0;
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
      g.fillStyle(0x261817, 0.32).fillEllipse(28, 58, 36, 10);
      g.fillStyle(0x351817, 1).fillRoundedRect(16, 24, 24, 31, 8);
      g.fillStyle(0x661d21, 1).fillTriangle(15, 25, 4, 44, 20, 39).fillTriangle(39, 25, 52, 44, 36, 39);
      g.fillStyle(0x1d1718, 1).fillCircle(28, 18, 13);
      g.fillStyle(0x7f2230, 1);
      g.fillTriangle(16, 12, 13, 0, 24, 9).fillTriangle(24, 8, 28, 0, 33, 9).fillTriangle(32, 9, 44, 2, 39, 15);
      g.fillStyle(0xf3c43b, 1).fillRoundedRect(8, 22, 40, 5, 2);
      g.fillStyle(0xffffff, 0.9).fillCircle(24, 17, 2).fillCircle(32, 17, 2);
      g.lineStyle(3, 0x1d1718, 1).lineBetween(20, 54, 15, 63).lineBetween(36, 54, 41, 63);
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
      g.fillStyle(0xffda4f, 1).fillEllipse(18, 14, 32, 18);
      g.fillStyle(0xf0a71f, 1).fillRoundedRect(8, 6, 20, 16, 5);
      g.fillStyle(0xfff2a8, 0.92).fillEllipse(18, 10, 17, 7);
      g.lineStyle(3, 0x9d6b19, 1).strokeEllipse(18, 14, 31, 17);
      g.lineStyle(2, 0xbd7a19, 0.9).lineBetween(9, 16, 27, 16);
      g.generateTexture("ingot", 36, 28);

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

    setTarget(pointer) {
      if (this.state.status !== "playing") return;
      this.state.targetX = Phaser.Math.Clamp((pointer.x / this.width - 0.5) * 2.55, -1.04, 1.04);
    }

    nudgeTarget(amount) {
      if (this.state.status !== "playing") return;
      this.state.targetX = Phaser.Math.Clamp(this.state.targetX + amount, -1.04, 1.04);
    }

    update(time, delta) {
      if (this.state.status !== "playing" || this.scene.isPaused()) return;
      const dt = Math.min(delta, 34) / 1000;
      const beforeX = this.state.x;
      this.state.x += (this.state.targetX - this.state.x) * Math.min(1, dt * 18);
      this.state.moveLean += ((this.state.x - beforeX) * 180 - this.state.moveLean) * Math.min(1, dt * 10);
      this.state.moveLean = Phaser.Math.Clamp(this.state.moveLean, -14, 14);
      this.state.lastX = beforeX;
      this.state.spawnTimer -= delta;
      this.state.fireTimer -= delta;
      this.state.obstacleTimer -= delta;
      this.drawRoad(time);
      this.updateObjects(delta);
      this.autoThrowIngots(delta);
      this.updatePenCombat(delta);
      this.updateIngots(delta);
      this.updateEnemyShots(delta);
      this.updatePigs();
      this.drawEnemyHpBars();
      this.drawJoystick();
      this.updateHud();
      if (this.state.spawnTimer <= 0) this.spawnSegment();
    }

    drawRoad(time) {
      const center = this.width * 0.5;
      const bottomW = Math.min(360, this.width * 0.9);
      const topW = Math.min(260, bottomW * 0.68);
      const scroll = (time * 0.18) % 54;
      this.road.clear();
      this.road.fillStyle(0xd9915d, 1).fillRect(0, 0, this.width, this.height);
      this.road.fillStyle(0xb8ada5, 0.22).fillCircle(center - bottomW * 0.58, this.height * 0.15, 96);
      this.road.fillStyle(0xc17b55, 0.32).fillCircle(center + bottomW * 0.55, this.height * 0.78, 118);
      this.road.fillStyle(colors.road, 1);
      this.road.fillPoints([
        new Phaser.Geom.Point(center - topW / 2, -24),
        new Phaser.Geom.Point(center + topW / 2, -24),
        new Phaser.Geom.Point(center + bottomW / 2, this.height + 28),
        new Phaser.Geom.Point(center - bottomW / 2, this.height + 28),
      ], true, true);
      this.road.lineStyle(7, colors.rail, 1);
      this.road.lineBetween(center - topW / 2 - 8, -24, center - bottomW / 2 - 8, this.height + 28);
      this.road.lineBetween(center + topW / 2 + 8, -24, center + bottomW / 2 + 8, this.height + 28);
      this.road.lineStyle(2, colors.roadLine, 0.62);
      for (let y = -54 + scroll; y < this.height + 54; y += 54) {
        const p = Phaser.Math.Clamp(y / Math.max(1, this.height), 0, 1);
        const w = Phaser.Math.Linear(topW * 0.36, bottomW * 0.58, p);
        this.road.lineBetween(center - w * 0.36, y, center + w * 0.36, y);
      }
    }

    updatePigs() {
      const totalPigs = Math.max(1, Math.floor(this.state.pigs));
      const visible = Math.min(totalPigs, 24, Math.max(1, Math.ceil(Math.sqrt(totalPigs) * 2.4)));
      const baseX = this.laneX(this.state.x);
      const baseY = this.height - 124;
      const runPhase = this.time.now * 0.012;
      let existing = this.pigGroup.getChildren();
      while (existing.length < visible) {
        const pig = this.add.image(0, 0, "pig").setDepth(5).setScale(0.62);
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
        pig.setScale(0.6 + Math.sin(runPhase + pig.seed) * 0.018);
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
      const knobX = baseX + this.state.x * 42;
      this.joystick.clear();
      this.joystick.lineStyle(3, 0x2d2320, 0.38).strokeCircle(baseX, baseY, 54);
      this.joystick.fillStyle(colors.blue, 0.88).fillCircle(knobX, baseY, 19);
    }

    spawnSegment() {
      this.state.segment += 1;
      this.state.spawnTimer = 2050;
      const mod = this.state.segment % 5;
      if (this.state.segment % 8 === 0) this.spawnBoss();
      else if (mod === 1 || mod === 3) this.spawnGatePairV2();
      else if (mod === 2) {
        this.spawnCoins();
        if (this.state.segment > 4) this.spawnEnemyPack(-360);
      }
      else this.spawnEnemyPack();
    }

    spawnGatePairV2() {
      const choices = [
        [{ label: "数量+5", kind: "qty", value: 5 }, { label: "攻击力x3", kind: "atkMul", value: 3 }],
        [{ label: "攻击力x2", kind: "atkMul", value: 2 }, { label: "攻击速x3", kind: "speedMul", value: 3 }],
        [{ label: "数量+2", kind: "qty", value: 2 }, { label: "数量-8", kind: "qty", value: -8 }],
        [{ label: "攻击力x2", kind: "atkMul", value: 2 }, { label: "步入道门", kind: "qtyMul", value: 2 }],
        [{ label: "攻击速x2", kind: "speedMul", value: 2 }, { label: "数量+10", kind: "qty", value: 10 }],
      ][Phaser.Math.Wrap(this.state.segment - 1, 0, 5)];
      const pairId = ++this.state.gatePairId;
      this.createGate(-70, -0.48, choices[0], pairId);
      this.createGate(-70, 0.48, choices[1], pairId);
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
      gate.used = false;
      gate.add(this.add.rectangle(-64, 0, 10, 72, 0x93315f, 0.96));
      gate.add(this.add.rectangle(64, 0, 10, 72, 0x93315f, 0.96));
      gate.add(this.add.circle(-64, -38, 7, 0xb54a79, 1));
      gate.add(this.add.circle(64, -38, 7, 0xb54a79, 1));
      gate.add(this.add.rectangle(0, 3, 130, 54, 0x2d2320, 0.28));
      gate.add(this.add.rectangle(0, 0, 126, 52, color, 0.72).setStrokeStyle(3, color, 1));
      gate.add(this.add.text(0, 0, option.label, {
        fontFamily: "Microsoft YaHei, system-ui, sans-serif",
        fontSize: "18px",
        fontStyle: "900",
        color: "#ffffff",
        stroke: "#3c241f",
        strokeThickness: 3,
      }).setOrigin(0.5));
      this.gateGroup.add(gate);
    }

    spawnCoins() {
      const lane = Math.random() < 0.5 ? -0.42 : 0.42;
      const curve = Math.random() < 0.5 ? -1 : 1;
      for (let i = 0; i < 28; i += 1) {
        const wave = Math.sin(i * 0.62) * 32 * curve;
        const fan = (i % 4 - 1.5) * 10;
        const coin = this.add.image(this.laneX(lane) + wave + fan, -42 - i * 20, "coin").setDepth(2).setScale(0.82);
        coin.kind = "coin";
        coin.value = 1;
        this.coinGroup.add(coin);
      }
    }

    spawnEnemyPack(yOffset = 0) {
      const amount = Math.min(20, 3 + Math.floor(this.state.segment * 0.72));
      const penId = `pen-${this.state.segment}-${this.time.now}`;
      const rows = Math.max(1, Math.ceil(amount / 5));
      const pen = this.createPigPen(this.width * 0.5, yOffset - 92 - (rows - 1) * 27, Math.min(312, this.width * 0.78), 92 + rows * 36, penId, false);
      for (let i = 0; i < amount; i += 1) {
        const row = Math.floor(i / 5);
        const col = i % 5;
        const usedCols = Math.min(5, amount - row * 5);
        const x = this.laneX((col - (usedCols - 1) / 2) * 0.17) + Phaser.Math.Between(-6, 6);
        const hp = 20 + this.state.segment * 5 + row * 4;
        this.createEnemy(x, yOffset - 48 - row * 54 - Phaser.Math.Between(0, 10), "guard", hp, 1, penId);
      }
      return pen;
    }

    spawnBoss() {
      this.state.bossCount += 1;
      const penId = `boss-pen-${this.state.bossCount}-${this.time.now}`;
      const playerY = this.height - 118;
      const penHeight = Math.max(420, playerY - 70);
      this.createPigPen(this.width * 0.5, (playerY + 130) / 2, Math.min(326, this.width * 0.84), penHeight, penId, true);
      this.createEnemy(this.width * 0.5, -92, "boss", 260 + this.state.bossCount * 170 + this.state.segment * 18, 4, penId);
      this.floatText("Boss", this.width * 0.5, 90, "#db6a55");
    }

    createEnemy(x, y, texture, hp, power, penId = "") {
      const enemy = this.add.image(x, y, texture).setDepth(4).setScale(texture === "boss" ? 1.08 : 0.86);
      enemy.kind = "enemy";
      enemy.type = texture === "boss" ? "boss" : "guard";
      enemy.penId = penId;
      enemy.hp = hp;
      enemy.maxHp = hp;
      enemy.power = power;
      enemy.nextShotAt = this.time.now + Phaser.Math.Between(1200, 2200);
      enemy.movePhase = Math.random() * Math.PI * 2;
      enemy.moveAmp = texture === "boss" ? Math.min(70, this.width * 0.18) : Phaser.Math.Between(8, 22);
      enemy.baseX = x;
      this.enemyGroup.add(enemy);
    }

    createPigPen(x, y, width, height, penId, isBoss) {
      const pen = this.add.container(x, y).setDepth(2);
      pen.kind = "pen";
      pen.penId = penId;
      pen.widthValue = width;
      pen.heightValue = height;
      pen.isBoss = isBoss;
      pen.activeCombat = false;
      pen.nextAttackAt = 0;
      pen.nextRetaliateAt = 0;
      const fill = this.add.rectangle(0, 0, width, height, isBoss ? 0x7b4a57 : 0x5f6b55, isBoss ? 0.13 : 0.16);
      const railTop = this.add.rectangle(0, -height / 2, width, 8, 0x8b4d35, 0.95);
      const railBottom = this.add.rectangle(0, height / 2, width, 8, 0x8b4d35, 0.95);
      const railLeft = this.add.rectangle(-width / 2, 0, 8, height, 0x8b4d35, 0.95);
      const railRight = this.add.rectangle(width / 2, 0, 8, height, 0x8b4d35, 0.95);
      pen.add([fill, railTop, railBottom, railLeft, railRight]);
      for (let i = -1; i <= 1; i += 1) {
        pen.add(this.add.circle(i * width * 0.34, -height / 2, 7, 0xa6603e, 1));
        pen.add(this.add.circle(i * width * 0.34, height / 2, 7, 0xa6603e, 1));
      }
      if (isBoss) {
        pen.add(this.add.text(0, -height / 2 + 24, "猪栏", {
          fontFamily: "Microsoft YaHei, system-ui, sans-serif",
          fontSize: "20px",
          fontStyle: "900",
          color: "#ffffff",
          stroke: "#5d302d",
          strokeThickness: 4,
        }).setOrigin(0.5));
      }
      this.penGroup.add(pen);
      return pen;
    }

    updateObjects(delta) {
      const dy = (this.state.runSpeed * delta) / 1000;
      const playerX = this.laneX(this.state.x);
      const playerY = this.height - 118;

      for (const group of [this.gateGroup, this.obstacleGroup]) {
        for (const obj of group.getChildren()) obj.y += dy;
      }

      for (const pen of this.penGroup.getChildren()) {
        if (pen.isBoss) continue;
        if (pen.activeCombat) {
          pen.y += (playerY - pen.y) * Math.min(1, (delta / 1000) * 10);
        } else {
          pen.y += dy;
        }
      }

      for (const enemy of this.enemyGroup.getChildren()) {
        if (enemy.type === "boss") {
          enemy.y += Math.min(dy, Math.max(0, 130 - enemy.y) * 0.08);
          enemy.x = this.width * 0.5 + Math.sin(this.time.now * 0.0014 + enemy.movePhase) * enemy.moveAmp;
          const bossPen = this.penGroup.getChildren().find((pen) => pen.penId === enemy.penId);
          if (bossPen) bossPen.x = this.width * 0.5;
          this.updateBossAttack(enemy);
          this.maybeSpawnBossRocks(enemy);
        } else {
          const pen = this.penGroup.getChildren().find((item) => item.penId === enemy.penId);
          if (!pen || !pen.activeCombat) enemy.y += dy;
          enemy.x = enemy.baseX + Math.sin(this.time.now * 0.003 + enemy.movePhase) * enemy.moveAmp;
        }
      }

      for (const gate of this.gateGroup.getChildren()) {
        if (!gate.used && Math.abs(gate.y - playerY) < 50 && Math.abs(gate.lane - this.state.x) < 0.48) {
          this.consumeGatePair(gate);
        } else if (gate.y > this.height + 80) gate.destroy();
      }

      this.updateCoins(delta, playerX, playerY, dy);
      this.updateObstacles(playerX, playerY);

      for (const enemy of this.enemyGroup.getChildren()) {
        if (Phaser.Math.Distance.Between(enemy.x, enemy.y, playerX, playerY) < (enemy.type === "boss" ? 96 : 56)) {
          this.hurtPigs(enemy);
        } else if (enemy.y > this.height + 90) {
          enemy.destroy();
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
      const playerY = this.height - 118;
      const now = this.time.now;
      for (const pen of this.penGroup.getChildren()) {
        if (!pen.active) continue;
        const inside = Math.abs(playerX - pen.x) < pen.widthValue * 0.5 && Math.abs(playerY - pen.y) < pen.heightValue * 0.5;
        pen.activeCombat = inside;
        pen.setAlpha(inside ? 1 : 0.68);
        if (!inside) {
          if (!pen.isBoss && pen.y > this.height + pen.heightValue * 0.5 + 80) pen.destroy();
          continue;
        }

        const enemies = this.enemyGroup.getChildren().filter((enemy) => enemy.active && enemy.penId === pen.penId);
        if (enemies.length === 0) {
          pen.destroy();
          continue;
        }

        if (now >= pen.nextAttackAt) {
          pen.nextAttackAt = now + Math.max(90, 260 / Math.max(0.4, this.state.attackSpeed));
          const hits = Math.min(enemies.length, this.shotCount());
          const damage = Math.max(1, Math.round(this.state.attack * (1 + Math.sqrt(this.state.pigs) * 0.16)));
          for (let i = 0; i < hits; i += 1) {
            const enemy = enemies[(i + Math.floor(now / 260)) % enemies.length];
            this.damageEnemy(enemy, damage);
            this.showMeleeHit(enemy, i);
          }
        }

        if (now >= pen.nextRetaliateAt && !pen.isBoss) {
          pen.nextRetaliateAt = now + 820;
          const loss = Math.min(4, Math.max(1, Math.ceil(enemies.length / 7)));
          this.state.pigs -= loss;
          this.floatText(`-${loss}`, playerX, playerY - 70, "#db6a55");
          this.pop(playerX, playerY - 28, colors.pigDark, 5);
          if (this.state.pigs <= 0) this.endGame(false);
        }
      }
    }

    showMeleeHit(enemy, index) {
      const slash = this.add.text(enemy.x + Phaser.Math.Between(-16, 16), enemy.y + Phaser.Math.Between(-14, 12), "撞", {
        fontFamily: "Microsoft YaHei, system-ui, sans-serif",
        fontSize: index % 2 ? "18px" : "22px",
        fontStyle: "900",
        color: "#ffd84d",
        stroke: "#5d302d",
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(8).setAngle(Phaser.Math.Between(-18, 18));
      this.fxGroup.add(slash);
      this.tweens.add({
        targets: slash,
        y: slash.y - 28,
        alpha: 0,
        scale: 1.25,
        duration: 260,
        onComplete: () => slash.destroy(),
      });
    }

    applyGate(option) {
      if (option.kind === "qty") this.state.pigs = Math.max(1, this.state.pigs + option.value);
      if (option.kind === "qtyMul") this.state.pigs = Math.max(1, Math.floor(this.state.pigs * option.value));
      if (option.kind === "atkMul") this.state.attack = Math.min(999, Math.floor(this.state.attack * option.value));
      if (option.kind === "atkAdd") this.state.attack = Math.min(999, this.state.attack + option.value);
      if (option.kind === "speedMul") this.state.attackSpeed = Math.min(12, this.state.attackSpeed * option.value);
      if (option.kind === "speedAdd") this.state.attackSpeed = Math.min(12, this.state.attackSpeed + option.value);
      this.floatText(option.label, this.laneX(this.state.x), this.height - 190, option.value < 0 ? "#db6a55" : "#4f9c5f");
    }

    hurtPigs(enemy) {
      if (enemy.lastBiteAt && this.time.now - enemy.lastBiteAt < 520) return;
      enemy.lastBiteAt = this.time.now;
      const loss = Math.max(1, enemy.type === "boss" ? enemy.power : Math.ceil(enemy.power));
      this.state.pigs -= loss;
      this.floatText(`-${loss}`, this.laneX(this.state.x), this.height - 180, "#db6a55");
      this.pop(this.laneX(this.state.x), this.height - 128, colors.pigDark, 8);
      if (enemy.type !== "boss") enemy.destroy();
      if (this.state.pigs <= 0) this.endGame(false);
    }

    shotCount() {
      return Math.max(1, Math.ceil(Math.sqrt(Math.max(1, Math.floor(this.state.pigs)))));
    }

    autoThrowIngots(delta) {
      if (this.state.fireTimer > 0) return;
      const delay = Math.max(170, 520 / Math.max(0.35, this.state.attackSpeed));
      const shooters = this.shotCount();
      const baseX = this.laneX(this.state.x);
      const baseY = this.height - 150;
      const volley = [];
      for (let i = 0; i < shooters; i += 1) {
        const offset = this.formationOffset(i, shooters);
        const target = this.nearestThrowTarget(baseX + offset.x, baseY);
        if (target) volley.push({ offset, target, index: i });
      }
      if (volley.length === 0) {
        this.state.fireTimer = 110;
        return;
      }
      this.state.fireTimer = delay;
      for (const shot of volley) {
        this.throwIngot(baseX + shot.offset.x, baseY + shot.offset.y, shot.target, shot.index, shooters);
      }
    }

    nearestThrowTarget(x, y) {
      let best = null;
      let bestScore = Infinity;
      for (const enemy of this.enemyGroup.getChildren()) {
        if (!enemy.active || enemy.y > y + 36) continue;
        const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
        if (distance > 470) continue;
        const dx = Math.abs(enemy.x - x);
        const dy = Math.max(0, y - enemy.y);
        const score = dx * 1.15 + dy * 0.6;
        if (score < bestScore) {
          bestScore = score;
          best = enemy;
        }
      }
      return best;
    }

    throwIngot(x, y, target, index, total) {
      const shot = this.add.image(x, y, "ingot").setDepth(6).setScale(total > 12 ? 0.72 : 0.86);
      const spread = (index - (total - 1) / 2) * 16;
      let vx = spread;
      let vy = -360;
      if (target) {
        const tx = target.x + Phaser.Math.Between(-12, 12);
        const ty = target.y + Phaser.Math.Between(-16, 12);
        const angle = Phaser.Math.Angle.Between(x, y, tx, ty);
        const speed = 390 + Math.min(120, this.state.attackSpeed * 18);
        vx = Math.cos(angle) * speed + spread * 0.35;
        vy = Math.sin(angle) * speed - 80;
      }
      shot.kind = "ingot";
      shot.vx = vx;
      shot.vy = vy;
      shot.gravity = 620;
      shot.target = target;
      shot.damage = Math.max(1, Math.round(this.state.attack * 0.85));
      shot.expiresAt = this.time.now + 1350;
      this.playerShotGroup.add(shot);
    }

    updateIngots(delta) {
      const dt = delta / 1000;
      for (const shot of this.playerShotGroup.getChildren()) {
        if (!shot.active) continue;
        if (shot.target && shot.target.active) {
          const angle = Phaser.Math.Angle.Between(shot.x, shot.y, shot.target.x, shot.target.y);
          const speed = Math.max(320, Math.hypot(shot.vx, shot.vy));
          const turn = Math.min(1, dt * 3.6);
          shot.vx += (Math.cos(angle) * speed - shot.vx) * turn;
          shot.vy += (Math.sin(angle) * speed - shot.vy) * turn * 0.55;
        }
        shot.vy += (shot.gravity || 0) * dt;
        shot.x += shot.vx * dt;
        shot.y += shot.vy * dt;
        shot.angle += 420 * dt;
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
      this.floatText(`+${reward}`, enemy.x, enemy.y, "#f3c43b");
      this.dropCoins(enemy.x, enemy.y, reward, enemy.type === "boss");
      enemy.destroy();
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

    maybeSpawnBossRocks(boss) {
      if (this.state.obstacleTimer > 0) return;
      this.state.obstacleTimer = Phaser.Math.Between(1700, 2500);
      const patterns = [
        [-0.58, 0.58],
        [-0.54],
        [0.54],
        [-0.66, 0.36],
        [-0.36, 0.66],
      ];
      const lanes = patterns[Phaser.Math.Between(0, patterns.length - 1)];
      for (let i = 0; i < lanes.length; i += 1) {
        const rock = this.add.image(this.laneX(lanes[i]), -44 - i * 30, "rock").setDepth(3).setScale(Phaser.Math.FloatBetween(0.82, 1.08));
        rock.kind = "rock";
        rock.hit = false;
        this.obstacleGroup.add(rock);
      }
      this.floatText("石头", boss.x, Math.max(84, boss.y + 70), "#7c776b");
    }

    updateBossAttack(enemy) {
      if (this.time.now < enemy.nextShotAt) return;
      const count = 9 + Math.min(8, this.state.bossCount * 2);
      const baseSpeed = 230 + this.state.segment * 3;
      for (let i = 0; i < count; i += 1) {
        const t = count === 1 ? 0.5 : i / (count - 1);
        const angle = Phaser.Math.DegToRad(58 + t * 64 + Phaser.Math.Between(-3, 3));
        const shot = this.add.image(enemy.x, enemy.y + 30, "greenShot").setDepth(6).setScale(0.86);
        shot.angle = Phaser.Math.RadToDeg(angle) - 90;
        shot.vx = Math.cos(angle) * baseSpeed;
        shot.vy = Math.sin(angle) * baseSpeed;
        shot.damage = 1;
        shot.expiresAt = this.time.now + 4200;
        this.enemyShotGroup.add(shot);
      }
      enemy.nextShotAt = this.time.now + Phaser.Math.Between(1600, 2400);
    }

    updateEnemyShots(delta) {
      const dt = delta / 1000;
      const playerX = this.laneX(this.state.x);
      const playerY = this.height - 118;
      for (const shot of this.enemyShotGroup.getChildren()) {
        if (!shot.active) continue;
        shot.x += shot.vx * dt;
        shot.y += shot.vy * dt;
        if (shot.expiresAt <= this.time.now || shot.y > this.height + 90 || shot.x < -90 || shot.x > this.width + 90) {
          shot.destroy();
          continue;
        }
        if (Phaser.Math.Distance.Between(shot.x, shot.y, playerX, playerY) < 34) {
          this.state.pigs -= shot.damage || 1;
          this.floatText(`-${shot.damage || 1}`, playerX, playerY - 64, "#db6a55");
          this.pop(shot.x, shot.y, 0x48ff3f, 8);
          shot.destroy();
          if (this.state.pigs <= 0) this.endGame(false);
        }
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
        <p class="hint">金币 ${this.state.coins} · 攻击 ${this.state.attack}</p>
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

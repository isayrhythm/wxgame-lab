const GRID_WIDTH = 15;
const GRID_HEIGHT = 13;
const TILE = 40;
const MAX_PLAYERS = 6;
const MATCH_MS = 180000;
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SPAWNS = [[1, 1], [13, 11], [13, 1], [1, 11], [7, 1], [7, 11]];
const BOT_NAMES = ["阿泡", "小浪", "蓝莓", "珊瑚", "海盐", "汽水"];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function allowedOrigin(origin) {
  return origin === "https://isayrhythm.github.io"
    || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin || "");
}

function addCors(response, origin) {
  const headers = new Headers(response.headers);
  if (allowedOrigin(origin)) headers.set("access-control-allow-origin", origin);
  headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
  headers.set("access-control-allow-headers", "content-type");
  headers.set("vary", "Origin");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function cleanName(value) {
  const name = String(value || "泡泡队长").replace(/[<>\n\r]/g, "").trim().slice(0, 10);
  return name || "泡泡队长";
}

function randomCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => ROOM_ALPHABET[value % ROOM_ALPHABET.length]).join("");
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin") || "";
    if (request.method === "OPTIONS") return addCors(new Response(null, { status: 204 }), origin);
    if (url.pathname === "/health") {
      return addCors(json({ ok: true, service: "wxgame-bubble-arena" }), origin);
    }
    if (!allowedOrigin(origin)) return json({ error: "Origin not allowed" }, 403);

    if (request.method === "POST" && url.pathname === "/rooms") {
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const code = randomCode();
        const room = env.BUBBLE_ROOMS.getByName(code);
        const inner = new Request("https://room/create", request);
        inner.headers.set("x-room-code", code);
        const response = await room.fetch(inner);
        if (response.status !== 409) return addCors(response, origin);
      }
      return addCors(json({ error: "暂时无法创建房间，请重试" }, 503), origin);
    }

    const match = url.pathname.match(/^\/rooms\/([A-Z0-9]{6})\/(join|connect)$/);
    if (!match) return addCors(json({ error: "Not found" }, 404), origin);
    const [, code, action] = match;
    const room = env.BUBBLE_ROOMS.getByName(code);
    const innerUrl = new URL(`https://room/${action}`);
    innerUrl.search = url.search;
    const inner = new Request(innerUrl, request);
    inner.headers.set("x-room-code", code);
    const response = await room.fetch(inner);
    return response.status === 101 ? response : addCors(response, origin);
  },
};

export class BubbleRoom {
  constructor(ctx) {
    this.ctx = ctx;
    this.state = null;
    this.lastPersist = 0;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/create") return this.create(request);
    if (request.method === "POST" && url.pathname === "/join") return this.join(request);
    if (request.method === "GET" && url.pathname === "/connect") return this.connect(request);
    return json({ error: "Not found" }, 404);
  }

  async getState() {
    if (this.state === null) this.state = await this.ctx.storage.get("state") || null;
    return this.state;
  }

  async persist(force = false) {
    const now = Date.now();
    if (!force && now - this.lastPersist < 1000) return;
    this.lastPersist = now;
    await this.ctx.storage.put("state", this.state);
  }

  publicRoom() {
    return {
      code: this.state.code,
      status: this.state.status,
      hostId: this.state.hostId,
      players: this.state.players.map(({ token, input, ...player }) => ({
        ...player,
        connected: player.bot || player.connected,
      })),
    };
  }

  publicGame(now = Date.now()) {
    const game = this.state.game;
    return {
      now,
      gridWidth: GRID_WIDTH,
      gridHeight: GRID_HEIGHT,
      map: game.map,
      bombs: game.bombs,
      flames: game.flames,
      items: game.items,
      startedAt: game.startedAt,
      endsAt: game.endsAt,
      paused: game.paused,
      players: this.state.players.map((player) => ({
        id: player.id,
        name: player.name,
        colorIndex: player.colorIndex,
        bot: player.bot,
        connected: player.bot || player.connected,
        x: player.x,
        y: player.y,
        alive: player.alive,
        kills: player.kills,
        maxBombs: player.maxBombs,
        range: player.range,
        speed: player.speed,
        inventory: player.inventory,
        trappedUntil: player.trappedUntil,
        shieldUntil: player.shieldUntil,
        survivedMs: player.survivedMs,
        direction: player.direction,
      })),
    };
  }

  newPlayer(name, colorIndex, bot = false) {
    return {
      id: crypto.randomUUID(),
      token: bot ? "" : crypto.randomUUID(),
      name,
      colorIndex,
      bot,
      connected: bot,
      input: { x: 0, y: 0 },
    };
  }

  async create(request) {
    if (await this.getState()) return json({ error: "Room already exists" }, 409);
    const body = await request.json().catch(() => ({}));
    const player = this.newPlayer(cleanName(body.name), 0);
    this.state = {
      code: request.headers.get("x-room-code"),
      status: "waiting",
      hostId: player.id,
      players: [player],
      game: null,
    };
    await this.persist(true);
    return json({
      code: this.state.code,
      playerId: player.id,
      token: player.token,
      state: this.publicRoom(),
    }, 201);
  }

  async join(request) {
    const state = await this.getState();
    if (!state) return json({ error: "房间不存在" }, 404);
    if (state.status !== "waiting") return json({ error: "游戏已经开始" }, 409);
    if (state.players.length >= MAX_PLAYERS) return json({ error: "房间已经满员" }, 409);
    const body = await request.json().catch(() => ({}));
    const player = this.newPlayer(cleanName(body.name), state.players.length);
    state.players.push(player);
    await this.persist(true);
    this.broadcastRoom();
    return json({
      code: state.code,
      playerId: player.id,
      token: player.token,
      state: this.publicRoom(),
    }, 201);
  }

  async connect(request) {
    const state = await this.getState();
    if (!state) return json({ error: "房间不存在" }, 404);
    if (request.headers.get("Upgrade") !== "websocket") return json({ error: "Expected WebSocket" }, 426);
    const url = new URL(request.url);
    const player = state.players.find((entry) => entry.id === url.searchParams.get("playerId")
      && entry.token === url.searchParams.get("token"));
    if (!player) return json({ error: "身份验证失败" }, 401);
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.serializeAttachment({ playerId: player.id });
    this.ctx.acceptWebSocket(server, [player.id]);
    player.connected = true;
    await this.persist(true);
    if (state.status === "waiting") {
      server.send(JSON.stringify({ type: "room", room: this.publicRoom() }));
    } else {
      server.send(JSON.stringify({ type: "snapshot", room: this.publicRoom(), game: this.publicGame() }));
    }
    this.broadcastRoom(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(webSocket, rawMessage) {
    const attachment = webSocket.deserializeAttachment();
    const state = await this.getState();
    const player = state?.players.find((entry) => entry.id === attachment?.playerId);
    if (!player) return this.sendError(webSocket, "玩家身份失效");
    let message;
    try {
      message = JSON.parse(typeof rawMessage === "string" ? rawMessage : new TextDecoder().decode(rawMessage));
    } catch {
      return this.sendError(webSocket, "消息格式错误");
    }
    try {
      await this.handleMessage(player, message, webSocket);
    } catch (error) {
      this.sendError(webSocket, error instanceof Error ? error.message : "操作失败");
    }
  }

  async handleMessage(player, message, webSocket) {
    if (message.type === "sync") {
      const payload = this.state.status === "waiting"
        ? { type: "room", room: this.publicRoom() }
        : { type: "snapshot", room: this.publicRoom(), game: this.publicGame() };
      webSocket.send(JSON.stringify(payload));
      return;
    }
    if (message.type === "leave") return this.leave(player);
    if (message.type === "start") return this.start(player);
    if (message.type === "restart") return this.restart(player);
    if (message.type === "pause") return this.togglePause(player);
    if (this.state.status !== "playing") return;

    const now = Date.now();
    this.step(now);
    if (message.type === "input") {
      const length = Math.hypot(Number(message.x) || 0, Number(message.y) || 0);
      player.input = {
        x: length > 1 ? Number(message.x) / length : Number(message.x) || 0,
        y: length > 1 ? Number(message.y) / length : Number(message.y) || 0,
      };
    } else if (message.type === "place") {
      this.placeBomb(player, now);
    } else if (message.type === "use") {
      this.useNeedle(player, now);
    }
    this.step(now + 1);
    await this.persist();
    this.broadcastSnapshot();
  }

  async start(player) {
    if (player.id !== this.state.hostId) throw new Error("只有房主可以开始");
    if (this.state.status !== "waiting") throw new Error("游戏已经开始");
    this.fillBots();
    this.initializeGame();
    this.state.status = "playing";
    await this.persist(true);
    this.broadcast({ type: "gameStart", room: this.publicRoom(), game: this.publicGame() });
  }

  async restart(player) {
    if (player.id !== this.state.hostId) throw new Error("只有房主可以再开一局");
    if (this.state.status !== "finished") return;
    this.initializeGame();
    this.state.status = "playing";
    await this.persist(true);
    this.broadcast({ type: "gameStart", room: this.publicRoom(), game: this.publicGame() });
  }

  fillBots() {
    let botIndex = 0;
    while (this.state.players.length < MAX_PLAYERS) {
      const color = this.state.players.length;
      this.state.players.push(this.newPlayer(BOT_NAMES[botIndex], color, true));
      botIndex += 1;
    }
  }

  initializeGame() {
    const now = Date.now();
    this.state.players.forEach((player, index) => {
      const [tileX, tileY] = SPAWNS[index];
      Object.assign(player, {
        x: (tileX + 0.5) * TILE,
        y: (tileY + 0.5) * TILE,
        alive: true,
        kills: 0,
        maxBombs: 1,
        range: 2,
        speed: 96,
        inventory: { needle: 0 },
        trappedUntil: 0,
        shieldUntil: now + 2400,
        survivedMs: 0,
        direction: "down",
        input: { x: 0, y: 0 },
        nextBotTurn: now + randomInt(250, 850),
        nextBotBomb: now + randomInt(2800, 4300),
      });
    });
    this.state.game = {
      map: this.generateMap(),
      bombs: [],
      flames: [],
      items: [],
      startedAt: now,
      endsAt: now + MATCH_MS,
      lastTick: now,
      paused: false,
      pausedAt: 0,
      winnerId: null,
    };
  }

  generateMap() {
    const map = Array(GRID_WIDTH * GRID_HEIGHT).fill(0);
    for (let y = 0; y < GRID_HEIGHT; y += 1) {
      for (let x = 0; x < GRID_WIDTH; x += 1) {
        if (x === 0 || y === 0 || x === GRID_WIDTH - 1 || y === GRID_HEIGHT - 1 || (x % 2 === 0 && y % 2 === 0)) {
          map[y * GRID_WIDTH + x] = 1;
        } else if (Math.random() < 0.58) {
          map[y * GRID_WIDTH + x] = 2;
        }
      }
    }
    for (const [x, y] of SPAWNS) {
      [[x, y], [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].forEach(([cx, cy]) => {
        if (cx > 0 && cy > 0 && cx < GRID_WIDTH - 1 && cy < GRID_HEIGHT - 1) map[cy * GRID_WIDTH + cx] = 0;
      });
    }
    return map;
  }

  step(now) {
    const game = this.state.game;
    if (!game || game.paused || this.state.status !== "playing") return;
    const dt = Math.min(0.1, Math.max(0, (now - game.lastTick) / 1000));
    game.lastTick = now;
    this.updateBots(now);
    for (const player of this.state.players) this.movePlayer(player, dt, now);
    this.explodeReadyBombs(now);
    game.flames = game.flames.filter((flame) => flame.expiresAt > now);
    game.items = game.items.filter((item) => !item.expiresAt || item.expiresAt > now);
    this.collectItems(now);
    this.applyFlameHits(now);
    for (const player of this.state.players) {
      if (player.alive) player.survivedMs = now - game.startedAt;
      if (player.alive && player.trappedUntil && player.trappedUntil <= now) this.eliminate(player, null, now);
    }
    this.checkGameOver(now);
  }

  updateBots(now) {
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const bot of this.state.players.filter((player) => player.bot && player.alive)) {
      if (bot.trappedUntil > now) {
        if (bot.inventory.needle > 0) this.useNeedle(bot, now);
        continue;
      }
      if (now >= bot.nextBotTurn) {
        const nearest = this.state.players
          .filter((player) => player.alive && player.id !== bot.id)
          .sort((a, b) => Math.hypot(a.x - bot.x, a.y - bot.y) - Math.hypot(b.x - bot.x, b.y - bot.y))[0];
        const toward = nearest && Math.random() < 0.58
          ? (Math.abs(nearest.x - bot.x) > Math.abs(nearest.y - bot.y)
            ? [Math.sign(nearest.x - bot.x), 0]
            : [0, Math.sign(nearest.y - bot.y)])
          : directions[randomInt(0, directions.length - 1)];
        bot.input = { x: toward[0], y: toward[1] };
        bot.nextBotTurn = now + randomInt(350, 1100);
      }
      if (now >= bot.nextBotBomb && this.shouldBotBomb(bot)) {
        this.placeBomb(bot, now);
        bot.nextBotBomb = now + randomInt(1300, 2800);
      }
    }
  }

  shouldBotBomb(bot) {
    const tileX = Math.floor(bot.x / TILE);
    const tileY = Math.floor(bot.y / TILE);
    const nearbyCrate = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => this.cell(tileX + dx, tileY + dy) === 2);
    const nearbyPlayer = this.state.players.some((player) => player.alive && player.id !== bot.id
      && Math.hypot(player.x - bot.x, player.y - bot.y) < TILE * 2.4);
    return nearbyCrate || nearbyPlayer || Math.random() < 0.12;
  }

  movePlayer(player, dt, now) {
    if (!player.alive || player.trappedUntil > now) return;
    const dx = player.input?.x || 0;
    const dy = player.input?.y || 0;
    if (!dx && !dy) return;
    if (Math.abs(dx) > Math.abs(dy)) player.direction = dx < 0 ? "left" : "right";
    else player.direction = dy < 0 ? "up" : "down";
    const distance = player.speed * dt;
    const targetX = player.x + dx * distance;
    const targetY = player.y + dy * distance;
    if (this.canOccupy(targetX, player.y)) player.x = targetX;
    if (this.canOccupy(player.x, targetY)) player.y = targetY;
    player.x = Math.max(TILE, Math.min((GRID_WIDTH - 1) * TILE, player.x));
    player.y = Math.max(TILE, Math.min((GRID_HEIGHT - 1) * TILE, player.y));
  }

  canOccupy(x, y) {
    const radius = 12;
    return [[x - radius, y - radius], [x + radius, y - radius], [x - radius, y + radius], [x + radius, y + radius]]
      .every(([px, py]) => this.cell(Math.floor(px / TILE), Math.floor(py / TILE)) === 0);
  }

  cell(x, y) {
    if (x < 0 || y < 0 || x >= GRID_WIDTH || y >= GRID_HEIGHT) return 1;
    return this.state.game.map[y * GRID_WIDTH + x];
  }

  placeBomb(player, now) {
    if (!player.alive || player.trappedUntil > now) return;
    const game = this.state.game;
    const active = game.bombs.filter((bomb) => bomb.ownerId === player.id).length;
    if (active >= player.maxBombs) return;
    const x = Math.floor(player.x / TILE);
    const y = Math.floor(player.y / TILE);
    if (game.bombs.some((bomb) => bomb.x === x && bomb.y === y)) return;
    game.bombs.push({ id: crypto.randomUUID(), x, y, ownerId: player.id, range: player.range, explodeAt: now + 2200 });
    if (player.bot) {
      player.shieldUntil = Math.max(player.shieldUntil, now + 2850);
      player.nextBotTurn = now;
      const escapeDirections = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => this.cell(x + dx, y + dy) === 0);
      const escape = escapeDirections[randomInt(0, Math.max(0, escapeDirections.length - 1))] || [0, 0];
      player.input = { x: escape[0], y: escape[1] };
    }
  }

  explodeReadyBombs(now) {
    const game = this.state.game;
    const queue = game.bombs.filter((bomb) => bomb.explodeAt <= now);
    const exploded = new Set();
    while (queue.length) {
      const bomb = queue.shift();
      if (exploded.has(bomb.id)) continue;
      exploded.add(bomb.id);
      const cells = [{ x: bomb.x, y: bomb.y }];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        for (let range = 1; range <= bomb.range; range += 1) {
          const x = bomb.x + dx * range;
          const y = bomb.y + dy * range;
          const cell = this.cell(x, y);
          if (cell === 1) break;
          cells.push({ x, y });
          if (cell === 2) {
            game.map[y * GRID_WIDTH + x] = 0;
            this.maybeDropItem(x, y, now);
            break;
          }
        }
      }
      for (const cell of cells) {
        game.flames.push({ ...cell, ownerId: bomb.ownerId, expiresAt: now + 480 });
        for (const chained of game.bombs) {
          if (chained.x === cell.x && chained.y === cell.y && !exploded.has(chained.id)) queue.push(chained);
        }
      }
    }
    game.bombs = game.bombs.filter((bomb) => !exploded.has(bomb.id));
  }

  maybeDropItem(x, y, now) {
    if (Math.random() > 0.38) return;
    const roll = Math.random();
    const type = roll < 0.28 ? "bomb" : roll < 0.56 ? "range" : roll < 0.76 ? "speed" : roll < 0.91 ? "needle" : "shield";
    this.state.game.items.push({ id: crypto.randomUUID(), x, y, type, expiresAt: now + 30000 });
  }

  collectItems(now) {
    const collected = new Set();
    for (const player of this.state.players.filter((entry) => entry.alive)) {
      for (const item of this.state.game.items) {
        if (Math.hypot(player.x - (item.x + 0.5) * TILE, player.y - (item.y + 0.5) * TILE) > TILE * 0.48) continue;
        collected.add(item.id);
        if (item.type === "bomb") player.maxBombs = Math.min(6, player.maxBombs + 1);
        if (item.type === "range") player.range = Math.min(7, player.range + 1);
        if (item.type === "speed") player.speed = Math.min(145, player.speed + 10);
        if (item.type === "needle") player.inventory.needle = Math.min(3, player.inventory.needle + 1);
        if (item.type === "shield") player.shieldUntil = now + 7000;
      }
    }
    this.state.game.items = this.state.game.items.filter((item) => !collected.has(item.id));
  }

  applyFlameHits(now) {
    for (const player of this.state.players.filter((entry) => entry.alive && entry.shieldUntil <= now)) {
      const hit = this.state.game.flames.find((flame) => Math.hypot(player.x - (flame.x + 0.5) * TILE, player.y - (flame.y + 0.5) * TILE) < TILE * 0.5);
      if (!hit) continue;
      if (player.trappedUntil > now) this.eliminate(player, hit.ownerId, now);
      else {
        player.trappedUntil = now + 2800;
        player.input = { x: 0, y: 0 };
      }
    }
  }

  useNeedle(player, now) {
    if (!player.alive || player.trappedUntil <= now || player.inventory.needle < 1) return;
    player.inventory.needle -= 1;
    player.trappedUntil = 0;
    player.shieldUntil = now + 1800;
  }

  eliminate(player, ownerId, now) {
    if (!player.alive) return;
    player.alive = false;
    player.trappedUntil = 0;
    player.input = { x: 0, y: 0 };
    player.survivedMs = now - this.state.game.startedAt;
    const owner = this.state.players.find((entry) => entry.id === ownerId);
    if (owner && owner.id !== player.id) owner.kills += 1;
  }

  checkGameOver(now) {
    if (this.state.status !== "playing") return;
    const alive = this.state.players.filter((player) => player.alive);
    if (now < this.state.game.startedAt + 3200 && now < this.state.game.endsAt) return;
    if (alive.length > 1 && now < this.state.game.endsAt) return;
    if (alive.length > 1) {
      alive.sort((a, b) => b.kills - a.kills || b.survivedMs - a.survivedMs);
      this.state.game.winnerId = alive[0]?.id || null;
    } else {
      this.state.game.winnerId = alive[0]?.id || null;
    }
    this.state.status = "finished";
    this.persist(true);
    this.broadcast({
      type: "gameOver",
      winnerId: this.state.game.winnerId,
      room: this.publicRoom(),
      game: this.publicGame(now),
    });
  }

  async togglePause(player) {
    if (player.id !== this.state.hostId) throw new Error("只有房主可以暂停");
    if (this.state.status !== "playing" || !this.state.game) return;
    const now = Date.now();
    const game = this.state.game;
    if (!game.paused) {
      this.step(now);
      game.paused = true;
      game.pausedAt = now;
    } else {
      const offset = now - game.pausedAt;
      game.endsAt += offset;
      game.bombs.forEach((bomb) => { bomb.explodeAt += offset; });
      game.flames.forEach((flame) => { flame.expiresAt += offset; });
      game.items.forEach((item) => { item.expiresAt += offset; });
      this.state.players.forEach((entry) => {
        if (entry.trappedUntil) entry.trappedUntil += offset;
        if (entry.shieldUntil) entry.shieldUntil += offset;
        if (entry.nextBotTurn) entry.nextBotTurn += offset;
        if (entry.nextBotBomb) entry.nextBotBomb += offset;
      });
      game.startedAt += offset;
      game.lastTick = now;
      game.paused = false;
      game.pausedAt = 0;
    }
    await this.persist(true);
    this.broadcastSnapshot();
  }

  async leave(player) {
    player.connected = false;
    if (this.state.status === "waiting") {
      this.state.players = this.state.players.filter((entry) => entry.id !== player.id);
      if (this.state.hostId === player.id) this.state.hostId = this.state.players.find((entry) => !entry.bot)?.id || "";
      await this.persist(true);
      this.broadcastRoom();
      return;
    }
    if (player.alive) this.eliminate(player, null, Date.now());
    this.checkGameOver(Date.now());
    await this.persist(true);
    this.broadcastSnapshot();
  }

  broadcastRoom(except = null) {
    this.broadcast({ type: "room", room: this.publicRoom() }, except);
  }

  broadcastSnapshot() {
    if (!this.state.game || this.state.status === "finished") return;
    this.broadcast({ type: "snapshot", room: this.publicRoom(), game: this.publicGame() });
  }

  broadcast(payload, except = null) {
    const encoded = JSON.stringify(payload);
    for (const socket of this.ctx.getWebSockets()) {
      if (socket === except) continue;
      try { socket.send(encoded); } catch { /* stale socket */ }
    }
  }

  sendError(webSocket, error) {
    try { webSocket.send(JSON.stringify({ type: "error", error })); } catch { /* closed */ }
  }

  async webSocketClose(webSocket) {
    const attachment = webSocket.deserializeAttachment();
    const state = await this.getState();
    const player = state?.players.find((entry) => entry.id === attachment?.playerId);
    if (!player) return;
    player.connected = this.ctx.getWebSockets(player.id).some((socket) => socket !== webSocket);
    await this.persist(true);
    if (state.status === "waiting") this.broadcastRoom();
    else this.broadcastSnapshot();
  }

  async webSocketError(webSocket) {
    return this.webSocketClose(webSocket);
  }
}

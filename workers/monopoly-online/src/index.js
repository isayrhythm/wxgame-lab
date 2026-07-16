const PERIODS_PER_YEAR = 24;
const MAX_PLAYERS = 7;
const START_CASH = 1800;
const TURN_TIMEOUT_MS = 15000;
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const AVATAR_IDS = new Set(["avatar-01", "avatar-02", "avatar-03", "avatar-04", "avatar-05", "avatar-06", "avatar-07", "avatar-08", "avatar-09", "avatar-10"]);

const spaces = [
  { type: "start", name: "江西农业大学学报", short: "江农学报", icon: "JXAU" },
  property("PLOS ONE", "综合开放", "#4DBBD5", 2.9, "PLOS ONE"),
  property("Cell", "CNS", "#E64B35", 45.5, "Cell"),
  { type: "chance", name: "基金评审", icon: "研" },
  property("生物工程学报", "中文核心", "#91D1C2", 1.4, "生工学报"),
  property("Nature Medicine", "医学", "#3C5488", 58.7, "Nat Medicine"),
  property("Scientific Reports", "综合开放", "#4DBBD5", 3.9, "Sci Rep"),
  property("Journal of Experimental Botany", "植物科学", "#00A087", 5.6, "J Exp Bot"),
  property("Nature Methods", "方法学", "#E64B35", 36.1, "Nat Methods"),
  { type: "penalty", name: "老板抢一作", icon: "二作" },
  property("科学通报", "中文综合", "#91D1C2", 2.5, "科学通报"),
  { type: "chance", name: "基金评审", icon: "研" },
  property("The New England Journal of Medicine", "医学四刊", "#3C5488", 78.5, "NEJM"),
  property("Plant Physiology", "植物科学", "#00A087", 6.5, "Plant Phys"),
  property("Genome Research", "基因组学", "#8491B4", 7.0, "Genome Res"),
  { type: "vacation", name: "学术休假", icon: "休" },
  property("Nature Plants", "植物科学", "#00A087", 15.8, "Nat Plants"),
  property("中国科学·生命科学", "中文综合", "#91D1C2", 2.1, "中国科学"),
  property("Science", "CNS", "#E64B35", 44.7, "Science"),
  property("The Plant Journal", "植物科学", "#00A087", 6.2, "Plant J"),
  property("Nucleic Acids Research", "核酸研究", "#8491B4", 13.1, "NAR"),
  { type: "chance", name: "基金评审", icon: "研" },
  property("The Lancet", "医学四刊", "#3C5488", 88.5, "Lancet"),
  property("New Phytologist", "植物科学", "#00A087", 8.3, "New Phytol"),
  property("Bioinformatics", "生物信息", "#8491B4", 5.8, "Bioinformatics"),
  property("Nature Genetics", "遗传学", "#F39B7F", 31.7, "Nat Genetics"),
  { type: "tax", name: "版面费结算", amount: 160, icon: "APC" },
  property("Molecular Plant", "植物科学", "#00A087", 17.1, "Mol Plant"),
  property("JAMA", "医学四刊", "#3C5488", 63.1, "JAMA"),
  { type: "chance", name: "基金评审", icon: "研" },
  property("The ISME Journal", "微生物学", "#8491B4", 10.0, "ISME J"),
  property("Nature Communications", "综合科学", "#F39B7F", 14.7, "Nat Commun"),
  property("The BMJ", "医学四刊", "#3C5488", 42.7, "BMJ"),
  property("PNAS", "综合科学", "#F39B7F", 9.4, "PNAS"),
  property("Nature", "CNS", "#E64B35", 48.5, "Nature"),
  property("Genome Biology", "基因组学", "#8491B4", 10.1, "Genome Biol"),
  property("Immunity", "免疫学", "#B09C85", 25.5, "Immunity"),
  property("Science Advances", "综合科学", "#F39B7F", 11.7, "Sci Adv"),
  property("Current Biology", "生命科学", "#B09C85", 8.1, "Curr Biol"),
  property("Cancer Cell", "肿瘤学", "#B09C85", 44.5, "Cancer Cell"),
  property("The Plant Cell", "植物科学", "#00A087", 11.6, "Plant Cell"),
  property("Nature Biotechnology", "生物技术", "#B09C85", 41.7, "Nat Biotech"),
  { type: "jackpot", name: "国自然放榜", icon: "NSFC" },
  property("Nature Ecology & Evolution", "生态进化", "#91D1C2", 14.1, "Nat Ecol Evol"),
];

const chanceCards = [
  { icon: "青", title: "青年科学基金获批", text: "评审意见积极，项目顺利获批。", amount: 260, grantKey: "youth" },
  { icon: "面", title: "国自然面上项目", text: "研究基础扎实，获得面上项目资助。", amount: 420, grantKey: "general" },
  { icon: "重", title: "重点研发计划", text: "你加入了重点专项课题组。", amount: 520, grantKey: "key-rd" },
  { icon: "合", title: "合作课题到账", text: "合作单位拨付了第一笔研究经费。", amount: 220, grantKey: "collaboration" },
  { icon: "修", title: "审稿人大修", text: "补实验、补统计，还要再熬几个晚上。", amount: -120 },
  { icon: "仪", title: "仪器突然罢工", text: "核心平台送来一张维修账单。", amount: -180 },
  { icon: "OA", title: "开放获取费用", text: "论文接收了，但需要支付开放获取费用。", amount: -160 },
  { icon: "校", title: "返校汇报", text: "回《江西农业大学学报》完成年度汇报并领取启动经费。", amount: 200, moveToStart: true },
];

function property(name, district, color, impactFactor, short) {
  const price = Math.round((120 + Math.max(1, impactFactor) * 10) / 5) * 5;
  const rent = Math.round(price * 0.2);
  const buildCost = Math.round(price * 0.52 / 5) * 5;
  return { type: "property", name, district, color, impactFactor, price, rent, buildCost, short };
}

function formatPeriod(period) {
  const normalized = Math.max(1, period);
  const year = Math.floor((normalized - 1) / PERIODS_PER_YEAR) + 1;
  const periodInYear = (normalized - 1) % PERIODS_PER_YEAR + 1;
  const month = Math.floor((periodInYear - 1) / 2) + 1;
  return `第${year}年 · ${month}月${periodInYear % 2 ? "上半月" : "下半月"}`;
}

const HAT_LADDER = ["暂无帽子", "学术新秀", "青年学术骨干", "优秀青年学者", "杰出青年学者", "学术带头人", "领军学者", "顶尖科学家", "学术泰斗"];
const HAT_THRESHOLDS = [0, 80, 240, 520, 900, 1450, 2250, 3400, 5000];

function academicHat(profile, previousLevel = 0) {
  const score = Math.round(
    profile.totalIf * 7
    + profile.papers * 28
    + profile.influence * 24
    + profile.topPapers * 75
    + profile.fundingTotal * 0.16
    + Math.max(0, profile.worth - START_CASH) * 0.08,
  );
  let earnedLevel = 0;
  HAT_THRESHOLDS.forEach((threshold, level) => {
    if (score >= threshold) earnedLevel = level;
  });
  const level = Math.max(previousLevel || 0, earnedLevel);
  return { hat: HAT_LADDER[level], level, score };
}

function randomCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => ROOM_ALPHABET[value % ROOM_ALPHABET.length]).join("");
}

function cleanName(value) {
  const name = String(value || "玩家").replace(/[<>\n\r]/g, "").trim().slice(0, 10);
  return name || "玩家";
}

function cleanAvatar(value) {
  return AVATAR_IDS.has(value) ? value : "avatar-01";
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function allowedOrigin(origin) {
  return origin === "https://isayrhythm.github.io" || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin || "");
}

function addCors(response, origin) {
  const headers = new Headers(response.headers);
  if (allowedOrigin(origin)) headers.set("access-control-allow-origin", origin);
  headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
  headers.set("access-control-allow-headers", "content-type");
  headers.set("vary", "Origin");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin") || "";
    if (request.method === "OPTIONS") {
      return addCors(new Response(null, { status: 204 }), origin);
    }
    if (url.pathname === "/health") {
      return addCors(json({ ok: true, service: "wxgame-monopoly-online" }), origin);
    }
    if (!allowedOrigin(origin)) return json({ error: "Origin not allowed" }, 403);

    if (request.method === "POST" && url.pathname === "/rooms") {
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const code = randomCode();
        const room = env.GAME_ROOMS.getByName(code);
        const inner = new Request("https://room/create", request);
        inner.headers.set("x-room-code", code);
        const response = await room.fetch(inner);
        if (response.status !== 409) return addCors(response, origin);
      }
      return addCors(json({ error: "无法生成房间码，请重试" }, 503), origin);
    }

    const match = url.pathname.match(/^\/rooms\/([A-Z0-9]{6})\/(join|connect)$/);
    if (!match) return addCors(json({ error: "Not found" }, 404), origin);
    const [, code, action] = match;
    const room = env.GAME_ROOMS.getByName(code);
    const innerUrl = new URL(`https://room/${action}`);
    innerUrl.search = url.search;
    const inner = new Request(innerUrl, request);
    inner.headers.set("x-room-code", code);
    const response = await room.fetch(inner);
    if (response.status === 101) return response;
    return addCors(response, origin);
  },
};

export class GameRoom {
  constructor(ctx) {
    this.ctx = ctx;
    this.state = null;
  }

  async getState() {
    if (this.state === null) this.state = await this.ctx.storage.get("state") || null;
    this.state?.players?.forEach((player) => {
      if (!player.hat) player.hat = "暂无帽子";
      player.hatLevel ||= 0;
      player.fundingTotal ||= 0;
      player.grants ||= {};
      player.nextPaperMultiplier ||= 1;
    });
    if (this.state && !this.state.paperValues) this.state.paperValues = Array(spaces.length).fill(1);
    return this.state;
  }

  async save() {
    this.state.revision += 1;
    await this.ctx.storage.put("state", this.state);
  }

  publicState() {
    const { code, status, hostId, players, owners, buildings, paperValues, currentPlayer, round, jackpot, phase, pending, turnDeadline, log, revision, winnerIds } = this.state;
    return {
      code,
      status,
      hostId,
      players: players.map(({ token, ...player }) => player),
      owners,
      buildings,
      paperValues,
      currentPlayer,
      round,
      periodsPerYear: PERIODS_PER_YEAR,
      jackpot,
      phase,
      pending,
      turnDeadline: turnDeadline || null,
      log,
      revision,
      winnerIds: winnerIds || [],
    };
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/create") return this.create(request);
    if (request.method === "POST" && url.pathname === "/join") return this.join(request);
    if (request.method === "GET" && url.pathname === "/connect") return this.connect(request);
    return json({ error: "Not found" }, 404);
  }

  async create(request) {
    if (await this.getState()) return json({ error: "Room already exists" }, 409);
    const body = await request.json().catch(() => ({}));
    const player = this.newPlayer(cleanName(body.name), cleanAvatar(body.avatar));
    this.state = {
      code: request.headers.get("x-room-code"),
      status: "waiting",
      hostId: player.id,
      players: [player],
      owners: Array(spaces.length).fill(-1),
      buildings: Array(spaces.length).fill(0),
      paperValues: Array(spaces.length).fill(1),
      currentPlayer: 0,
      round: 1,
      jackpot: 180,
      phase: "waiting",
      pending: null,
      turnDeadline: null,
      log: [{ message: `${player.name}创建了房间。`, important: false, at: Date.now() }],
      revision: 0,
      winnerIds: [],
    };
    await this.save();
    return json({ code: this.state.code, playerId: player.id, token: player.token, state: this.publicState() }, 201);
  }

  async join(request) {
    const state = await this.getState();
    if (!state) return json({ error: "房间不存在" }, 404);
    const body = await request.json().catch(() => ({}));
    if (body.playerId && body.token) {
      const existing = state.players.find((player) => player.id === body.playerId && player.token === body.token);
      if (existing) return json({ code: state.code, playerId: existing.id, token: existing.token, state: this.publicState() });
    }
    if (state.status !== "waiting") return json({ error: "游戏已经开始" }, 409);
    if (state.players.length >= MAX_PLAYERS) return json({ error: "房间已经满员" }, 409);
    const player = this.newPlayer(cleanName(body.name), cleanAvatar(body.avatar));
    state.players.push(player);
    this.pushLog(`${player.name}加入了房间。`);
    await this.save();
    this.broadcast({ type: "state", state: this.publicState(), action: { kind: "join", playerId: player.id } });
    return json({ code: state.code, playerId: player.id, token: player.token, state: this.publicState() }, 201);
  }

  newPlayer(name, avatar) {
    return {
      id: crypto.randomUUID(),
      token: crypto.randomUUID(),
      name,
      avatar,
      cash: START_CASH,
      pos: 0,
      bankrupt: false,
      connected: false,
      bot: false,
      hat: "暂无帽子",
      hatLevel: 0,
      fundingTotal: 0,
      grants: {},
      nextPaperMultiplier: 1,
    };
  }

  newBot(number) {
    const names = ["阿财", "玖玖"];
    return {
      id: crypto.randomUUID(),
      token: "",
      name: names[number - 1] || `对手${number}`,
      avatar: "robot",
      cash: START_CASH,
      pos: 0,
      bankrupt: false,
      connected: true,
      bot: true,
      hat: "暂无帽子",
      hatLevel: 0,
      fundingTotal: 0,
      grants: {},
      nextPaperMultiplier: 1,
    };
  }

  async connect(request) {
    const state = await this.getState();
    if (!state) return json({ error: "房间不存在" }, 404);
    if (request.headers.get("Upgrade") !== "websocket") return json({ error: "Expected WebSocket" }, 426);
    const url = new URL(request.url);
    const player = state.players.find((entry) => entry.id === url.searchParams.get("playerId") && entry.token === url.searchParams.get("token"));
    if (!player) return json({ error: "身份验证失败" }, 401);
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.serializeAttachment({ playerId: player.id });
    this.ctx.acceptWebSocket(server, [player.id]);
    player.connected = true;
    await this.save();
    server.send(JSON.stringify({ type: "state", state: this.publicState(), action: { kind: "connected", playerId: player.id } }));
    this.broadcast({ type: "presence", playerId: player.id, connected: true }, server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(webSocket, rawMessage) {
    const attachment = webSocket.deserializeAttachment();
    const state = await this.getState();
    const playerIndex = state.players.findIndex((player) => player.id === attachment?.playerId);
    if (playerIndex < 0) return this.sendError(webSocket, "玩家身份失效");
    let message;
    try {
      message = JSON.parse(typeof rawMessage === "string" ? rawMessage : new TextDecoder().decode(rawMessage));
    } catch {
      return this.sendError(webSocket, "消息格式错误");
    }
    try {
      await this.handleAction(playerIndex, message, webSocket);
    } catch (error) {
      this.sendError(webSocket, error instanceof Error ? error.message : "操作失败");
    }
  }

  async handleAction(playerIndex, message, webSocket) {
    const player = this.state.players[playerIndex];
    if (message.type === "rename") {
      if (this.state.status !== "waiting") throw new Error("开局后不能改名");
      player.name = cleanName(message.name);
      this.pushLog(`${player.name}更新了昵称。`);
      return this.commit({ kind: "rename", playerId: player.id });
    }
    if (message.type === "start") {
      if (player.id !== this.state.hostId) throw new Error("只有房主可以开始");
      if (this.state.status !== "waiting") throw new Error("游戏已经开始");
      let botNumber = 1;
      while (this.state.players.length < 3) {
        this.state.players.push(this.newBot(botNumber));
        botNumber += 1;
      }
      this.state.status = "playing";
      this.state.phase = "await_roll";
      this.state.currentPlayer = 0;
      this.armTurnTimer();
      this.pushLog(`联机学术圈开启，共 ${this.state.players.length} 位学者。`, true);
      return this.commit({ kind: "start" });
    }
    if (this.state.status !== "playing") throw new Error("游戏尚未开始");
    if (message.type === "leave_game") return this.leaveGame(playerIndex);
    if (message.type === "roll") return this.roll(playerIndex);
    if (message.type === "buy" || message.type === "skip_buy") return this.resolvePurchase(playerIndex, message.type === "buy");
    if (message.type === "build") return this.build(playerIndex, Number(message.position));
    if (message.type === "sync") {
      webSocket.send(JSON.stringify({ type: "state", state: this.publicState(), action: { kind: "sync" } }));
      return;
    }
    throw new Error("未知操作");
  }

  async leaveGame(playerIndex) {
    const player = this.state.players[playerIndex];
    if (player.bankrupt) return;
    player.bankrupt = true;
    player.connected = false;
    this.state.owners.forEach((owner, position) => {
      if (owner === playerIndex) {
        this.state.owners[position] = -1;
        this.state.buildings[position] = 0;
        this.state.paperValues[position] = 1;
      }
    });
    if (this.state.pending?.playerIndex === playerIndex) {
      this.state.pending = null;
      this.state.phase = "await_roll";
    }
    this.pushLog(`${player.name}主动退出了学术圈。`, true);
    const annualReview = this.state.currentPlayer === playerIndex ? this.advanceTurn() : null;
    if (!this.state.players.some((entry) => !entry.bankrupt)) this.finishGame();
    return this.commit({ kind: "leave", playerIndex, annualReview });
  }

  async roll(playerIndex) {
    this.assertTurn(playerIndex, "await_roll");
    const player = this.state.players[playerIndex];
    const from = player.pos;
    const dice = randomInt(1, 6);
    let passedStart = false;
    for (let step = 0; step < dice; step += 1) {
      const previous = player.pos;
      player.pos = (player.pos + 1) % spaces.length;
      if (player.pos < previous) {
        player.cash += 200;
        passedStart = true;
      }
    }
    const landing = this.resolveLanding(playerIndex);
    this.checkBankruptcy(playerIndex);
    let annualReview = null;
    if (!this.state.pending) annualReview = this.advanceTurn();
    else this.armTurnTimer();
    return this.commit({ kind: "roll", playerIndex, from, steps: dice, dice, passedStart, landing, annualReview });
  }

  resolveLanding(playerIndex) {
    const player = this.state.players[playerIndex];
    const position = player.pos;
    const space = spaces[position];
    const result = { type: space.type, position, name: space.name };
    this.pushLog(`${player.name}掷骰来到${space.name}。`);
    if (space.type === "property" || space.type === "station") {
      const owner = this.state.owners[position];
      if (owner < 0 && player.cash >= space.price) {
        this.state.pending = { type: "buy", playerIndex, position };
        this.state.phase = "await_buy";
        result.offer = true;
      } else if (owner >= 0 && owner !== playerIndex) {
        const rent = this.calculateRent(position);
        player.cash -= rent;
        this.state.players[owner].cash += rent;
        result.rent = rent;
        result.owner = owner;
        this.pushLog(`${player.name}引用了${this.state.players[owner].name}发表于${space.name}的论文，贡献学术收益 ¥${rent}。`);
      }
    } else if (space.type === "chance") {
      const card = this.resolveChanceCard(chanceCards[randomInt(0, chanceCards.length - 1)], player);
      if (card.moveToStart) player.pos = 0;
      player.cash += card.amount;
      result.card = card;
      this.pushLog(`${player.name}抽到“${card.title}”，${card.amount >= 0 ? "获得" : "支出"} ¥${Math.abs(card.amount)}。`);
    } else if (space.type === "tax") {
      player.cash -= space.amount;
      this.state.jackpot += Math.round(space.amount * 0.75);
      result.amount = -space.amount;
      this.pushLog(`${player.name}支付${space.name} ¥${space.amount}。`);
    } else if (space.type === "jackpot") {
      result.amount = this.state.jackpot;
      player.cash += this.state.jackpot;
      player.fundingTotal = (player.fundingTotal || 0) + this.state.jackpot;
      this.pushLog(`${player.name}获得国自然资助 ¥${this.state.jackpot}！`);
      this.state.jackpot = 120;
    } else if (space.type === "start") {
      player.cash += 80;
      result.amount = 80;
    } else if (space.type === "penalty") {
      player.nextPaperMultiplier = 0.5;
      result.penalty = "next_paper_half";
      this.pushLog(`${player.name}遇到“老板抢一作”，下一篇论文的价值、累计 IF 与引用收益减半。`);
    }
    return result;
  }

  resolveChanceCard(card, player) {
    if (!card.grantKey) return card;
    player.grants ||= {};
    const previousAwards = player.grants[card.grantKey] || 0;
    const year = Math.floor((Math.max(1, this.state.round) - 1) / PERIODS_PER_YEAR) + 1;
    const growth = 1 + (year - 1) * 0.18 + previousAwards * 0.08;
    const amount = Math.round(card.amount * growth / 10) * 10;
    player.grants[card.grantKey] = previousAwards + 1;
    player.fundingTotal = (player.fundingTotal || 0) + amount;
    return {
      ...card,
      amount,
      text: `${card.text} 第${year}年度资助额度随积累提升，本次到账 ¥${amount}。`,
    };
  }

  async resolvePurchase(playerIndex, shouldBuy) {
    this.assertTurn(playerIndex, "await_buy");
    const pending = this.state.pending;
    if (!pending || pending.playerIndex !== playerIndex) throw new Error("当前没有待处理投稿");
    const space = spaces[pending.position];
    let bought = false;
    if (shouldBuy) {
      if (this.state.owners[pending.position] >= 0) throw new Error("该期刊已有代表作");
      if (this.state.players[playerIndex].cash < space.price) throw new Error("现金不足");
      this.state.players[playerIndex].cash -= space.price;
      this.state.owners[pending.position] = playerIndex;
      const multiplier = this.state.players[playerIndex].nextPaperMultiplier || 1;
      this.state.paperValues[pending.position] = multiplier;
      this.state.players[playerIndex].nextPaperMultiplier = 1;
      bought = true;
      this.pushLog(`${this.state.players[playerIndex].name}支付 ¥${space.price}版面费，在${space.name}发表论文${multiplier < 1 ? "，但因老板抢一作仅按 50% 计值" : ""}。`);
    } else {
      this.pushLog(`${this.state.players[playerIndex].name}放弃向${space.name}投稿。`);
    }
    this.state.pending = null;
    this.state.phase = "await_roll";
    const annualReview = this.advanceTurn();
    return this.commit({ kind: "purchase", playerIndex, position: pending.position, bought, annualReview });
  }

  async build(playerIndex, position) {
    this.assertTurn(playerIndex, "await_roll");
    if (!Number.isInteger(position) || this.state.owners[position] !== playerIndex) throw new Error("这不是你的论文");
    if (this.state.buildings[position] >= 3) throw new Error("论文影响力已经满级");
    const space = spaces[position];
    const cost = space.buildCost * (this.state.buildings[position] + 1);
    if (this.state.players[playerIndex].cash < cost) throw new Error("现金不足");
    this.state.players[playerIndex].cash -= cost;
    this.state.buildings[position] += 1;
    this.pushLog(`${this.state.players[playerIndex].name}为${space.name}论文补充研究，影响力提升。`);
    this.armTurnTimer();
    return this.commit({ kind: "build", playerIndex, position, level: this.state.buildings[position] });
  }

  maybeBuildForBot(playerIndex) {
    const player = this.state.players[playerIndex];
    if (!player?.bot || player.cash < 520 || randomInt(0, 99) >= 38) return;
    const positions = this.state.owners
      .map((owner, position) => owner === playerIndex && this.state.buildings[position] < 3 ? position : -1)
      .filter((position) => position >= 0)
      .sort((a, b) => this.calculateRent(b) - this.calculateRent(a));
    const position = positions[0];
    if (position === undefined) return;
    const space = spaces[position];
    const cost = space.buildCost * (this.state.buildings[position] + 1);
    if (player.cash - cost < 300) return;
    player.cash -= cost;
    this.state.buildings[position] += 1;
    this.pushLog(`${player.name}为${space.name}论文补充研究，影响力提升。`);
  }

  async alarm() {
    const state = await this.getState();
    if (!state || state.status !== "playing") return;
    const playerIndex = state.currentPlayer;
    const player = state.players[playerIndex];
    if (!player || player.bankrupt) return;
    if (player.bot && state.phase === "await_buy") {
      const position = state.pending?.position;
      const space = spaces[position];
      const reserve = 320;
      const shouldBuy = Boolean(space && player.cash >= space.price && (player.cash - space.price >= reserve || randomInt(0, 99) < 24));
      await this.resolvePurchase(playerIndex, shouldBuy);
      return;
    }
    if (player.bot && state.phase === "await_roll") {
      this.maybeBuildForBot(playerIndex);
      await this.roll(playerIndex);
      return;
    }
    if (!["await_roll", "await_buy"].includes(state.phase)) return;
    if (state.turnDeadline && Date.now() + 50 < state.turnDeadline) {
      await this.ctx.storage.setAlarm(state.turnDeadline);
      return;
    }
    if (state.phase === "await_buy") {
      this.pushLog(`${player.name}选择超时，系统已跳过投稿。`);
      await this.resolvePurchase(playerIndex, false);
      return;
    }
    this.pushLog(`${player.name}在 15 秒内未行动，系统自动掷骰。`);
    await this.roll(playerIndex);
  }

  armTurnTimer() {
    this.state.turnDeadline = Date.now() + TURN_TIMEOUT_MS;
  }

  assertTurn(playerIndex, phase) {
    if (this.state.currentPlayer !== playerIndex) throw new Error("还没轮到你");
    if (this.state.phase !== phase) throw new Error("请先完成当前操作");
    if (this.state.players[playerIndex].bankrupt) throw new Error("你已经退出学术圈");
  }

  calculateRent(position) {
    return Math.round(spaces[position].rent * (1 + this.state.buildings[position] * 1.15) * (this.state.paperValues[position] || 1));
  }

  checkBankruptcy(playerIndex) {
    const player = this.state.players[playerIndex];
    if (player.cash >= 0 || player.bankrupt) return;
    const holdings = this.state.owners
      .map((owner, position) => owner === playerIndex ? position : -1)
      .filter((position) => position >= 0)
      .sort((a, b) => spaces[a].price - spaces[b].price);
    const sold = [];
    while (player.cash < 0 && holdings.length) {
      const position = holdings.shift();
      const space = spaces[position];
      player.cash += Math.round((space.price * 0.65 + this.state.buildings[position] * space.buildCost * 0.5) * (this.state.paperValues[position] || 1));
      this.state.owners[position] = -1;
      this.state.buildings[position] = 0;
      this.state.paperValues[position] = 1;
      sold.push(space.name);
    }
    if (player.cash >= 0) {
      this.pushLog(`${player.name}出售${sold.join("、")}渡过了资金危机。`);
      return;
    }
    player.bankrupt = true;
    this.state.owners.forEach((owner, position) => {
      if (owner === playerIndex) {
        this.state.owners[position] = -1;
        this.state.buildings[position] = 0;
        this.state.paperValues[position] = 1;
      }
    });
    this.pushLog(`${player.name}科研经费耗尽，退出学术圈。`, true);
  }

  advanceTurn() {
    const active = this.state.players.filter((player) => !player.bankrupt);
    if (active.length === 0) return this.finishGame();
    const previous = this.state.currentPlayer;
    let next = previous;
    let wrapped = false;
    do {
      next = (next + 1) % this.state.players.length;
      if (next <= previous) wrapped = true;
    } while (this.state.players[next].bankrupt && next !== previous);
    if (wrapped) this.state.round += 1;
    const annualReview = wrapped && (this.state.round - 1) % PERIODS_PER_YEAR === 0
      ? this.resolveAnnualReview((this.state.round - 1) / PERIODS_PER_YEAR)
      : null;
    const remaining = this.state.players.filter((player) => !player.bankrupt);
    if (remaining.length === 0) {
      this.finishGame();
      return annualReview;
    }
    if (this.state.players[next].bankrupt) {
      do { next = (next + 1) % this.state.players.length; } while (this.state.players[next].bankrupt);
    }
    this.state.currentPlayer = next;
    this.state.phase = "await_roll";
    this.armTurnTimer();
    return annualReview;
  }

  resolveAnnualReview(completedYear) {
    const ranking = this.state.players
      .map((player, playerIndex) => ({ playerIndex, player, profile: this.academicProfile(playerIndex) }))
      .sort((a, b) => b.profile.worth - a.profile.worth);
    ranking.forEach((entry) => {
      const award = academicHat(entry.profile, entry.player.hatLevel);
      entry.player.hat = award.hat;
      entry.player.hatLevel = award.level;
      entry.profile.academicScore = award.score;
    });
    this.pushLog(`第${completedYear}年度评帽完成：${ranking.map((entry) => `${entry.player.name}获评${entry.player.hat}`).join("；")}。`, true);
    return {
      type: "annual_review",
      year: completedYear,
      results: ranking.map((entry) => ({ playerIndex: entry.playerIndex, hat: entry.player.hat, ...entry.profile })),
    };
  }

  academicProfile(playerIndex) {
    const positions = this.state.owners.map((owner, position) => owner === playerIndex ? position : -1).filter((position) => position >= 0);
    const papers = positions.length;
    const influence = this.state.owners.reduce((total, owner, position) => owner === playerIndex ? total + this.state.buildings[position] : total, 0);
    const cns = positions.filter((position) => spaces[position].district === "CNS").length;
    const medicalTop = positions.filter((position) => spaces[position].district === "医学四刊").length;
    const totalIf = positions.reduce((total, position) => total + (spaces[position].impactFactor || 0) * (this.state.paperValues[position] || 1), 0);
    const topPapers = positions.filter((position) => (spaces[position].impactFactor || 0) >= 20).length;
    const prestige = positions.reduce((total, position) => total + spaces[position].price, 0);
    return {
      papers,
      influence,
      cns,
      medicalTop,
      totalIf: Number(totalIf.toFixed(1)),
      topPapers,
      prestige,
      fundingTotal: this.state.players[playerIndex].fundingTotal || 0,
      cash: Math.max(0, this.state.players[playerIndex].cash),
      worth: this.netWorth(playerIndex),
    };
  }

  finishGame() {
    this.state.status = "finished";
    this.state.phase = "finished";
    this.state.pending = null;
    this.state.turnDeadline = null;
    const values = this.state.players.map((_, index) => this.netWorth(index));
    const best = Math.max(...values);
    this.state.winnerIds = this.state.players.filter((_, index) => values[index] === best).map((player) => player.id);
    this.pushLog("所有学者均已退出，本次学术圈结束。", true);
  }

  netWorth(playerIndex) {
    let worth = Math.max(0, this.state.players[playerIndex].cash);
    this.state.owners.forEach((owner, position) => {
      if (owner === playerIndex) worth += (spaces[position].price + this.state.buildings[position] * spaces[position].buildCost) * (this.state.paperValues[position] || 1);
    });
    return Math.round(worth);
  }

  pushLog(message, important = false) {
    this.state.log.unshift({ message, important, at: Date.now() });
    this.state.log = this.state.log.slice(0, 8);
  }

  async commit(action) {
    await this.save();
    this.broadcast({ type: "state", state: this.publicState(), action });
    await this.scheduleTurnAction();
  }

  async scheduleTurnAction() {
    const player = this.state?.players[this.state.currentPlayer];
    if (this.state?.status === "playing" && player && !player.bankrupt) {
      if (player.bot) {
        await this.ctx.storage.setAlarm(Date.now() + 850);
        return;
      }
      if (["await_roll", "await_buy"].includes(this.state.phase)) {
        if (!this.state.turnDeadline) this.armTurnTimer();
        await this.ctx.storage.setAlarm(this.state.turnDeadline);
        return;
      }
    }
    await this.ctx.storage.deleteAlarm();
  }

  broadcast(payload, except = null) {
    const message = JSON.stringify(payload);
    for (const webSocket of this.ctx.getWebSockets()) {
      if (webSocket === except) continue;
      try { webSocket.send(message); } catch { /* The close handler updates presence. */ }
    }
  }

  sendError(webSocket, message) {
    try { webSocket.send(JSON.stringify({ type: "error", message })); } catch { /* Socket already closed. */ }
  }

  async webSocketClose(webSocket) {
    const attachment = webSocket.deserializeAttachment();
    const state = await this.getState();
    const player = state?.players.find((entry) => entry.id === attachment?.playerId);
    if (!player) return;
    const stillConnected = this.ctx.getWebSockets(player.id).some((socket) => socket !== webSocket);
    player.connected = stillConnected;
    await this.save();
    this.broadcast({ type: "presence", playerId: player.id, connected: stillConnected });
  }
}

function randomInt(minimum, maximum) {
  const range = maximum - minimum + 1;
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return minimum + values[0] % range;
}

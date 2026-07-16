(() => {
  "use strict";

  const API_URL = "https://wxgame-monopoly-online.781279348.workers.dev";
  const PERIODS_PER_YEAR = 24;
  const BOARD_SIDE = 12;
  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#boardCanvas");
  const ctx = canvas.getContext("2d");
  const boardWrap = $("#boardWrap");
  const diceElement = $("#dice");
  const rollButton = $("#rollButton");
  const playerColors = ["#E64B35", "#4DBBD5", "#00A087", "#3C5488", "#F39B7F", "#8491B4", "#7E6148"];
  const avatarPaths = {
    "avatar-01": "./assets/avatars/avatar-01.jpg",
    "avatar-02": "./assets/avatars/avatar-02.jpg",
    "avatar-03": "./assets/avatars/avatar-03.jpg",
    "avatar-04": "./assets/avatars/avatar-04.jpg",
    "avatar-05": "./assets/avatars/avatar-05.jpg",
    "avatar-06": "./assets/avatars/avatar-06.jpg",
    "avatar-07": "./assets/avatars/avatar-07.png",
    "avatar-08": "./assets/avatars/avatar-08.jpg",
    "avatar-09": "./assets/avatars/avatar-09.jpg",
    "avatar-10": "./assets/avatars/avatar-10.jpg",
    robot: "./assets/avatars/robot.svg",
  };
  const avatarImages = new Map();

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

  let identity = null;
  let socket = null;
  let roomState = null;
  let players = [];
  let owners = Array(spaces.length).fill(-1);
  let buildings = Array(spaces.length).fill(0);
  let paperValues = Array(spaces.length).fill(1);
  let currentPlayer = 0;
  let round = 1;
  let jackpot = 180;
  let boardMetrics = null;
  let busy = false;
  let manuallyClosed = false;
  let reconnectTimer = 0;
  let reconnectAttempts = 0;
  let toastTimer = 0;
  let packetQueue = Promise.resolve();
  let eventQueue = [];
  let selectedAvatar = avatarPaths[localStorage.getItem("monopolyAvatar")] ? localStorage.getItem("monopolyAvatar") : "avatar-01";

  Object.entries(avatarPaths).forEach(([id, source]) => {
    const image = new Image();
    image.addEventListener("load", drawBoard);
    image.src = source;
    avatarImages.set(id, image);
  });
  const campusLogo = new Image();
  campusLogo.addEventListener("load", drawBoard);
  campusLogo.src = "./assets/jiangxi-agricultural-university.png";

  function boardPath(index) {
    const edge = BOARD_SIDE - 1;
    if (index <= edge) return { col: index, row: edge };
    if (index <= edge * 2) return { col: edge, row: edge * 2 - index };
    if (index <= edge * 3) return { col: edge * 3 - index, row: 0 };
    return { col: 0, row: index - edge * 3 };
  }

  function resizeBoard() {
    const rect = boardWrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    boardMetrics = { width: rect.width, height: rect.height, cell: rect.width / BOARD_SIDE };
    drawBoard();
  }

  function roundRect(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function drawBoard() {
    if (!boardMetrics) return;
    const { width, height, cell } = boardMetrics;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#e9eff0";
    ctx.fillRect(0, 0, width, height);
    drawCenterCity(cell);
    spaces.forEach((space, index) => drawSpace(space, index, cell));
    players.forEach((player, index) => { if (index !== currentPlayer) drawToken(player, index, cell); });
    if (players[currentPlayer]) drawToken(players[currentPlayer], currentPlayer, cell);
  }

  function drawCenterCity(cell) {
    const x = cell + 3;
    const y = cell + 3;
    const size = cell * (BOARD_SIDE - 2) - 6;
    ctx.fillStyle = "#f2f5f4";
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = "rgba(255,255,255,.24)";
    for (let line = 1; line < 5; line += 1) {
      ctx.fillRect(x, y + size * line / 5, size, 1);
      ctx.fillRect(x + size * line / 5, y, 1, size);
    }
    const route = [[.22,.56],[.28,.38],[.43,.25],[.64,.2],[.79,.35],[.72,.54],[.59,.7],[.38,.76],[.2,.66]];
    ctx.strokeStyle = "rgba(60,84,136,.42)";
    ctx.lineWidth = Math.max(2, cell * .06);
    ctx.setLineDash([Math.max(3, cell * .1), Math.max(3, cell * .1)]);
    ctx.beginPath();
    route.forEach(([rx, ry], index) => index ? ctx.lineTo(x + size * rx, y + size * ry) : ctx.moveTo(x + size * rx, y + size * ry));
    ctx.stroke();
    ctx.setLineDash([]);
    route.forEach(([rx, ry], index) => {
      ctx.fillStyle = index === 0 ? "#E64B35" : "#ffffff";
      ctx.beginPath();
      ctx.arc(x + size * rx, y + size * ry, Math.max(2.5, cell * .07), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = index === 0 ? "#fff" : "#00A087";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
    if (campusLogo.complete && campusLogo.naturalWidth) {
      const logoSize = Math.max(20, cell * .58);
      const logoX = x + size * route[0][0];
      const logoY = y + size * route[0][1];
      ctx.save();
      ctx.beginPath();
      ctx.arc(logoX, logoY, logoSize / 2, 0, Math.PI * 2);
      ctx.clip();
      drawCoverImage(campusLogo, logoX - logoSize / 2, logoY - logoSize / 2, logoSize, logoSize);
      ctx.restore();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(logoX, logoY, logoSize / 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(60,84,136,.72)";
    ctx.font = `900 ${Math.max(9, cell * .24)}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("江农学报起步 · 闯荡学术圈", x + size / 2, y + size * .9);
  }

  function drawSpace(space, index, cell) {
    const { col, row } = boardPath(index);
    const x = col * cell;
    const y = row * cell;
    const pad = Math.max(1.5, cell * 0.035);
    const ownedBy = owners[index];
    ctx.save();
    roundRect(x + pad, y + pad, cell - pad * 2, cell - pad * 2, Math.max(3, cell * 0.07));
    ctx.fillStyle = index % 2 ? "#ffffff" : "#f6f7f7";
    ctx.fill();
    ctx.strokeStyle = ownedBy >= 0 ? playerColors[ownedBy] : "rgba(43,43,43,.18)";
    ctx.lineWidth = ownedBy >= 0 ? Math.max(2, cell * 0.055) : 1;
    ctx.stroke();
    const bandColor = space.color || specialColor(space.type);
    ctx.fillStyle = bandColor;
    const band = Math.max(7, cell * 0.19);
    if (row === BOARD_SIDE - 1) ctx.fillRect(x + pad, y + pad, cell - pad * 2, band);
    else if (col === BOARD_SIDE - 1) ctx.fillRect(x + cell - pad - band, y + pad, band, cell - pad * 2);
    else if (row === 0) ctx.fillRect(x + pad, y + cell - pad - band, cell - pad * 2, band);
    else ctx.fillRect(x + pad, y + pad, band, cell - pad * 2);
    ctx.fillStyle = "#2b2b2b";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 ${Math.max(6, cell * 0.12)}px system-ui`;
    ctx.fillText(space.short || (space.name.length > 4 ? space.name.slice(0, 4) : space.name), x + cell / 2, y + cell * 0.47, cell * .78);
    ctx.font = `800 ${Math.max(6, cell * 0.11)}px system-ui`;
    ctx.fillStyle = "#6f7175";
    if (space.price) ctx.fillText(`¥${space.price}`, x + cell / 2, y + cell * 0.67);
    else if (space.type !== "start") ctx.fillText(space.icon || "", x + cell / 2, y + cell * 0.67);
    if (space.type === "start" && campusLogo.complete && campusLogo.naturalWidth) {
      const logoSize = cell * .28;
      ctx.drawImage(campusLogo, x + cell / 2 - logoSize / 2, y + cell * .53, logoSize, logoSize);
    }
    if (buildings[index] > 0) drawHouses(index, x, y, cell);
    ctx.restore();
  }

  function drawHouses(position, x, y, cell) {
    const paperWidth = Math.max(4, cell * 0.11);
    const paperHeight = paperWidth * 1.22;
    const startX = x + cell / 2 - ((buildings[position] - 1) * (paperWidth + 1)) / 2;
    for (let index = 0; index < buildings[position]; index += 1) {
      const paperX = startX + index * (paperWidth + 1);
      const paperY = y + cell * 0.65;
      ctx.fillStyle = "#3C5488";
      ctx.fillRect(paperX, paperY, paperWidth, paperHeight);
      ctx.fillStyle = "#F39B7F";
      ctx.fillRect(paperX, paperY, paperWidth, Math.max(1.5, paperHeight * .22));
      ctx.fillStyle = "rgba(255,255,255,.82)";
      ctx.fillRect(paperX + paperWidth * .18, paperY + paperHeight * .46, paperWidth * .64, 1);
      ctx.fillRect(paperX + paperWidth * .18, paperY + paperHeight * .69, paperWidth * .48, 1);
    }
  }

  function specialColor(type) {
    return { start: "#00A087", chance: "#F39B7F", tax: "#E64B35", penalty: "#E64B35", vacation: "#4DBBD5", jackpot: "#3C5488" }[type] || "#B09C85";
  }

  function tokenPoint(playerIndex, position) {
    const { col, row } = boardPath(position);
    const cell = boardMetrics.cell;
    const offsets = [[0.22, 0.22], [0.5, 0.22], [0.78, 0.22], [0.22, 0.5], [0.5, 0.5], [0.78, 0.5], [0.5, 0.78]];
    return { x: (col + offsets[playerIndex][0]) * cell, y: (row + offsets[playerIndex][1]) * cell };
  }

  function drawToken(player, index, cell) {
    if (player.bankrupt) return;
    const point = tokenPoint(index, player.pos);
    const active = index === currentPlayer && roomState?.status === "playing";
    const width = Math.max(13.5, cell * .36) + (active ? 2 : 0);
    const height = width * 1.16;
    const x = point.x - width / 2;
    const y = point.y - height / 2 - (active ? 2 : 0);
    ctx.save();
    ctx.shadowColor = "rgba(24,47,51,.32)";
    ctx.shadowBlur = active ? 7 : 4;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = "#fff";
    roundRect(x, y, width, height, Math.max(3, width * .2));
    ctx.fill();
    ctx.shadowColor = "transparent";
    const image = avatarImages.get(player.avatar);
    if (image?.complete && image.naturalWidth) {
      ctx.save();
      roundRect(x + 2, y + 2, width - 4, height - 4, Math.max(2, width * .14));
      ctx.clip();
      if (player.bot) drawContainImage(image, x + 2, y + 2, width - 4, height - 4);
      else drawCoverImage(image, x + 2, y + 2, width - 4, height - 4);
      ctx.restore();
    } else {
      ctx.fillStyle = playerColors[index];
      roundRect(x + 2, y + 2, width - 4, height - 4, 2);
      ctx.fill();
    }
    ctx.strokeStyle = playerColors[index];
    ctx.lineWidth = active ? 3 : 2;
    roundRect(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, width - ctx.lineWidth, height - ctx.lineWidth, Math.max(3, width * .2));
    ctx.stroke();
    ctx.fillStyle = playerColors[index];
    ctx.beginPath();
    ctx.moveTo(point.x - 3, y + height - 1);
    ctx.lineTo(point.x + 3, y + height - 1);
    ctx.lineTo(point.x, y + height + 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawCoverImage(image, x, y, width, height) {
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const sourceWidth = width / scale;
    const sourceHeight = height / scale;
    const sourceX = (image.naturalWidth - sourceWidth) / 2;
    const sourceY = (image.naturalHeight - sourceHeight) / 2;
    ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
  }

  function drawContainImage(image, x, y, width, height) {
    const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
  }

  function setDice(value) {
    const shadows = {
      1: "none",
      2: "-9px -9px 0 #2b2b2b, 9px 9px 0 #2b2b2b",
      3: "-9px -9px 0 #2b2b2b, 9px 9px 0 #2b2b2b",
      4: "-9px -9px 0 #2b2b2b, 9px -9px 0 #2b2b2b, -9px 9px 0 #2b2b2b, 9px 9px 0 #2b2b2b",
      5: "-9px -9px 0 #2b2b2b, 9px -9px 0 #2b2b2b, -9px 9px 0 #2b2b2b, 9px 9px 0 #2b2b2b",
      6: "-9px -9px 0 #2b2b2b, 9px -9px 0 #2b2b2b, -9px 0 0 #2b2b2b, 9px 0 0 #2b2b2b, -9px 9px 0 #2b2b2b, 9px 9px 0 #2b2b2b",
    };
    diceElement.style.setProperty("--dice-shadow", shadows[value]);
    diceElement.style.setProperty("--dice-center", value % 2 === 0 ? "transparent" : "#2b2b2b");
  }

  async function apiRequest(path, body) {
    const response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "联机服务暂时不可用");
    return data;
  }

  async function createRoom() {
    setLobbyBusy(true);
    try {
      const name = cleanLocalName();
      const result = await apiRequest("/rooms", { name, avatar: selectedAvatar });
      acceptIdentity(result);
    } catch (error) {
      showLobbyError(error.message);
    } finally {
      setLobbyBusy(false);
    }
  }

  async function joinRoom() {
    const code = $("#roomCodeInput").value.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) return showLobbyError("请输入六位房间码");
    setLobbyBusy(true);
    try {
      const name = cleanLocalName();
      const result = await apiRequest(`/rooms/${code}/join`, { name, avatar: selectedAvatar });
      acceptIdentity(result);
    } catch (error) {
      showLobbyError(error.message);
    } finally {
      setLobbyBusy(false);
    }
  }

  function cleanLocalName() {
    const name = $("#playerName").value.replace(/[<>\n\r]/g, "").trim().slice(0, 10) || "玩家";
    localStorage.setItem("monopolyOnlineName", name);
    return name;
  }

  function acceptIdentity(result) {
    identity = { code: result.code, playerId: result.playerId, token: result.token };
    localStorage.setItem("monopolyOnlineSession", JSON.stringify(identity));
    history.replaceState(null, "", `${location.pathname}?room=${result.code}`);
    roomState = result.state;
    renderLobby(result.state);
    connectSocket();
  }

  function connectSocket() {
    if (!identity) return;
    manuallyClosed = false;
    clearTimeout(reconnectTimer);
    socket?.close();
    setConnection("reconnecting", "连接中");
    const url = new URL(API_URL.replace(/^http/, "ws"));
    url.pathname = `/rooms/${identity.code}/connect`;
    url.searchParams.set("playerId", identity.playerId);
    url.searchParams.set("token", identity.token);
    socket = new WebSocket(url);
    socket.addEventListener("open", () => {
      reconnectAttempts = 0;
      setConnection("connected", "已连接");
    });
    socket.addEventListener("message", (event) => {
      let packet;
      try { packet = JSON.parse(event.data); } catch { return; }
      if (packet.type === "error") {
        busy = false;
        showToast(packet.message || "操作失败");
        updateControls();
        return;
      }
      packetQueue = packetQueue.then(() => processPacket(packet));
    });
    socket.addEventListener("close", () => {
      setConnection("reconnecting", "重连中");
      if (!manuallyClosed) scheduleReconnect();
    });
    socket.addEventListener("error", () => setConnection("reconnecting", "网络波动"));
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimer);
    reconnectAttempts += 1;
    reconnectTimer = window.setTimeout(connectSocket, Math.min(8000, 600 * 2 ** reconnectAttempts));
  }

  function sendAction(type, extra = {}) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return showToast("正在重新连接房间");
    socket.send(JSON.stringify({ type, ...extra }));
  }

  async function processPacket(packet) {
    if (packet.type === "presence") {
      if (roomState) {
        const player = roomState.players.find((entry) => entry.id === packet.playerId);
        if (player) player.connected = packet.connected;
        if (roomState.status === "waiting") renderLobby(roomState);
        else renderPlayerStrip();
      }
      return;
    }
    if (packet.type !== "state") return;
    const action = packet.action || {};
    if (action.kind === "roll" && roomState?.status === "playing") {
      await animateRoll(packet.state, action);
    } else {
      applyState(packet.state);
      if (action.annualReview) showAnnualReview(action.annualReview);
    }
    if (action.kind === "join") showToast("有好友加入了房间");
    if (action.kind === "build") showToast(`${players[action.playerIndex]?.name || "玩家"}提升了论文影响力`);
    if (action.kind === "leave") showToast(`${players[action.playerIndex]?.name || "玩家"}退出了学术圈`);
  }

  async function animateRoll(nextState, action) {
    busy = true;
    diceElement.classList.add("rolling");
    setDice(action.dice);
    applyState(nextState, true);
    if (players[action.playerIndex]) players[action.playerIndex].pos = action.from;
    drawBoard();
    for (let step = 0; step < action.steps; step += 1) {
      players[action.playerIndex].pos = (players[action.playerIndex].pos + 1) % spaces.length;
      drawBoard();
      await delay(135);
    }
    diceElement.classList.remove("rolling");
    applyState(nextState);
    busy = false;
    updateControls();
    showLandingEffect(action);
    if (action.annualReview) showAnnualReview(action.annualReview);
  }

  function applyState(state, deferPrompts = false) {
    roomState = state;
    players = state.players.map((player) => ({
      ...player,
      mark: player.name.slice(0, 1) || "玩",
    }));
    owners = state.owners.slice();
    buildings = state.buildings.slice();
    paperValues = state.paperValues?.slice() || Array(spaces.length).fill(1);
    currentPlayer = state.currentPlayer;
    round = state.round;
    jackpot = state.jackpot;
    if (state.status === "waiting") {
      renderLobby(state);
      return;
    }
    $("#lobbyOverlay").classList.add("hidden");
    updateUi();
    if (state.status === "finished") showGameOver();
    if (!deferPrompts) syncPendingPrompt();
  }

  function localPlayerIndex() {
    return roomState?.players.findIndex((player) => player.id === identity?.playerId) ?? -1;
  }

  function updateUi() {
    const localIndex = localPlayerIndex();
    const localPlayer = players[localIndex];
    $("#playerCash").textContent = Math.max(0, localPlayer?.cash || 0);
    $("#roundValue").textContent = formatPeriod(round);
    $("#jackpotValue").textContent = jackpot;
    $("#assetCount").textContent = `${owners.filter((owner) => owner === localIndex).length} 篇论文`;
    renderPlayerStrip();
    renderFeed();
    updateControls();
    updateTurnTimer();
    drawBoard();
  }

  function updateTurnTimer() {
    const timer = $("#turnTimer");
    const activePlayer = players[currentPlayer];
    const show = roomState?.status === "playing" && roomState.turnDeadline && !activePlayer?.bot;
    timer.classList.toggle("hidden", !show);
    if (!show) return;
    const seconds = Math.max(0, Math.ceil((roomState.turnDeadline - Date.now()) / 1000));
    timer.textContent = `${seconds}s`;
    timer.classList.toggle("warning", seconds <= 5);
  }

  function renderPlayerStrip() {
    $("#playerStrip").innerHTML = players.map((player, index) => `
      <article class="player-card ${index === currentPlayer && roomState?.status === "playing" ? "active" : ""} ${player.bankrupt ? "bankrupt" : ""}" style="--player-color:${playerColors[index]}">
        <span class="player-token ${player.bot ? "bot" : ""}"><img src="${avatarPaths[player.avatar] || avatarPaths.robot}" alt="" /></span>
        <div><b>${escapeHtml(player.name)}${player.id === identity?.playerId ? " · 你" : ""}</b><small>¥${Math.max(0, player.cash)} · ${owners.filter((owner) => owner === index).length} 篇 · ${escapeHtml(player.hat || "暂无帽子")}${player.bot || player.connected ? "" : " · 离线"}</small></div>
      </article>`).join("");
  }

  function renderFeed() {
    const log = roomState?.log || [];
    const icons = ["●", "↗", "¥", "◇"];
    $("#feedList").innerHTML = log.slice(0, 4).map((entry, index) => {
      const message = typeof entry === "string" ? entry : entry.message;
      return `<div class="feed-entry"><i>${icons[index]}</i><span>${escapeHtml(message)}</span></div>`;
    }).join("");
    const first = log[0];
    $("#logText").textContent = typeof first === "string" ? first : first?.message || "等待玩家行动。";
  }

  function updateControls() {
    if (!roomState || roomState.status !== "playing") {
      rollButton.disabled = true;
      return;
    }
    const localIndex = localPlayerIndex();
    const isMyTurn = currentPlayer === localIndex;
    const canRoll = isMyTurn && roomState.phase === "await_roll" && !busy && socket?.readyState === WebSocket.OPEN;
    rollButton.disabled = !canRoll;
    $("#turnName").textContent = isMyTurn ? "轮到你了" : `等待${players[currentPlayer]?.name || "好友"}`;
    $("#turnHint").textContent = canRoll ? "点击骰子开始行动" : roomState.phase === "await_buy" && isMyTurn ? "请决定是否投稿" : "服务器正在同步当前行动";
  }

  function syncPendingPrompt() {
    const pending = roomState?.pending;
    if (pending?.type === "buy" && pending.playerIndex === localPlayerIndex()) showPropertyPrompt(pending.position);
    else $("#propertyOverlay").classList.add("hidden");
  }

  function showPropertyPrompt(position) {
    const space = spaces[position];
    $("#propertyColor").style.background = space.color;
    $("#propertyDistrict").textContent = `${space.district} · 游戏 IF ${space.impactFactor.toFixed(1)}`;
    $("#propertyName").textContent = space.name;
    $("#propertyPrice").textContent = `¥${space.price}`;
    $("#propertyRent").textContent = `¥${space.rent}`;
    const localPlayer = players[localPlayerIndex()];
    const penaltyText = localPlayer?.nextPaperMultiplier === 0.5
      ? " 注意：老板将抢走一作，本篇成果价值、累计 IF 与引用收益仅按 50% 计算。"
      : "";
    $("#propertyText").textContent = `支付版面费即可发表；其他玩家停留时会引用并贡献学术收益。后续研究从 ¥${space.buildCost} 起，影响力最高三级。${penaltyText}`;
    $("#buyButton").disabled = players[localPlayerIndex()].cash < space.price;
    $("#propertyOverlay").classList.remove("hidden");
  }

  function showLandingEffect(action) {
    if (action.playerIndex !== localPlayerIndex()) return;
    const landing = action.landing;
    if (landing?.card) {
      const card = landing.card;
      enqueueEvent({
        icon: card.icon,
        type: "科研事件",
        title: card.title,
        text: card.text,
        amount: `${card.amount >= 0 ? "+" : "-"}¥${Math.abs(card.amount)}`,
        negative: card.amount < 0,
      });
    }
    if (landing?.penalty) {
      enqueueEvent({
        icon: "二作",
        type: "惩罚格",
        title: "老板抢一作",
        text: "你的下一篇论文仍需支付全部版面费，但累计 IF、引用收益和学术资产只按 50% 计算。",
        amount: "下一篇价值 ×0.5",
        negative: true,
      });
    }
    let amount = landing?.amount || 0;
    if (landing?.rent) amount = -landing.rent;
    if (amount) showMoneyFx(action.playerIndex, amount);
  }

  function showAnnualReview(review) {
    const localIndex = localPlayerIndex();
    const result = review.results?.find((entry) => entry.playerIndex === localIndex);
    if (!result) return;
    enqueueEvent({
      icon: "冠",
      type: `第${review.year}年度评帽`,
      title: "年度学术评议",
      text: "按累计影响因子、顶刊成果、学术资产与基金积累完成全员评帽；帽子只升不降。",
      amount: `你的帽子：${result.hat}`,
      negative: false,
      annualResults: review.results,
      buttonText: "进入下一年",
    });
  }

  function enqueueEvent(event) {
    eventQueue.push(event);
    if ($("#eventOverlay").classList.contains("hidden")) showNextEvent();
  }

  function showNextEvent() {
    const event = eventQueue.shift();
    if (!event) {
      $("#eventOverlay").classList.add("hidden");
      return;
    }
    $("#eventIcon").textContent = event.icon;
    $("#eventType").textContent = event.type;
    $("#eventTitle").textContent = event.title;
    $("#eventText").textContent = event.text;
    if (event.annualResults) renderAnnualReviewTable(event.annualResults, localPlayerIndex());
    else {
      $("#annualReviewTable").classList.add("hidden");
      $("#annualReviewTable").replaceChildren();
    }
    $("#eventAmount").textContent = event.amount;
    $("#eventAmount").classList.toggle("negative", event.negative);
    $("#eventAmount").classList.toggle("positive", !event.negative);
    $("#eventButton").textContent = event.buttonText || "知道了";
    $("#eventOverlay").classList.remove("hidden");
  }

  function renderAnnualReviewTable(results, localIndex) {
    const table = $("#annualReviewTable");
    table.replaceChildren();
    const appendRow = (values, className = "") => {
      const row = document.createElement("div");
      row.className = `annual-review-row ${className}`.trim();
      values.forEach((value, index) => {
        const cell = document.createElement(index === 0 ? "b" : "span");
        cell.textContent = value;
        cell.title = value;
        row.appendChild(cell);
      });
      table.appendChild(row);
    };
    appendRow(["学者", "累计IF", "顶刊", "学术资产", "帽子"], "header");
    results.forEach((result) => appendRow(
      [players[result.playerIndex]?.name || "已退出", Number(result.totalIf || 0).toFixed(1), `${result.topPapers || 0}篇`, `¥${result.worth}`, result.hat],
      result.playerIndex === localIndex ? "mine" : "",
    ));
    table.classList.remove("hidden");
  }

  function showMoneyFx(playerIndex, amount) {
    if (!boardMetrics || !players[playerIndex]) return;
    const point = tokenPoint(playerIndex, players[playerIndex].pos);
    const span = document.createElement("span");
    span.textContent = `${amount >= 0 ? "+" : "-"}¥${Math.abs(amount)}`;
    span.className = amount < 0 ? "negative" : "";
    span.style.left = `${point.x}px`;
    span.style.top = `${point.y}px`;
    $("#moneyFx").appendChild(span);
    window.setTimeout(() => span.remove(), 1200);
  }

  function renderLobby(state) {
    $("#roomSetup").classList.add("hidden");
    $("#roomWaiting").classList.remove("hidden");
    $("#lobbyOverlay").classList.remove("hidden");
    $("#roomCodeValue").textContent = state.code;
    $("#lobbyPlayers").innerHTML = state.players.map((player, index) => `
      <div class="lobby-player" style="--player-color:${playerColors[index]}">
        <i class="${player.bot ? "bot" : ""}"><img src="${avatarPaths[player.avatar] || avatarPaths.robot}" alt="" /></i>
        <b>${escapeHtml(player.name)}${player.id === state.hostId ? " · 房主" : ""}${player.id === identity?.playerId ? " · 你" : ""}</b>
        <span class="${player.connected || player.bot ? "online" : ""}">${player.bot ? "已就位" : player.connected ? "已连接" : "连接中"}</span>
      </div>`).join("");
    const isHost = identity?.playerId === state.hostId;
    const robotsNeeded = Math.max(0, 3 - state.players.length);
    $("#startOnlineButton").disabled = !isHost;
    $("#startOnlineButton").textContent = !isHost ? "等待房主开始" : robotsNeeded ? `开始游戏 · 补 ${robotsNeeded} 位对手` : `开始游戏 · ${state.players.length} 人`;
  }

  function openAssets() {
    if (!roomState || roomState.status !== "playing") return;
    renderAssets();
    $("#assetsPanel").classList.remove("hidden");
  }

  function renderAssets() {
    const localIndex = localPlayerIndex();
    const positions = owners.map((owner, position) => owner === localIndex ? position : -1).filter((position) => position >= 0);
    $("#netWorth").textContent = `¥${netWorth(localIndex)}`;
    $("#propertyCount").textContent = positions.length;
    $("#buildingCount").textContent = positions.reduce((total, position) => total + buildings[position], 0);
    if (!positions.length) {
      $("#propertyList").innerHTML = '<div class="empty-assets">还没有论文。先找一本合适的期刊投稿吧。</div>';
      return;
    }
    $("#propertyList").innerHTML = positions.map((position) => {
      const space = spaces[position];
      const level = buildings[position];
      const cost = space.buildCost * (level + 1);
      const disabled = level >= 3 || players[localIndex].cash < cost || currentPlayer !== localIndex || roomState.phase !== "await_roll";
      return `<article class="asset-item" style="--property-color:${space.color}">
        <i></i><div><b>${space.name}${paperValues[position] < 1 ? " · 二作" : ""}</b><small>游戏 IF ${(space.impactFactor * (paperValues[position] || 1)).toFixed(1)} · 影响力 ${level} 级 · 引用收益 ¥${calculateRent(position)}</small></div>
        <button class="build-button" data-position="${position}" ${disabled ? "disabled" : ""}>${level >= 3 ? "影响力满级" : `补充研究 ¥${cost}`}</button>
      </article>`;
    }).join("");
  }

  function calculateRent(position) {
    return Math.round(spaces[position].rent * (1 + buildings[position] * 1.15) * (paperValues[position] || 1));
  }

  function netWorth(playerIndex) {
    if (playerIndex < 0) return 0;
    let worth = Math.max(0, players[playerIndex].cash);
    owners.forEach((owner, position) => {
      if (owner === playerIndex) worth += (spaces[position].price + buildings[position] * spaces[position].buildCost) * (paperValues[position] || 1);
    });
    return Math.round(worth);
  }

  function showGameOver() {
    const ranking = players.map((player, index) => ({ ...player, index, worth: netWorth(index) })).sort((a, b) => b.worth - a.worth);
    const localRank = ranking.findIndex((entry) => entry.id === identity.playerId) + 1;
    $("#resultTitle").textContent = players[localPlayerIndex()]?.hat || `学术圈第 ${localRank} 名`;
    $("#resultText").textContent = "科研经费耗尽，本次学术旅程结束。";
    $("#rankingList").innerHTML = ranking.map((entry, rank) => `<div class="ranking-row ${rank === 0 ? "winner" : ""}"><i>${rank + 1}</i><b>${escapeHtml(entry.name)} · ${escapeHtml(entry.hat || "暂无帽子")}${entry.id === identity.playerId ? " · 你" : ""}</b><strong>¥${entry.worth}</strong></div>`).join("");
    $("#gameOverOverlay").classList.remove("hidden");
  }

  function setConnection(status, text) {
    $("#connectionDot").className = status;
    $("#connectionText").textContent = text;
  }

  function setLobbyBusy(value) {
    $("#createRoomButton").disabled = value;
    $("#joinRoomButton").disabled = value;
    $("#createRoomButton").textContent = value ? "连接服务中..." : "创建房间";
  }

  function showLobbyError(message) {
    $("#lobbyError").textContent = message;
    $("#lobbyError").classList.remove("hidden");
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    $("#toast").textContent = message;
    $("#toast").classList.remove("hidden");
    toastTimer = window.setTimeout(() => $("#toast").classList.add("hidden"), 1900);
  }

  async function copyInvite() {
    const invite = `${location.origin}${location.pathname}?room=${identity.code}`;
    try {
      await navigator.clipboard.writeText(invite);
      showToast("邀请链接已复制");
    } catch {
      await navigator.clipboard.writeText(identity.code).catch(() => {});
      showToast(`房间码：${identity.code}`);
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
  }

  function delay(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  async function reconnectFromUrl() {
    const code = new URLSearchParams(location.search).get("room")?.toUpperCase();
    if (!code) return;
    $("#roomCodeInput").value = code;
    let stored;
    try { stored = JSON.parse(localStorage.getItem("monopolyOnlineSession") || "null"); } catch { stored = null; }
    if (!stored || stored.code !== code) return;
    setLobbyBusy(true);
    try {
      const result = await apiRequest(`/rooms/${code}/join`, { playerId: stored.playerId, token: stored.token });
      acceptIdentity(result);
    } catch {
      localStorage.removeItem("monopolyOnlineSession");
    } finally {
      setLobbyBusy(false);
    }
  }

  rollButton.addEventListener("click", () => {
    busy = true;
    updateControls();
    sendAction("roll");
  });
  $("#avatarPicker").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-avatar]");
    if (!button) return;
    selectedAvatar = button.dataset.avatar;
    localStorage.setItem("monopolyAvatar", selectedAvatar);
    $("#avatarPicker").querySelectorAll("button").forEach((entry) => entry.classList.toggle("selected", entry === button));
  });
  $("#createRoomButton").addEventListener("click", createRoom);
  $("#joinRoomButton").addEventListener("click", joinRoom);
  $("#roomCodeInput").addEventListener("input", (event) => { event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); });
  $("#copyRoomButton").addEventListener("click", copyInvite);
  $("#startOnlineButton").addEventListener("click", () => sendAction("start"));
  $("#leaveRoomButton").addEventListener("click", () => {
    manuallyClosed = true;
    socket?.close();
    localStorage.removeItem("monopolyOnlineSession");
    location.href = "./online.html";
  });
  $("#buyButton").addEventListener("click", () => { $("#propertyOverlay").classList.add("hidden"); sendAction("buy"); });
  $("#skipButton").addEventListener("click", () => { $("#propertyOverlay").classList.add("hidden"); sendAction("skip_buy"); });
  $("#eventButton").addEventListener("click", showNextEvent);
  $("#assetsButton").addEventListener("click", openAssets);
  $("#closeAssetsButton").addEventListener("click", () => $("#assetsPanel").classList.add("hidden"));
  $("#propertyList").addEventListener("click", (event) => {
    const button = event.target.closest(".build-button");
    if (button) sendAction("build", { position: Number(button.dataset.position) });
  });
  $("#pauseButton").addEventListener("click", () => $("#pauseOverlay").classList.remove("hidden"));
  $("#resumeButton").addEventListener("click", () => $("#pauseOverlay").classList.add("hidden"));
  $("#exitGameButton").addEventListener("click", (event) => {
    event.preventDefault();
    sendAction("leave_game");
    manuallyClosed = true;
    window.setTimeout(() => {
      socket?.close();
      localStorage.removeItem("monopolyOnlineSession");
      location.href = "./";
    }, 180);
  });
  $("#backToLobbyButton").addEventListener("click", () => { manuallyClosed = true; socket?.close(); location.href = "./"; });
  window.addEventListener("resize", resizeBoard);

  $("#playerName").value = localStorage.getItem("monopolyOnlineName") || "玩家";
  $("#avatarPicker").querySelectorAll("button[data-avatar]").forEach((button) => button.classList.toggle("selected", button.dataset.avatar === selectedAvatar));
  window.setInterval(updateTurnTimer, 250);
  setDice(1);
  resizeBoard();
  reconnectFromUrl();
})();

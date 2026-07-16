(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#boardCanvas");
  const ctx = canvas.getContext("2d");
  const boardWrap = $("#boardWrap");
  const dice = $("#dice");
  const rollButton = $("#rollButton");
  const playerColors = ["#E64B35", "#4DBBD5", "#00A087"];
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
  const PERIODS_PER_YEAR = 24;
  const START_CASH = 1800;
  const BOARD_SIDE = 12;

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

  let players = [];
  let owners = [];
  let buildings = [];
  let paperValues = [];
  let currentPlayer = 0;
  let round = 1;
  let jackpot = 180;
  let busy = false;
  let paused = false;
  let started = false;
  let gameEnded = false;
  let pendingDecision = null;
  let toastTimer = 0;
  let boardMetrics = null;
  let logHistory = [];
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

  function resetGame() {
    players = [
      { name: "你", mark: "我", avatar: selectedAvatar, cash: START_CASH, pos: 0, bankrupt: false, hat: "暂无帽子", hatLevel: 0, fundingTotal: 0, grants: {} },
      { name: "阿财", mark: "财", avatar: "robot", bot: true, cash: START_CASH, pos: 0, bankrupt: false, hat: "暂无帽子", hatLevel: 0, fundingTotal: 0, grants: {} },
      { name: "玖玖", mark: "玖", avatar: "robot", bot: true, cash: START_CASH, pos: 0, bankrupt: false, hat: "暂无帽子", hatLevel: 0, fundingTotal: 0, grants: {} },
    ];
    owners = Array(spaces.length).fill(-1);
    buildings = Array(spaces.length).fill(0);
    paperValues = Array(spaces.length).fill(1);
    currentPlayer = 0;
    round = 1;
    jackpot = 180;
    busy = false;
    paused = false;
    started = true;
    gameEnded = false;
    pendingDecision = null;
    logHistory = [];
    hideAllOverlays();
    setDice(1);
    setLog("从《江西农业大学学报》起步，先掷个骰子吧。");
    updateUi();
    beginTurn();
  }

  function hideAllOverlays() {
    ["#introOverlay", "#propertyOverlay", "#eventOverlay", "#pauseOverlay", "#gameOverOverlay"].forEach((selector) => $(selector).classList.add("hidden"));
    $("#assetsPanel").classList.add("hidden");
  }

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
    const centerX = x + cell / 2;
    const centerY = y + cell * 0.47;
    ctx.fillText(space.short || shortName(space.name), centerX, centerY, cell * .78);
    ctx.font = `800 ${Math.max(6, cell * 0.11)}px system-ui`;
    ctx.fillStyle = "#6f7175";
    if (space.price) ctx.fillText(`¥${space.price}`, centerX, centerY + cell * 0.2);
    else if (space.type !== "start" && space.icon) ctx.fillText(space.icon, centerX, centerY + cell * 0.2);
    if (space.type === "start" && campusLogo.complete && campusLogo.naturalWidth) {
      const logoSize = cell * .28;
      ctx.drawImage(campusLogo, centerX - logoSize / 2, centerY + cell * .06, logoSize, logoSize);
    }

    if (buildings[index] > 0) {
      const paperW = Math.max(4, cell * 0.11);
      const paperH = paperW * 1.22;
      const startX = centerX - ((buildings[index] - 1) * (paperW + 1)) / 2;
      for (let i = 0; i < buildings[index]; i += 1) {
        const paperX = startX + i * (paperW + 1);
        const paperY = y + cell * 0.65;
        ctx.fillStyle = "#3C5488";
        ctx.fillRect(paperX, paperY, paperW, paperH);
        ctx.fillStyle = "#F39B7F";
        ctx.fillRect(paperX, paperY, paperW, Math.max(1.5, paperH * .22));
        ctx.fillStyle = "rgba(255,255,255,.82)";
        ctx.fillRect(paperX + paperW * .18, paperY + paperH * .46, paperW * .64, 1);
        ctx.fillRect(paperX + paperW * .18, paperY + paperH * .69, paperW * .48, 1);
      }
    }
    ctx.restore();
  }

  function specialColor(type) {
    return { start: "#00A087", chance: "#F39B7F", tax: "#E64B35", penalty: "#E64B35", vacation: "#4DBBD5", jackpot: "#3C5488" }[type] || "#B09C85";
  }

  function shortName(name) {
    return name.length > 4 ? name.slice(0, 4) : name;
  }

  function tokenPoint(playerIndex, position) {
    const { col, row } = boardPath(position);
    const cell = boardMetrics.cell;
    const offsets = [[0.31, 0.34], [0.68, 0.34], [0.5, 0.7]];
    const offset = offsets[playerIndex];
    return { x: (col + offset[0]) * cell, y: (row + offset[1]) * cell };
  }

  function drawToken(player, index, cell) {
    if (player.bankrupt) return;
    const point = tokenPoint(index, player.pos);
    const active = index === currentPlayer && !gameEnded;
    const width = Math.max(15, cell * .4) + (active ? 2 : 0);
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
      ctx.fillStyle = "white";
      ctx.font = `1000 ${Math.max(8, cell * .19)}px system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(player.mark, point.x, y + height / 2);
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
    dice.style.setProperty("--dice-shadow", shadows[value]);
    dice.style.setProperty("--dice-center", value % 2 === 0 ? "transparent" : "#2b2b2b");
    dice.dataset.value = value;
  }

  function setLog(message) {
    $("#logText").textContent = message;
    if (logHistory[0] !== message) logHistory.unshift(message);
    logHistory = logHistory.slice(0, 4);
    renderFeed();
  }

  function renderFeed() {
    const icons = ["●", "↗", "¥", "◇"];
    $("#feedList").innerHTML = logHistory.map((message, index) => `<div class="feed-entry"><i>${icons[index]}</i><span>${message}</span></div>`).join("");
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    $("#toast").textContent = message;
    $("#toast").classList.remove("hidden");
    toastTimer = window.setTimeout(() => $("#toast").classList.add("hidden"), 1800);
  }

  function updateUi() {
    $("#playerCash").textContent = Math.max(0, players[0]?.cash || 0);
    $("#roundValue").textContent = formatPeriod(round);
    $("#jackpotValue").textContent = jackpot;
    const humanProperties = owners.filter((owner) => owner === 0).length;
    $("#assetCount").textContent = `${humanProperties} 篇论文`;
    renderPlayerStrip();
    drawBoard();
  }

  function renderPlayerStrip() {
    $("#playerStrip").innerHTML = players.map((player, index) => `
      <article class="player-card ${index === currentPlayer && !gameEnded ? "active" : ""} ${player.bankrupt ? "bankrupt" : ""}" style="--player-color:${playerColors[index]}">
        <span class="player-token ${player.bot ? "bot" : ""}"><img src="${avatarPaths[player.avatar] || avatarPaths.robot}" alt="" /></span>
        <div><b>${player.name}${player.bankrupt ? " · 退出" : ""}</b><small>¥${Math.max(0, player.cash)} · ${owners.filter((owner) => owner === index).length} 篇 · ${player.hat || "暂无帽子"}</small></div>
      </article>`).join("");
  }

  function beginTurn() {
    if (gameEnded) return;
    const activePlayers = players.filter((player) => !player.bankrupt);
    if (activePlayers.length === 0) {
      endGame();
      return;
    }
    while (players[currentPlayer].bankrupt) currentPlayer = (currentPlayer + 1) % players.length;
    const player = players[currentPlayer];
    busy = false;
    $("#turnName").textContent = currentPlayer === 0 ? "轮到你了" : `${player.name}行动中`;
    $("#turnHint").textContent = currentPlayer === 0 ? "点击骰子开始行动" : "对手正在考虑路线";
    rollButton.disabled = currentPlayer !== 0 || paused;
    updateUi();
    if (currentPlayer !== 0) gameDelay(650).then(() => takeTurn());
  }

  async function takeTurn() {
    if (busy || paused || gameEnded) return;
    busy = true;
    rollButton.disabled = true;
    const value = await rollDice();
    if (gameEnded) return;
    const player = players[currentPlayer];
    setLog(`${player.name} 掷出了 ${value} 点。`);
    await movePlayer(player, currentPlayer, value);
    await resolveSpace(currentPlayer);
    if (!gameEnded && currentPlayer !== 0) await maybeAiBuild(currentPlayer);
    if (!gameEnded && !pendingDecision) await finishTurn();
  }

  async function maybeAiBuild(playerIndex) {
    const player = players[playerIndex];
    if (player.bankrupt || player.cash < 520 || Math.random() > 0.52) return;
    const options = owners
      .map((owner, position) => owner === playerIndex && buildings[position] < 3 ? position : -1)
      .filter((position) => position >= 0)
      .sort((a, b) => calculateRent(b) - calculateRent(a));
    if (!options.length) return;
    const position = options[0];
    const space = spaces[position];
    const cost = space.buildCost * (buildings[position] + 1);
    if (player.cash - cost < 280) return;
    changeCash(playerIndex, -cost, `补充${space.name}论文研究`);
    buildings[position] += 1;
    setLog(`${player.name}为${space.name}论文补充研究，引用收益提升到 ¥${calculateRent(position)}。`);
    showToast(`${player.name}提升了论文影响力`);
    updateUi();
    await gameDelay(600);
  }

  async function rollDice() {
    dice.classList.add("rolling");
    let elapsed = 0;
    while (elapsed < 640) {
      setDice(1 + Math.floor(Math.random() * 6));
      await gameDelay(70);
      elapsed += 70;
    }
    const value = 1 + Math.floor(Math.random() * 6);
    setDice(value);
    dice.classList.remove("rolling");
    return value;
  }

  async function movePlayer(player, playerIndex, steps) {
    for (let step = 0; step < steps; step += 1) {
      const previous = player.pos;
      player.pos = (player.pos + 1) % spaces.length;
      if (player.pos < previous) {
        changeCash(playerIndex, 200, "经过江农学报");
        showToast(`${player.name} 完成一轮研究，领取基础经费 ¥200`);
      }
      drawBoard();
      await gameDelay(145);
    }
  }

  async function resolveSpace(playerIndex) {
    const player = players[playerIndex];
    const space = spaces[player.pos];
    setLog(`${player.name} 来到${space.name}。`);
    if (space.type === "property" || space.type === "station") {
      await resolveProperty(playerIndex, player.pos);
    } else if (space.type === "chance") {
      await resolveChance(playerIndex);
    } else if (space.type === "tax") {
      changeCash(playerIndex, -space.amount, space.name);
      jackpot += Math.round(space.amount * 0.75);
      updateUi();
      setLog(`${player.name} 支付${space.name} ¥${space.amount}，部分金额进入国自然基金池。`);
      await gameDelay(700);
    } else if (space.type === "jackpot") {
      const prize = jackpot;
      jackpot = 120;
      player.fundingTotal = (player.fundingTotal || 0) + prize;
      changeCash(playerIndex, prize, "国自然资助");
      setLog(`${player.name} 国自然项目获批，领取基金池 ¥${prize}！`);
      await gameDelay(800);
    } else if (space.type === "start") {
      changeCash(playerIndex, 80, "出发奖励");
      setLog(`${player.name} 回到《江西农业大学学报》，获得校级启动经费 ¥80。`);
      await gameDelay(650);
    } else if (space.type === "penalty") {
      player.nextPaperMultiplier = 0.5;
      setLog(`${player.name} 遇到“老板抢一作”，下一篇论文的价值、累计 IF 与引用收益减半。`);
      await showPenaltyEvent(playerIndex);
    } else if (space.type === "vacation") {
      setLog(`${player.name} 进入学术休假，暂时没有新进展。`);
      await gameDelay(650);
    }
    checkBankruptcy(playerIndex);
  }

  async function resolveProperty(playerIndex, position) {
    const player = players[playerIndex];
    const space = spaces[position];
    const owner = owners[position];
    if (owner < 0) {
      if (player.cash < space.price) {
        setLog(`${player.name} 看中了${space.name}，但现金不够。`);
        await gameDelay(650);
        return;
      }
      if (playerIndex === 0) {
        await askToBuy(position);
      } else {
        const reserve = 260 + Math.min(round, PERIODS_PER_YEAR * 2) * 8;
        const shouldBuy = player.cash - space.price >= reserve || Math.random() < 0.42;
        if (shouldBuy) buyProperty(playerIndex, position);
        else setLog(`${player.name} 放弃向${space.name}投稿。`);
        await gameDelay(700);
      }
      return;
    }
    if (owner === playerIndex) {
      setLog(`${player.name} 回到自己的${space.name}。`);
      await gameDelay(500);
      return;
    }
    const rent = calculateRent(position);
    changeCash(playerIndex, -rent, `引用${space.name}论文`);
    changeCash(owner, rent, `${space.name}获得引用`);
    setLog(`${player.name} 引用了${players[owner].name}发表在${space.name}的论文，贡献学术收益 ¥${rent}。`);
    await gameDelay(850);
  }

  function calculateRent(position) {
    const base = spaces[position].rent;
    const level = buildings[position];
    return Math.round(base * (1 + level * 1.15) * (paperValues[position] || 1));
  }

  function askToBuy(position) {
    const space = spaces[position];
    pendingDecision = { type: "property", position };
    $("#propertyColor").style.background = space.color;
    $("#propertyDistrict").textContent = `${space.district} · 游戏 IF ${space.impactFactor.toFixed(1)}`;
    $("#propertyName").textContent = space.name;
    $("#propertyPrice").textContent = `¥${space.price}`;
    $("#propertyRent").textContent = `¥${space.rent}`;
    const penaltyText = players[0].nextPaperMultiplier === 0.5
      ? " 注意：老板将抢走一作，本篇成果价值、累计 IF 与引用收益仅按 50% 计算。"
      : "";
    $("#propertyText").textContent = `支付版面费即可发表；其他玩家停留时会引用并贡献学术收益。后续研究从 ¥${space.buildCost} 起，影响力最高三级。${penaltyText}`;
    $("#buyButton").disabled = players[0].cash < space.price;
    $("#propertyOverlay").classList.remove("hidden");
    return new Promise((resolve) => { pendingDecision.resolve = resolve; });
  }

  function completePropertyDecision(shouldBuy) {
    if (!pendingDecision || pendingDecision.type !== "property") return;
    const { position, resolve } = pendingDecision;
    if (shouldBuy) buyProperty(0, position);
    else setLog(`你暂时没有向${spaces[position].name}投稿。`);
    pendingDecision = null;
    $("#propertyOverlay").classList.add("hidden");
    resolve();
  }

  function buyProperty(playerIndex, position) {
    const space = spaces[position];
    if (owners[position] >= 0 || players[playerIndex].cash < space.price) return;
    changeCash(playerIndex, -space.price, `向${space.name}发表论文`);
    owners[position] = playerIndex;
    const multiplier = players[playerIndex].nextPaperMultiplier || 1;
    paperValues[position] = multiplier;
    players[playerIndex].nextPaperMultiplier = 1;
    setLog(`${players[playerIndex].name} 支付 ¥${space.price} 版面费，在${space.name}发表论文${multiplier < 1 ? "，但因老板抢一作仅按 50% 计值" : ""}。`);
    showToast(`${players[playerIndex].name}的论文被${space.name}接收`);
    updateUi();
  }

  async function resolveChance(playerIndex) {
    const baseCard = chanceCards[Math.floor(Math.random() * chanceCards.length)];
    const player = players[playerIndex];
    const card = resolveChanceCard(baseCard, player);
    if (card.moveToStart) {
      player.pos = 0;
      drawBoard();
    }
    changeCash(playerIndex, card.amount, card.title);
    setLog(`${player.name} 抽到“${card.title}”：${card.amount >= 0 ? "获得" : "支出"} ¥${Math.abs(card.amount)}。`);
    if (playerIndex !== 0) {
      await gameDelay(900);
      return;
    }
    pendingDecision = { type: "event" };
    $("#annualReviewTable").classList.add("hidden");
    $("#annualReviewTable").replaceChildren();
    $("#eventIcon").textContent = card.icon;
    $("#eventType").textContent = "科研事件";
    $("#eventTitle").textContent = card.title;
    $("#eventText").textContent = card.text;
    $("#eventAmount").textContent = `${card.amount >= 0 ? "+" : "-"}¥${Math.abs(card.amount)}`;
    $("#eventAmount").classList.toggle("negative", card.amount < 0);
    $("#eventAmount").classList.toggle("positive", card.amount >= 0);
    $("#eventButton").textContent = card.amount >= 0 ? "收下" : "知道了";
    $("#eventOverlay").classList.remove("hidden");
    await new Promise((resolve) => { pendingDecision.resolve = resolve; });
  }

  async function showPenaltyEvent(playerIndex) {
    if (playerIndex !== 0) {
      await gameDelay(750);
      return;
    }
    pendingDecision = { type: "event" };
    $("#annualReviewTable").classList.add("hidden");
    $("#annualReviewTable").replaceChildren();
    $("#eventIcon").textContent = "二作";
    $("#eventType").textContent = "惩罚格";
    $("#eventTitle").textContent = "老板抢一作";
    $("#eventText").textContent = "你的下一篇论文仍需支付全部版面费，但累计 IF、引用收益和学术资产只按 50% 计算。";
    $("#eventAmount").textContent = "下一篇价值 ×0.5";
    $("#eventAmount").classList.add("negative");
    $("#eventAmount").classList.remove("positive");
    $("#eventButton").textContent = "记住了";
    $("#eventOverlay").classList.remove("hidden");
    await new Promise((resolve) => { pendingDecision.resolve = resolve; });
  }

  function resolveChanceCard(card, player) {
    if (!card.grantKey) return card;
    player.grants ||= {};
    const previousAwards = player.grants[card.grantKey] || 0;
    const year = Math.floor((Math.max(1, round) - 1) / PERIODS_PER_YEAR) + 1;
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

  function completeEvent() {
    if (!pendingDecision || pendingDecision.type !== "event") return;
    const resolve = pendingDecision.resolve;
    pendingDecision = null;
    $("#eventOverlay").classList.add("hidden");
    resolve();
  }

  function academicProfile(playerIndex) {
    const positions = owners.map((owner, position) => owner === playerIndex ? position : -1).filter((position) => position >= 0);
    const papers = positions.length;
    const influence = owners.reduce((total, owner, position) => owner === playerIndex ? total + buildings[position] : total, 0);
    const cns = positions.filter((position) => spaces[position].district === "CNS").length;
    const medicalTop = positions.filter((position) => spaces[position].district === "医学四刊").length;
    const totalIf = positions.reduce((total, position) => total + (spaces[position].impactFactor || 0) * (paperValues[position] || 1), 0);
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
      fundingTotal: players[playerIndex].fundingTotal || 0,
      cash: Math.max(0, players[playerIndex].cash),
      worth: netWorth(playerIndex),
    };
  }

  const hatLadder = ["暂无帽子", "学术新秀", "青年学术骨干", "优秀青年学者", "杰出青年学者", "学术带头人", "领军学者", "顶尖科学家", "学术泰斗"];
  const hatThresholds = [0, 80, 240, 520, 900, 1450, 2250, 3400, 5000];

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
    hatThresholds.forEach((threshold, level) => {
      if (score >= threshold) earnedLevel = level;
    });
    const level = Math.max(previousLevel || 0, earnedLevel);
    return { hat: hatLadder[level], level, score };
  }

  async function showAnnualReview(completedYear) {
    const ranking = players
      .map((player, index) => ({ index, player, profile: academicProfile(index) }))
      .sort((a, b) => b.profile.worth - a.profile.worth);
    ranking.forEach((entry) => {
      const award = academicHat(entry.profile, entry.player.hatLevel);
      entry.player.hat = award.hat;
      entry.player.hatLevel = award.level;
      entry.profile.academicScore = award.score;
    });
    const human = ranking.find((entry) => entry.index === 0);
    setLog(`第${completedYear}年度评帽完成：${ranking.map((entry) => `${entry.player.name}获评${entry.player.hat}`).join("；")}。`);
    updateUi();
    if (!human || gameEnded) return;
    pendingDecision = { type: "event" };
    $("#eventIcon").textContent = "冠";
    $("#eventType").textContent = `第${completedYear}年度评帽`;
    $("#eventTitle").textContent = "年度学术评议";
    $("#eventText").textContent = "按累计影响因子、顶刊成果、学术资产与基金积累完成全员评帽；帽子只升不降。";
    renderAnnualReviewTable(ranking.map((entry) => ({
      playerIndex: entry.index,
      name: entry.player.name,
      hat: entry.player.hat,
      ...entry.profile,
    })), 0);
    $("#eventAmount").textContent = `你的帽子：${human.player.hat}`;
    $("#eventAmount").classList.remove("negative");
    $("#eventAmount").classList.add("positive");
    $("#eventButton").textContent = "进入下一年";
    $("#eventOverlay").classList.remove("hidden");
    await new Promise((resolve) => { pendingDecision.resolve = resolve; });
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
      [result.name, result.totalIf.toFixed(1), `${result.topPapers}篇`, `¥${result.worth}`, result.hat],
      result.playerIndex === localIndex ? "mine" : "",
    ));
    table.classList.remove("hidden");
  }

  function changeCash(playerIndex, amount, reason) {
    const player = players[playerIndex];
    player.cash += amount;
    showMoneyFx(playerIndex, amount);
    updateUi();
    if (reason) console.debug(`[cash] ${player.name}: ${amount} (${reason})`);
  }

  function showMoneyFx(playerIndex, amount) {
    if (!boardMetrics) return;
    const point = tokenPoint(playerIndex, players[playerIndex].pos);
    const span = document.createElement("span");
    span.textContent = `${amount >= 0 ? "+" : "-"}¥${Math.abs(amount)}`;
    span.className = amount < 0 ? "negative" : "";
    span.style.left = `${point.x}px`;
    span.style.top = `${point.y}px`;
    $("#moneyFx").appendChild(span);
    window.setTimeout(() => span.remove(), 1200);
  }

  function checkBankruptcy(playerIndex) {
    const player = players[playerIndex];
    if (player.cash >= 0 || player.bankrupt) return;
    const holdings = owners
      .map((owner, position) => owner === playerIndex ? position : -1)
      .filter((position) => position >= 0)
      .sort((a, b) => spaces[a].price - spaces[b].price);
    const sold = [];
    while (player.cash < 0 && holdings.length) {
      const position = holdings.shift();
      const space = spaces[position];
      const recovered = Math.round((space.price * 0.65 + buildings[position] * space.buildCost * 0.5) * (paperValues[position] || 1));
      player.cash += recovered;
      owners[position] = -1;
      buildings[position] = 0;
      paperValues[position] = 1;
      sold.push(space.name);
    }
    if (player.cash >= 0) {
      setLog(`${player.name}出售${sold.join("、")}回笼资金，暂时渡过了危机。`);
      showToast(`${player.name}转让论文权益回笼经费`);
      updateUi();
      return;
    }
    player.bankrupt = true;
    owners.forEach((owner, position) => {
      if (owner === playerIndex) {
        owners[position] = -1;
        buildings[position] = 0;
        paperValues[position] = 1;
      }
    });
    setLog(`${player.name} 科研经费耗尽，暂时退出学术圈。`);
    showToast(`${player.name}退出学术圈`);
    updateUi();
    if (playerIndex === 0) endGame();
  }

  async function finishTurn() {
    if (gameEnded) return;
    busy = false;
    const previous = currentPlayer;
    let completedYear = 0;
    do {
      currentPlayer = (currentPlayer + 1) % players.length;
      if (currentPlayer === 0) {
        round += 1;
        if ((round - 1) % PERIODS_PER_YEAR === 0) completedYear = (round - 1) / PERIODS_PER_YEAR;
      }
    } while (players[currentPlayer].bankrupt && currentPlayer !== previous);
    updateUi();
    if (completedYear) await showAnnualReview(completedYear);
    if (gameEnded) return;
    await gameDelay(330);
    beginTurn();
  }

  function netWorth(playerIndex) {
    let worth = Math.max(0, players[playerIndex].cash);
    owners.forEach((owner, position) => {
      if (owner === playerIndex) {
        const space = spaces[position];
        worth += (space.price + buildings[position] * space.buildCost) * (paperValues[position] || 1);
      }
    });
    return Math.round(worth);
  }

  function openAssets() {
    if (!started || gameEnded) return;
    const wasPaused = paused;
    $("#assetsPanel").dataset.wasPaused = wasPaused ? "1" : "0";
    paused = true;
    renderAssets();
    $("#assetsPanel").classList.remove("hidden");
  }

  function closeAssets() {
    const keepPaused = $("#assetsPanel").dataset.wasPaused === "1";
    $("#assetsPanel").classList.add("hidden");
    paused = keepPaused;
    rollButton.disabled = currentPlayer !== 0 || busy || paused;
  }

  function renderAssets() {
    const positions = owners.map((owner, position) => owner === 0 ? position : -1).filter((position) => position >= 0);
    $("#netWorth").textContent = `¥${netWorth(0)}`;
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
      const disabled = level >= 3 || players[0].cash < cost || busy || currentPlayer !== 0;
      const label = level >= 3 ? "影响力满级" : `补充研究 ¥${cost}`;
      return `<article class="asset-item" style="--property-color:${space.color}">
        <i></i><div><b>${space.name}${paperValues[position] < 1 ? " · 二作" : ""}</b><small>游戏 IF ${(space.impactFactor * (paperValues[position] || 1)).toFixed(1)} · 影响力 ${level} 级 · 引用收益 ¥${calculateRent(position)}</small></div>
        <button class="build-button" data-position="${position}" ${disabled ? "disabled" : ""}>${label}</button>
      </article>`;
    }).join("");
  }

  function buildOn(position) {
    const space = spaces[position];
    const level = buildings[position];
    if (owners[position] !== 0 || level >= 3 || busy || currentPlayer !== 0) return;
    const cost = space.buildCost * (level + 1);
    if (players[0].cash < cost) return;
    changeCash(0, -cost, `补充${space.name}论文研究`);
    buildings[position] += 1;
    setLog(`你为${space.name}论文完成补充研究，影响力升到 ${buildings[position]} 级，引用收益提升到 ¥${calculateRent(position)}。`);
    showToast(`${space.name}论文影响力提升`);
    renderAssets();
    updateUi();
  }

  function togglePause(force) {
    if (!started || gameEnded || pendingDecision) return;
    paused = typeof force === "boolean" ? force : !paused;
    $("#pauseOverlay").classList.toggle("hidden", !paused);
    rollButton.disabled = paused || currentPlayer !== 0 || busy;
  }

  function endGame() {
    if (gameEnded) return;
    gameEnded = true;
    busy = true;
    paused = false;
    rollButton.disabled = true;
    const ranking = players.map((player, index) => ({ ...player, index, worth: netWorth(index) })).sort((a, b) => b.worth - a.worth);
    const humanRank = ranking.findIndex((entry) => entry.index === 0) + 1;
    $("#resultTitle").textContent = players[0].hat || "暂别学术圈";
    $("#resultText").textContent = players[0].bankrupt ? "你的科研经费耗尽，本次学术旅程结束。" : `你以第 ${humanRank} 名暂时离开学术圈。`;
    $("#rankingList").innerHTML = ranking.map((entry, rank) => `<div class="ranking-row ${rank === 0 ? "winner" : ""}"><i>${rank + 1}</i><b>${entry.name}${entry.bankrupt ? " · 已退出" : ` · ${entry.hat || "暂无帽子"}`}</b><strong>¥${entry.worth}</strong></div>`).join("");
    const best = Math.max(netWorth(0), Number(localStorage.getItem("monopolyBestWorth") || 0));
    localStorage.setItem("monopolyBestWorth", String(best));
    $("#bestWorth").textContent = `¥${best}`;
    $("#gameOverOverlay").classList.remove("hidden");
    updateUi();
  }

  function gameDelay(milliseconds) {
    return new Promise((resolve) => {
      let elapsed = 0;
      const tick = () => {
        if (gameEnded) { resolve(); return; }
        if (!paused) elapsed += 50;
        if (elapsed >= milliseconds) resolve();
        else window.setTimeout(tick, 50);
      };
      tick();
    });
  }

  rollButton.addEventListener("click", takeTurn);
  $("#avatarPicker").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-avatar]");
    if (!button) return;
    selectedAvatar = button.dataset.avatar;
    localStorage.setItem("monopolyAvatar", selectedAvatar);
    $("#avatarPicker").querySelectorAll("button").forEach((entry) => entry.classList.toggle("selected", entry === button));
  });
  $("#startButton").addEventListener("click", resetGame);
  $("#restartButton").addEventListener("click", resetGame);
  $("#buyButton").addEventListener("click", () => completePropertyDecision(true));
  $("#skipButton").addEventListener("click", () => completePropertyDecision(false));
  $("#eventButton").addEventListener("click", completeEvent);
  $("#assetsButton").addEventListener("click", openAssets);
  $("#closeAssetsButton").addEventListener("click", closeAssets);
  $("#propertyList").addEventListener("click", (event) => {
    const button = event.target.closest(".build-button");
    if (button) buildOn(Number(button.dataset.position));
  });
  $("#pauseButton").addEventListener("click", () => togglePause());
  $("#resumeButton").addEventListener("click", () => togglePause(false));
  window.addEventListener("resize", resizeBoard);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && started && !gameEnded && !pendingDecision && $("#assetsPanel").classList.contains("hidden")) togglePause(true);
  });

  $("#avatarPicker").querySelectorAll("button[data-avatar]").forEach((button) => button.classList.toggle("selected", button.dataset.avatar === selectedAvatar));
  setDice(1);
  resizeBoard();
  renderPlayerStrip();
})();

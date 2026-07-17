(() => {
  "use strict";

  const API_URL = "https://wxgame-bubble-arena.781279348.workers.dev";
  const COLORS = ["#ef6f5b", "#2b9fc0", "#27a875", "#816cc1", "#f2ad3d", "#e568a1"];
  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#gameCanvas");
  const ctx = canvas.getContext("2d");
  const input = { x: 0, y: 0 };
  const keys = new Set();
  let identity = null;
  let socket = null;
  let room = null;
  let snapshot = null;
  let reconnectTimer = 0;
  let heartbeatTimer = 0;
  let practiceRequested = false;
  let toastTimer = 0;
  let joystickPointer = null;
  let localPaused = false;
  let lastFrame = 0;

  function cleanName() {
    const name = $("#playerName").value.replace(/[<>\n\r]/g, "").trim().slice(0, 10);
    return name || "泡泡队长";
  }

  function setConnection(mode, text) {
    $("#connectionDot").className = mode;
    $("#connectionText").textContent = text;
  }

  async function createRoom(practice = false) {
    setEntryBusy(true);
    practiceRequested = practice;
    try {
      const response = await fetch(`${API_URL}/rooms`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: cleanName(), practice }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "创建房间失败");
      acceptIdentity(data);
      connect();
    } catch (error) {
      showToast(error.message || "连接服务失败");
      setConnection("error", "连接失败");
      setEntryBusy(false);
    }
  }

  async function joinRoom() {
    const code = $("#roomCodeInput").value.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      showToast("请输入 6 位房间码");
      return;
    }
    setEntryBusy(true);
    try {
      const response = await fetch(`${API_URL}/rooms/${code}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: cleanName() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "加入房间失败");
      practiceRequested = false;
      acceptIdentity(data);
      connect();
    } catch (error) {
      showToast(error.message || "找不到这个房间");
      setConnection("error", "连接失败");
      setEntryBusy(false);
    }
  }

  function acceptIdentity(data) {
    identity = { code: data.code, playerId: data.playerId, token: data.token };
    sessionStorage.setItem("bubbleArenaIdentity", JSON.stringify(identity));
    room = data.state || null;
  }

  function connect() {
    clearTimeout(reconnectTimer);
    if (!identity) return;
    if (socket) {
      socket.onclose = null;
      socket.close();
    }
    setConnection("", "连接中");
    const wsUrl = API_URL.replace(/^http/, "ws");
    socket = new WebSocket(`${wsUrl}/rooms/${identity.code}/connect?playerId=${encodeURIComponent(identity.playerId)}&token=${encodeURIComponent(identity.token)}`);
    socket.addEventListener("open", () => {
      setConnection("online", "实时联机");
      setEntryBusy(false);
      startHeartbeat();
      send({ type: "sync" });
    });
    socket.addEventListener("message", (event) => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      handleMessage(message);
    });
    socket.addEventListener("close", () => {
      clearInterval(heartbeatTimer);
      setConnection("error", "正在重连");
      if (identity) reconnectTimer = window.setTimeout(connect, 1600);
    });
    socket.addEventListener("error", () => setConnection("error", "网络波动"));
  }

  function send(message) {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }

  function startHeartbeat() {
    clearInterval(heartbeatTimer);
    heartbeatTimer = window.setInterval(() => {
      const vector = localPaused ? { x: 0, y: 0 } : currentInput();
      send({ type: "input", x: vector.x, y: vector.y, at: Date.now() });
    }, 60);
  }

  function handleMessage(message) {
    if (message.type === "error") {
      showToast(message.error || "操作失败");
      return;
    }
    if (message.type === "room") {
      room = message.room;
      renderRoom();
      if (room.status === "waiting") {
        $("#entryOverlay").classList.add("hidden");
        $("#roomOverlay").classList.remove("hidden");
        $("#resultOverlay").classList.add("hidden");
        if (practiceRequested && room.hostId === identity.playerId) {
          practiceRequested = false;
          window.setTimeout(() => send({ type: "start" }), 120);
        }
      }
      return;
    }
    if (message.type === "snapshot") {
      room = message.room;
      snapshot = message.game;
      $("#entryOverlay").classList.add("hidden");
      $("#roomOverlay").classList.add("hidden");
      updateGameUi();
      return;
    }
    if (message.type === "gameStart") {
      room = message.room;
      snapshot = message.game;
      $("#roomOverlay").classList.add("hidden");
      $("#resultOverlay").classList.add("hidden");
      showBanner("开战！", 900);
      updateGameUi();
      return;
    }
    if (message.type === "gameOver") {
      room = message.room;
      snapshot = message.game;
      updateGameUi();
      showResult(message);
    }
  }

  function renderRoom() {
    if (!room) return;
    $("#roomCode").textContent = room.code;
    const slots = [...room.players];
    while (slots.length < 6) slots.push(null);
    $("#roomPlayers").innerHTML = slots.map((player, index) => player ? `
      <div class="room-player" style="--player-color:${COLORS[player.colorIndex % COLORS.length]}">
        <i>${player.bot ? "AI" : escapeHtml(player.name.slice(0, 1))}</i>
        <b>${escapeHtml(player.name)}</b>
        <small>${player.id === room.hostId ? "房主" : player.bot ? "BOT" : player.connected ? "已连接" : "离线"}</small>
      </div>` : `<div class="room-player empty">等待玩家 ${index + 1}</div>`).join("");
    const isHost = identity?.playerId === room.hostId;
    $("#startButton").classList.toggle("hidden", !isHost);
    $("#startButton").disabled = room.status !== "waiting";
    $("#roomHint").textContent = isHost ? `当前 ${room.players.length} 人，开始后自动补满 6 人` : "等待房主开始，分享房间码可邀请好友";
  }

  function updateGameUi() {
    if (!snapshot) return;
    const me = snapshot.players.find((player) => player.id === identity?.playerId);
    if (me) {
      $("#meName").textContent = me.name;
      $("#meColor").style.background = COLORS[me.colorIndex % COLORS.length];
      $("#bombStat").textContent = me.maxBombs;
      $("#rangeStat").textContent = me.range;
      $("#speedStat").textContent = (me.speed / 96).toFixed(1).replace(".0", "");
      $("#itemCount").textContent = me.inventory?.needle || 0;
    }
    const remaining = Math.max(0, snapshot.endsAt - snapshot.now);
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor(remaining % 60000 / 1000);
    $("#timeStat").textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    $("#roster").innerHTML = snapshot.players.map((player) => {
      const status = !player.alive ? "淘汰" : player.trappedUntil > snapshot.now ? "被困" : `${player.kills} 击破`;
      return `<div class="roster-player ${!player.alive ? "out" : ""} ${player.trappedUntil > snapshot.now ? "trapped" : ""}" style="--player-color:${COLORS[player.colorIndex % COLORS.length]}"><i></i><b>${escapeHtml(player.name)}</b><small>${status}</small></div>`;
    }).join("");
    const paused = Boolean(snapshot.paused);
    $("#pauseOverlay").classList.toggle("hidden", !paused);
    const isHost = identity?.playerId === room?.hostId;
    $("#resumeButton").classList.toggle("hidden", !isHost);
    $("#pauseButton").disabled = !isHost || room?.status !== "playing";
  }

  function showResult(message) {
    const winner = snapshot.players.find((player) => player.id === message.winnerId);
    const isWinner = winner?.id === identity?.playerId;
    $("#resultBadge").textContent = isWinner ? "胜" : winner ? "负" : "平";
    $("#resultTitle").textContent = winner ? `${winner.name} 获胜` : "本局平局";
    $("#resultText").textContent = isWinner ? "你是最后留在竞技场上的玩家。" : "再抢一点威力和水泡数量，下一局会更凶。";
    const ranking = [...snapshot.players].sort((a, b) => Number(b.alive) - Number(a.alive) || b.kills - a.kills || b.survivedMs - a.survivedMs);
    $("#resultRanking").innerHTML = ranking.map((player, index) => `<div class="rank-row ${player.id === message.winnerId ? "winner" : ""}"><i>${index + 1}</i><b>${escapeHtml(player.name)}${player.bot ? " · BOT" : ""}</b><span>${player.kills} 击破</span></div>`).join("");
    const isHost = identity?.playerId === room?.hostId;
    $("#againButton").classList.toggle("hidden", !isHost);
    $("#resultOverlay").classList.remove("hidden");
  }

  function leaveRoom() {
    send({ type: "leave" });
    identity = null;
    room = null;
    snapshot = null;
    sessionStorage.removeItem("bubbleArenaIdentity");
    clearInterval(heartbeatTimer);
    if (socket) {
      socket.onclose = null;
      socket.close();
      socket = null;
    }
    $("#roomOverlay").classList.add("hidden");
    $("#resultOverlay").classList.add("hidden");
    $("#pauseOverlay").classList.add("hidden");
    $("#entryOverlay").classList.remove("hidden");
    setConnection("", "未连接");
  }

  function currentInput() {
    let x = input.x;
    let y = input.y;
    if (keys.has("ArrowLeft") || keys.has("KeyA")) x -= 1;
    if (keys.has("ArrowRight") || keys.has("KeyD")) x += 1;
    if (keys.has("ArrowUp") || keys.has("KeyW")) y -= 1;
    if (keys.has("ArrowDown") || keys.has("KeyS")) y += 1;
    const length = Math.hypot(x, y);
    return length > 1 ? { x: x / length, y: y / length } : { x, y };
  }

  function updateJoystick(event) {
    const rect = $("#joystick").getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const radius = rect.width * .32;
    const length = Math.hypot(dx, dy) || 1;
    const scale = Math.min(1, radius / length);
    const px = dx * scale;
    const py = dy * scale;
    $("#joystickKnob").style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;
    input.x = Math.abs(dx) < 7 ? 0 : dx / Math.max(radius, length);
    input.y = Math.abs(dy) < 7 ? 0 : dy / Math.max(radius, length);
  }

  function resetJoystick() {
    joystickPointer = null;
    input.x = 0;
    input.y = 0;
    $("#joystickKnob").style.transform = "translate(-50%,-50%)";
  }

  function draw(now) {
    requestAnimationFrame(draw);
    if (!snapshot) {
      drawIdle(now);
      return;
    }
    const width = canvas.width;
    const height = canvas.height;
    const tile = width / snapshot.gridWidth;
    ctx.clearRect(0, 0, width, height);
    drawFloor(width, height, tile, now);
    snapshot.map.forEach((cell, index) => {
      if (!cell) return;
      const x = index % snapshot.gridWidth;
      const y = Math.floor(index / snapshot.gridWidth);
      if (cell === 1) drawStone(x * tile, y * tile, tile);
      else drawCrate(x * tile, y * tile, tile);
    });
    snapshot.items.forEach((item) => drawItem(item, tile, now));
    snapshot.bombs.forEach((bomb) => drawBomb(bomb, tile, now));
    snapshot.flames.forEach((flame) => drawFlame(flame, tile, now));
    snapshot.players.forEach((player) => drawPlayer(player, tile, now));
    lastFrame = now;
  }

  function drawIdle(now) {
    const tile = canvas.width / 15;
    drawFloor(canvas.width, canvas.height, tile, now);
    for (let y = 0; y < 13; y += 1) for (let x = 0; x < 15; x += 1) {
      if (x === 0 || y === 0 || x === 14 || y === 12 || (x % 2 === 0 && y % 2 === 0)) drawStone(x * tile, y * tile, tile);
    }
    drawPlayer({ id: "idle", x: 7.5 * tile, y: 6.5 * tile, name: "泡泡队长", colorIndex: 0, alive: true, trappedUntil: 0, direction: "down", shieldUntil: 0 }, tile, now);
  }

  function drawFloor(width, height, tile, now) {
    ctx.fillStyle = "#66cad0";
    ctx.fillRect(0, 0, width, height);
    for (let y = 0; y < 13; y += 1) for (let x = 0; x < 15; x += 1) {
      ctx.fillStyle = (x + y) % 2 ? "rgba(255,255,255,.07)" : "rgba(8,105,121,.035)";
      ctx.fillRect(x * tile, y * tile, tile, tile);
    }
    ctx.strokeStyle = "rgba(255,255,255,.12)";
    ctx.lineWidth = 1;
    for (let y = 1; y < 13; y += 1) {
      ctx.beginPath();
      for (let x = 0; x <= width; x += 12) {
        const wave = Math.sin(x * .035 + now * .002 + y) * 1.5;
        x ? ctx.lineTo(x, y * tile + wave) : ctx.moveTo(x, y * tile + wave);
      }
      ctx.stroke();
    }
  }

  function drawStone(x, y, size) {
    const p = size * .08;
    roundedRect(x + p, y + p, size - p * 2, size - p * 2, size * .16);
    ctx.fillStyle = "#227d8b";
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.22)";
    roundedRect(x + p * 1.7, y + p * 1.6, size - p * 3.4, size * .19, size * .08);
    ctx.fill();
    ctx.strokeStyle = "rgba(4,74,87,.28)";
    ctx.lineWidth = 2;
    ctx.beginPath();ctx.moveTo(x + size*.2,y + size*.62);ctx.lineTo(x + size*.8,y + size*.62);ctx.stroke();
  }

  function drawCrate(x, y, size) {
    const p = size * .1;
    roundedRect(x + p, y + p, size - p * 2, size - p * 2, size * .08);
    ctx.fillStyle = "#e6a74f";ctx.fill();
    ctx.strokeStyle = "#a96335";ctx.lineWidth = Math.max(2,size*.07);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x+size*.2,y+size*.2);ctx.lineTo(x+size*.8,y+size*.8);ctx.moveTo(x+size*.8,y+size*.2);ctx.lineTo(x+size*.2,y+size*.8);ctx.stroke();
    ctx.fillStyle = "rgba(255,240,173,.38)";ctx.fillRect(x+size*.18,y+size*.18,size*.64,size*.09);
  }

  function drawBomb(bomb, tile, now) {
    const cx = (bomb.x + .5) * tile;
    const cy = (bomb.y + .5) * tile;
    const pulse = 1 + Math.sin(now * .012 + bomb.x) * .06;
    const radius = tile * .34 * pulse;
    const gradient = ctx.createRadialGradient(cx-radius*.35,cy-radius*.4,2,cx,cy,radius);
    gradient.addColorStop(0,"#ffffff");gradient.addColorStop(.2,"#9eecf2");gradient.addColorStop(.72,"#319fbd");gradient.addColorStop(1,"#126887");
    ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,.8)";ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(cx-radius*.32,cy-radius*.35,radius*.13,0,Math.PI*2);ctx.fill();
  }

  function drawFlame(flame, tile, now) {
    const x = flame.x * tile;
    const y = flame.y * tile;
    const pulse = .78 + Math.sin(now * .02 + flame.x * 2) * .12;
    ctx.save();ctx.globalAlpha=pulse;
    const gradient=ctx.createRadialGradient(x+tile/2,y+tile/2,2,x+tile/2,y+tile/2,tile*.58);
    gradient.addColorStop(0,"#fff");gradient.addColorStop(.18,"#d5ffff");gradient.addColorStop(.55,"#46d5e3");gradient.addColorStop(1,"rgba(25,129,182,0)");
    ctx.fillStyle=gradient;ctx.fillRect(x-tile*.15,y-tile*.15,tile*1.3,tile*1.3);
    ctx.restore();
  }

  function drawItem(item, tile, now) {
    const cx=(item.x+.5)*tile,cy=(item.y+.5)*tile+Math.sin(now*.006+item.x)*2;
    ctx.fillStyle="rgba(255,255,255,.86)";ctx.beginPath();ctx.arc(cx,cy,tile*.29,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="rgba(7,87,100,.18)";ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle={bomb:"#2b9fc0",range:"#ef6f5b",speed:"#f2ad3d",needle:"#7566b3",shield:"#27a875"}[item.type]||"#17333a";
    ctx.font=`900 ${tile*.32}px system-ui`;ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText({bomb:"泡",range:"强",speed:"速",needle:"针",shield:"盾"}[item.type]||"?",cx,cy+1);
  }

  function drawPlayer(player, tile, now) {
    const cx=player.x,cy=player.y;
    if (!player.alive) {
      ctx.save();ctx.globalAlpha=.28;ctx.fillStyle="#31575c";ctx.beginPath();ctx.ellipse(cx,cy+tile*.25,tile*.28,tile*.1,0,0,Math.PI*2);ctx.fill();ctx.restore();
      return;
    }
    const trapped = player.trappedUntil > (snapshot?.now || Date.now());
    const bob = Math.sin(now*.008 + player.colorIndex)*1.5;
    ctx.save();ctx.translate(cx,cy+bob);
    if (player.shieldUntil > (snapshot?.now || Date.now())) {
      ctx.strokeStyle="rgba(255,240,125,.85)";ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,tile*.43,0,Math.PI*2);ctx.stroke();
    }
    ctx.fillStyle="rgba(12,73,81,.2)";ctx.beginPath();ctx.ellipse(0,tile*.3,tile*.27,tile*.1,0,0,Math.PI*2);ctx.fill();
    const color=COLORS[player.colorIndex%COLORS.length];
    ctx.fillStyle=color;ctx.beginPath();ctx.arc(0,0,tile*.29,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="rgba(255,255,255,.28)";ctx.beginPath();ctx.arc(-tile*.1,-tile*.11,tile*.1,0,Math.PI*2);ctx.fill();
    const eyeY=-tile*.03;ctx.fillStyle="#fff";ctx.beginPath();ctx.ellipse(-tile*.09,eyeY,tile*.065,tile*.085,0,0,Math.PI*2);ctx.ellipse(tile*.09,eyeY,tile*.065,tile*.085,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#17333a";ctx.beginPath();ctx.arc(-tile*.075,eyeY+tile*.012,tile*.026,0,Math.PI*2);ctx.arc(tile*.105,eyeY+tile*.012,tile*.026,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="#fff";ctx.lineWidth=tile*.055;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(-tile*.12,tile*.19);ctx.lineTo(-tile*.18,tile*.32);ctx.moveTo(tile*.12,tile*.19);ctx.lineTo(tile*.18,tile*.32);ctx.stroke();
    if (trapped) {
      const bubble=tile*.44+Math.sin(now*.01)*2;const g=ctx.createRadialGradient(-bubble*.3,-bubble*.35,2,0,0,bubble);g.addColorStop(0,"rgba(255,255,255,.5)");g.addColorStop(.45,"rgba(136,235,247,.28)");g.addColorStop(1,"rgba(22,136,185,.5)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,bubble,0,Math.PI*2);ctx.fill();ctx.strokeStyle="rgba(255,255,255,.8)";ctx.lineWidth=3;ctx.stroke();
    }
    ctx.restore();
    ctx.font=`800 ${Math.max(9,tile*.2)}px system-ui`;ctx.textAlign="center";ctx.textBaseline="bottom";ctx.lineWidth=3;ctx.strokeStyle="rgba(8,48,54,.55)";ctx.strokeText(player.name,cx,cy-tile*.37);ctx.fillStyle="#fff";ctx.fillText(player.name,cx,cy-tile*.37);
  }

  function roundedRect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
  function escapeHtml(value){return String(value).replace(/[&<>"']/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));}
  function showToast(text){clearTimeout(toastTimer);$("#toast").textContent=text;$("#toast").classList.remove("hidden");toastTimer=window.setTimeout(()=>$("#toast").classList.add("hidden"),2200);}
  function showBanner(text,duration=1000){$("#roundBanner").textContent=text;$("#roundBanner").classList.remove("hidden");window.setTimeout(()=>$("#roundBanner").classList.add("hidden"),duration);}
  function setEntryBusy(busy){["#practiceButton","#createButton","#joinButton"].forEach(selector=>$(selector).disabled=busy);}

  $("#practiceButton").addEventListener("click",()=>createRoom(true));
  $("#createButton").addEventListener("click",()=>createRoom(false));
  $("#joinButton").addEventListener("click",joinRoom);
  $("#roomCodeInput").addEventListener("input",(event)=>{event.target.value=event.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"");});
  $("#startButton").addEventListener("click",()=>send({type:"start"}));
  $("#leaveButton").addEventListener("click",leaveRoom);
  $("#resultLeaveButton").addEventListener("click",leaveRoom);
  $("#againButton").addEventListener("click",()=>send({type:"restart"}));
  $("#copyCodeButton").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(room.code);showToast("房间码已复制");}catch{showToast(`房间码：${room.code}`);}});
  $("#pauseButton").addEventListener("click",()=>send({type:"pause"}));
  $("#resumeButton").addEventListener("click",()=>send({type:"pause"}));
  $("#bubbleButton").addEventListener("pointerdown",(event)=>{event.preventDefault();send({type:"place"});});
  $("#itemButton").addEventListener("pointerdown",(event)=>{event.preventDefault();send({type:"use"});});

  $("#joystick").addEventListener("pointerdown",(event)=>{joystickPointer=event.pointerId;event.currentTarget.setPointerCapture(event.pointerId);updateJoystick(event);});
  $("#joystick").addEventListener("pointermove",(event)=>{if(event.pointerId===joystickPointer)updateJoystick(event);});
  $("#joystick").addEventListener("pointerup",resetJoystick);
  $("#joystick").addEventListener("pointercancel",resetJoystick);
  window.addEventListener("keydown",(event)=>{if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Space","ControlLeft","ControlRight"].includes(event.code))event.preventDefault();keys.add(event.code);if(!event.repeat&&event.code==="Space")send({type:"place"});if(!event.repeat&&(event.code==="ControlLeft"||event.code==="ControlRight"))send({type:"use"});});
  window.addEventListener("keyup",(event)=>keys.delete(event.code));
  window.addEventListener("blur",()=>{keys.clear();resetJoystick();});

  const storedName=localStorage.getItem("bubbleArenaName");
  if(storedName)$("#playerName").value=storedName;
  $("#playerName").addEventListener("change",()=>localStorage.setItem("bubbleArenaName",cleanName()));
  try {
    const saved=JSON.parse(sessionStorage.getItem("bubbleArenaIdentity")||"null");
    if(saved?.code&&saved?.playerId&&saved?.token){identity=saved;connect();}
  } catch { sessionStorage.removeItem("bubbleArenaIdentity"); }
  requestAnimationFrame(draw);
})();

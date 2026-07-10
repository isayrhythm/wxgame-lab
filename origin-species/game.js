(() => {
  if (!window.Phaser) return;

  const WORLD_SIZE = 4000000;
  const WORLD_CENTER = WORLD_SIZE / 2;
  const CHUNK_SIZE = 680;
  const START_CHUNK = Math.floor(WORLD_CENTER / CHUNK_SIZE);
  const START_POSITION = START_CHUNK * CHUNK_SIZE + CHUNK_SIZE / 2;
  const ACTIVE_CHUNK_RADIUS = 2;
  const UNLOAD_CHUNK_RADIUS = 4;

  const ROUTES = {
    phagocyte: { name: '吞噬路线', color: '#65e8bd', tint: 0x65e8bd },
    mobility: { name: '运动路线', color: '#66c9ef', tint: 0x66c9ef },
    defense: { name: '防御路线', color: '#ba9df5', tint: 0xba9df5 },
    growth: { name: '增殖路线', color: '#ffd069', tint: 0xffd069 },
    sensing: { name: '感知路线', color: '#ff91b5', tint: 0xff91b5 },
    symbiosis: { name: '共生路线', color: '#95db74', tint: 0x95db74 }
  };

  const EVOLUTIONS = [
    {
      id: 'broad_pseudopod', stage: 1, route: 'phagocyte', name: '宽叶伪足',
      summary: '展开更宽的伪足包围猎物。', benefit: '吞噬判定范围 +20%，体型 +6%', cost: '移动速度 -7%',
      effects: { eatRadius: .20, size: .06, speed: -.07 }
    },
    {
      id: 'actin_bundles', stage: 1, route: 'mobility', name: '肌动蛋白束',
      summary: '让细胞前缘快速重排，持续爬行。', benefit: '移动速度 +19%', cost: '最大生命 -6',
      effects: { speed: .19, maxHealth: -6 }
    },
    {
      id: 'dense_cortex', stage: 1, route: 'defense', name: '致密皮层',
      summary: '加厚膜下骨架，降低碰撞损伤。', benefit: '减伤 +15%，最大生命 +8', cost: '移动速度 -5%',
      effects: { armor: .15, maxHealth: 8, speed: -.05 }
    },
    {
      id: 'nutrient_vacuoles', stage: 1, route: 'growth', name: '营养液泡',
      summary: '把吞入的营养更快转为生物量。', benefit: '生物量 +18%，变异积累 +8%', cost: '减伤 -4%',
      effects: { biomassGain: .18, mutationGain: .08, armor: -.04 }
    },
    {
      id: 'surface_sensors', stage: 1, route: 'sensing', name: '表面感受器',
      summary: '更早感知猎物与危险产生的化学梯度。', benefit: '移动速度 +8%，感知范围 +30%', cost: '捕食力量 -4%',
      effects: { speed: .08, detect: .30, power: -.04 }
    },

    {
      id: 'acid_phagosome', stage: 2, route: 'phagocyte', name: '酸性吞噬泡',
      summary: '提高吞噬泡酸化效率，处理更难消化的猎物。', benefit: '捕食力量 +20%，生物量 +8%', cost: '最大生命 -5',
      effects: { power: .20, biomassGain: .08, maxHealth: -5 }
    },
    {
      id: 'polarized_front', stage: 2, route: 'mobility', name: '极化前缘',
      summary: '固定前后轴，减少改变方向时的能量浪费。', benefit: '移动速度 +16%，击退抗性 +10%', cost: '体型 -4%',
      effects: { speed: .16, knockback: .10, size: -.04 }
    },
    {
      id: 'membrane_repair', stage: 2, route: 'defense', name: '膜快速修补',
      summary: '受损后迅速募集膜泡封闭裂口。', benefit: '生命再生 +0.7/秒，最大生命 +8', cost: '捕食力量 -5%',
      effects: { regen: .7, maxHealth: 8, power: -.05 }
    },
    {
      id: 'rapid_digestion', stage: 2, route: 'growth', name: '高周转消化',
      summary: '缩短摄食到生长之间的时间。', benefit: '变异积累 +22%，吞噬回血 +1', cost: '减伤 -5%',
      effects: { mutationGain: .22, healOnEat: 1, armor: -.05 }
    },
    {
      id: 'chemotaxis', stage: 2, route: 'sensing', name: '受体趋化',
      summary: '沿着营养物和猎物留下的信号移动。', benefit: '感知范围 +45%，移动速度 +10%', cost: '最大生命 -4',
      effects: { detect: .45, speed: .10, maxHealth: -4 }
    },
    {
      id: 'foreign_symbiont', stage: 2, route: 'symbiosis', name: '暂驻共生菌',
      summary: '容纳未被消化的细菌，交换一部分代谢产物。', benefit: '吞噬回血 +2，生物量 +10%', cost: '移动速度 -6%',
      effects: { healOnEat: 2, biomassGain: .10, speed: -.06 }
    },

    {
      id: 'surrounding_cup', stage: 3, route: 'phagocyte', name: '环抱式吞噬杯',
      summary: '多方向伪足协同闭合，锁住擦身而过的猎物。', benefit: '吞噬范围 +24%，捕食力量 +12%', cost: '移动速度 -8%',
      effects: { eatRadius: .24, power: .12, speed: -.08 }
    },
    {
      id: 'burst_crawl', stage: 3, route: 'mobility', name: '爆发爬行',
      summary: '短周期强化前缘推进，追击和脱离都更迅速。', benefit: '移动速度 +22%，减小击退 +10%', cost: '减伤 -5%',
      effects: { speed: .22, knockback: .10, armor: -.05 }
    },
    {
      id: 'resting_cyst', stage: 3, route: 'defense', name: '可逆包囊',
      summary: '形成保护性外层，代价是活动性下降。', benefit: '减伤 +20%，最大生命 +18', cost: '移动速度 -12%',
      effects: { armor: .20, maxHealth: 18, speed: -.12 }
    },
    {
      id: 'efficient_respiration', stage: 3, route: 'growth', name: '高效能量耦联',
      summary: '把更多摄食收益投入生长与复制。', benefit: '生物量 +22%，变异积累 +14%', cost: '最大生命 -8',
      effects: { biomassGain: .22, mutationGain: .14, maxHealth: -8 }
    },
    {
      id: 'tactile_filaments', stage: 3, route: 'sensing', name: '触觉丝',
      summary: '用细长突起提前接触周围生物。', benefit: '吞噬范围 +12%，感知范围 +55%', cost: '捕食力量 -5%',
      effects: { eatRadius: .12, detect: .55, power: -.05 }
    },
    {
      id: 'stable_endosymbiosis', stage: 3, route: 'symbiosis', name: '稳定内共生',
      summary: '把暂驻关系变成可持续的代谢合作。', benefit: '生命再生 +0.8/秒，变异积累 +12%', cost: '体型 +5%，移动速度 -6%',
      effects: { regen: .8, mutationGain: .12, size: .05, speed: -.06 }
    },

    {
      id: 'giant_grazer', stage: 4, route: 'phagocyte', name: '巨型摄食者',
      summary: '增大细胞体积，用体型压制更多猎物。', benefit: '体型 +17%，捕食力量 +22%', cost: '移动速度 -13%',
      effects: { size: .17, power: .22, speed: -.13 }
    },
    {
      id: 'pursuit_hunter', stage: 4, route: 'mobility', name: '追猎策略',
      summary: '维持高速方向性运动，持续黏住正在逃逸的猎物。', benefit: '移动速度 +24%，捕食力量 +10%', cost: '最大生命 -10',
      effects: { speed: .24, power: .10, maxHealth: -10 }
    },
    {
      id: 'armored_survivor', stage: 4, route: 'defense', name: '装甲存活型',
      summary: '牺牲摄食效率换取稳定的高耐受。', benefit: '减伤 +18%，最大生命 +24', cost: '变异积累 -10%',
      effects: { armor: .18, maxHealth: 24, mutationGain: -.10 }
    },
    {
      id: 'boom_bust', stage: 4, route: 'growth', name: '机会增殖型',
      summary: '资源充足时迅速积累生物量和变异。', benefit: '生物量 +30%，变异积累 +25%', cost: '减伤 -9%',
      effects: { biomassGain: .30, mutationGain: .25, armor: -.09 }
    },
    {
      id: 'ambush_net', stage: 4, route: 'sensing', name: '伏击感知网',
      summary: '扩大探测和包围范围，等待猎物主动靠近。', benefit: '感知范围 +65%，吞噬范围 +18%', cost: '移动速度 -9%',
      effects: { detect: .65, eatRadius: .18, speed: -.09 }
    },
    {
      id: 'metabolic_exchange', stage: 4, route: 'symbiosis', name: '代谢互补',
      summary: '宿主与共生体分担不同代谢环节。', benefit: '吞噬回血 +3，生命再生 +0.5/秒', cost: '捕食力量 -7%',
      effects: { healOnEat: 3, regen: .5, power: -.07 }
    },

    {
      id: 'broad_receptors', stage: 5, route: 'phagocyte', name: '广谱猎物识别',
      summary: '扩展表面识别谱，允许处理接近自身强度的猎物。', benefit: '捕食力量 +28%，生物量 +12%', cost: '受伤后恢复较慢',
      effects: { power: .28, biomassGain: .12, regen: -.25 }
    },
    {
      id: 'myosin_burst', stage: 5, route: 'mobility', name: '肌球蛋白爆发',
      summary: '把收缩力集中到短时推进，几乎不给猎物拉开距离。', benefit: '移动速度 +27%，击退抗性 +18%', cost: '最大生命 -9',
      effects: { speed: .27, knockback: .18, maxHealth: -9 }
    },
    {
      id: 'multilayer_membrane', stage: 5, route: 'defense', name: '多层膜防护',
      summary: '增加表层缓冲结构，降低强敌接触造成的破坏。', benefit: '减伤 +17%，生命再生 +0.6/秒', cost: '吞噬范围 -8%',
      effects: { armor: .17, regen: .6, eatRadius: -.08 }
    },
    {
      id: 'multinucleate_control', stage: 5, route: 'growth', name: '多核协同',
      summary: '增加局部转录和修复能力，支撑更大的细胞体。', benefit: '体型 +12%，最大生命 +18，变异积累 +10%', cost: '移动速度 -8%',
      effects: { size: .12, maxHealth: 18, mutationGain: .10, speed: -.08 }
    },
    {
      id: 'danger_sense', stage: 5, route: 'sensing', name: '捕食者预警',
      summary: '对强敌释放的分子信号高度敏感。', benefit: '感知范围 +80%，移动速度 +12%', cost: '生物量收益 -7%',
      effects: { detect: .80, speed: .12, biomassGain: -.07 }
    },
    {
      id: 'integrated_symbiont', stage: 5, route: 'symbiosis', name: '共生体整合',
      summary: '加强宿主与共生体之间的物质运输。', benefit: '生命再生 +1/秒，生物量 +16%', cost: '移动速度 -8%',
      effects: { regen: 1, biomassGain: .16, speed: -.08 }
    },

    {
      id: 'roaming_giant', stage: 6, route: 'phagocyte', name: '游猎巨胞型',
      summary: '以巨大的吞噬面和强消化能力控制资源斑块。', benefit: '体型 +20%，捕食力量 +30%，吞噬范围 +18%', cost: '移动速度 -16%',
      effects: { size: .20, power: .30, eatRadius: .18, speed: -.16 }
    },
    {
      id: 'vector_chaser', stage: 6, route: 'mobility', name: '定向追击型',
      summary: '高度极化的细胞骨架让转向和追击近乎连续。', benefit: '移动速度 +32%，捕食力量 +15%', cost: '减伤 -8%',
      effects: { speed: .32, power: .15, armor: -.08 }
    },
    {
      id: 'cyst_walker', stage: 6, route: 'defense', name: '耐逆装甲型',
      summary: '在活动状态下保留部分包囊防护结构。', benefit: '减伤 +22%，最大生命 +30', cost: '移动速度 -14%',
      effects: { armor: .22, maxHealth: 30, speed: -.14 }
    },
    {
      id: 'prolific_colonist', stage: 6, route: 'growth', name: '快速扩张型',
      summary: '把每次成功摄食都转化为更快的谱系变化。', benefit: '生物量 +32%，变异积累 +32%', cost: '最大生命 -14',
      effects: { biomassGain: .32, mutationGain: .32, maxHealth: -14 }
    },
    {
      id: 'ambush_specialist', stage: 6, route: 'sensing', name: '广域伏击型',
      summary: '在大范围内预判猎物路线，再用伪足完成包围。', benefit: '感知范围 +90%，吞噬范围 +25%', cost: '移动速度 -11%',
      effects: { detect: .90, eatRadius: .25, speed: -.11 }
    },
    {
      id: 'mosaic_holobiont', stage: 6, route: 'symbiosis', name: '复合共生型',
      summary: '多个代谢伙伴共同维持宿主，形成稳定复合体。', benefit: '生命再生 +1.4/秒，吞噬回血 +4，变异积累 +12%', cost: '体型 +8%，移动速度 -10%',
      effects: { regen: 1.4, healOnEat: 4, mutationGain: .12, size: .08, speed: -.10 }
    }
  ];

  const REFINEMENTS = [
    { id: 'refine_phagocyte', stage: 7, route: 'phagocyte', name: '吞噬结构精炼', summary: '继续优化吞噬杯闭合与消化。', benefit: '捕食力量 +10%，吞噬范围 +5%', cost: '移动速度 -2%', effects: { power: .10, eatRadius: .05, speed: -.02 } },
    { id: 'refine_mobility', stage: 7, route: 'mobility', name: '骨架动力精炼', summary: '继续提高细胞骨架周转速度。', benefit: '移动速度 +11%', cost: '最大生命 -2', effects: { speed: .11, maxHealth: -2 } },
    { id: 'refine_defense', stage: 7, route: 'defense', name: '膜防护精炼', summary: '加固现有皮层和修复结构。', benefit: '减伤 +5%，最大生命 +6', cost: '生物量收益 -2%', effects: { armor: .05, maxHealth: 6, biomassGain: -.02 } },
    { id: 'refine_growth', stage: 7, route: 'growth', name: '代谢通量精炼', summary: '进一步提高摄食后的物质转化。', benefit: '生物量 +9%，变异积累 +7%', cost: '减伤 -2%', effects: { biomassGain: .09, mutationGain: .07, armor: -.02 } },
    { id: 'refine_sensing', stage: 7, route: 'sensing', name: '受体网络精炼', summary: '扩大对猎物和危险的有效感知。', benefit: '感知范围 +18%，移动速度 +3%', cost: '捕食力量 -2%', effects: { detect: .18, speed: .03, power: -.02 } },
    { id: 'refine_symbiosis', stage: 7, route: 'symbiosis', name: '共生交换精炼', summary: '降低宿主与共生体的交换损耗。', benefit: '生命再生 +0.25/秒，吞噬回血 +1', cost: '移动速度 -2%', effects: { regen: .25, healOnEat: 1, speed: -.02 } }
  ];

  const ORGANISMS = [
    { name: '细菌', kind: 'rod', power: .62, radius: 9, speed: 58, mutation: 5, biomass: 4 },
    { name: '酵母样微生物', kind: 'yeast', power: .86, radius: 12, speed: 46, mutation: 6, biomass: 5 },
    { name: '小型鞭毛生物', kind: 'flagellate', power: 1.12, radius: 15, speed: 76, mutation: 7, biomass: 7 },
    { name: '纤毛捕食者', kind: 'ciliate', power: 1.42, radius: 19, speed: 88, mutation: 9, biomass: 9 },
    { name: '掠食性变形生物', kind: 'amoeboid', power: 1.78, radius: 23, speed: 96, mutation: 11, biomass: 12 },
    { name: '微型后生动物', kind: 'rotifer', power: 2.15, radius: 27, speed: 102, mutation: 14, biomass: 15 },
    { name: '大型原生捕食者', kind: 'predator', power: 2.62, radius: 32, speed: 110, mutation: 18, biomass: 20 },
    { name: '群体捕食单元', kind: 'colony', power: 3.18, radius: 38, speed: 94, mutation: 23, biomass: 27 }
  ];

  const BIOMES = [
    { id: 'nutrient', name: '营养斑块', color: 0x6be3b5, weakBias: 2 },
    { id: 'biofilm', name: '生物膜边缘', color: 0xe0c46a, weakBias: 1 },
    { id: 'open', name: '开阔水层', color: 0x67bddd, weakBias: 0 },
    { id: 'hypoxia', name: '低氧微区', color: 0x9e87d9, weakBias: -1 },
    { id: 'detritus', name: '碎屑富集区', color: 0xd7907f, weakBias: 1 }
  ];

  const dom = {
    shell: document.querySelector('.origin-shell'),
    healthFill: document.querySelector('#healthFill'),
    healthValue: document.querySelector('#healthValue'),
    eatenValue: document.querySelector('#eatenValue'),
    biomassValue: document.querySelector('#biomassValue'),
    mutationFill: document.querySelector('#mutationFill'),
    mutationValue: document.querySelector('#mutationValue'),
    lineageName: document.querySelector('#lineageName'),
    biomeName: document.querySelector('#biomeName'),
    evolutionLevel: document.querySelector('#evolutionLevel'),
    introOverlay: document.querySelector('#introOverlay'),
    evolutionOverlay: document.querySelector('#evolutionOverlay'),
    evolutionChoices: document.querySelector('#evolutionChoices'),
    treePanel: document.querySelector('#treePanel'),
    chosenPath: document.querySelector('#chosenPath'),
    treeStages: document.querySelector('#treeStages'),
    pauseOverlay: document.querySelector('#pauseOverlay'),
    gameOverOverlay: document.querySelector('#gameOverOverlay'),
    gameOverSummary: document.querySelector('#gameOverSummary'),
    finalPath: document.querySelector('#finalPath'),
    pauseButton: document.querySelector('#pauseButton'),
    treeButton: document.querySelector('#treeButton'),
    joystick: document.querySelector('#joystick'),
    toast: document.querySelector('#toast')
  };

  const makeState = () => ({
    started: false,
    paused: false,
    over: false,
    evolutionPending: false,
    treeOpen: false,
    damageAt: 0,
    safeUntil: 0,
    damageHits: 0,
    lastDamage: null,
    health: 100,
    biomass: 0,
    eaten: 0,
    mutation: 0,
    mutationGoal: 28,
    evolutionLevel: 0,
    chosen: [],
    routeCounts: { phagocyte: 0, mobility: 0, defense: 0, growth: 0, sensing: 0, symbiosis: 0 },
    stats: {
      speed: 0,
      power: 0,
      eatRadius: 0,
      armor: 0,
      maxHealth: 0,
      mutationGain: 0,
      biomassGain: 0,
      healOnEat: 0,
      regen: 0,
      size: 0,
      detect: 0,
      knockback: 0
    },
    currentBiome: '',
    refinementCount: 0
  });

  let state = makeState();
  let scene = null;
  let player = null;
  let entityGroup = null;
  let backdrop = null;
  let keys = null;
  let toastTimer = 0;
  let chunkTimer = 0;
  let relationTimer = 0;
  const chunks = new Map();
  const control = {
    active: false,
    pointerId: null,
    originX: 0,
    originY: 0,
    x: 0,
    y: 0,
    driftX: 0,
    driftY: 0,
    driftUntil: 0
  };

  function stats() {
    const s = state.stats;
    return {
      speed: Math.max(115, 188 * (1 + s.speed)),
      power: Math.max(.7, 1 + state.evolutionLevel * .14 + s.power),
      eatRadius: Math.max(.78, 1 + s.eatRadius),
      armor: Phaser.Math.Clamp(s.armor, 0, .68),
      maxHealth: Math.max(55, 100 + s.maxHealth),
      mutationGain: Math.max(.55, 1 + s.mutationGain),
      biomassGain: Math.max(.55, 1 + s.biomassGain),
      healOnEat: Math.max(0, 2 + s.healOnEat),
      regen: Math.max(0, s.regen),
      size: Math.max(.72, 1 + state.evolutionLevel * .025 + s.size),
      detect: Math.max(.8, 1 + s.detect),
      knockback: Phaser.Math.Clamp(s.knockback, 0, .65)
    };
  }

  function hashNumber(x, y, salt = 0) {
    let n = Math.imul(x ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(y ^ salt, 0xc2b2ae35);
    n ^= n >>> 16;
    return Math.abs(n | 0);
  }

  function getBiome(cx, cy) {
    if (cx === START_CHUNK && cy === START_CHUNK) return BIOMES[0];
    return BIOMES[hashNumber(cx, cy, 71) % BIOMES.length];
  }

  function routeAffinity(route) {
    return state.routeCounts[route] || 0;
  }

  function routeColor(route) {
    return ROUTES[route]?.color || '#62e5bd';
  }

  function updateHud() {
    const s = stats();
    state.health = Math.min(state.health, s.maxHealth);
    const hp = Phaser.Math.Clamp(state.health / s.maxHealth, 0, 1);
    dom.healthFill.style.width = `${hp * 100}%`;
    dom.healthFill.style.background = hp < .32
      ? 'linear-gradient(90deg,#ff6587,#ffb35f)'
      : 'linear-gradient(90deg,#62e5bd,#b7f46b)';
    dom.healthValue.textContent = Math.ceil(state.health);
    dom.eatenValue.textContent = state.eaten;
    dom.biomassValue.textContent = Math.floor(state.biomass);
    dom.mutationFill.style.width = `${Math.min(100, state.mutation / state.mutationGoal * 100)}%`;
    dom.mutationValue.textContent = `${Math.floor(state.mutation)} / ${state.mutationGoal}`;
    dom.evolutionLevel.textContent = state.evolutionLevel;
    const last = state.chosen[state.chosen.length - 1];
    dom.lineageName.textContent = last ? `${last.name}型变形虫` : '自由生活变形虫';
    dom.shell.dataset.runtime = JSON.stringify({
      health: state.health,
      eaten: state.eaten,
      mutation: state.mutation,
      damageHits: state.damageHits,
      lastDamage: state.lastDamage,
      x: player?.x || 0,
      y: player?.y || 0,
      power: player ? stats().power : 0,
      nearby: player && entityGroup ? entityGroup.getChildren()
        .filter(entity => entity.active)
        .map(entity => ({ x: entity.x, y: entity.y, power: entity.power, name: entity.profile.name }))
        .sort((a, b) => Phaser.Math.Distance.Between(player.x, player.y, a.x, a.y) - Phaser.Math.Distance.Between(player.x, player.y, b.x, b.y))
        .slice(0, 8) : []
    });
  }

  function showToast(message, duration = 1300) {
    window.clearTimeout(toastTimer);
    dom.toast.textContent = message;
    dom.toast.classList.remove('hidden');
    toastTimer = window.setTimeout(() => dom.toast.classList.add('hidden'), duration);
  }

  function createTextures(targetScene) {
    if (!targetScene.textures.exists('player-cell')) {
      const texture = targetScene.textures.createCanvas('player-cell', 128, 128);
      const ctx = texture.context;
      ctx.clearRect(0, 0, 128, 128);
      ctx.beginPath();
      for (let i = 0; i <= 24; i += 1) {
        const angle = i / 24 * Math.PI * 2;
        const radius = 45 + Math.sin(angle * 3 + .7) * 7 + Math.sin(angle * 5) * 4;
        const x = 64 + Math.cos(angle) * radius;
        const y = 64 + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(174,255,232,.9)';
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(238,255,249,.92)';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(67, 63, 16, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(45,91,102,.8)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(42, 45, 7, 0, Math.PI * 2);
      ctx.arc(83, 87, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,224,115,.72)';
      ctx.fill();
      texture.refresh();
    }

    ORGANISMS.forEach((profile, index) => {
      const key = `organism-${index}`;
      if (targetScene.textures.exists(key)) return;
      const texture = targetScene.textures.createCanvas(key, 96, 96);
      const ctx = texture.context;
      ctx.clearRect(0, 0, 96, 96);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(248,255,252,.86)';
      ctx.lineWidth = 4;
      ctx.fillStyle = index < 2 ? '#a7efb7' : index < 4 ? '#e8cb6d' : '#d584a5';

      if (profile.kind === 'rod') {
        ctx.beginPath(); ctx.roundRect(20, 33, 56, 30, 15); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(22, 48); ctx.bezierCurveTo(8, 32, 10, 65, 2, 56); ctx.stroke();
      } else if (profile.kind === 'yeast') {
        ctx.beginPath(); ctx.arc(43, 49, 24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(68, 34, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      } else if (profile.kind === 'flagellate') {
        ctx.beginPath(); ctx.ellipse(44, 48, 27, 20, -.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(65, 37); ctx.bezierCurveTo(90, 14, 87, 74, 94, 65); ctx.stroke();
        ctx.beginPath(); ctx.arc(40, 47, 7, 0, Math.PI * 2); ctx.fillStyle = '#496b75'; ctx.fill();
      } else if (profile.kind === 'ciliate') {
        ctx.beginPath(); ctx.ellipse(48, 48, 29, 21, .2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        for (let i = 0; i < 10; i += 1) {
          const a = i / 10 * Math.PI * 2;
          ctx.beginPath(); ctx.moveTo(48 + Math.cos(a) * 31, 48 + Math.sin(a) * 23); ctx.lineTo(48 + Math.cos(a) * 38, 48 + Math.sin(a) * 29); ctx.stroke();
        }
      } else if (profile.kind === 'amoeboid') {
        ctx.beginPath();
        for (let i = 0; i <= 14; i += 1) {
          const a = i / 14 * Math.PI * 2;
          const r = 27 + Math.sin(a * 4) * 8;
          const x = 48 + Math.cos(a) * r;
          const y = 48 + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(50, 48, 9, 0, Math.PI * 2); ctx.fillStyle = '#563f6b'; ctx.fill();
      } else if (profile.kind === 'rotifer') {
        ctx.beginPath(); ctx.ellipse(48, 54, 21, 28, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(37, 28, 13, Math.PI, 0); ctx.arc(60, 28, 13, Math.PI, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(48, 79); ctx.lineTo(39, 91); ctx.moveTo(48, 79); ctx.lineTo(58, 91); ctx.stroke();
      } else if (profile.kind === 'predator') {
        ctx.beginPath(); ctx.moveTo(13, 48); ctx.quadraticCurveTo(45, 14, 82, 34); ctx.quadraticCurveTo(67, 78, 18, 69); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(58, 40, 7, 0, Math.PI * 2); ctx.fillStyle = '#351e3c'; ctx.fill();
      } else {
        for (let i = 0; i < 6; i += 1) {
          const a = i / 6 * Math.PI * 2;
          ctx.beginPath(); ctx.arc(48 + Math.cos(a) * 18, 48 + Math.sin(a) * 18, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
      }
      texture.refresh();
    });
  }

  function playerRadius() {
    return 27 * stats().size;
  }

  function updatePlayerAppearance() {
    if (!player?.active) return;
    const radius = playerRadius();
    player.setScale(radius * 2 / 128);
    const dominant = Object.entries(state.routeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'phagocyte';
    player.setTint(ROUTES[dominant].tint);
    if (player.body) {
      player.body.setCircle(45, 19, 19);
      player.body.setOffset(19, 19);
    }
  }

  function spawnOrganism(targetScene, chunk, rng, cx, cy, biome) {
    const baseLevel = Math.min(ORGANISMS.length - 2, Math.floor(state.evolutionLevel * .75));
    const roll = rng.frac();
    let offset = roll < .42 ? -1 : roll < .72 ? 0 : roll < .91 ? 1 : 2;
    if (biome.weakBias > 0 && rng.frac() < .34) offset -= 1;
    if (biome.weakBias < 0 && rng.frac() < .3) offset += 1;
    let profileIndex = Phaser.Math.Clamp(baseLevel + offset, 0, ORGANISMS.length - 1);
    if (state.evolutionLevel === 0 && cx === START_CHUNK && cy === START_CHUNK) profileIndex = Math.min(1, profileIndex);
    const profile = ORGANISMS[profileIndex];
    let x = cx * CHUNK_SIZE + rng.between(48, CHUNK_SIZE - 48);
    let y = cy * CHUNK_SIZE + rng.between(48, CHUNK_SIZE - 48);
    if (player && profile.power >= stats().power && Phaser.Math.Distance.Between(x, y, player.x, player.y) < 190) {
      x += x < player.x ? -190 : 190;
      y += y < player.y ? -130 : 130;
    }
    const variance = .9 + rng.frac() * .22;
    const sprite = targetScene.physics.add.sprite(x, y, `organism-${profileIndex}`);
    const radius = profile.radius * variance;
    sprite.setScale(radius * 2 / 96);
    sprite.setDepth(3);
    sprite.body.setCircle(37, 11, 11);
    sprite.body.setAllowGravity(false);
    sprite.body.setCollideWorldBounds(false);
    sprite.profile = profile;
    sprite.profileIndex = profileIndex;
    sprite.power = profile.power * variance;
    sprite.radiusValue = radius;
    sprite.baseSpeed = profile.speed * (.9 + rng.frac() * .2);
    sprite.turnAt = 0;
    sprite.wanderAngle = rng.frac() * Math.PI * 2;
    sprite.damageAt = 0;
    sprite.chunkKey = chunk.key;
    entityGroup.add(sprite);
    chunk.entities.push(sprite);
  }

  function createChunk(cx, cy) {
    if (!scene) return;
    const key = `${cx}:${cy}`;
    if (chunks.has(key)) return;
    const rng = new Phaser.Math.RandomDataGenerator([key, 'origin-world']);
    const biome = getBiome(cx, cy);
    const graphics = scene.add.graphics().setDepth(-2);
    const left = cx * CHUNK_SIZE;
    const top = cy * CHUNK_SIZE;
    graphics.fillStyle(biome.color, .045);
    graphics.fillCircle(left + rng.between(40, 640), top + rng.between(40, 640), rng.between(90, 210));
    for (let i = 0; i < 28; i += 1) {
      const x = left + rng.between(10, CHUNK_SIZE - 10);
      const y = top + rng.between(10, CHUNK_SIZE - 10);
      const size = rng.between(2, 11);
      graphics.fillStyle(i % 4 === 0 ? biome.color : 0xd7eee5, rng.frac() * .08 + .025);
      graphics.fillEllipse(x, y, size * 2.2, size);
    }
    graphics.lineStyle(1, biome.color, .09);
    for (let i = 0; i < 5; i += 1) {
      const x = left + rng.between(0, CHUNK_SIZE);
      const y = top + rng.between(0, CHUNK_SIZE);
      graphics.beginPath();
      graphics.moveTo(x, y);
      graphics.lineTo(x + rng.between(-90, 90), y + rng.between(70, 180));
      graphics.strokePath();
    }
    const chunk = { key, cx, cy, biome, graphics, entities: [] };
    chunks.set(key, chunk);
    const count = rng.between(7, 12);
    for (let i = 0; i < count; i += 1) spawnOrganism(scene, chunk, rng, cx, cy, biome);
  }

  function destroyChunk(chunk) {
    chunk.graphics?.destroy();
    chunk.entities.forEach(entity => {
      if (entity?.active) entity.destroy();
    });
    chunks.delete(chunk.key);
  }

  function streamChunks() {
    if (!player?.active) return;
    const cx = Math.floor(player.x / CHUNK_SIZE);
    const cy = Math.floor(player.y / CHUNK_SIZE);
    for (let x = cx - ACTIVE_CHUNK_RADIUS; x <= cx + ACTIVE_CHUNK_RADIUS; x += 1) {
      for (let y = cy - ACTIVE_CHUNK_RADIUS; y <= cy + ACTIVE_CHUNK_RADIUS; y += 1) createChunk(x, y);
    }
    [...chunks.values()].forEach(chunk => {
      if (Math.abs(chunk.cx - cx) > UNLOAD_CHUNK_RADIUS || Math.abs(chunk.cy - cy) > UNLOAD_CHUNK_RADIUS) destroyChunk(chunk);
    });
    const biome = getBiome(cx, cy);
    if (state.currentBiome !== biome.id) {
      state.currentBiome = biome.id;
      dom.biomeName.textContent = biome.name;
      showToast(`进入 ${biome.name}`);
    }
  }

  function updateRelations() {
    if (!entityGroup || !player) return;
    const playerPower = stats().power;
    entityGroup.getChildren().forEach(entity => {
      if (!entity.active) return;
      if (entity.power < playerPower * 1.01) entity.setTint(0x8ff0bd);
      else if (entity.power < playerPower * 1.18) entity.setTint(0xffd36b);
      else entity.setTint(0xff7295);
    });
  }

  function floatingText(x, y, text, color) {
    if (!scene) return;
    const label = scene.add.text(x, y, text, {
      color,
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      stroke: '#08221f',
      strokeThickness: 4
    }).setOrigin(.5).setDepth(9);
    scene.tweens.add({ targets: label, y: y - 46, alpha: 0, duration: 620, ease: 'Cubic.easeOut', onComplete: () => label.destroy() });
  }

  function consume(entity) {
    if (!entity.active || state.evolutionPending || state.over) return;
    const s = stats();
    const mutation = Math.max(1, Math.round(entity.profile.mutation * s.mutationGain));
    const biomass = Math.max(1, Math.round(entity.profile.biomass * s.biomassGain));
    state.eaten += 1;
    state.mutation += mutation;
    state.biomass += biomass;
    state.health = Math.min(s.maxHealth, state.health + s.healOnEat);
    floatingText(entity.x, entity.y, `+${mutation} 变异`, '#9ff3cf');
    entity.body.enable = false;
    scene.tweens.add({
      targets: entity,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 150,
      ease: 'Back.easeIn',
      onComplete: () => entity.destroy()
    });
    updateHud();
    if (state.mutation >= state.mutationGoal) scene.time.delayedCall(120, openEvolutionChoice);
  }

  function takeDamage(entity) {
    if (scene.time.now < state.damageAt || scene.time.now < state.safeUntil || state.over) return;
    const s = stats();
    const ratio = Phaser.Math.Clamp(entity.power / s.power, 1, 1.8);
    const damage = Math.max(4, Math.round(7 * ratio * (1 - s.armor)));
    state.damageAt = scene.time.now + 1150;
    entity.damageAt = state.damageAt;
    state.damageHits += 1;
    state.lastDamage = { name: entity.profile.name, damage, power: entity.power };
    state.health = Math.max(0, state.health - damage);
    const angle = Phaser.Math.Angle.Between(entity.x, entity.y, player.x, player.y);
    const push = 260 * (1 - s.knockback);
    player.body.velocity.x += Math.cos(angle) * push;
    player.body.velocity.y += Math.sin(angle) * push;
    entity.body.velocity.x -= Math.cos(angle) * 120;
    entity.body.velocity.y -= Math.sin(angle) * 120;
    player.setAlpha(.42);
    scene.time.delayedCall(100, () => player?.setAlpha(1));
    floatingText(player.x, player.y - playerRadius(), `-${damage}`, '#ff8aa3');
    updateHud();
    if (state.health <= 0) endGame();
  }

  function handleOverlap(_player, entity) {
    if (!state.started || state.paused || state.over || !entity.active) return;
    if (entity.power < stats().power * 1.01) consume(entity);
    else takeDamage(entity);
  }

  function updateOrganisms(time) {
    if (!entityGroup || !player) return;
    const s = stats();
    const playerPower = s.power;
    const detection = 380 * s.detect;
    entityGroup.getChildren().forEach(entity => {
      if (!entity.active || !entity.body?.enable) return;
      const dx = player.x - entity.x;
      const dy = player.y - entity.y;
      const distance = Math.hypot(dx, dy) || 1;
      if (distance > 1050) {
        entity.setVelocity(0, 0);
        return;
      }
      const danger = entity.power >= playerPower * 1.01;
      const edible = !danger;
      const feedingDistance = playerRadius() * (s.eatRadius + .14) + entity.radiusValue * .72;
      if (edible && distance <= feedingDistance) {
        consume(entity);
        return;
      }
      let angle = entity.wanderAngle;
      let speed = entity.baseSpeed;
      if (danger && distance < Math.min(620, detection)) {
        angle = Math.atan2(dy, dx);
        speed *= 1.12;
      } else if (edible && entity.profileIndex >= 2 && distance < 190 + playerRadius()) {
        angle = Math.atan2(-dy, -dx);
        speed *= 1.35;
      } else if (time > entity.turnAt) {
        entity.turnAt = time + Phaser.Math.Between(650, 1800);
        entity.wanderAngle += Phaser.Math.FloatBetween(-1.1, 1.1);
        angle = entity.wanderAngle;
      }
      entity.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      entity.rotation = angle * .18;
    });
  }

  function candidateChoices() {
    if (state.evolutionLevel >= 6) {
      return [...REFINEMENTS]
        .map(node => ({ node, score: routeAffinity(node.route) * 2 + Math.random() * 4 }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(item => item.node);
    }
    const targetStage = state.evolutionLevel + 1;
    const lastRoute = state.chosen[state.chosen.length - 1]?.route;
    return EVOLUTIONS
      .filter(node => node.stage === targetStage)
      .map(node => ({
        node,
        score: routeAffinity(node.route) * 2.4 + (node.route === lastRoute ? 2.2 : 0) + Math.random() * 3.8
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.node);
  }

  function nextRouteNode(node) {
    if (node.stage >= 6) return '后续可继续精炼这条路线';
    return EVOLUTIONS.find(item => item.stage === node.stage + 1 && item.route === node.route)?.name || '可转入其他路线';
  }

  function openEvolutionChoice() {
    if (state.evolutionPending || state.over || !state.started) return;
    state.evolutionPending = true;
    state.paused = true;
    control.active = false;
    control.x = 0;
    control.y = 0;
    dom.joystick.classList.add('hidden');
    scene.physics.pause();
    dom.evolutionChoices.replaceChildren();
    candidateChoices().forEach(node => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'evolution-card';
      button.style.setProperty('--route-color', routeColor(node.route));
      button.innerHTML = `
        <small>${ROUTES[node.route].name}</small>
        <h3>${node.name}</h3>
        <p>${node.summary}</p>
        <dl><dt>获得</dt><dd>${node.benefit}</dd><dt class="cost">代价</dt><dd>${node.cost}</dd></dl>
        <span class="future">后续：${nextRouteNode(node)}</span>
      `;
      button.addEventListener('click', () => chooseEvolution(node), { once: true });
      dom.evolutionChoices.append(button);
    });
    dom.evolutionOverlay.classList.remove('hidden');
  }

  function chooseEvolution(node) {
    const chosen = { ...node };
    if (node.stage === 7) {
      state.refinementCount += 1;
      chosen.id = `${node.id}-${state.refinementCount}`;
      chosen.name = `${node.name} ${state.refinementCount}`;
    }
    state.chosen.push(chosen);
    state.routeCounts[node.route] += 1;
    Object.entries(node.effects).forEach(([key, value]) => {
      state.stats[key] = (state.stats[key] || 0) + value;
    });
    state.evolutionLevel += 1;
    state.mutation = Math.max(0, state.mutation - state.mutationGoal);
    state.mutationGoal = Math.round(28 + state.evolutionLevel * 19 + Math.pow(state.evolutionLevel, 1.35) * 3);
    const s = stats();
    state.health = Math.min(s.maxHealth, state.health + Math.max(16, s.maxHealth * .22));
    updatePlayerAppearance();
    updateRelations();
    updateHud();
    renderTree();
    dom.evolutionOverlay.classList.add('hidden');
    state.evolutionPending = false;
    state.paused = false;
    scene.physics.resume();
    showToast(`固定变异：${node.name}`, 1800);
  }

  function renderTree() {
    dom.chosenPath.replaceChildren();
    const origin = document.createElement('span');
    origin.className = 'path-node';
    origin.style.setProperty('--route-color', '#dff8f0');
    origin.innerHTML = '<i></i>变形虫';
    dom.chosenPath.append(origin);
    state.chosen.forEach(node => {
      const item = document.createElement('span');
      item.className = 'path-node';
      item.style.setProperty('--route-color', routeColor(node.route));
      item.innerHTML = `<i></i>${node.name}`;
      dom.chosenPath.append(item);
    });

    dom.treeStages.replaceChildren();
    for (let stage = 1; stage <= 6; stage += 1) {
      const section = document.createElement('section');
      section.className = 'tree-stage';
      section.innerHTML = `<h3>第 ${stage} 次分化</h3><div class="tree-nodes"></div>`;
      const nodes = section.querySelector('.tree-nodes');
      EVOLUTIONS.filter(node => node.stage === stage).forEach(node => {
        const chosen = state.chosen.some(item => item.id === node.id);
        const item = document.createElement('div');
        item.className = `tree-node${chosen ? ' chosen' : ''}${stage === Math.min(6, state.evolutionLevel + 1) ? ' next' : ''}`;
        item.style.setProperty('--route-color', routeColor(node.route));
        item.innerHTML = `<strong>${node.name}</strong><small>${ROUTES[node.route].name} · ${node.summary}</small>`;
        nodes.append(item);
      });
      dom.treeStages.append(section);
    }
  }

  function openTree() {
    if (!state.started || state.over || state.evolutionPending || state.treeOpen) return;
    state.treeOpen = true;
    state.paused = true;
    scene.physics.pause();
    renderTree();
    dom.treePanel.classList.remove('hidden');
  }

  function closeTree() {
    if (!state.treeOpen) return;
    state.treeOpen = false;
    dom.treePanel.classList.add('hidden');
    if (!state.over && !state.evolutionPending) {
      state.paused = false;
      scene.physics.resume();
    }
  }

  function pauseGame() {
    if (!state.started || state.over || state.evolutionPending || state.treeOpen) return;
    state.paused = true;
    scene.physics.pause();
    dom.pauseOverlay.classList.remove('hidden');
  }

  function resumeGame() {
    if (state.over || state.evolutionPending) return;
    dom.pauseOverlay.classList.add('hidden');
    state.paused = false;
    scene.physics.resume();
  }

  function endGame() {
    if (state.over) return;
    state.over = true;
    state.paused = true;
    scene.physics.pause();
    player?.setVelocity(0, 0);
    dom.gameOverSummary.textContent = `吞噬 ${state.eaten} 个生物，积累 ${Math.floor(state.biomass)} 生物量，完成 ${state.evolutionLevel} 次进化。`;
    dom.finalPath.innerHTML = state.chosen.length
      ? state.chosen.map(node => `<span>${node.name}</span>`).join('')
      : '<span>尚未固定变异</span>';
    dom.gameOverOverlay.classList.remove('hidden');
  }

  function resetControl() {
    control.active = false;
    control.pointerId = null;
    control.x = 0;
    control.y = 0;
    control.driftX = 0;
    control.driftY = 0;
    control.driftUntil = 0;
    dom.joystick.classList.add('hidden');
  }

  function releaseControl() {
    control.active = false;
    control.pointerId = null;
    control.driftX = control.x;
    control.driftY = control.y;
    control.driftUntil = scene ? scene.time.now + 520 : 0;
    control.x = 0;
    control.y = 0;
    dom.joystick.classList.add('hidden');
  }

  function setupInput(targetScene) {
    keys = targetScene.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
    targetScene.input.on('pointerdown', pointer => {
      if (!state.started || state.paused || state.over) return;
      control.active = true;
      control.pointerId = pointer.id;
      control.originX = pointer.x;
      control.originY = pointer.y;
      control.x = 0;
      control.y = 0;
      dom.joystick.style.left = `${pointer.x}px`;
      dom.joystick.style.top = `${pointer.y}px`;
      dom.joystick.querySelector('i').style.transform = 'translate(-50%, -50%)';
      dom.joystick.classList.remove('hidden');
    });
    targetScene.input.on('pointermove', pointer => {
      if (!control.active || pointer.id !== control.pointerId) return;
      const dx = pointer.x - control.originX;
      const dy = pointer.y - control.originY;
      const distance = Math.hypot(dx, dy);
      const strength = Math.min(1, distance / 42);
      if (distance > 5) {
        control.x = dx / distance * strength;
        control.y = dy / distance * strength;
      } else {
        control.x = 0;
        control.y = 0;
      }
      const knobX = control.x * 24;
      const knobY = control.y * 24;
      dom.joystick.querySelector('i').style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
    });
    targetScene.input.on('pointerup', pointer => {
      if (pointer.id === control.pointerId) releaseControl();
    });
    targetScene.input.on('pointerupoutside', releaseControl);
  }

  class OriginScene extends Phaser.Scene {
    constructor() { super('OriginScene'); }

    preload() {
      this.load.image('microcosm', './assets/microcosm-bg.webp');
    }

    create() {
      scene = this;
      chunks.clear();
      createTextures(this);
      this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
      backdrop = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'microcosm')
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(-10)
        .setAlpha(.38)
        .setTint(0x80b6a8);
      const wash = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x062a27, .44)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(-9);

      entityGroup = this.physics.add.group({ allowGravity: false });
      player = this.physics.add.sprite(START_POSITION, START_POSITION, 'player-cell').setDepth(7);
      player.body.setAllowGravity(false);
      player.body.setCollideWorldBounds(true);
      updatePlayerAppearance();
      this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
      this.cameras.main.startFollow(player, true, .11, .11);
      this.cameras.main.setZoom(1);
      this.physics.add.overlap(player, entityGroup, handleOverlap);
      setupInput(this);
      streamChunks();
      updateRelations();
      updateHud();

      this.scale.on('resize', gameSize => {
        backdrop.setSize(gameSize.width, gameSize.height);
        wash.setSize(gameSize.width, gameSize.height);
      });

      if (!state.started) this.physics.pause();
      else {
        state.safeUntil = this.time.now + 4200;
        this.physics.resume();
      }
    }

    update(time, delta) {
      if (backdrop && this.cameras.main) {
        backdrop.tilePositionX = this.cameras.main.scrollX * .16;
        backdrop.tilePositionY = this.cameras.main.scrollY * .16;
      }
      if (!state.started || state.paused || state.over || !player?.active) return;

      let x = control.x;
      let y = control.y;
      if (!control.active && time < control.driftUntil) {
        const fade = Phaser.Math.Clamp((control.driftUntil - time) / 520, 0, 1);
        x = control.driftX * fade;
        y = control.driftY * fade;
      }
      if (keys.A.isDown || keys.LEFT.isDown) x -= 1;
      if (keys.D.isDown || keys.RIGHT.isDown) x += 1;
      if (keys.W.isDown || keys.UP.isDown) y -= 1;
      if (keys.S.isDown || keys.DOWN.isDown) y += 1;
      const length = Math.hypot(x, y);
      if (length > 0) {
        x /= Math.max(1, length);
        y /= Math.max(1, length);
      }
      const moveSpeed = stats().speed;
      player.setVelocity(x * moveSpeed, y * moveSpeed);
      player.rotation = Phaser.Math.Linear(player.rotation, x * .16, .1);

      updateOrganisms(time);
      const s = stats();
      if (s.regen > 0 && state.health < s.maxHealth) {
        state.health = Math.min(s.maxHealth, state.health + s.regen * delta / 1000);
      }
      if (time > chunkTimer) {
        chunkTimer = time + 350;
        streamChunks();
        updateHud();
      }
      if (time > relationTimer) {
        relationTimer = time + 600;
        updateRelations();
      }
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#082b28',
    transparent: false,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH, width: '100%', height: '100%' },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    render: { antialias: true, pixelArt: false, roundPixels: false },
    scene: OriginScene
  });

  document.querySelector('#startButton').addEventListener('click', () => {
    state.started = true;
    state.paused = false;
    state.safeUntil = scene.time.now + 4200;
    dom.introOverlay.classList.add('hidden');
    scene.physics.resume();
    showToast('拖动屏幕，寻找绿色的弱小生物');
  });
  dom.pauseButton.addEventListener('click', () => state.paused ? resumeGame() : pauseGame());
  document.querySelector('#resumeButton').addEventListener('click', resumeGame);
  dom.treeButton.addEventListener('click', openTree);
  document.querySelector('#closeTreeButton').addEventListener('click', closeTree);
  document.querySelector('#restartButton').addEventListener('click', () => {
    dom.gameOverOverlay.classList.add('hidden');
    dom.pauseOverlay.classList.add('hidden');
    dom.treePanel.classList.add('hidden');
    dom.evolutionOverlay.classList.add('hidden');
    state = makeState();
    state.started = true;
    resetControl();
    game.scene.stop('OriginScene');
    game.scene.start('OriginScene');
    window.setTimeout(() => showToast('新的谱系开始了'), 260);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.started && !state.paused && !state.over) pauseGame();
  });

  renderTree();
  updateHud();
})();

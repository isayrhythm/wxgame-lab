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

  const FORM_NAMES = {
    phagocyte: ['宽伪足摄食体', '酸泡捕食体', '环抱吞噬体', '巨型摄食体', '广谱猎手', '游猎巨胞体'],
    mobility: ['流线爬行体', '极化运动体', '爆发追猎体', '高速追猎体', '肌球动力体', '定向追击体'],
    defense: ['致密皮层体', '修复膜体', '包囊耐受体', '装甲存活体', '多层膜体', '耐逆装甲体'],
    growth: ['营养液泡体', '高周转消化体', '高效代谢体', '机会增殖体', '多核协同体', '快速扩张体'],
    sensing: ['表面感受体', '趋化搜索体', '触丝探索体', '伏击感知体', '预警感知体', '广域伏击体'],
    symbiosis: ['共生容纳体', '暂驻共生体', '稳定内共生体', '代谢互补体', '整合共生体', '复合共生体']
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

  const CLADE_EFFECTS = {
    phagocyte: { power: .08, eatRadius: .03 },
    mobility: { speed: .08, knockback: .03 },
    defense: { armor: .035, maxHealth: 4 },
    growth: { mutationGain: .07, biomassGain: .06 },
    sensing: { detect: .12, speed: .025 },
    symbiosis: { regen: .12, healOnEat: .4 }
  };

  const CLADE_BENEFITS = {
    phagocyte: '捕食与消化效率提高',
    mobility: '移动与追踪能力提高',
    defense: '耐受与损伤防护提高',
    growth: '能量转化与进化积累提高',
    sensing: '资源和危险感知范围提高',
    symbiosis: '代谢互补与恢复能力提高'
  };

  const makeLineage = (id, name, depth, parents, diet, form, clade, rank, summary, cost = '对其他生态资源的利用效率下降', effects = {}) => ({
    id, name, depth, parents, diet, form, clade, rank, summary, cost,
    benefit: CLADE_BENEFITS[clade],
    effects: { ...CLADE_EFFECTS[clade], ...effects }
  });

  const LINEAGE_NODES = [
    makeLineage('molecular_pool', '核苷酸与短肽体系', 0, [], 'prebiotic', 'molecule', 'growth', '前生命化学', '可利用的核苷酸、短肽和脂质在微环境中聚集。', '尚无稳定遗传与边界结构'),
    makeLineage('rna_replicator', 'RNA 自复制体系', 1, ['molecular_pool'], 'prebiotic', 'rna', 'growth', '自复制体系', 'RNA 同时承担信息储存和部分催化功能。', '复制错误率高，长序列难以稳定维持'),
    makeLineage('peptide_rna', '肽-RNA 协同网络', 1, ['molecular_pool'], 'prebiotic', 'rna', 'symbiosis', '化学协同体', '短肽提高 RNA 催化网络的稳定性与反应范围。', '组分依赖增强，任一环节缺失都会降低复制'),
    makeLineage('lipid_vesicle', '脂质囊泡', 1, ['molecular_pool'], 'prebiotic', 'vesicle', 'defense', '区室化体系', '脂质自组装形成边界，使反应物能够局部富集。', '跨膜物质交换受到限制'),

    makeLineage('ribozyme_network', '核酶网络', 2, ['rna_replicator'], 'prebiotic', 'rna', 'growth', '自复制体系', '多类核酶分工复制、切割和连接反应。', '依赖稳定的核苷酸供给'),
    makeLineage('translation_system', '原始翻译体系', 2, ['peptide_rna', 'rna_replicator'], 'prebiotic', 'ribo_peptide', 'symbiosis', '信息-功能耦联', '核酸模板与肽合成建立稳定对应关系。', '维持翻译装置需要更多能量'),
    makeLineage('protocell', '原始细胞', 2, ['lipid_vesicle', 'ribozyme_network', 'translation_system'], 'prebiotic', 'protocell', 'defense', '原始细胞', '遗传体系、代谢网络与膜区室被整合进同一复制单位。', '生长与分裂必须保持协调'),
    makeLineage('virus_like', '病毒样复制体', 2, ['rna_replicator'], 'virus', 'virus', 'sensing', '病毒旁支', '精简自身功能，依赖已存在的宿主复制。病毒不是细胞生命的必经祖先。', '离开宿主后不能独立复制'),

    makeLineage('rna_virus', 'RNA 病毒谱系', 3, ['virus_like'], 'virus', 'virus_rna', 'growth', '病毒类群', '以 RNA 为遗传物质并利用宿主复制系统。', '高突变率带来较高遗传负荷'),
    makeLineage('dna_virus', 'DNA 病毒谱系', 3, ['virus_like'], 'virus', 'virus_dna', 'defense', '病毒类群', '采用更稳定的 DNA 基因组维持较大遗传信息量。', '复制周期和装配成本提高'),
    makeLineage('giant_virus', '巨型病毒谱系', 3, ['virus_like'], 'virus', 'virus_giant', 'phagocyte', '病毒类群', '保留更多复制与翻译相关基因，形成大型病毒颗粒。', '宿主范围更受限制'),

    makeLineage('bacterial_cell', '细菌型细胞', 3, ['protocell'], 'bacterial', 'bacterium', 'growth', '原核细胞', '形成紧凑基因组、细胞壁和快速二分裂策略。', '内部区室化能力有限'),
    makeLineage('archaeal_cell', '古菌型细胞', 3, ['protocell'], 'chemo', 'archaea', 'defense', '原核细胞', '独特膜脂与信息处理系统支持多种极端环境适应。', '部分代谢路线高度环境依赖'),
    makeLineage('heterotrophic_bacterium', '异养细菌', 4, ['bacterial_cell'], 'bacterial', 'bacterium', 'phagocyte', '细菌生态型', '利用有机物快速生长并参与分解网络。', '资源匮乏时竞争力下降'),
    makeLineage('cyanobacterium', '产氧光合细菌', 4, ['bacterial_cell'], 'photo', 'cyanobacteria', 'symbiosis', '细菌生态型', '利用光能并释放氧，改变环境氧化状态。', '暗环境中能量获取显著下降'),
    makeLineage('predatory_bacterium', '捕食性细菌', 4, ['bacterial_cell'], 'bacterial', 'predatory_bacteria', 'mobility', '细菌生态型', '追踪并侵入其他细菌，获得集中营养。', '缺少猎物时维持成本较高'),
    makeLineage('methanogen', '产甲烷古菌', 4, ['archaeal_cell'], 'chemo', 'archaea', 'growth', '古菌生态型', '利用无机底物进行产甲烷代谢。', '对氧暴露较敏感'),
    makeLineage('thermophile', '嗜热古菌', 4, ['archaeal_cell'], 'chemo', 'archaea_armored', 'defense', '古菌生态型', '稳定蛋白和膜结构支持高温环境。', '常温环境中的生长速度降低'),
    makeLineage('archaeal_host', '古菌宿主细胞', 4, ['archaeal_cell'], 'chemo', 'archaea_host', 'symbiosis', '内共生宿主', '与细菌伙伴形成长期代谢耦联，为真核细胞起源提供条件。', '宿主与共生体必须协调分裂'),

    makeLineage('eukaryotic_cell', '真核单细胞', 5, ['archaeal_host'], 'euk_hetero', 'eukaryote', 'symbiosis', '真核细胞', '细胞核、线粒体与复杂细胞骨架支持更大的基因组和细胞体。', '结构复杂导致维持成本提高', { maxHealth: 10, size: .12 }),
    makeLineage('heterotrophic_protist', '异养原生生物', 6, ['eukaryotic_cell'], 'euk_hetero', 'amoeba', 'phagocyte', '真核单细胞', '通过吞噬细菌和其他单细胞获取能量。', '依赖可捕获的颗粒猎物'),
    makeLineage('photosynthetic_protist', '光合原生生物', 6, ['eukaryotic_cell'], 'photo', 'algae_cell', 'symbiosis', '真核单细胞', '通过质体内共生获得光合能力。', '暗环境与缺矿环境中收益下降'),
    makeLineage('osmotrophic_protist', '渗透营养型真核生物', 6, ['eukaryotic_cell'], 'fungus', 'fungal_cell', 'sensing', '真核单细胞', '分泌酶并吸收溶解有机物。', '移动和主动捕食能力降低'),

    makeLineage('choano_colony', '领鞭毛虫样群体', 7, ['heterotrophic_protist'], 'euk_hetero', 'colony', 'sensing', '多细胞化前体', '细胞黏附、通讯和分工逐渐稳定。', '群体需要协调个体利益'),
    makeLineage('amoebozoan_colony', '聚集型变形生物', 7, ['heterotrophic_protist'], 'euk_hetero', 'slime_colony', 'mobility', '独立多细胞化', '饥饿时个体聚集并形成临时多细胞结构。', '多细胞状态依赖环境诱导'),
    makeLineage('green_algal_colony', '绿藻群体', 7, ['photosynthetic_protist'], 'photo', 'algae_colony', 'growth', '多细胞化前体', '光合细胞保持黏附并出现生殖分工。', '需要稳定光照和无机盐'),
    makeLineage('brown_algal_multicell', '褐藻多细胞体', 7, ['photosynthetic_protist'], 'photo', 'kelp', 'defense', '独立多细胞化', '通过独立路线形成大型多细胞藻体。', '主要适合水生光照环境'),
    makeLineage('fungal_hypha', '菌丝型多细胞体', 7, ['osmotrophic_protist'], 'fungus', 'hypha', 'growth', '多细胞化前体', '细长菌丝扩大外部消化和吸收面积。', '依赖外部有机底物'),

    makeLineage('early_animal', '早期动物', 8, ['choano_colony'], 'animal', 'animal_simple', 'mobility', '动物界', '稳定胚胎发育、细胞分化与胞外基质。', '需要持续摄取有机物'),
    makeLineage('land_plant', '早期陆生植物', 8, ['green_algal_colony'], 'plant', 'plant_simple', 'defense', '植物界', '形成保护胚、角质层与陆地生活史。', '固定生活使逃逸能力丧失'),
    makeLineage('early_fungus', '早期真菌', 8, ['fungal_hypha'], 'fungus', 'fungus', 'growth', '真菌界', '以几丁质细胞壁、菌丝和孢子完成扩散。', '能量来源依赖外界有机质'),
    makeLineage('slime_mold', '黏菌样谱系', 8, ['amoebozoan_colony'], 'euk_hetero', 'slime_mold', 'sensing', '变形生物类群', '保留单细胞摄食与聚集繁殖两种状态。', '环境变化会触发形态转换'),
    makeLineage('kelp_lineage', '海带样大型藻体', 8, ['brown_algal_multicell'], 'photo', 'kelp', 'growth', '褐藻类群', '形成固着器、柄和叶片样结构。', '离不开水体与适宜光照'),

    makeLineage('sponge_grade', '海绵样动物', 9, ['early_animal'], 'animal', 'sponge', 'defense', '动物早期分支', '依靠水流过滤颗粒食物，缺少真正神经系统。', '移动能力极弱'),
    makeLineage('cnidarian', '刺胞动物', 9, ['early_animal'], 'animal', 'cnidarian', 'phagocyte', '动物门级分支', '辐射对称并利用刺细胞捕获猎物。', '身体组织层次相对简单'),
    makeLineage('bilaterian', '两侧对称动物', 9, ['early_animal'], 'animal', 'worm', 'mobility', '动物演化支', '前后轴、集中感觉和定向运动共同发展。', '神经与运动组织耗能增加'),
    makeLineage('bryophyte', '苔藓植物', 9, ['land_plant'], 'plant', 'moss', 'defense', '植物分支', '保持无维管的矮小生活史。', '输导距离和体型受限'),
    makeLineage('vascular_plant', '维管植物', 9, ['land_plant'], 'plant', 'vascular_plant', 'growth', '植物演化支', '木质部和韧皮部支持更高植株。', '构建支持组织需要更多碳投入'),
    makeLineage('ascomycota', '子囊菌谱系', 9, ['early_fungus'], 'fungus', 'fungus', 'growth', '真菌门级分支', '以子囊产生有性孢子并形成多样生活型。', '繁殖依赖适合的底物环境'),
    makeLineage('basidiomycota', '担子菌谱系', 9, ['early_fungus'], 'fungus', 'mushroom', 'symbiosis', '真菌门级分支', '形成担子和复杂子实体，常参与木质分解或菌根共生。', '子实体建造成本较高'),

    makeLineage('protostome', '原口动物支', 10, ['bilaterian'], 'animal', 'worm', 'phagocyte', '动物演化支', '包含节肢、软体和环节等主要类群。', '各支系食物和体制快速专化'),
    makeLineage('deuterostome', '后口动物支', 10, ['bilaterian'], 'animal', 'worm', 'sensing', '动物演化支', '包含棘皮动物与脊索动物等类群。', '发育程序更复杂'),
    makeLineage('fern', '蕨类植物', 10, ['vascular_plant'], 'plant', 'fern', 'growth', '维管植物分支', '以孢子繁殖并形成大型叶。', '受精仍较依赖水环境'),
    makeLineage('seed_plant', '种子植物', 10, ['vascular_plant'], 'plant', 'seedling', 'defense', '维管植物分支', '花粉和种子降低繁殖对水的依赖。', '繁殖结构投入增加'),

    makeLineage('arthropod', '节肢动物', 11, ['protostome'], 'animal', 'arthropod', 'defense', '门：节肢动物门', '外骨骼、附肢分节和蜕皮支持高度多样化。', '生长必须经历蜕皮'),
    makeLineage('mollusk', '软体动物', 11, ['protostome'], 'animal', 'mollusk', 'defense', '门：软体动物门', '发育出足、外套膜和多样取食器官。', '多数类型运动速度有限'),
    makeLineage('annelid', '环节动物', 11, ['protostome'], 'animal', 'worm', 'mobility', '门：环节动物门', '分节体制支持重复器官和灵活运动。', '体表水分平衡要求较高'),
    makeLineage('echinoderm', '棘皮动物', 11, ['deuterostome'], 'animal', 'star_animal', 'defense', '门：棘皮动物门', '成体辐射对称并使用水管系统运动。', '主要限制在海洋环境'),
    makeLineage('chordate', '脊索动物', 11, ['deuterostome'], 'animal', 'chordate', 'mobility', '门：脊索动物门', '脊索、背神经管和肌节提高定向游动能力。', '神经与肌肉耗能较高'),
    makeLineage('gymnosperm', '裸子植物', 11, ['seed_plant'], 'plant', 'conifer', 'defense', '种子植物分支', '以裸露胚珠和花粉完成繁殖。', '繁殖周期通常较长'),
    makeLineage('angiosperm', '被子植物', 11, ['seed_plant'], 'plant', 'flower', 'symbiosis', '种子植物分支', '花与果实提高授粉和种子传播效率。', '对传粉或传播互作存在依赖'),

    makeLineage('vertebrate', '脊椎动物', 12, ['chordate'], 'animal', 'fish', 'defense', '亚门：脊椎动物亚门', '颅骨和脊柱保护中枢神经并支撑更强运动。', '骨骼和感觉系统维持成本提高'),
    makeLineage('monocot', '单子叶植物', 12, ['angiosperm'], 'plant', 'grass', 'growth', '被子植物分支', '平行叶脉和须根等特征适合多种快速生长策略。', '木质化方式受到限制'),
    makeLineage('eudicot', '真双子叶植物', 12, ['angiosperm'], 'plant', 'flower', 'symbiosis', '被子植物分支', '形成高度多样的花、叶和次生生长类型。', '组织建造与繁殖投入较高'),

    makeLineage('ray_finned_fish', '辐鳍鱼类', 13, ['vertebrate'], 'animal', 'fish', 'mobility', '纲级分支', '鳍条支撑多样游泳方式并辐射到广泛水域。', '离不开水生呼吸环境'),
    makeLineage('lobe_finned_fish', '肉鳍鱼类', 13, ['vertebrate'], 'animal', 'lobe_fish', 'mobility', '纲级分支', '肉质偶鳍为四肢演化提供结构基础。', '游泳效率未必优于专化辐鳍鱼'),
    makeLineage('poales', '禾本目', 13, ['monocot'], 'plant', 'grass', 'growth', '目：禾本目', '适应开阔环境与快速再生。', '对光照竞争较敏感'),
    makeLineage('rosales', '蔷薇目', 13, ['eudicot'], 'plant', 'flower', 'symbiosis', '目：蔷薇目', '多样花果结构支持动物传播。', '繁殖依赖生物互作'),

    makeLineage('tetrapod', '四足动物', 14, ['lobe_finned_fish'], 'animal', 'tetrapod', 'mobility', '总纲：四足类', '四肢、颈部和空气呼吸支持浅水与陆地活动。', '身体承重与保水压力提高'),
    makeLineage('cypriniformes', '鲤形目', 14, ['ray_finned_fish'], 'animal', 'fish', 'sensing', '目：鲤形目', '咽齿与韦伯器等特征支持淡水多样化。', '主要适应淡水生态'),
    makeLineage('poaceae', '禾本科', 14, ['poales'], 'plant', 'grass', 'growth', '科：禾本科', '节间、叶鞘和基部分生组织支持耐受取食。', '营养品质和防御存在权衡'),
    makeLineage('rosaceae', '蔷薇科', 14, ['rosales'], 'plant', 'flower', 'symbiosis', '科：蔷薇科', '多样花托和果实类型促进传播。', '果实建造消耗大量碳'),

    makeLineage('amphibian', '两栖类', 15, ['tetrapod'], 'animal', 'amphibian', 'sensing', '纲级分支', '保留水生幼体并适应陆地成体生活。', '繁殖和皮肤水分仍依赖湿润环境'),
    makeLineage('amniote', '羊膜动物', 15, ['tetrapod'], 'animal', 'tetrapod', 'defense', '演化支', '羊膜卵与更强保水能力减少繁殖对水的依赖。', '胚胎和附属膜投入提高'),
    makeLineage('cyprinidae', '鲤科', 15, ['cypriniformes'], 'animal', 'fish', 'growth', '科：鲤科', '适应多样淡水环境并形成广泛食性。', '对水体变化敏感'),
    makeLineage('oryza', '稻属', 15, ['poaceae'], 'plant', 'grass', 'growth', '属：稻属', '适应季节性湿地并形成颖果。', '高产依赖水分和矿质供应'),
    makeLineage('malus', '苹果属', 15, ['rosaceae'], 'plant', 'tree', 'symbiosis', '属：苹果属', '多年生木本并形成大型梨果。', '成熟和繁殖周期较长'),

    makeLineage('sauropsid', '蜥形纲支系', 16, ['amniote'], 'animal', 'reptile', 'defense', '羊膜动物分支', '角质表皮和高效保水适应干燥陆地。', '外温类型活动受环境温度限制'),
    makeLineage('synapsid', '合弓纲支系', 16, ['amniote'], 'animal', 'mammal_early', 'growth', '羊膜动物分支', '颞孔与颌部重构最终导向哺乳动物。', '高代谢路线需要持续能量'),
    makeLineage('danio', '丹属', 16, ['cyprinidae'], 'animal', 'fish', 'mobility', '属：丹属', '小型活跃淡水鱼，发育周期较快。', '体型限制捕食范围'),
    makeLineage('oryza_sativa', '水稻', 16, ['oryza'], 'plant', 'rice', 'growth', '种：Oryza sativa', '一年生禾本科作物，适应人工水田环境。', '高产性状依赖充足资源'),
    makeLineage('malus_domestica', '栽培苹果', 16, ['malus'], 'plant', 'apple_tree', 'symbiosis', '种：Malus domestica', '经长期驯化形成多样果实性状。', '繁殖与栽培高度依赖管理'),

    makeLineage('bird', '鸟类', 17, ['sauropsid'], 'animal', 'bird', 'mobility', '纲：鸟纲', '羽毛、气囊和轻量骨骼支持飞行与高代谢。', '维持体温和飞行耗能很高'),
    makeLineage('reptile', '非鸟爬行动物', 17, ['sauropsid'], 'animal', 'reptile', 'defense', '爬行动物类群', '多样化为蜥蜴、蛇、龟和鳄类等路线。', '多数类型依赖环境热源'),
    makeLineage('mammal', '哺乳动物', 17, ['synapsid'], 'animal', 'mammal', 'growth', '纲：哺乳纲', '毛发、乳腺和内温支持稳定育幼。', '基础代谢和育幼成本高'),
    makeLineage('danio_rerio', '斑马鱼', 17, ['danio'], 'animal', 'fish', 'mobility', '种：Danio rerio', '小型鲤科鱼类，视觉觅食并群游。', '生态位偏向温暖浅水'),

    makeLineage('passeriformes', '雀形目', 18, ['bird'], 'animal', 'bird', 'sensing', '目：雀形目', '足部与鸣管专化支持栖息和复杂交流。', '高活动水平要求稳定食物'),
    makeLineage('primates', '灵长目', 18, ['mammal'], 'animal', 'primate', 'sensing', '目：灵长目', '立体视觉、灵活手部与复杂社会行为发展。', '发育和育幼周期延长'),
    makeLineage('carnivora', '食肉目', 18, ['mammal'], 'animal', 'carnivore', 'phagocyte', '目：食肉目', '裂齿与感官系统适合捕食或杂食。', '需要较高质量食物'),
    makeLineage('rodentia', '啮齿目', 18, ['mammal'], 'omnivore', 'rodent', 'growth', '目：啮齿目', '持续生长门齿和快速繁殖支持广泛生态位。', '个体防御能力相对有限'),

    makeLineage('corvidae', '鸦科', 19, ['passeriformes'], 'omnivore', 'bird', 'sensing', '科：鸦科', '较高认知能力和机会主义食性。', '复杂行为需要较大脑部投入'),
    makeLineage('hominidae', '人科', 19, ['primates'], 'omnivore', 'primate', 'sensing', '科：人科', '大型体型、长育幼期和复杂社会学习。', '繁殖速度较慢'),
    makeLineage('felidae', '猫科', 19, ['carnivora'], 'animal', 'carnivore', 'phagocyte', '科：猫科', '伏击捕食、伸缩爪和高度肉食化。', '对猎物资源依赖较强'),

    makeLineage('corvus', '鸦属', 20, ['corvidae'], 'omnivore', 'bird', 'sensing', '属：鸦属', '灵活觅食、工具使用和复杂交流。', '脑组织耗能较高'),
    makeLineage('homo', '人属', 20, ['hominidae'], 'omnivore', 'human', 'sensing', '属：人属', '双足行走、精细操作和累积文化显著增强。', '极长发育期与高能量脑'),
    makeLineage('panthera', '豹属', 20, ['felidae'], 'animal', 'big_cat', 'phagocyte', '属：豹属', '大型伏击捕食者，具强大颌部和肢体。', '需要广阔领地和大型猎物'),

    makeLineage('corvus_corax', '渡鸦', 21, ['corvus'], 'omnivore', 'raven', 'sensing', '种：Corvus corax', '大型鸦科鸟类，适应广泛环境并具复杂认知。', '繁殖投入较高'),
    makeLineage('homo_sapiens', '智人', 21, ['homo'], 'omnivore', 'human', 'sensing', '种：Homo sapiens', '语言、累积文化与技术显著改变生态位。', '高度依赖社会协作和资源网络'),
    makeLineage('panthera_leo', '狮', 21, ['panthera'], 'animal', 'lion', 'phagocyte', '种：Panthera leo', '群居大型猫科，协作捕食并保卫领地。', '能量需求与领地需求很高')
  ];

  const LINEAGE_MAP = Object.fromEntries(LINEAGE_NODES.map(node => [node.id, node]));

  const DIET_PROFILES = {
    prebiotic: { nucleotide: 1.8, amino: 1.45, lipid: 1.3, light: .25, mineral: .35, detritus: .15 },
    virus: { host: 2.1, cell: 1.55, bacteria: 1.2, nucleotide: .25 },
    bacterial: { detritus: 1.45, amino: 1.25, bacteria: .65, mineral: .7 },
    chemo: { mineral: 1.9, detritus: .75, amino: .45 },
    photo: { light: 2.05, mineral: 1.35, detritus: .25 },
    euk_hetero: { bacteria: 1.7, cell: 1.3, plankton: 1.15, detritus: .55 },
    fungus: { detritus: 2, cell: .8, amino: .7, mineral: .45 },
    animal: { animal: 1.65, plankton: 1.35, cell: 1.05, bacteria: .55 },
    plant: { light: 2.1, mineral: 1.45, detritus: .2 },
    omnivore: { animal: 1.15, cell: 1.05, detritus: 1, plankton: .85, bacteria: .65 }
  };

  const RESOURCE_PROFILES = [
    { name: '核苷酸', food: 'nucleotide', kind: 'nucleotide', power: .08, radius: 7, speed: 24, mutation: 5, biomass: 3 },
    { name: '短肽', food: 'amino', kind: 'amino', power: .08, radius: 8, speed: 20, mutation: 5, biomass: 4 },
    { name: '脂质小滴', food: 'lipid', kind: 'lipid', power: .08, radius: 9, speed: 18, mutation: 5, biomass: 4 },
    { name: '光能团', food: 'light', kind: 'light', power: .05, radius: 7, speed: 30, mutation: 5, biomass: 3 },
    { name: '无机矿质', food: 'mineral', kind: 'mineral', power: .08, radius: 8, speed: 12, mutation: 5, biomass: 4 },
    { name: '有机碎屑', food: 'detritus', kind: 'detritus', power: .1, radius: 10, speed: 10, mutation: 6, biomass: 5 },
    { name: '宿主细胞', food: 'host', kind: 'host', power: .35, radius: 13, speed: 42, mutation: 8, biomass: 7 }
  ];

  const ORGANISMS = [
    { name: '细菌', food: 'bacteria', kind: 'rod', power: .62, radius: 9, speed: 58, mutation: 5, biomass: 4 },
    { name: '酵母样微生物', food: 'cell', kind: 'yeast', power: .86, radius: 12, speed: 46, mutation: 6, biomass: 5 },
    { name: '小型鞭毛生物', food: 'plankton', kind: 'flagellate', power: 1.12, radius: 15, speed: 76, mutation: 7, biomass: 7 },
    { name: '纤毛捕食者', food: 'plankton', kind: 'ciliate', power: 1.42, radius: 19, speed: 88, mutation: 9, biomass: 9 },
    { name: '掠食性变形生物', food: 'cell', kind: 'amoeboid', power: 1.78, radius: 23, speed: 96, mutation: 11, biomass: 12 },
    { name: '微型后生动物', food: 'animal', kind: 'rotifer', power: 2.15, radius: 27, speed: 102, mutation: 14, biomass: 15 },
    { name: '大型原生捕食者', food: 'animal', kind: 'predator', power: 2.62, radius: 32, speed: 110, mutation: 18, biomass: 20 },
    { name: '群体捕食单元', food: 'animal', kind: 'colony', power: 3.18, radius: 38, speed: 94, mutation: 23, biomass: 27 }
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
    currentLineage: 'molecular_pool',
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

  function currentLineageNode() {
    return LINEAGE_MAP[state.currentLineage] || LINEAGE_MAP.molecular_pool;
  }

  function dietWeight(profile) {
    const diet = DIET_PROFILES[currentLineageNode().diet] || DIET_PROFILES.prebiotic;
    return diet[profile.food] ?? .08;
  }

  function autotrophyRate() {
    const diet = currentLineageNode().diet;
    const biome = state.currentBiome || 'nutrient';
    if (diet === 'photo' || diet === 'plant') {
      const factor = { open: 1.3, nutrient: 1.05, biofilm: .88, hypoxia: .76, detritus: .64 }[biome] || 1;
      return { rate: (diet === 'plant' ? 1.55 : 1.2) * factor, label: '光合' };
    }
    if (diet === 'chemo') {
      const factor = { open: .68, nutrient: 1, biofilm: 1.12, hypoxia: 1.32, detritus: 1.22 }[biome] || 1;
      return { rate: .9 * factor, label: '化能' };
    }
    return { rate: 0, label: '' };
  }

  function canConsume(entity) {
    return dietWeight(entity.profile) >= .32 && entity.power < stats().power * 1.01;
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
    dom.lineageName.textContent = currentForm().name;
    const biome = BIOMES.find(item => item.id === state.currentBiome) || BIOMES[0];
    const autotrophy = autotrophyRate();
    dom.biomeName.textContent = autotrophy.rate > 0 ? `${biome.name} · ${autotrophy.label}+${autotrophy.rate.toFixed(1)}/秒` : biome.name;
    dom.shell.dataset.runtime = JSON.stringify({
      health: state.health,
      eaten: state.eaten,
      mutation: state.mutation,
      damageHits: state.damageHits,
      lastDamage: state.lastDamage,
      x: player?.x || 0,
      y: player?.y || 0,
      power: player ? stats().power : 0,
      autotrophy: autotrophyRate(),
      nearby: player && entityGroup ? entityGroup.getChildren()
        .filter(entity => entity.active)
        .map(entity => ({ x: entity.x, y: entity.y, power: entity.power, name: entity.profile.name, food: entity.profile.food, edible: canConsume(entity) }))
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

  function currentForm() {
    const node = currentLineageNode();
    return { route: node.clade, stage: Math.min(6, Math.max(1, state.evolutionLevel)), name: node.name, form: node.form };
  }

  function organicPath(ctx, radius, lobes, stretchX = 1, stretchY = 1, phase = 0) {
    ctx.beginPath();
    for (let i = 0; i <= 40; i += 1) {
      const angle = i / 40 * Math.PI * 2;
      const ripple = 1 + Math.sin(angle * lobes + phase) * .1 + Math.sin(angle * (lobes + 2) - phase) * .045;
      const x = 80 + Math.cos(angle) * radius * ripple * stretchX;
      const y = 80 + Math.sin(angle) * radius * ripple * stretchY;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function drawPlayerForm(ctx, route, stage) {
    const color = ROUTES[route].color;
    ctx.clearRect(0, 0, 160, 160);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;

    if (route === 'phagocyte') {
      ctx.globalAlpha = .94;
      ctx.fillStyle = color;
      organicPath(ctx, 48 + stage * 1.5, 4 + Math.min(stage, 3), 1.12, .92, .4);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#edfff8';
      ctx.stroke();
      ctx.lineWidth = 7 + stage;
      ctx.strokeStyle = 'rgba(7,65,57,.7)';
      ctx.beginPath();
      ctx.arc(106, 80, 24 + stage * 2, Math.PI * .58, Math.PI * 1.42);
      ctx.stroke();
      for (let i = 0; i < Math.min(5, stage + 1); i += 1) {
        const y = 51 + i * 15;
        ctx.lineWidth = 8 - i * .5;
        ctx.strokeStyle = color;
        ctx.beginPath(); ctx.moveTo(44, y); ctx.quadraticCurveTo(21 - stage * 2, y - 8, 11, y + (i % 2 ? 8 : -8)); ctx.stroke();
      }
    } else if (route === 'mobility') {
      ctx.save();
      ctx.translate(82, 80);
      ctx.rotate(-.12);
      ctx.fillStyle = color;
      ctx.globalAlpha = .95;
      ctx.beginPath();
      ctx.moveTo(62, 0);
      ctx.bezierCurveTo(25, -42 - stage * 2, -47, -31, -54, 0);
      ctx.bezierCurveTo(-47, 31, 25, 42 + stage * 2, 62, 0);
      ctx.closePath(); ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = '#effcff'; ctx.stroke();
      ctx.restore();
      for (let i = 0; i < 1 + Math.floor(stage / 2); i += 1) {
        ctx.lineWidth = 3 + (stage - i) * .3;
        ctx.strokeStyle = i === 0 ? color : 'rgba(222,250,255,.72)';
        ctx.beginPath();
        ctx.moveTo(31, 70 + i * 11);
        ctx.bezierCurveTo(8, 46 + i * 12, 14, 114 - i * 10, 1, 102 - i * 14);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(12,73,89,.82)';
      ctx.beginPath(); ctx.ellipse(92, 77, 14, 18, -.15, 0, Math.PI * 2); ctx.fill();
    } else if (route === 'defense') {
      const sides = 8 + stage;
      ctx.fillStyle = color;
      ctx.globalAlpha = .95;
      ctx.beginPath();
      for (let i = 0; i <= sides; i += 1) {
        const angle = i / sides * Math.PI * 2;
        const radius = i % 2 ? 49 : 55 + stage;
        const x = 80 + Math.cos(angle) * radius;
        const y = 80 + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#f5f0ff'; ctx.lineWidth = 5 + stage * .5; ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(63,42,94,.55)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(80, 80, 38 + stage, 0, Math.PI * 2); ctx.stroke();
      if (stage >= 3) {
        for (let i = 0; i < 8; i += 1) {
          const angle = i / 8 * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(80 + Math.cos(angle) * 40, 80 + Math.sin(angle) * 40);
          ctx.lineTo(80 + Math.cos(angle) * 53, 80 + Math.sin(angle) * 53);
          ctx.stroke();
        }
      }
    } else if (route === 'growth') {
      ctx.globalAlpha = .94;
      ctx.fillStyle = color;
      organicPath(ctx, 48 + stage, 5, 1, 1, 1.2);
      ctx.fill();
      ctx.strokeStyle = '#fff7dc'; ctx.lineWidth = 4; ctx.stroke();
      const buds = 1 + Math.floor(stage / 2);
      for (let i = 0; i < buds; i += 1) {
        const angle = -.8 + i * 1.1;
        const x = 80 + Math.cos(angle) * 51;
        const y = 80 + Math.sin(angle) * 45;
        ctx.beginPath(); ctx.arc(x, y, 12 + i * 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.shadowBlur = 0;
      for (let i = 0; i < Math.min(5, stage + 1); i += 1) {
        const angle = i / Math.min(5, stage + 1) * Math.PI * 2;
        ctx.fillStyle = i % 2 ? '#7d6228' : '#556a5d';
        ctx.beginPath(); ctx.arc(80 + Math.cos(angle) * 23, 80 + Math.sin(angle) * 21, 8, 0, Math.PI * 2); ctx.fill();
      }
    } else if (route === 'sensing') {
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      const feelers = 5 + stage;
      for (let i = 0; i < feelers; i += 1) {
        const angle = i / feelers * Math.PI * 2;
        const length = 59 + (i % 3) * 7 + stage * 2;
        ctx.beginPath();
        ctx.moveTo(80 + Math.cos(angle) * 34, 80 + Math.sin(angle) * 34);
        ctx.quadraticCurveTo(80 + Math.cos(angle + .13) * (length - 10), 80 + Math.sin(angle + .13) * (length - 10), 80 + Math.cos(angle) * length, 80 + Math.sin(angle) * length);
        ctx.stroke();
        ctx.fillStyle = '#ffe5ee';
        ctx.beginPath(); ctx.arc(80 + Math.cos(angle) * length, 80 + Math.sin(angle) * length, 3.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = color;
      organicPath(ctx, 40 + stage, 5, 1.04, .96, 2.1);
      ctx.fill(); ctx.strokeStyle = '#fff0f5'; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = 'rgba(87,38,72,.72)';
      ctx.beginPath(); ctx.arc(82, 80, 14, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.globalAlpha = .94;
      ctx.fillStyle = color;
      organicPath(ctx, 47 + stage, 6, 1, 1, .8);
      ctx.fill(); ctx.strokeStyle = '#f2ffe9'; ctx.lineWidth = 4; ctx.stroke();
      ctx.shadowBlur = 0;
      const symbionts = 3 + stage * 2;
      for (let i = 0; i < symbionts; i += 1) {
        const angle = i * 2.399;
        const distance = 13 + (i % 3) * 10;
        ctx.fillStyle = i % 2 ? '#eaf56c' : '#267d65';
        ctx.beginPath();
        ctx.ellipse(80 + Math.cos(angle) * distance, 80 + Math.sin(angle) * distance, 4 + stage * .18, 7, angle, 0, Math.PI * 2);
        ctx.fill();
      }
      if (stage >= 4) {
        ctx.strokeStyle = 'rgba(232,255,177,.72)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(80, 80, 56 + stage, 0, Math.PI * 2); ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    if (route !== 'mobility' && route !== 'growth' && route !== 'symbiosis') {
      ctx.fillStyle = 'rgba(24,67,73,.76)';
      ctx.beginPath(); ctx.arc(78, 80, 11 + stage * .35, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.62)';
      ctx.beginPath(); ctx.arc(74, 76, 3.2, 0, Math.PI * 2); ctx.fill();
    }
  }

  function createPlayerForms(targetScene) {
    Object.keys(ROUTES).forEach(route => {
      for (let stage = 1; stage <= 6; stage += 1) {
        const key = `player-${route}-${stage}`;
        if (targetScene.textures.exists(key)) continue;
        const texture = targetScene.textures.createCanvas(key, 160, 160);
        drawPlayerForm(texture.context, route, stage);
        texture.refresh();
      }
    });
  }

  function createResourceTextures(targetScene) {
    const colors = ['#85e8ff', '#ffca77', '#ff9fbd', '#fff37b', '#bda7ff', '#b98c67', '#9be38d'];
    RESOURCE_PROFILES.forEach((profile, index) => {
      const key = `resource-${index}`;
      if (targetScene.textures.exists(key)) return;
      const texture = targetScene.textures.createCanvas(key, 96, 96);
      const ctx = texture.context;
      const color = colors[index];
      ctx.clearRect(0, 0, 96, 96);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      if (profile.kind === 'nucleotide') {
        for (let i = 0; i < 4; i += 1) {
          const x = 25 + i * 15;
          const y = 37 + (i % 2) * 20;
          ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
          if (i) { ctx.beginPath(); ctx.moveTo(x - 15, 57 - ((i - 1) % 2) * 20); ctx.lineTo(x, y); ctx.stroke(); }
        }
      } else if (profile.kind === 'amino') {
        ctx.beginPath(); ctx.moveTo(22, 56); ctx.lineTo(36, 34); ctx.lineTo(53, 55); ctx.lineTo(72, 31); ctx.stroke();
        [22,36,53,72].forEach((x, i) => { ctx.beginPath(); ctx.arc(x, i % 2 ? 34 : 56, 6, 0, Math.PI * 2); ctx.fill(); });
      } else if (profile.kind === 'lipid') {
        ctx.beginPath(); ctx.arc(48, 40, 15, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(42, 54); ctx.quadraticCurveTo(30, 72, 38, 86); ctx.moveTo(53, 54); ctx.quadraticCurveTo(68, 72, 58, 86); ctx.stroke();
      } else if (profile.kind === 'light') {
        ctx.beginPath();
        for (let i = 0; i < 16; i += 1) {
          const angle = i / 16 * Math.PI * 2;
          const radius = i % 2 ? 18 : 31;
          const x = 48 + Math.cos(angle) * radius;
          const y = 48 + Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.fill();
      } else if (profile.kind === 'mineral') {
        ctx.beginPath(); ctx.moveTo(48, 14); ctx.lineTo(76, 37); ctx.lineTo(65, 75); ctx.lineTo(31, 79); ctx.lineTo(17, 42); ctx.closePath(); ctx.fill();
      } else if (profile.kind === 'detritus') {
        for (let i = 0; i < 5; i += 1) {
          ctx.beginPath(); ctx.ellipse(28 + i * 11, 40 + (i % 3) * 9, 9, 5, i * .5, 0, Math.PI * 2); ctx.fill();
        }
      } else {
        ctx.beginPath(); ctx.ellipse(48, 49, 28, 22, -.2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#efffe8'; ctx.stroke();
        ctx.fillStyle = '#326c62'; ctx.beginPath(); ctx.arc(49, 48, 9, 0, Math.PI * 2); ctx.fill();
      }
      texture.refresh();
    });
  }

  function drawLineageTexture(ctx, form) {
    const isVirus = form.startsWith('virus');
    const isBacterium = ['bacterium', 'cyanobacteria', 'predatory_bacteria'].includes(form);
    const isArchaea = form.startsWith('archaea');
    const isMolecule = ['molecule', 'rna', 'ribo_peptide'].includes(form);
    const isCell = ['vesicle', 'protocell', 'eukaryote', 'amoeba', 'algae_cell', 'fungal_cell'].includes(form);
    const isColony = ['colony', 'slime_colony', 'algae_colony', 'slime_mold'].includes(form);
    const isFungus = ['hypha', 'fungus', 'mushroom'].includes(form);
    const plantForms = ['plant_simple', 'moss', 'vascular_plant', 'fern', 'seedling', 'conifer', 'flower', 'grass', 'rice', 'tree', 'apple_tree'];
    const fishForms = ['fish', 'lobe_fish'];
    const birdForms = ['bird', 'raven'];
    const mammalForms = ['mammal_early', 'mammal', 'primate', 'carnivore', 'rodent', 'human', 'big_cat', 'lion'];
    const reptileForms = ['tetrapod', 'amphibian', 'reptile'];
    ctx.clearRect(0, 0, 160, 160);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;

    if (isMolecule) {
      ctx.strokeStyle = '#7de8ff';
      ctx.fillStyle = '#d8fbff';
      ctx.shadowColor = '#65dff9'; ctx.shadowBlur = 12;
      const points = form === 'ribo_peptide' ? 8 : 6;
      for (let i = 0; i < points; i += 1) {
        const x = 28 + i * 15;
        const y = 76 + Math.sin(i * 1.7) * 26;
        if (i) {
          const px = 28 + (i - 1) * 15;
          const py = 76 + Math.sin((i - 1) * 1.7) * 26;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(x, y, form === 'molecule' ? 7 : 9, 0, Math.PI * 2); ctx.fill();
      }
      if (form !== 'molecule') {
        ctx.strokeStyle = '#ffce78'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(31, 95); ctx.bezierCurveTo(54, 132, 95, 28, 130, 72); ctx.stroke();
      }
    } else if (isVirus) {
      const color = form === 'virus_rna' ? '#ff87b4' : form === 'virus_dna' ? '#8ac5ff' : '#c79cff';
      ctx.fillStyle = color; ctx.strokeStyle = '#f9f3ff'; ctx.shadowColor = color; ctx.shadowBlur = 12;
      const spikes = form === 'virus_giant' ? 14 : 10;
      for (let i = 0; i < spikes; i += 1) {
        const a = i / spikes * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(80 + Math.cos(a) * 42, 80 + Math.sin(a) * 42); ctx.lineTo(80 + Math.cos(a) * 65, 80 + Math.sin(a) * 65); ctx.stroke();
        ctx.beginPath(); ctx.arc(80 + Math.cos(a) * 68, 80 + Math.sin(a) * 68, 4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.beginPath();
      for (let i = 0; i <= 8; i += 1) {
        const a = i / 8 * Math.PI * 2;
        const x = 80 + Math.cos(a) * (form === 'virus_giant' ? 46 : 39);
        const y = 80 + Math.sin(a) * (form === 'virus_giant' ? 46 : 39);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#493d70'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(58, 79); ctx.bezierCurveTo(69, 49, 91, 111, 105, 72); ctx.stroke();
    } else if (isBacterium) {
      const color = form === 'cyanobacteria' ? '#5be4ae' : form === 'predatory_bacteria' ? '#ff9a77' : '#cce86f';
      ctx.fillStyle = color; ctx.strokeStyle = '#f5ffe3'; ctx.shadowColor = color; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.roundRect(26, 50, 108, 60, 30); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = color; ctx.beginPath(); ctx.moveTo(27, 77); ctx.bezierCurveTo(4, 23, 10, 139, 0, 116); ctx.stroke();
      ctx.shadowBlur = 0; ctx.fillStyle = '#4b765d';
      for (let i = 0; i < 5; i += 1) { ctx.beginPath(); ctx.arc(50 + i * 14, 74 + (i % 2) * 15, 4, 0, Math.PI * 2); ctx.fill(); }
    } else if (isArchaea || isCell) {
      const color = isArchaea ? '#d2a8ff' : form === 'algae_cell' ? '#77e3a3' : form === 'fungal_cell' ? '#e5c28d' : '#72dfc0';
      ctx.fillStyle = color; ctx.strokeStyle = '#f2fff9'; ctx.shadowColor = color; ctx.shadowBlur = 11;
      organicPath(ctx, isArchaea ? 47 : 51, isArchaea ? 8 : 5, 1.03, .95, form.length * .2); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0; ctx.fillStyle = '#3d6674'; ctx.beginPath(); ctx.arc(82, 80, isCell ? 16 : 11, 0, Math.PI * 2); ctx.fill();
      if (form === 'algae_cell') {
        ctx.fillStyle = '#d9f15d'; for (let i = 0; i < 6; i += 1) { const a = i / 6 * Math.PI * 2; ctx.beginPath(); ctx.arc(82 + Math.cos(a) * 29, 80 + Math.sin(a) * 27, 6, 0, Math.PI * 2); ctx.fill(); }
      }
    } else if (isColony) {
      const color = form === 'algae_colony' ? '#79df82' : '#f0a4c7';
      ctx.fillStyle = color; ctx.strokeStyle = '#fff4fb'; ctx.shadowColor = color; ctx.shadowBlur = 9;
      for (let i = 0; i < 9; i += 1) {
        const a = i / 9 * Math.PI * 2;
        const d = i % 3 ? 30 : 12;
        ctx.beginPath(); ctx.arc(80 + Math.cos(a) * d, 80 + Math.sin(a) * d, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    } else if (isFungus) {
      ctx.strokeStyle = '#f1d7a8'; ctx.fillStyle = '#e9ba75'; ctx.shadowColor = '#e9ba75'; ctx.shadowBlur = 8;
      if (form === 'mushroom') {
        ctx.beginPath(); ctx.roundRect(68, 76, 24, 54, 10); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(80, 74, 45, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      } else {
        for (let i = 0; i < 6; i += 1) {
          ctx.beginPath(); ctx.moveTo(80, 130); ctx.bezierCurveTo(70 + i * 4, 93, 22 + i * 22, 67 - i * 5, 22 + i * 22, 25); ctx.stroke();
        }
      }
    } else if (plantForms.includes(form) || form === 'kelp') {
      const woody = ['conifer', 'tree', 'apple_tree'].includes(form);
      const grassy = ['grass', 'rice', 'moss'].includes(form);
      ctx.strokeStyle = '#75d58a'; ctx.fillStyle = '#71d78c'; ctx.shadowColor = '#5fcf81'; ctx.shadowBlur = 8;
      if (grassy) {
        for (let i = 0; i < 7; i += 1) { ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(42 + i * 12, 132); ctx.quadraticCurveTo(38 + i * 13, 77, 53 + i * 9, 34 + (i % 2) * 15); ctx.stroke(); }
      } else if (woody) {
        ctx.strokeStyle = '#9d7650'; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(80, 134); ctx.lineTo(80, 62); ctx.stroke();
        ctx.fillStyle = '#66cc79';
        for (let i = 0; i < 5; i += 1) { const a = i / 5 * Math.PI * 2; ctx.beginPath(); ctx.arc(80 + Math.cos(a) * 27, 51 + Math.sin(a) * 22, 25, 0, Math.PI * 2); ctx.fill(); }
        if (form === 'apple_tree') { ctx.fillStyle = '#ff6d63'; for (let i = 0; i < 5; i += 1) { ctx.beginPath(); ctx.arc(58 + i * 11, 43 + (i % 2) * 24, 5, 0, Math.PI * 2); ctx.fill(); } }
      } else {
        ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(80, 135); ctx.quadraticCurveTo(72, 88, 80, 35); ctx.stroke();
        for (let i = 0; i < 4; i += 1) { const y = 62 + i * 17; ctx.beginPath(); ctx.ellipse(65 + (i % 2) * 30, y, 22, 10, i % 2 ? -.35 : .35, 0, Math.PI * 2); ctx.fill(); }
        if (form === 'flower') { ctx.fillStyle = '#ff91bd'; for (let i = 0; i < 6; i += 1) { const a = i / 6 * Math.PI * 2; ctx.beginPath(); ctx.arc(80 + Math.cos(a) * 18, 32 + Math.sin(a) * 18, 12, 0, Math.PI * 2); ctx.fill(); } }
      }
    } else if (fishForms.includes(form) || form === 'chordate') {
      ctx.fillStyle = form === 'lobe_fish' ? '#7fc990' : '#72c8ef'; ctx.strokeStyle = '#eefcff'; ctx.shadowColor = '#69c7ec'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.ellipse(78, 80, 48, 29, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(31, 80); ctx.lineTo(8, 55); ctx.lineTo(8, 106); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#173b4b'; ctx.beginPath(); ctx.arc(107, 72, 5, 0, Math.PI * 2); ctx.fill();
    } else if (birdForms.includes(form)) {
      ctx.fillStyle = form === 'raven' ? '#343846' : '#79c8ed'; ctx.strokeStyle = '#f1f7ff'; ctx.shadowColor = '#6dbde5'; ctx.shadowBlur = 7;
      ctx.beginPath(); ctx.ellipse(78, 85, 42, 30, -.12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(110, 58, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffc766'; ctx.beginPath(); ctx.moveTo(127, 58); ctx.lineTo(151, 67); ctx.lineTo(127, 72); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#dff4ff'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(74, 82); ctx.lineTo(36, 45); ctx.moveTo(78, 85); ctx.lineTo(44, 122); ctx.stroke();
    } else if (mammalForms.includes(form)) {
      const feline = ['carnivore', 'big_cat', 'lion'].includes(form);
      const human = ['primate', 'human'].includes(form);
      ctx.fillStyle = feline ? '#e4ad63' : human ? '#d5a17c' : form === 'rodent' ? '#b6a49b' : '#be9471';
      ctx.strokeStyle = '#fff3e7'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 7;
      if (human) {
        ctx.beginPath(); ctx.arc(80, 42, 19, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(80, 66); ctx.lineTo(80, 112); ctx.stroke();
        ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(79, 78); ctx.lineTo(50, 96); ctx.moveTo(81, 78); ctx.lineTo(111, 94); ctx.moveTo(76, 112); ctx.lineTo(60, 143); ctx.moveTo(84, 112); ctx.lineTo(101, 143); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.ellipse(75, 91, 49, 29, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(119, 69, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.lineWidth = 9; [48,73,98,118].forEach(x => { ctx.beginPath(); ctx.moveTo(x, 108); ctx.lineTo(x - 4, 139); ctx.stroke(); });
        ctx.beginPath(); ctx.moveTo(29, 88); ctx.quadraticCurveTo(4, 65, 11, 40); ctx.stroke();
        if (feline) { ctx.beginPath(); ctx.moveTo(108, 49); ctx.lineTo(111, 31); ctx.lineTo(123, 48); ctx.moveTo(125, 49); ctx.lineTo(137, 33); ctx.lineTo(139, 56); ctx.stroke(); }
      }
    } else if (reptileForms.includes(form)) {
      ctx.fillStyle = form === 'amphibian' ? '#74d692' : '#8fc66e'; ctx.strokeStyle = '#efffe6'; ctx.shadowColor = '#72c97b'; ctx.shadowBlur = 7;
      ctx.beginPath(); ctx.ellipse(76, 84, 45, 26, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(118, 70, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(52, 96); ctx.lineTo(25, 125); ctx.moveTo(77, 101); ctx.lineTo(68, 138); ctx.moveTo(99, 92); ctx.lineTo(126, 122); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(34, 86); ctx.quadraticCurveTo(9, 80, 2, 55); ctx.stroke();
    } else if (form === 'arthropod') {
      ctx.fillStyle = '#d49a5f'; ctx.strokeStyle = '#fff1d8'; ctx.shadowColor = '#d49a5f'; ctx.shadowBlur = 7;
      [48,78,108].forEach((x, i) => { ctx.beginPath(); ctx.ellipse(x, 80, 22 - i * 2, 25, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
      ctx.lineWidth = 6; for (let i = 0; i < 3; i += 1) { const x = 58 + i * 20; ctx.beginPath(); ctx.moveTo(x, 67); ctx.lineTo(x - 21, 38); ctx.moveTo(x, 94); ctx.lineTo(x - 22, 124); ctx.stroke(); }
    } else if (form === 'mollusk') {
      ctx.fillStyle = '#dfb479'; ctx.strokeStyle = '#fff0d7';
      ctx.beginPath(); ctx.ellipse(84, 105, 60, 21, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c9866c'; ctx.beginPath(); ctx.arc(72, 75, 38, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#754a45'; ctx.beginPath(); ctx.arc(72, 75, 22, 0, Math.PI * 1.7); ctx.stroke();
    } else if (form === 'cnidarian' || form === 'sponge' || form === 'star_animal') {
      ctx.fillStyle = '#f28fb1'; ctx.strokeStyle = '#fff0f7';
      if (form === 'star_animal') {
        ctx.beginPath(); for (let i = 0; i < 10; i += 1) { const a = -Math.PI / 2 + i / 10 * Math.PI * 2; const r = i % 2 ? 22 : 62; const x = 80 + Math.cos(a) * r; const y = 80 + Math.sin(a) * r; if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.closePath(); ctx.fill(); ctx.stroke();
      } else if (form === 'cnidarian') {
        ctx.beginPath(); ctx.arc(80, 70, 43, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        for (let i = 0; i < 6; i += 1) { ctx.beginPath(); ctx.moveTo(48 + i * 13, 72); ctx.bezierCurveTo(38 + i * 15, 101, 56 + i * 8, 119, 40 + i * 15, 145); ctx.stroke(); }
      } else {
        ctx.beginPath(); ctx.moveTo(40, 130); ctx.quadraticCurveTo(25, 68, 54, 32); ctx.quadraticCurveTo(92, 9, 119, 49); ctx.lineTo(126, 132); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#9e5073'; for (let i = 0; i < 9; i += 1) { ctx.beginPath(); ctx.arc(51 + (i % 3) * 26, 55 + Math.floor(i / 3) * 27, 5, 0, Math.PI * 2); ctx.fill(); }
      }
    } else {
      ctx.strokeStyle = '#f4b3c9'; ctx.lineWidth = 20; ctx.shadowColor = '#f4b3c9'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(19, 104); ctx.bezierCurveTo(48, 21, 99, 137, 143, 54); ctx.stroke();
      ctx.fillStyle = '#694d69'; ctx.beginPath(); ctx.arc(137, 54, 5, 0, Math.PI * 2); ctx.fill();
    }
  }

  function createLineageTextures(targetScene) {
    [...new Set(LINEAGE_NODES.map(node => node.form))].forEach(form => {
      const key = `lineage-${form}`;
      if (targetScene.textures.exists(key)) return;
      const texture = targetScene.textures.createCanvas(key, 160, 160);
      drawLineageTexture(texture.context, form);
      texture.refresh();
    });
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

    createPlayerForms(targetScene);
    createResourceTextures(targetScene);
    createLineageTextures(targetScene);

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

  function updatePlayerAppearance(animate = false) {
    if (!player?.active) return;
    const radius = playerRadius();
    const form = currentForm();
    const textureSize = 160;
    const textureKey = `lineage-${form.form}`;
    const targetScale = radius * 2 / textureSize;
    player.setTexture(textureKey);
    player.clearTint();
    if (animate) {
      scene.tweens.killTweensOf(player);
      player.setScale(targetScale * .52).setAlpha(.45);
      scene.tweens.add({ targets: player, scaleX: targetScale, scaleY: targetScale, alpha: 1, duration: 460, ease: 'Back.easeOut' });
    } else {
      player.setScale(targetScale).setAlpha(1);
    }
    if (player.body) {
      const bodyRadius = 58;
      const bodyOffset = (textureSize - bodyRadius * 2) / 2;
      player.body.setCircle(bodyRadius, bodyOffset, bodyOffset);
      player.body.setOffset(bodyOffset, bodyOffset);
    }
  }

  function playMorphEffect(route) {
    if (!scene || !player) return;
    const color = ROUTES[route].tint;
    const ring = scene.add.circle(player.x, player.y, playerRadius() * .65).setStrokeStyle(5, color, .9).setDepth(8);
    scene.tweens.add({ targets: ring, scale: 3.1, alpha: 0, duration: 620, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    for (let i = 0; i < 12; i += 1) {
      const angle = i / 12 * Math.PI * 2;
      const particle = scene.add.circle(player.x, player.y, 3 + i % 3, color, .9).setDepth(8);
      scene.tweens.add({
        targets: particle,
        x: player.x + Math.cos(angle) * (55 + i * 2),
        y: player.y + Math.sin(angle) * (55 + i * 2),
        alpha: 0,
        duration: 520 + i * 12,
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      });
    }
  }

  function spawnOrganism(targetScene, chunk, rng, cx, cy, biome) {
    const depth = currentLineageNode().depth;
    const resourceChance = depth <= 2 ? .78 : depth <= 7 ? .5 : .36;
    const useResource = rng.frac() < resourceChance;
    let profile;
    let profileIndex = -1;
    let textureKey;
    if (useResource) {
      const preferred = RESOURCE_PROFILES.filter(item => (DIET_PROFILES[currentLineageNode().diet]?.[item.food] || 0) >= .8);
      const pool = preferred.length && rng.frac() < .72 ? preferred : RESOURCE_PROFILES;
      const picked = pool[rng.between(0, pool.length - 1)];
      const resourceIndex = RESOURCE_PROFILES.indexOf(picked);
      profile = { ...picked, isResource: true };
      textureKey = `resource-${resourceIndex}`;
    } else {
      const baseLevel = Math.min(ORGANISMS.length - 2, Math.floor(state.evolutionLevel * .34));
      const roll = rng.frac();
      let offset = roll < .42 ? -1 : roll < .72 ? 0 : roll < .91 ? 1 : 2;
      if (biome.weakBias > 0 && rng.frac() < .34) offset -= 1;
      if (biome.weakBias < 0 && rng.frac() < .3) offset += 1;
      profileIndex = Phaser.Math.Clamp(baseLevel + offset, 0, ORGANISMS.length - 1);
      if (state.evolutionLevel === 0 && cx === START_CHUNK && cy === START_CHUNK) profileIndex = Math.min(1, profileIndex);
      profile = ORGANISMS[profileIndex];
      textureKey = `organism-${profileIndex}`;
    }
    let x = cx * CHUNK_SIZE + rng.between(48, CHUNK_SIZE - 48);
    let y = cy * CHUNK_SIZE + rng.between(48, CHUNK_SIZE - 48);
    if (player && !profile.isResource && profile.power >= stats().power && Phaser.Math.Distance.Between(x, y, player.x, player.y) < 190) {
      x += x < player.x ? -190 : 190;
      y += y < player.y ? -130 : 130;
    }
    const variance = .9 + rng.frac() * .22;
    const sprite = targetScene.physics.add.sprite(x, y, textureKey);
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
      entity.setAlpha(1);
      if (canConsume(entity)) entity.setTint(0x8ff0bd);
      else if (entity.profile.isResource) entity.setTint(0x8caaa2).setAlpha(.6);
      else if (entity.power < playerPower * 1.01) entity.setTint(0xb8c8c2).setAlpha(.72);
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
    const foodValue = dietWeight(entity.profile);
    const mutation = Math.max(1, Math.round(entity.profile.mutation * s.mutationGain * foodValue));
    const biomass = Math.max(1, Math.round(entity.profile.biomass * s.biomassGain * foodValue));
    state.eaten += 1;
    state.mutation += mutation;
    state.biomass += biomass;
    state.health = Math.min(s.maxHealth, state.health + s.healOnEat);
    floatingText(entity.x, entity.y, `+${mutation} 能量`, foodValue >= 1.4 ? '#fff08c' : '#9ff3cf');
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
    if (canConsume(entity)) consume(entity);
    else if (!entity.profile.isResource && entity.power >= stats().power * 1.01) takeDamage(entity);
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
      const edible = canConsume(entity);
      const danger = !entity.profile.isResource && entity.power >= playerPower * 1.01;
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
    const children = LINEAGE_NODES.filter(node => node.parents.includes(state.currentLineage));
    if (children.length) return children;
    const current = currentLineageNode();
    return [...REFINEMENTS]
      .map(node => ({ node, score: routeAffinity(node.route) * 2 + Math.random() * 4 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ node }) => ({
        ...node,
        isRefinement: true,
        clade: node.route,
        form: current.form,
        diet: current.diet,
        rank: '谱系内适应'
      }));
  }

  function nextRouteNode(node) {
    if (node.isRefinement) return '继续在当前谱系内适应';
    const children = LINEAGE_NODES.filter(item => item.parents.includes(node.id));
    return children.length ? children.slice(0, 3).map(item => item.name).join(' / ') : '该代表谱系可继续进行生态适应';
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
      const clade = node.clade || node.route;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'evolution-card';
      button.style.setProperty('--route-color', routeColor(clade));
      button.innerHTML = `
        <small>${node.rank} · ${ROUTES[clade].name}</small>
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
    const clade = node.clade || node.route;
    if (node.isRefinement) {
      state.refinementCount += 1;
      chosen.id = `${node.id}-${state.refinementCount}`;
      chosen.name = `${node.name} ${state.refinementCount}`;
    } else {
      state.currentLineage = node.id;
    }
    state.chosen.push(chosen);
    state.routeCounts[clade] += 1;
    Object.entries(node.effects).forEach(([key, value]) => {
      state.stats[key] = (state.stats[key] || 0) + value;
    });
    state.evolutionLevel += 1;
    state.mutation = Math.max(0, state.mutation - state.mutationGoal);
    state.mutationGoal = Math.min(85, 26 + state.evolutionLevel * 6);
    const s = stats();
    state.health = Math.min(s.maxHealth, state.health + Math.max(16, s.maxHealth * .22));
    updatePlayerAppearance(true);
    playMorphEffect(clade);
    updateRelations();
    updateHud();
    renderTree();
    dom.evolutionOverlay.classList.add('hidden');
    state.evolutionPending = false;
    state.paused = false;
    scene.physics.resume();
    const autotrophy = autotrophyRate();
    showToast(autotrophy.rate > 0 ? `进化为：${currentForm().name} · ${autotrophy.label}自养启动` : `进化为：${currentForm().name}`, 2100);
  }

  function renderTree() {
    dom.chosenPath.replaceChildren();
    const origin = document.createElement('span');
    origin.className = 'path-node';
    origin.style.setProperty('--route-color', '#dff8f0');
    origin.innerHTML = `<i></i>${LINEAGE_MAP.molecular_pool.name}`;
    dom.chosenPath.append(origin);
    state.chosen.forEach(node => {
      if (node.isRefinement) return;
      const clade = node.clade || node.route;
      const item = document.createElement('span');
      item.className = 'path-node';
      item.style.setProperty('--route-color', routeColor(clade));
      item.innerHTML = `<i></i>${node.name}`;
      dom.chosenPath.append(item);
    });

    dom.treeStages.replaceChildren();
    const map = document.createElement('div');
    map.className = 'lineage-map';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('lineage-links');
    map.append(svg);
    const chosenIds = new Set(['molecular_pool', ...state.chosen.filter(node => !node.isRefinement).map(node => node.id)]);
    const availableIds = new Set(candidateChoices().filter(node => !node.isRefinement).map(node => node.id));
    const depths = [...new Set(LINEAGE_NODES.map(node => node.depth))].sort((a, b) => a - b);
    depths.forEach(depth => {
      const column = document.createElement('section');
      column.className = 'lineage-column';
      column.innerHTML = `<h3>${depth === 0 ? '起点' : `第 ${depth} 步`}</h3>`;
      LINEAGE_NODES.filter(node => node.depth === depth).forEach(node => {
        const card = document.createElement('div');
        const isCurrent = node.id === state.currentLineage;
        const isChosen = chosenIds.has(node.id);
        const isAvailable = availableIds.has(node.id);
        card.className = `lineage-node${isCurrent ? ' current' : ''}${isChosen ? ' chosen' : ''}${isAvailable ? ' available' : ''}`;
        card.dataset.lineageId = node.id;
        card.style.setProperty('--route-color', routeColor(node.clade));
        card.innerHTML = `<small>${node.rank}</small><strong>${node.name}</strong><span>${node.summary}</span>`;
        column.append(card);
      });
      map.append(column);
    });
    dom.treeStages.append(map);
    window.requestAnimationFrame(() => drawLineageLinks(map, svg, chosenIds));
  }

  function drawLineageLinks(map, svg, chosenIds) {
    const mapRect = map.getBoundingClientRect();
    if (!mapRect.width || !mapRect.height) return;
    svg.setAttribute('width', map.scrollWidth);
    svg.setAttribute('height', map.scrollHeight);
    svg.setAttribute('viewBox', `0 0 ${map.scrollWidth} ${map.scrollHeight}`);
    svg.replaceChildren();
    LINEAGE_NODES.forEach(node => {
      const child = map.querySelector(`[data-lineage-id="${node.id}"]`);
      if (!child) return;
      const childRect = child.getBoundingClientRect();
      node.parents.forEach(parentId => {
        const parent = map.querySelector(`[data-lineage-id="${parentId}"]`);
        if (!parent) return;
        const parentRect = parent.getBoundingClientRect();
        const x1 = parentRect.right - mapRect.left + map.scrollLeft;
        const y1 = parentRect.top - mapRect.top + map.scrollTop + parentRect.height / 2;
        const x2 = childRect.left - mapRect.left + map.scrollLeft;
        const y2 = childRect.top - mapRect.top + map.scrollTop + childRect.height / 2;
        const bend = Math.max(30, (x2 - x1) * .48);
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`);
        path.setAttribute('class', chosenIds.has(node.id) && chosenIds.has(parentId) ? 'selected' : 'locked');
        svg.append(path);
      });
    });
  }

  function openTree() {
    if (!state.started || state.over || state.evolutionPending || state.treeOpen) return;
    state.treeOpen = true;
    state.paused = true;
    scene.physics.pause();
    dom.treePanel.classList.remove('hidden');
    renderTree();
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
    dom.gameOverSummary.textContent = `收集 ${state.eaten} 个资源，积累 ${Math.floor(state.biomass)} 能量，完成 ${state.evolutionLevel} 次进化。`;
    dom.finalPath.innerHTML = state.chosen.length
      ? state.chosen.map(node => `<span>${node.name}</span>`).join('')
      : '<span>尚未完成进化</span>';
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
      this.load.image('microcosm', './assets/micro-world.svg');
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
      const passive = autotrophyRate();
      if (passive.rate > 0) {
        state.mutation += passive.rate * delta / 1000;
        state.biomass += passive.rate * .42 * delta / 1000;
        if (state.mutation >= state.mutationGoal && !state.evolutionPending) {
          updateHud();
          openEvolutionChoice();
        }
      }
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
    showToast('拖动屏幕，收集发光的适配资源');
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

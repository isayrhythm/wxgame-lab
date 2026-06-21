(() => {
  const canvas = document.getElementById("gameCanvas");
  const overlay = document.getElementById("overlay");
  const panel = overlay.querySelector(".panel");
  const primaryButton = document.getElementById("primaryButton");
  const pauseButton = document.getElementById("pauseButton");
  const appleLabel = document.getElementById("appleCount");
  const lengthLabel = document.getElementById("lengthCount");
  const buffStatus = document.getElementById("buffStatus");

  const mapScale = 1.32;
  const map = (value) => Math.round(value * mapScale * 100) / 100;
  const pt = (x, z) => [map(x), map(z)];

  const field = { half: map(49), visualHalf: map(50) };
  const lanePaths = [
    {
      name: "top",
      width: 6.2,
      points: [
        pt(-38, 37),
        pt(-46, 30),
        pt(-46, -44),
        pt(30, -44),
        pt(37, -37),
      ],
    },
    {
      name: "middle",
      width: 6.8,
      points: [
        pt(-37, 37),
        pt(0, 0),
        pt(37, -37),
      ],
    },
    {
      name: "bottom",
      width: 6.2,
      points: [
        pt(-37, 38),
        pt(-30, 46),
        pt(44, 46),
        pt(46, -30),
        pt(38, -37),
      ],
    },
  ];
  const laneDefs = buildLaneSegments(lanePaths);
  const buffCamps = {
    blue: { x: map(-23), z: map(9), kind: "blueBuff", value: 4 },
    red: { x: map(23), z: map(-9), kind: "redBuff", value: 4 },
  };
  const jungleCamps = [
    { id: "wolfA", x: map(-29), z: map(-17), kind: "wolf", value: 3 },
    { id: "spiritA", x: map(-15), z: map(24), kind: "spirit", value: 4 },
    { id: "spiritB", x: map(14), z: map(-24), kind: "spirit", value: 4 },
    { id: "crabA", x: map(29), z: map(17), kind: "crab", value: 3 },
    { id: "wolfB", x: map(-4), z: map(-30), kind: "wolf", value: 3 },
    { id: "crabB", x: map(5), z: map(29), kind: "crab", value: 3 },
  ];
  const dragonCamps = [
    { id: "bigDragon", x: map(-18), z: map(17), kind: "bigDragon", value: 12 },
    { id: "smallDragon", x: map(18), z: map(-17), kind: "smallDragon", value: 8 },
  ];
  const state = {
    status: "ready",
    paused: true,
    apples: 0,
    targetLength: 4,
    scorePulse: 0,
    lastTime: 0,
    appleDropTimer: 0,
    redApplesSinceBigFruit: 0,
    blueBuffUntil: 0,
    redBuffUntil: 0,
    blueBuffRespawnAt: 0,
    redBuffRespawnAt: 0,
    baseSpeed: 0,
    speedMultiplier: 1,
    currentSpeed: 0,
    input: { x: 0, z: -1 },
  };

  let renderer;
  let scene;
  let camera;
  let snakeRoot;
  let head;
  let eyes = [];
  let segments = [];
  let trail = [];
  let fruits = [];
  let raycaster;
  let pointerPlane;
  let pointer = new THREE.Vector2();
  let targetMarker;

  const keys = new Set();
  const materials = {};

  function buildLaneSegments(paths) {
    const segments = [];
    for (const path of paths) {
      for (let i = 0; i < path.points.length - 1; i += 1) {
        const [x1, z1] = path.points[i];
        const [x2, z2] = path.points[i + 1];
        const dx = x2 - x1;
        const dz = z2 - z1;
        const length = Math.hypot(dx, dz);
        segments.push({
          name: path.name,
          x: (x1 + x2) / 2,
          z: (z1 + z2) / 2,
          width: path.width,
          length,
          rotation: Math.atan2(dx, dz),
        });
      }
    }
    return segments;
  }

  function init() {
    makeRenderer();
    makeScene();
    makeWorld();
    makeSnake();
    bindInput();
    resize();
    window.addEventListener("resize", resize);
    requestAnimationFrame(loop);
    setPaused(true);
    updateHud();
  }

  function makeRenderer() {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0xa6d9fb, 1);
  }

  function makeScene() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xa6d9fb, 118, 260);

    camera = new THREE.PerspectiveCamera(48, 1, 0.1, 420);
    camera.position.set(0, 60, 82);
    camera.lookAt(0, 0, 0);

    raycaster = new THREE.Raycaster();
    pointerPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    materials.grass = new THREE.MeshLambertMaterial({ color: 0x66a85a });
    materials.grassLight = new THREE.MeshLambertMaterial({ color: 0x83b765 });
    materials.grassDark = new THREE.MeshLambertMaterial({ color: 0x356f45 });
    materials.brush = new THREE.MeshLambertMaterial({ color: 0x2f6b3f });
    materials.path = new THREE.MeshLambertMaterial({ color: 0xb9975e });
    materials.pathLight = new THREE.MeshLambertMaterial({ color: 0xd0b47a });
    materials.pathEdge = new THREE.MeshLambertMaterial({ color: 0x6f6848 });
    materials.water = new THREE.MeshLambertMaterial({ color: 0x1f7f9a, transparent: true, opacity: 0.94 });
    materials.waterDeep = new THREE.MeshLambertMaterial({ color: 0x125f83, transparent: true, opacity: 0.96 });
    materials.waterBank = new THREE.MeshLambertMaterial({ color: 0x245f55 });
    materials.snake = new THREE.MeshStandardMaterial({ color: 0x56b956, roughness: 0.76 });
    materials.snakeDark = new THREE.MeshStandardMaterial({ color: 0x2e7f42, roughness: 0.82 });
    materials.apple = new THREE.MeshStandardMaterial({ color: 0xe4443f, roughness: 0.48 });
    materials.big = new THREE.MeshStandardMaterial({ color: 0xffc43d, metalness: 0.18, roughness: 0.28 });
    materials.wood = new THREE.MeshLambertMaterial({ color: 0x8a5a32 });
    materials.stone = new THREE.MeshLambertMaterial({ color: 0xd8d1b8 });
    materials.stoneDark = new THREE.MeshLambertMaterial({ color: 0x8f907f });
    materials.baseFloor = new THREE.MeshLambertMaterial({ color: 0xb9b79e });
    materials.cliff = new THREE.MeshLambertMaterial({ color: 0x53605a });
    materials.cliffDark = new THREE.MeshLambertMaterial({ color: 0x303d42 });
    materials.markerBlue = new THREE.MeshBasicMaterial({ color: 0x7ed7ff, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    materials.markerRed = new THREE.MeshBasicMaterial({ color: 0xff8b68, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    materials.roof = new THREE.MeshLambertMaterial({ color: 0x2f8b65 });
    materials.white = new THREE.MeshLambertMaterial({ color: 0xf7f4e6 });
    materials.blueBase = new THREE.MeshStandardMaterial({ color: 0x55a7ff, emissive: 0x13345e, roughness: 0.42 });
    materials.redBase = new THREE.MeshStandardMaterial({ color: 0xff6464, emissive: 0x4a1515, roughness: 0.42 });
    materials.monsterBlue = new THREE.MeshStandardMaterial({ color: 0x4ba7ff, roughness: 0.58 });
    materials.monsterRed = new THREE.MeshStandardMaterial({ color: 0xd9553d, roughness: 0.62 });
    materials.monsterPurple = new THREE.MeshStandardMaterial({ color: 0x9565d6, roughness: 0.56 });
    materials.monsterCrab = new THREE.MeshStandardMaterial({ color: 0xff9a45, roughness: 0.6 });
    materials.monsterWolf = new THREE.MeshStandardMaterial({ color: 0x6f7d82, roughness: 0.65 });
    materials.buffBlueAura = new THREE.MeshBasicMaterial({ color: 0x7ed7ff, transparent: true, opacity: 0.38, side: THREE.DoubleSide });
    materials.buffRedAura = new THREE.MeshBasicMaterial({ color: 0xff8b68, transparent: true, opacity: 0.38, side: THREE.DoubleSide });
  }

  function makeWorld() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x5e8b59, 1.75);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff2c6, 2.15);
    sun.position.set(-34, 42, 28);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -96;
    sun.shadow.camera.right = 96;
    sun.shadow.camera.top = 96;
    sun.shadow.camera.bottom = -96;
    scene.add(sun);

    const under = new THREE.Mesh(new THREE.PlaneGeometry(field.visualHalf * 2.45, field.visualHalf * 2.45, 1, 1), materials.cliffDark);
    under.rotation.x = -Math.PI / 2;
    under.position.y = -1.15;
    scene.add(under);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(field.visualHalf * 2, field.visualHalf * 2, 28, 28), materials.grass);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grassPlate = new THREE.Mesh(new THREE.PlaneGeometry(field.visualHalf * 1.42, field.visualHalf * 1.42, 1, 1), materials.grassLight);
    grassPlate.rotation.x = -Math.PI / 2;
    grassPlate.position.y = 0.012;
    grassPlate.receiveShadow = true;
    scene.add(grassPlate);

    addPerimeter();
    addRiver();
    addLanes();
    addBases();
    addDragonPits();
    addJungleCamps();
    addTrees();

    targetMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 0.92, 28),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.42, side: THREE.DoubleSide })
    );
    targetMarker.rotation.x = -Math.PI / 2;
    targetMarker.visible = false;
    scene.add(targetMarker);
  }

  function addPerimeter() {
    const wallLength = field.visualHalf * 2;
    const cliffWalls = [
      [0, -field.visualHalf - 1.1, 0, wallLength + 2.8],
      [0, field.visualHalf + 1.1, 0, wallLength + 2.8],
      [-field.visualHalf - 1.1, 0, Math.PI / 2, wallLength + 2.8],
      [field.visualHalf + 1.1, 0, Math.PI / 2, wallLength + 2.8],
    ];
    for (const [x, z, rotation, length] of cliffWalls) {
      const cliff = new THREE.Mesh(new THREE.BoxGeometry(length, 3.6, 2.4), materials.cliff);
      cliff.position.set(x, -0.95, z);
      cliff.rotation.y = rotation;
      cliff.castShadow = true;
      cliff.receiveShadow = true;
      scene.add(cliff);
    }

    const walls = [
      [0, -field.visualHalf, 0, wallLength],
      [0, field.visualHalf, 0, wallLength],
      [-field.visualHalf, 0, Math.PI / 2, wallLength],
      [field.visualHalf, 0, Math.PI / 2, wallLength],
    ];
    for (const [x, z, rotation, length] of walls) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(length, 1.2, 1.6), materials.stoneDark);
      wall.position.set(x, 0.75, z);
      wall.rotation.y = rotation;
      wall.castShadow = true;
      wall.receiveShadow = true;
      scene.add(wall);
    }

    for (const [x, z] of [
      [-field.visualHalf, -field.visualHalf],
      [field.visualHalf, -field.visualHalf],
      [-field.visualHalf, field.visualHalf],
      [field.visualHalf, field.visualHalf],
    ]) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, 3.6, 6), materials.stoneDark);
      tower.position.set(x, 1.8, z);
      tower.castShadow = true;
      tower.receiveShadow = true;
      scene.add(tower);
    }

    for (let i = 0; i < 44; i += 1) {
      const side = Math.floor(i / 11);
      const t = (i % 11) / 10;
      const x = side < 2 ? -field.visualHalf + t * field.visualHalf * 2 : (side === 2 ? -field.visualHalf : field.visualHalf);
      const z = side < 2 ? (side === 0 ? -field.visualHalf - 1.5 : field.visualHalf + 1.5) : -field.visualHalf + t * field.visualHalf * 2;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9 + (i % 3) * 0.18, 0), i % 2 ? materials.cliff : materials.stoneDark);
      rock.position.set(x + THREE.MathUtils.randFloatSpread(1.6), 0.35, z + THREE.MathUtils.randFloatSpread(1.6));
      rock.rotation.set(THREE.MathUtils.randFloatSpread(0.4), THREE.MathUtils.randFloat(0, Math.PI), THREE.MathUtils.randFloatSpread(0.4));
      rock.castShadow = true;
      scene.add(rock);
    }

    for (let i = 0; i < 24; i += 1) {
      const side = Math.floor(i / 6);
      const t = (i % 6 + 0.5) / 6;
      const x = side < 2 ? -field.visualHalf + t * field.visualHalf * 2 : (side === 2 ? -field.visualHalf + 2 : field.visualHalf - 2);
      const z = side < 2 ? (side === 0 ? -field.visualHalf + 2 : field.visualHalf - 2) : -field.visualHalf + t * field.visualHalf * 2;
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), i % 2 ? materials.markerBlue : materials.markerRed);
      lamp.position.set(x, 0.72, z);
      scene.add(lamp);
    }
  }

  function addRiver() {
    const riverSegments = [
      [map(-31), map(-23), -0.72, map(7.8), map(32)],
      [map(-13), map(-8), -0.72, map(7.2), map(28)],
      [map(9), map(10), -0.72, map(7.2), map(32)],
      [map(30), map(25), -0.72, map(7.8), map(30)],
    ];
    for (const [x, z, rotation, width, length] of riverSegments) {
      const bank = new THREE.Mesh(new THREE.PlaneGeometry(width + 0.9, length + 1.2), materials.waterBank);
      bank.rotation.x = -Math.PI / 2;
      bank.rotation.z = rotation;
      bank.position.set(x, 0.028, z);
      bank.receiveShadow = true;
      scene.add(bank);

      const river = new THREE.Mesh(new THREE.PlaneGeometry(width, length), materials.water);
      river.rotation.x = -Math.PI / 2;
      river.rotation.z = rotation;
      river.position.set(x, 0.035, z);
      river.receiveShadow = true;
      scene.add(river);
    }

    for (const point of [
      [map(-24), map(-20), map(6.1)],
      [map(20), map(19), map(6.8)],
      [map(-2), map(1), map(4.0)],
    ]) {
      const bank = new THREE.Mesh(new THREE.CircleGeometry(point[2] + 0.6, 44), materials.waterBank);
      bank.rotation.x = -Math.PI / 2;
      bank.position.set(point[0], 0.03, point[1]);
      scene.add(bank);

      const pool = new THREE.Mesh(new THREE.CircleGeometry(point[2], 36), materials.water);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(point[0], 0.04, point[1]);
      scene.add(pool);

      const deep = new THREE.Mesh(new THREE.CircleGeometry(point[2] * 0.56, 36), materials.waterDeep);
      deep.rotation.x = -Math.PI / 2;
      deep.position.set(point[0], 0.047, point[1]);
      scene.add(deep);
    }

    for (const [x, z, scale] of [
      [map(-18), map(-15), 1.25],
      [map(16), map(17), 1.4],
      [map(-1), map(2), 1.0],
    ]) {
      const ripple = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.07, 8, 32), materials.markerBlue);
      ripple.rotation.x = Math.PI / 2;
      ripple.position.set(x, 0.08, z);
      ripple.scale.setScalar(scale);
      scene.add(ripple);
    }
  }

  function addLanes() {
    laneDefs.forEach((lane) => {
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(lane.width + 1.4, lane.length + 2), materials.pathEdge);
      edge.rotation.x = -Math.PI / 2;
      edge.rotation.z = lane.rotation;
      edge.position.set(lane.x, 0.045, lane.z);
      edge.receiveShadow = true;
      scene.add(edge);

      const road = new THREE.Mesh(new THREE.PlaneGeometry(lane.width, lane.length), materials.path);
      road.rotation.x = -Math.PI / 2;
      road.rotation.z = lane.rotation;
      road.position.set(lane.x, 0.06, lane.z);
      road.receiveShadow = true;
      scene.add(road);

      const stripeCount = Math.max(2, Math.floor(lane.length / 9));
      for (let i = 1; i < stripeCount; i += 1) {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(lane.width * 0.72, 0.045, 0.16), materials.pathLight);
        const localZ = -lane.length / 2 + (lane.length / stripeCount) * i;
        const cos = Math.cos(lane.rotation);
        const sin = Math.sin(lane.rotation);
        slab.position.set(lane.x - localZ * sin, 0.105, lane.z + localZ * cos);
        slab.rotation.y = lane.rotation;
        slab.castShadow = false;
        slab.receiveShadow = true;
        scene.add(slab);
      }
    });

    const junctions = [
      [map(-38), map(37), 8.4],
      [map(37), map(-37), 8.4],
      [0, 0, 10.5],
      [map(-46), map(30), 5.6],
      [map(-46), map(-44), 5.8],
      [map(30), map(-44), 5.6],
      [map(-30), map(46), 5.6],
      [map(44), map(46), 5.8],
      [map(46), map(-30), 5.6],
    ];
    for (const [x, z, radius] of junctions) {
      const pad = new THREE.Mesh(new THREE.CircleGeometry(radius, 34), materials.path);
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(x, 0.07, z);
      pad.receiveShadow = true;
      scene.add(pad);
    }

  }

  function addLaneNode(x, z, material) {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.35, 0.34, 16), materials.stone);
    base.position.y = 0.17;
    base.castShadow = true;
    base.receiveShadow = true;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.06, 8, 28), material);
    ring.position.y = 0.42;
    ring.rotation.x = Math.PI / 2;
    group.add(base, ring);
    group.position.set(x, 0, z);
    scene.add(group);
  }

  function addBases() {
    addBaseCourt(map(-37), map(37), 0.78, materials.blueBase);
    addBaseCourt(map(37), map(-37), -2.36, materials.redBase);
    makeBase(map(-33), map(33), materials.blueBase, 0.78);
    makeBase(map(33), map(-33), materials.redBase, -2.36);

    for (const tower of [
      [map(-24), map(25), materials.blueBase],
      [map(-12), map(12), materials.blueBase],
      [map(24), map(-25), materials.redBase],
      [map(12), map(-12), materials.redBase],
      [map(-31), map(-10), materials.blueBase],
      [map(31), map(10), materials.redBase],
    ]) {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.8, 0.8, 10), materials.stone);
      base.position.set(tower[0], 0.4, tower[1]);
      base.castShadow = true;
      base.receiveShadow = true;
      const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.1, 6), tower[2]);
      crystal.position.y = 1.85;
      crystal.castShadow = true;
      const group = new THREE.Group();
      group.add(base, crystal);
      scene.add(group);
    }
  }

  function addBaseCourt(x, z, rotation, material) {
    const court = new THREE.Mesh(new THREE.PlaneGeometry(15.5, 15.5), materials.baseFloor);
    court.rotation.x = -Math.PI / 2;
    court.rotation.z = rotation;
    court.position.set(x, 0.082, z);
    court.receiveShadow = true;
    scene.add(court);

    for (let i = 0; i < 3; i += 1) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2 + i * 1.35, 0.05, 8, 42), i === 0 ? material : materials.stoneDark);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, 0.12 + i * 0.01, z);
      scene.add(ring);
    }

    for (let i = 0; i < 4; i += 1) {
      const angle = rotation + i * Math.PI / 2 + Math.PI / 4;
      const node = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 0.38, 8), materials.stone);
      node.position.set(x + Math.cos(angle) * 4.8, 0.22, z + Math.sin(angle) * 4.8);
      node.castShadow = true;
      node.receiveShadow = true;
      scene.add(node);
    }
  }

  function makeBase(x, z, material, rotation) {
    const group = new THREE.Group();
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.5, 0.5, 8), materials.stone);
    platform.position.y = 0.26;
    platform.rotation.y = Math.PI / 8;
    platform.receiveShadow = true;
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(1.2, 0), material);
    core.position.y = 1.65;
    core.castShadow = true;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.1, 8, 36), material);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.68;
    group.add(platform, core, ring);
    group.position.set(x, 0, z);
    group.rotation.y = rotation;
    scene.add(group);
  }

  function addDragonPits() {
    for (const pit of dragonCamps) {
      const radius = pit.kind === "bigDragon" ? 6.8 : 5.8;
      const outer = new THREE.Mesh(new THREE.CircleGeometry(radius + 1.25, 44), materials.stoneDark);
      outer.rotation.x = -Math.PI / 2;
      outer.position.set(pit.x, 0.078, pit.z);
      outer.receiveShadow = true;
      scene.add(outer);

      const floor = new THREE.Mesh(new THREE.CircleGeometry(radius, 44), materials.waterBank);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(pit.x, 0.092, pit.z);
      floor.receiveShadow = true;
      scene.add(floor);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.74, 0.12, 8, 44), pit.kind === "bigDragon" ? materials.markerBlue : materials.markerRed);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(pit.x, 0.15, pit.z);
      scene.add(ring);

      for (let i = 0; i < 5; i += 1) {
        const angle = (i / 5) * Math.PI * 2 + 0.35;
        addStoneWall(pit.x + Math.cos(angle) * (radius + 1.2), pit.z + Math.sin(angle) * (radius + 1.2), angle + Math.PI / 2, 3.4);
      }
    }
  }

  function addJungleCamps() {
    for (const camp of [...jungleCamps, buffCamps.blue, buffCamps.red]) {
      const floor = new THREE.Mesh(new THREE.CircleGeometry(camp.kind === "blueBuff" || camp.kind === "redBuff" ? 8.2 : 6.8, 28), materials.grassDark);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(camp.x, 0.066, camp.z);
      floor.receiveShadow = true;
      scene.add(floor);

      if (camp.kind === "blueBuff" || camp.kind === "redBuff") {
        const aura = new THREE.Mesh(
          new THREE.RingGeometry(3.2, 3.72, 32),
          camp.kind === "blueBuff" ? materials.buffBlueAura : materials.buffRedAura
        );
        aura.rotation.x = -Math.PI / 2;
        aura.position.set(camp.x, 0.09, camp.z);
        scene.add(aura);
      }

      addBrushPatch(camp.x - 5.2, camp.z + 3.6, 0.8, 1.55);
      addBrushPatch(camp.x + 4.8, camp.z - 3.9, -0.5, 1.45);
      addBrushPatch(camp.x + 1.2, camp.z + 5.6, 0.05, 1.25);
      addStoneWall(camp.x, camp.z + 6.2, 0.15, 8.2);
      addStoneWall(camp.x - 6.4, camp.z - 0.6, 1.05, 6.8);
    }

    for (const zone of [
      [map(-32), map(5), 13, 8, 0.45],
      [map(-21), map(-19), 12, 9, -0.35],
      [map(-8), map(24), 10, 7, 0.72],
      [map(32), map(-5), 13, 8, 0.45],
      [map(21), map(19), 12, 9, -0.35],
      [map(8), map(-24), 10, 7, 0.72],
    ]) {
      addJungleZone(...zone);
    }

    for (const patch of [
      [map(-30), map(8), -0.4, 1.6],
      [map(-21), map(3), 0.2, 1.35],
      [map(-12), map(-14), -0.8, 1.4],
      [map(30), map(-8), -0.4, 1.6],
      [map(21), map(-3), 0.2, 1.35],
      [map(12), map(14), -0.8, 1.4],
      [map(-2), map(22), 0.4, 1.25],
      [map(2), map(-22), 0.4, 1.25],
    ]) {
      addBrushPatch(...patch);
    }

    for (const [x, z, radius] of [
      [map(-23), map(9), 2.8],
      [map(23), map(-9), 2.8],
      [map(-15), map(24), 2.1],
      [map(14), map(-24), 2.1],
    ]) {
      const marker = new THREE.Mesh(new THREE.RingGeometry(radius, radius + 0.18, 26), materials.pathEdge);
      marker.rotation.x = -Math.PI / 2;
      marker.position.set(x, 0.095, z);
      scene.add(marker);
    }
  }

  function addJungleZone(x, z, width, length, rotation) {
    const zone = new THREE.Mesh(new THREE.PlaneGeometry(width, length), materials.grassDark);
    zone.rotation.x = -Math.PI / 2;
    zone.rotation.z = rotation;
    zone.position.set(x, 0.054, z);
    zone.receiveShadow = true;
    scene.add(zone);

    for (let i = 0; i < 3; i += 1) {
      const offset = (i - 1) * width * 0.28;
      addBrushPatch(
        x + Math.cos(rotation) * offset,
        z + Math.sin(rotation) * offset,
        rotation + (i - 1) * 0.25,
        1.2 + i * 0.12
      );
    }
  }

  function addStoneWall(x, z, rotation, length) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(length, 0.78, 1.05), materials.stoneDark);
    wall.position.set(x, 0.45, z);
    wall.rotation.y = rotation;
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
  }

  function addBrushPatch(x, z, rotation, scale) {
    const patch = new THREE.Group();
    for (let i = 0; i < 7; i += 1) {
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.5 + (i % 3) * 0.26, 5), materials.brush);
      blade.position.set((i - 3) * 0.54, 0.72, Math.sin(i * 1.7) * 0.6);
      blade.rotation.z = THREE.MathUtils.randFloatSpread(0.35);
      blade.castShadow = true;
      patch.add(blade);
    }
    patch.position.set(x, 0, z);
    patch.rotation.y = rotation;
    patch.scale.setScalar(scale);
    scene.add(patch);
  }

  function addTown() {
    for (let i = 0; i < 7; i += 1) {
      const x = -9 + i * 3;
      const z = -25 - Math.abs(i - 3) * 1.4;
      const house = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.7, 1.8), materials.white);
      body.position.y = 0.85;
      body.castShadow = true;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.55, 1.25, 4), materials.roof);
      roof.position.y = 2.25;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      house.add(body, roof);
      house.position.set(x, 0, z);
      house.scale.setScalar(0.8 + (i % 3) * 0.12);
      scene.add(house);
    }
  }

  function addWindmill(x, z, scale) {
    const windmill = new THREE.Group();
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 5.8, 8), materials.white);
    tower.position.y = 2.9;
    tower.castShadow = true;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.25, 1.2, 8), materials.roof);
    cap.position.y = 6.3;
    cap.castShadow = true;
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), materials.wood);
    hub.position.set(0, 5.3, 0.92);
    hub.castShadow = true;
    windmill.add(tower, cap, hub);
    for (let i = 0; i < 4; i += 1) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.35, 0.08), materials.wood);
      blade.position.copy(hub.position);
      blade.rotation.z = i * Math.PI / 2;
      blade.translateY(1.12);
      blade.castShadow = true;
      windmill.add(blade);
    }
    windmill.position.set(x, 0, z);
    windmill.scale.setScalar(scale);
    scene.add(windmill);
  }

  function addTrees() {
    for (let i = 0; i < 150; i += 1) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.1, 6), materials.wood);
      trunk.position.y = 0.55;
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.75, 8), materials.grassDark);
      crown.position.y = 1.65;
      tree.add(trunk, crown);
      const angle = (i / 150) * Math.PI * 2;
      const radius = field.visualHalf * 0.68 + (i % 10) * 1.65;
      tree.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      if (Math.abs(tree.position.x) < 14 && Math.abs(tree.position.z) < 36) tree.position.x += Math.sign(tree.position.x || 1) * 16;
      tree.scale.setScalar(0.62 + (i % 4) * 0.11);
      scene.add(tree);
    }

  }

  function makeSnake() {
    snakeRoot = new THREE.Group();
    scene.add(snakeRoot);

    head = makeSnakePart(0.72, true);
    head.position.set(0, 0.62, 5);
    snakeRoot.add(head);
    eyes = [makeEye(-0.26), makeEye(0.26)];
    const tongue = makeTongue();
    head.add(...eyes, tongue);

    segments = [];
    trail = [];
    syncSegments();
    spawnInitialFruit();
  }

  function makeSnakePart(radius, isHead) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(radius, 28, 18), isHead ? materials.snakeDark : materials.snake);
    body.scale.set(isHead ? 0.86 : 0.7, isHead ? 0.58 : 0.44, isHead ? 1.42 : 1.62);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const stripe = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.38, 16, 10), materials.snakeDark);
    stripe.scale.set(isHead ? 0.42 : 0.34, 0.12, isHead ? 1.28 : 1.38);
    stripe.position.y = radius * 0.42;
    stripe.castShadow = false;
    group.add(stripe);

    if (!isHead) {
      const sideA = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.12, 8, 6), materials.snakeDark);
      const sideB = sideA.clone();
      sideA.position.set(-radius * 0.38, radius * 0.16, -radius * 0.1);
      sideB.position.set(radius * 0.38, radius * 0.16, -radius * 0.1);
      group.add(sideA, sideB);
    }

    group.userData.body = body;
    group.userData.stripe = stripe;
    group.userData.baseRadius = radius;
    return group;
  }

  function makeEye(x) {
    const eye = new THREE.Group();
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 8), new THREE.MeshBasicMaterial({ color: 0xf7fff3 }));
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), new THREE.MeshBasicMaterial({ color: 0x101510 }));
    white.position.set(x, 0.3, -0.58);
    pupil.position.set(x, 0.3, -0.655);
    eye.add(white, pupil);
    return eye;
  }

  function makeTongue() {
    const tongue = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xd93658, side: THREE.DoubleSide });
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.02, 0.5), mat);
    stem.position.set(0, -0.04, -0.92);
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.018, 0.26), mat);
    const right = left.clone();
    left.position.set(-0.08, -0.04, -1.14);
    right.position.set(0.08, -0.04, -1.14);
    left.rotation.y = -0.55;
    right.rotation.y = 0.55;
    tongue.add(stem, left, right);
    return tongue;
  }

  function syncSegments() {
    while (segments.length < state.targetLength - 1) {
      const segment = makeSnakePart(0.62, false);
      segment.position.copy(head.position);
      snakeRoot.add(segment);
      segments.push(segment);
    }
    while (segments.length > state.targetLength - 1) {
      const segment = segments.pop();
      snakeRoot.remove(segment);
    }
  }

  function spawnInitialFruit() {
    fruits.forEach((fruit) => scene.remove(fruit.group));
    fruits = [];
    state.redApplesSinceBigFruit = 0;
    for (let i = 0; i < 8; i += 1) spawnFruit(false);
    spawnAllMonsters();
    spawnBuff("blue");
    spawnBuff("red");
    state.appleDropTimer = 0;
    state.blueBuffRespawnAt = 0;
    state.redBuffRespawnAt = 0;
  }

  function spawnFruit(big) {
    const group = new THREE.Group();
    const fruit = new THREE.Mesh(
      big ? new THREE.SphereGeometry(0.68, 24, 18) : new THREE.SphereGeometry(0.42, 20, 14),
      big ? materials.big : materials.apple
    );
    fruit.castShadow = true;
    fruit.position.y = big ? 0.68 : 0.44;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.36, 7), materials.wood);
    stem.position.y = fruit.position.y + (big ? 0.62 : 0.4);
    stem.rotation.z = 0.36;
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(big ? 0.18 : 0.13, 10, 8), materials.grassDark);
    leaf.scale.set(1.45, 0.38, 0.8);
    leaf.position.set(0.18, stem.position.y + 0.1, 0);
    group.add(fruit, stem, leaf);
    group.position.copy(big ? randomJunglePoint() : randomMapPoint());
    group.userData.kind = big ? "big" : "apple";
    group.userData.big = big;
    group.userData.value = big ? 10 : 1;
    group.userData.spin = Math.random() * Math.PI * 2;
    group.userData.falling = true;
    group.userData.groundY = 0;
    group.position.y = big ? 9 : 7;
    scene.add(group);
    fruits.push({ group, big, kind: group.userData.kind });
    if (!big) {
      state.redApplesSinceBigFruit += 1;
      if (state.redApplesSinceBigFruit >= 10) {
        state.redApplesSinceBigFruit -= 10;
        spawnFruit(true);
      }
    }
  }

  function spawnAllMonsters() {
    [...jungleCamps, ...dragonCamps].forEach((camp) => spawnMonster(camp));
  }

  function spawnMonster(camp) {
    if (!camp || fruits.some((fruit) => fruit.kind === "monster" && fruit.group.userData.campId === camp.id)) return;
    const group = makeMonster(camp.kind);
    group.position.set(camp.x, 0, camp.z);
    group.userData.kind = "monster";
    group.userData.monster = camp.kind;
    group.userData.campId = camp.id;
    group.userData.value = camp.value;
    group.userData.big = false;
    group.userData.spin = Math.random() * Math.PI * 2;
    scene.add(group);
    fruits.push({ group, big: false, kind: "monster" });
  }

  function spawnBuff(type) {
    const camp = buffCamps[type];
    if (!camp || fruits.some((fruit) => fruit.kind === camp.kind)) return;
    const group = makeMonster(camp.kind);
    group.position.set(camp.x, 0, camp.z);
    group.userData.kind = camp.kind;
    group.userData.value = camp.value;
    group.userData.big = false;
    group.userData.spin = Math.random() * Math.PI * 2;
    scene.add(group);
    fruits.push({ group, big: false, kind: camp.kind });
  }

  function makeMonster(kind) {
    const group = new THREE.Group();
    const material = {
      blueBuff: materials.monsterBlue,
      redBuff: materials.monsterRed,
      spirit: materials.monsterPurple,
      wolf: materials.monsterWolf,
      crab: materials.monsterCrab,
      bigDragon: materials.monsterBlue,
      smallDragon: materials.monsterRed,
    }[kind] || materials.monsterBlue;

    const isBuff = kind === "blueBuff" || kind === "redBuff";
    const isCrab = kind === "crab";
    const isDragon = kind === "bigDragon" || kind === "smallDragon";
    const body = new THREE.Mesh(new THREE.SphereGeometry(isCrab ? 0.78 : isBuff ? 1.18 : isDragon ? 1.35 : 1.0, 18, 13), material);
    body.scale.set(
      isCrab ? 1.45 : isBuff ? 1.32 : isDragon ? 1.65 : 1.2,
      isCrab ? 0.48 : isBuff ? 0.95 : isDragon ? 0.8 : 0.82,
      isCrab ? 0.84 : isBuff ? 1.15 : isDragon ? 1.85 : 1.05
    );
    body.position.y = isCrab ? 0.55 : isBuff ? 1.08 : isDragon ? 1.05 : 0.9;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111316 });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), eyeMat);
      eye.position.set(side * 0.28, body.position.y + 0.22, -0.62);
      group.add(eye);
    }

    const hornMat = kind === "red" ? materials.stoneDark : materials.stone;
    if (!isCrab) {
      for (const side of [-1, 1]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(isDragon ? 0.24 : isBuff ? 0.2 : 0.14, isDragon ? 0.9 : isBuff ? 0.78 : 0.58, 6), hornMat);
        horn.position.set(side * 0.48, isDragon ? 1.9 : isBuff ? 1.88 : 1.58, -0.08);
        horn.rotation.z = side * 0.45;
        horn.castShadow = true;
        group.add(horn);
      }
    } else {
      for (const side of [-1, 1]) {
        const claw = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.2, 0.28), material);
        claw.position.set(side * 0.95, 0.62, -0.38);
        claw.rotation.y = side * 0.45;
        claw.castShadow = true;
        group.add(claw);
      }
    }

    if (isBuff) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.45, 0.08, 8, 30),
        kind === "blueBuff" ? materials.buffBlueAura : materials.buffRedAura
      );
      ring.position.y = 0.12;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    if (isDragon) {
      for (const side of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.12, 0.7), material);
        wing.position.set(side * 1.05, 1.18, 0.15);
        wing.rotation.z = side * 0.38;
        wing.rotation.y = side * 0.4;
        wing.castShadow = true;
        group.add(wing);
      }
    }

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(isCrab ? 1.15 : isBuff ? 1.65 : isDragon ? 2.4 : 1.35, 20),
      new THREE.MeshBasicMaterial({ color: 0x16321e, transparent: true, opacity: 0.18 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    group.add(shadow);
    return group;
  }

  function randomRoadPoint() {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const lane = laneDefs[THREE.MathUtils.randInt(0, laneDefs.length - 1)];
      const localX = THREE.MathUtils.randFloatSpread(lane.width * 0.62);
      const localZ = THREE.MathUtils.randFloatSpread(lane.length * 0.82);
      const cos = Math.cos(lane.rotation);
      const sin = Math.sin(lane.rotation);
      const x = lane.x + localX * cos - localZ * sin;
      const z = lane.z + localX * sin + localZ * cos;
      if (insideField(x, z) && distanceToHead(x, z) > 5.5) return new THREE.Vector3(x, 0, z);
    }
    return new THREE.Vector3(0, 0, -12);
  }

  function randomJunglePoint(camp) {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const source = camp || jungleCamps[THREE.MathUtils.randInt(0, jungleCamps.length - 1)];
      const x = source.x + THREE.MathUtils.randFloatSpread(4.6);
      const z = source.z + THREE.MathUtils.randFloatSpread(4.6);
      if (insideField(x, z) && distanceToHead(x, z) > 6) return new THREE.Vector3(x, 0, z);
    }
    return new THREE.Vector3(-18, 0, 14);
  }

  function insideField(x, z) {
    return Math.abs(x) < field.half - 1 && Math.abs(z) < field.half - 1;
  }

  function distanceToHead(x, z) {
    return new THREE.Vector2(x - head.position.x, z - head.position.z).length();
  }

  function randomMapPoint() {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const x = THREE.MathUtils.randFloat(-field.half + 3, field.half - 3);
      const z = THREE.MathUtils.randFloat(-field.half + 3, field.half - 3);
      if (distanceToHead(x, z) > 5) return new THREE.Vector3(x, 0, z);
    }
    return new THREE.Vector3(0, 0, 0);
  }

  function bindInput() {
    window.addEventListener("keydown", (event) => {
      keys.add(event.key.toLowerCase());
      if (event.key === "Escape" || event.key.toLowerCase() === "p") togglePause();
    });
    window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
    canvas.addEventListener("pointerdown", setPointerTarget);
    canvas.addEventListener("pointermove", (event) => {
      if (event.buttons) setPointerTarget(event);
    });
  }

  function setPointerTarget(event) {
    if (state.status !== "playing") return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(pointerPlane, hit)) {
      const dx = hit.x - head.position.x;
      const dz = hit.z - head.position.z;
      const len = Math.hypot(dx, dz) || 1;
      state.input.x = dx / len;
      state.input.z = dz / len;
      targetMarker.position.set(hit.x, 0.04, hit.z);
      targetMarker.visible = true;
    }
  }

  function loop(time) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.033, (time - state.lastTime) / 1000 || 0.016);
    state.lastTime = time;
    if (state.status === "playing" && !state.paused) update(dt, time);
    renderer.render(scene, camera);
  }

  function update(dt, time) {
    updateInput();
    updateSnake(dt, time);
    updateFruits(dt, time);
    updateCamera(dt);
    updateHud();
  }

  function updateInput() {
    let x = 0;
    let z = 0;
    if (keys.has("arrowleft") || keys.has("a")) x -= 1;
    if (keys.has("arrowright") || keys.has("d")) x += 1;
    if (keys.has("arrowup") || keys.has("w")) z -= 1;
    if (keys.has("arrowdown") || keys.has("s")) z += 1;
    if (x || z) {
      const len = Math.hypot(x, z);
      state.input.x = x / len;
      state.input.z = z / len;
      targetMarker.visible = false;
    }
  }

  function updateSnake(dt, time) {
    const baseSpeed = 6.4 + Math.min(4, state.targetLength * 0.045);
    const speedMultiplier = isBlueBuffActive(time) ? 2 : 1;
    const speed = baseSpeed * speedMultiplier;
    state.baseSpeed = baseSpeed;
    state.speedMultiplier = speedMultiplier;
    state.currentSpeed = speed;
    trail.unshift(head.position.clone());
    const maxTrail = Math.max(220, state.targetLength * 18);
    if (trail.length > maxTrail) trail.length = maxTrail;

    const angle = Math.atan2(state.input.x, state.input.z);
    head.rotation.y += angleDelta(head.rotation.y, angle) * Math.min(1, dt * 9);
    head.position.x += state.input.x * speed * dt;
    head.position.z += state.input.z * speed * dt;
    head.position.x = THREE.MathUtils.clamp(head.position.x, -field.half, field.half);
    head.position.z = THREE.MathUtils.clamp(head.position.z, -field.half, field.half);
    head.position.y = 0.62 + Math.sin(time * 0.008) * 0.06;

    syncSegments();
    for (let i = 0; i < segments.length; i += 1) {
      const trailIndex = Math.min(trail.length - 1, 7 + i * 5);
      const target = trail[trailIndex] || head.position;
      const nextTarget = trail[Math.min(trail.length - 1, trailIndex + 5)] || target;
      const segment = segments[i];
      segment.position.lerp(target, Math.min(1, dt * 12));
      segment.position.y = 0.52 + Math.sin(time * 0.007 - i * 0.35) * 0.05;
      const dx = target.x - nextTarget.x;
      const dz = target.z - nextTarget.z;
      if (Math.abs(dx) + Math.abs(dz) > 0.001) {
        const bodyAngle = Math.atan2(dx, dz);
        segment.rotation.y += angleDelta(segment.rotation.y, bodyAngle) * Math.min(1, dt * 10);
      }
      const tailTaper = 1 - Math.max(0, i - segments.length * 0.58) / Math.max(1, segments.length * 0.42) * 0.48;
      const wave = 1 + Math.sin(time * 0.006 - i * 0.6) * 0.035;
      segment.scale.setScalar(Math.max(0.5, tailTaper * wave));
    }
  }

  function angleDelta(from, to) {
    let delta = (to - from + Math.PI) % (Math.PI * 2) - Math.PI;
    if (delta < -Math.PI) delta += Math.PI * 2;
    return delta;
  }

  function updateFruits(dt, time) {
    ensureBuffs(time);
    updateAppleDrops(dt, time);

    for (let i = fruits.length - 1; i >= 0; i -= 1) {
      const fruit = fruits[i];
      const isMonster = fruit.kind === "monster" || fruit.kind === "blueBuff" || fruit.kind === "redBuff";
      const isBuff = fruit.kind === "blueBuff" || fruit.kind === "redBuff";
      fruit.group.userData.spin += dt * (fruit.big ? 2.8 : isBuff ? 1.55 : isMonster ? 1.1 : 1.8);
      fruit.group.rotation.y = fruit.group.userData.spin;
      if (fruit.group.userData.falling) {
        fruit.group.position.y = Math.max(fruit.group.userData.groundY, fruit.group.position.y - dt * (fruit.big ? 5.2 : 6.4));
        if (fruit.group.position.y <= fruit.group.userData.groundY + 0.01) {
          fruit.group.userData.falling = false;
          fruit.group.position.y = fruit.group.userData.groundY;
        }
      } else {
        fruit.group.position.y = Math.sin(time * 0.004 + i) * (fruit.big ? 0.12 : isMonster ? 0.05 : 0.07);
      }
      if (isMonster) {
        fruit.group.scale.setScalar((isBuff ? 1.08 : 1) + Math.sin(time * 0.006 + i) * 0.035);
      }
      const distance = new THREE.Vector2(fruit.group.position.x - head.position.x, fruit.group.position.z - head.position.z).length();
      if (distance < (fruit.big ? 1.38 : isBuff ? 1.86 : isMonster ? 1.62 : 0.88)) {
        eatFruit(i);
      }
    }
  }

  function updateAppleDrops(dt, time) {
    state.appleDropTimer += dt * 1000;
    const interval = 780;
    while (state.appleDropTimer >= interval) {
      state.appleDropTimer -= interval;
      const count = isRedBuffActive(time) ? 5 : 1;
      for (let i = 0; i < count; i += 1) spawnFruit(false);
    }
  }

  function ensureBuffs(time) {
    if (time >= state.blueBuffRespawnAt && !fruits.some((fruit) => fruit.kind === "blueBuff")) spawnBuff("blue");
    if (time >= state.redBuffRespawnAt && !fruits.some((fruit) => fruit.kind === "redBuff")) spawnBuff("red");
  }

  function isBlueBuffActive(time) {
    return time < state.blueBuffUntil;
  }

  function isRedBuffActive(time) {
    return time < state.redBuffUntil;
  }

  function eatFruit(index) {
    const fruit = fruits[index];
    const value = fruit.group.userData.value;
    state.apples += value;
    state.targetLength += value;
    state.scorePulse = 1;
    if (fruit.kind === "blueBuff") {
      state.blueBuffUntil = state.lastTime + 10000;
      state.blueBuffRespawnAt = state.lastTime + 30000;
    } else if (fruit.kind === "redBuff") {
      state.redBuffUntil = state.lastTime + 10000;
      state.redBuffRespawnAt = state.lastTime + 30000;
    }
    popFruit(fruit.group.position, fruit.big, fruit.kind);
    scene.remove(fruit.group);
    fruits.splice(index, 1);
  }

  function popFruit(position, big, kind) {
    const count = big ? 20 : kind === "monster" ? 14 : 8;
    const color = big
      ? 0xffe082
      : kind === "blueBuff"
        ? 0x83dbff
        : kind === "redBuff"
          ? 0xff8b68
          : kind === "monster"
            ? 0x8df0ff
            : 0xff6b5f;
    for (let i = 0; i < count; i += 1) {
      const spark = new THREE.Mesh(
        new THREE.SphereGeometry(big ? 0.08 : 0.055, 8, 6),
        new THREE.MeshBasicMaterial({ color })
      );
      spark.position.copy(position);
      spark.userData.velocity = new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(3),
        THREE.MathUtils.randFloat(1.2, 3.4),
        THREE.MathUtils.randFloatSpread(3)
      );
      spark.userData.life = 0.5;
      scene.add(spark);
      const start = performance.now();
      const tick = () => {
        const dt = 0.016;
        spark.userData.life -= dt;
        spark.userData.velocity.y -= 8 * dt;
        spark.position.addScaledVector(spark.userData.velocity, dt);
        spark.material.opacity = Math.max(0, spark.userData.life * 2);
        spark.material.transparent = true;
        if (spark.userData.life > 0) requestAnimationFrame(tick);
        else scene.remove(spark);
      };
      requestAnimationFrame(tick);
    }
  }

  function updateCamera(dt) {
    const desired = new THREE.Vector3(head.position.x * 0.58, 58, head.position.z * 0.58 + 78);
    camera.position.lerp(desired, Math.min(1, dt * 2));
    const lookAt = new THREE.Vector3(head.position.x * 0.68, 0, head.position.z * 0.68 - 5);
    camera.lookAt(lookAt);
  }

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function startGame() {
    state.status = "playing";
    setPaused(false);
    state.apples = 0;
    state.targetLength = 4;
    state.blueBuffUntil = 0;
    state.redBuffUntil = 0;
    state.blueBuffRespawnAt = 0;
    state.redBuffRespawnAt = 0;
    state.redApplesSinceBigFruit = 0;
    state.input.x = 0;
    state.input.z = -1;
    head.position.set(0, 0.62, 5);
    trail = [];
    segments.forEach((segment) => snakeRoot.remove(segment));
    segments = [];
    syncSegments();
    spawnInitialFruit();
    hideOverlay();
    updateHud();
  }

  function updateHud() {
    appleLabel.textContent = String(state.apples);
    lengthLabel.textContent = String(state.targetLength);
    const chips = [];
    if (isBlueBuffActive(state.lastTime)) {
      chips.push(`<span class="buff-chip"><span class="buff-dot blue"></span>${Math.ceil((state.blueBuffUntil - state.lastTime) / 1000)}s</span>`);
    }
    if (isRedBuffActive(state.lastTime)) {
      chips.push(`<span class="buff-chip"><span class="buff-dot red"></span>${Math.ceil((state.redBuffUntil - state.lastTime) / 1000)}s</span>`);
    }
    if (buffStatus) buffStatus.innerHTML = chips.join("");
  }

  function showPanel(html) {
    panel.innerHTML = html;
    overlay.classList.remove("hidden");
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  function setPaused(paused) {
    state.paused = paused;
    if (pauseButton) pauseButton.textContent = paused ? "▶" : "Ⅱ";
  }

  function togglePause() {
    if (state.status !== "playing") return;
    if (state.paused) {
      hideOverlay();
      setPaused(false);
    } else {
      setPaused(true);
      showPanel(`
        <p class="kicker">Paused</p>
        <h1>贪吃蛇吃苹果</h1>
        <p class="hint">调整路线，继续在峡谷里吃苹果、精品大果和野怪。</p>
        <button id="resumeButton" type="button">继续</button>
        <button id="restartButton" class="secondary-button" type="button">重新开始</button>
      `);
      panel.querySelector("#resumeButton").addEventListener("click", togglePause);
      panel.querySelector("#restartButton").addEventListener("click", startGame);
    }
  }

  primaryButton.addEventListener("click", startGame);
  pauseButton.addEventListener("click", togglePause);

  window.__snakeAppleState = state;
  window.__snakeAppleDebug = () => ({
    scene,
    camera,
    renderer,
    head,
    segments,
    fruits,
    field,
    lanePaths,
    laneDefs,
    jungleCamps,
    dragonCamps,
    buffCamps,
    effects: {
      blueActive: isBlueBuffActive(state.lastTime),
      redActive: isRedBuffActive(state.lastTime),
      blueRemainingMs: Math.max(0, state.blueBuffUntil - state.lastTime),
      redRemainingMs: Math.max(0, state.redBuffUntil - state.lastTime),
      blueRespawnMs: Math.max(0, state.blueBuffRespawnAt - state.lastTime),
      redRespawnMs: Math.max(0, state.redBuffRespawnAt - state.lastTime),
    },
  });

  init();
})();

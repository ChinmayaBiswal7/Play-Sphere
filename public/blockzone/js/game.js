const WORLD_SIZE = 400;
const NUM_BOTS = 19; // +1 player = 20 total

let scene, renderer, world, player, camera, minimap, weaponSystem, lootSystem, safeZone;
let entities = [];
let lastTime = 0;
let gameState = 'playing';

function init() {
    // UI overlay
    const hud = document.createElement('div');
    hud.id = 'hud';
    hud.style.position = 'absolute';
    hud.style.top = '20px';
    hud.style.left = '20px';
    hud.style.color = 'white';
    hud.style.fontFamily = 'monospace';
    hud.style.fontSize = '24px';
    hud.style.textShadow = '2px 2px 0 #000';
    document.body.appendChild(hud);

    // Three.js setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    scene.fog = new THREE.Fog(0x87CEEB, 50, WORLD_SIZE * 0.8);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(100, 200, 50);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = WORLD_SIZE / 2;
    dirLight.shadow.camera.bottom = -WORLD_SIZE / 2;
    dirLight.shadow.camera.left = -WORLD_SIZE / 2;
    dirLight.shadow.camera.right = WORLD_SIZE / 2;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    // Systems
    world = new World(scene, WORLD_SIZE);
    player = new Player(scene);
    camera = new Camera(player, renderer.domElement);
    weaponSystem = new WeaponSystem(scene);
    lootSystem = new LootSystem(scene, WORLD_SIZE);
    safeZone = new SafeZone(scene, WORLD_SIZE);
    minimap = new Minimap(WORLD_SIZE, 'minimap');

    entities.push(player);

    // Bots
    for (let i = 0; i < NUM_BOTS; i++) {
        const x = (Math.random() - 0.5) * WORLD_SIZE * 0.9;
        const z = (Math.random() - 0.5) * WORLD_SIZE * 0.9;
        const bot = new BotAI(scene, new THREE.Vector3(x, 50, z), `Bot_${i}`);
        entities.push(bot);
    }

    window.addEventListener('resize', onWindowResize, false);
    
    // Start loop
    requestAnimationFrame(animate);
}

function onWindowResize() {
    camera.camera.aspect = window.innerWidth / window.innerHeight;
    camera.camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(time) {
    requestAnimationFrame(animate);

    const dt = (time - lastTime) / 1000;
    lastTime = time;
    
    if (dt > 0.1) return; // Prevent huge jumps on tab switch

    if (gameState === 'playing') {
        player.update(dt, camera, world, weaponSystem);
        camera.update();
        
        entities.forEach(ent => {
            if (ent instanceof BotAI) {
                ent.update(dt, entities, weaponSystem);
            }
        });

        weaponSystem.update(dt, entities, world);
        lootSystem.update(dt);
        lootSystem.checkPickup(player);
        safeZone.update(dt, entities);
        minimap.update(player, entities.filter(e => e instanceof BotAI), safeZone);
        
        checkWinCondition();
    }

    renderer.render(scene, camera.camera);
}

function checkWinCondition() {
    let alive = 0;
    for (let ent of entities) {
        if (ent.health > 0) alive++;
    }
    
    if (alive === 1 && player.health > 0) {
        document.getElementById('hud').innerHTML = "<h1 style='color:gold; text-align:center;'>VICTORY ROYALE!</h1>";
        gameState = 'ended';
    } else if (player.health <= 0) {
        gameState = 'ended';
    }
}

// Ensure scripts are loaded in index.html before calling init
window.onload = init;

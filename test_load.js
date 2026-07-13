class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  distanceTo(v) { return Math.sqrt((this.x-v.x)**2 + (this.y-v.y)**2 + (this.z-v.z)**2); }
  length() { return Math.sqrt(this.x**2 + this.y**2 + this.z**2); }
  normalize() { const l = this.length(); if (l > 0) { this.x /= l; this.y /= l; this.z /= l; } return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
}

class CannonQuaternion {
  constructor() { this.x = 0; this.y = 0; this.z = 0; this.w = 1; }
  setFromAxisAngle() {}
  setFromEuler() {}
  copy() {}
  set() {}
}

global.window = {
  THREE: {
    Vector3,
    Color: class {
      constructor(hex) { this.hex = hex; this.r = 1; this.g = 1; this.b = 1; }
    },
    RepeatWrapping: 1,
    DoubleSide: 2,
    AdditiveBlending: 3,
    Group: class {
      constructor() {
        this.position = new Vector3();
        this.rotation = new Vector3();
        this.scale = new Vector3(1, 1, 1);
      }
      add(x) { this.children = this.children || []; this.children.push(x); }
    },
    Mesh: class { 
      constructor() {
        this.position = new Vector3(); 
        this.rotation = new Vector3(); 
        this.scale = new Vector3(1, 1, 1); 
      }
      add(x) { this.children = this.children || []; this.children.push(x); }
      lookAt() {}
      translateZ() {}
    },
    CylinderGeometry: class {},
    MeshStandardMaterial: class {},
    CanvasTexture: class {},
    RingGeometry: class {},
    BoxGeometry: class {},
    SphereGeometry: class {},
    BufferGeometry: class { setAttribute() {} },
    BufferAttribute: class { constructor() {} },
    Points: class {
      constructor() {
        this.position = new Vector3(); 
        this.rotation = new Vector3(); 
        this.scale = new Vector3(1, 1, 1); 
      }
    },
    PointsMaterial: class {},
    SpotLight: class {
      constructor() {
        this.position = new Vector3();
        this.target = { position: new Vector3() };
        this.shadow = { mapSize: { width: 0, height: 0 } };
      }
    },
    PlaneGeometry: class {},
    MeshBasicMaterial: class {},
    AmbientLight: class {},
    DirectionalLight: class {
      constructor() {
        this.position = new Vector3();
      }
    },
    PointLight: class {
      constructor() {
        this.position = new Vector3();
      }
    },
    TorusGeometry: class {},
    Clock: class { getDelta() { return 0.1; } getElapsedTime() { return 0; } }
  },
  CANNON: {
    World: class { addBody() {} },
    Plane: class {},
    Body: class {
      constructor() {
        this.position = new Vector3();
        this.quaternion = new CannonQuaternion();
        this.velocity = new Vector3();
        this.angularVelocity = new Vector3();
      }
      addShape() {}
      updateMassProperties() {}
      addEventListener() {}
    },
    Cylinder: class {},
    Sphere: class {},
    Box: class {},
    Vec3: Vector3,
    Quaternion: CannonQuaternion
  },
  WICKET_Z: 1.2,
  BATSMAN_CREASE_Z: 0.0,
  stanceX: 0,
  scene: { add() {} },
  physicsWorld: { addBody() {} },
  MATCH: { userTeam: 'IND', oppTeam: 'AUS' },
  TEAMS: {
    IND: { primary: '#1d4ed8', secondary: '#f97316', pant: '#1d4ed8', helmet: '#172554' },
    AUS: { primary: '#facc15', secondary: '#15803d', pant: '#facc15', helmet: '#15803d' }
  }
};

global.THREE = global.window.THREE;
global.document = {
  createElement() {
    return {
      getContext() {
        return {
          fillRect() {},
          beginPath() {},
          arc() {},
          fill() {},
          clearRect() {},
          fillText() {}
        };
      }
    };
  },
  getElementById() {
    return { appendChild() {}, getElementsByClassName() { return []; } };
  }
};

// Define window in global scope for free-variable access
global.window.window = global.window;
Object.assign(global, global.window);

import('./public/js/models.js').then(({ createStadium, createPitch, createWickets, createPlayers }) => {
  createStadium();
  createPitch();
  createWickets();
  createPlayers();
  console.log('TEST PASSED: models.js executed and loaded all entities successfully!');
}).catch(err => {
  console.error('TEST FAILED: Error executing models.js:', err);
  process.exit(1);
});

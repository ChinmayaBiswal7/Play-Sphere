// FBX Player Model Inspector & Separation Module

export function inspectAndLoadPlayerFBX() {
  const THREE = window.THREE;
  if (!THREE.FBXLoader) {
    console.warn("FBXLoader is not loaded yet.");
    return;
  }

  console.log("Starting CharacterSketchfab.fbx model inspection...");
  const loader = new THREE.FBXLoader();
  
  // Load the FBX model
  loader.load(
    'models/players/indiancricketplayer/source/CharacterSketchfab.fbx',
    (fbx) => {
      console.log("================= CharacterSketchfab.fbx Hierarchy =================");
      console.log(fbx);

      // Traversal to identify meshes and groupings
      const hierarchy = [];
      fbx.traverse((child) => {
        if (child.isMesh) {
          hierarchy.push({
            name: child.name,
            type: child.type,
            parent: child.parent ? child.parent.name : 'root',
            materialName: Array.isArray(child.material) 
              ? child.material.map(m => m.name).join(', ') 
              : (child.material ? child.material.name : 'none')
          });
        }
      });

      console.table(hierarchy);
      console.log("====================================================================");

      // Map meshes to categories for future separation:
      // Typically, an FBX characters with props includes:
      // - Body / Skin mesh
      // - Clothes (Jersey, Pants)
      // - Equipment props (Helmet, Gloves, Pads, Bat)
      
      const bodyMeshes = [];
      const gearMeshes = [];
      const propMeshes = [];

      fbx.traverse((child) => {
        if (child.isMesh) {
          const nameLower = child.name.toLowerCase();
          if (nameLower.includes('body') || nameLower.includes('skin') || nameLower.includes('head') || nameLower.includes('hair') || nameLower.includes('char')) {
            bodyMeshes.push(child);
          } else if (nameLower.includes('helmet') || nameLower.includes('pad') || nameLower.includes('glove')) {
            gearMeshes.push(child);
          } else {
            propMeshes.push(child);
          }
        }
      });

      console.log("Separated Meshes Count:");
      console.log(`- Body/Player Skin Meshes: ${bodyMeshes.length} (${bodyMeshes.map(m => m.name).join(', ')})`);
      console.log(`- Equipment/Gear Meshes: ${gearMeshes.length} (${gearMeshes.map(m => m.name).join(', ')})`);
      console.log(`- Other Prop Meshes: ${propMeshes.length} (${propMeshes.map(m => m.name).join(', ')})`);
    },
    (xhr) => {
      if (xhr.total > 0) {
        console.log(`FBX Loading Progress: ${Math.round((xhr.loaded / xhr.total) * 100)}%`);
      }
    },
    (err) => {
      console.error("Error loading CharacterSketchfab.fbx:", err);
    }
  );
}

// Expose globally
window.inspectAndLoadPlayerFBX = inspectAndLoadPlayerFBX;

// Initialize inspection on script load
if (window.THREE) {
  inspectAndLoadPlayerFBX();
}

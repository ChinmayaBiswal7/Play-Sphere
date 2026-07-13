import * as THREE from "three";

export const createAsphaltTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  
  ctx.fillStyle = "#222227";
  ctx.fillRect(0, 0, 256, 256);
  
  const imgData = ctx.getImageData(0, 0, 256, 256);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 16;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise));
    data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(120, 120);
  return texture;
};

export const createAsphaltBumpTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, 128, 128);
  
  const imgData = ctx.getImageData(0, 0, 128, 128);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 55;
    const val = Math.max(0, Math.min(255, 128 + noise));
    data[i] = val;
    data[i+1] = val;
    data[i+2] = val;
  }
  ctx.putImageData(imgData, 0, 0);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(120, 120);
  return texture;
};

export const createCarbonFiberTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");
  
  ctx.fillStyle = "#121316";
  ctx.fillRect(0, 0, 16, 16);
  
  ctx.fillStyle = "#22242a";
  for (let y = 0; y < 16; y += 4) {
    for (let x = 0; x < 16; x += 4) {
      if ((x + y) % 8 === 0) {
        ctx.fillRect(x, y, 2, 2);
        ctx.fillRect(x + 2, y + 2, 2, 2);
      }
    }
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(200, 200);
  return texture;
};

export const createCarbonFiberBumpTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");
  
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, 16, 16);
  
  ctx.fillStyle = "#555555";
  ctx.fillRect(0, 0, 8, 8);
  ctx.fillRect(8, 8, 8, 8);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(150, 150);
  return texture;
};

export const createGrassTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  
  ctx.fillStyle = "#0c2b18";
  ctx.fillRect(0, 0, 256, 256);
  
  const imgData = ctx.getImageData(0, 0, 256, 256);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 32;
    data[i] = Math.max(0, Math.min(255, data[i] + noise * 0.4));
    data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise));
    data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise * 0.3));
  }
  ctx.putImageData(imgData, 0, 0);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(250, 250);
  return texture;
};

export const createTyreDecalTexture = (color = "#e63946", text = "GEMINI") => {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  
  ctx.clearRect(0, 0, 512, 512);
  
  // Draw outer circle ring
  ctx.strokeStyle = color;
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.arc(256, 256, 190, 0, Math.PI * 2);
  ctx.stroke();
  
  // Draw brand text
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 34px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  
  ctx.save();
  ctx.translate(256, 256);
  ctx.fillText(text, 0, -190);
  ctx.rotate(Math.PI);
  ctx.fillText("F1 ZERO", 0, -190);
  ctx.restore();
  
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
};

import * as THREE from 'three';

/** Authored paint and access-panel markings, not photographs of a real launch vehicle. */
export function vehiclePaint(stage: 'booster' | 'upper') {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 1024;
  const c = canvas.getContext('2d')!; c.scale(.5, .5);
  c.fillStyle = '#e9ece7'; c.fillRect(0, 0, 1024, 2048);
  // Subtle, repeatable coating variation, without random frame-to-frame noise.
  for (let y = 0; y < 2048; y += 4) { c.fillStyle = `rgba(92,108,110,${.013 + .012 * (1 + Math.sin(y * .73))})`; c.fillRect(0, y, 1024, 1); }
  c.fillStyle = '#203540'; c.fillRect(0, stage === 'booster' ? 1380 : 170, 1024, stage === 'booster' ? 128 : 150);
  c.fillStyle = '#bc793e'; c.fillRect(0, stage === 'booster' ? 1358 : 330, 1024, 17);
  c.fillStyle = '#8e9e9e';
  for (const y of stage === 'booster' ? [140, 620, 1190, 1690, 1990] : [44, 590, 1260, 1940]) c.fillRect(0, y, 1024, 2);
  for (const x of [100, 612]) {
    c.save(); c.translate(x, stage === 'booster' ? 740 : 960); c.rotate(-Math.PI / 2);
    c.fillStyle = '#213a44'; c.textAlign = 'center'; c.font = '700 85px Arial'; c.fillText(stage === 'booster' ? 'O R B I T' : 'O R B I T  /  0 2', 0, 0);
    c.font = '22px Arial'; c.fillStyle = '#62757a'; c.fillText('EARTH LAUNCH PROGRAM', 0, 36); c.restore();
  }
  for (const x of [340, 852]) {
    c.strokeStyle = '#859696'; c.lineWidth = 3; c.strokeRect(x - 55, 370, 110, 140);
    c.fillStyle = '#b88e59'; c.fillRect(x - 17, 413, 34, 8);
    c.fillStyle = '#526970'; c.font = '18px Arial'; c.textAlign = 'center'; c.fillText('ACCESS', x, 483);
    for (const y of [384, 496]) for (const dx of [-43, 43]) { c.beginPath(); c.arc(x + dx, y, 3, 0, Math.PI * 2); c.fill(); }
  }
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4; return map;
}

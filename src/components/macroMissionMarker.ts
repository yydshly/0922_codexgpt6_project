import * as THREE from 'three';
import { placeMacroLabels } from './macroLabelLayout';

/** A task locator anchored to Earth, never a fabricated ephemeris position. */
export function createMissionMarker(host: HTMLElement, earth: THREE.Mesh, onSelect: () => void) {
  const overlay = document.createElement('div'); overlay.className = 'macro-world-labels mission-world-labels'; host.append(overlay);
  const button = document.createElement('button'), leader = document.createElement('span');
  button.type = 'button'; button.className = 'macro-world-label selectable'; button.textContent = 'E01 模拟卫星 · 任务入口'; button.style.setProperty('--label-color', '#e8c480');
  button.title = '地球任务定位入口；独立任务时钟，不表示当前历表里的实测卫星位置'; button.onclick = onSelect;
  leader.className = 'macro-label-leader'; leader.style.background = '#e8c480'; overlay.append(leader, button);
  return { layout(camera: THREE.PerspectiveCamera, visible: boolean) {
    button.style.visibility = leader.style.visibility = 'hidden'; if (!visible || !earth.visible) return;
    const point = earth.getWorldPosition(new THREE.Vector3()).project(camera), w = host.clientWidth, h = host.clientHeight;
    if (point.z < -1 || point.z > 1 || Math.abs(point.x) > .95 || Math.abs(point.y) > .9) return;
    const [box] = placeMacroLabels([{ id: 'e01', x: (point.x + 1) * w / 2, y: (1 - point.y) * h / 2, width: button.offsetWidth, height: button.offsetHeight, radius: 35 }], w, h, 75, 110);
    if (!box) return; button.style.transform = `translate(${box.x}px,${box.y}px)`; button.style.visibility = 'visible';
    const x = Math.max(box.x, Math.min(box.anchorX, box.x + box.width)), y = Math.max(box.y, Math.min(box.anchorY, box.y + box.height));
    const dx = x - box.anchorX, dy = y - box.anchorY; leader.style.width = `${Math.hypot(dx, dy)}px`; leader.style.transform = `translate(${box.anchorX}px,${box.anchorY}px) rotate(${Math.atan2(dy, dx)}rad)`; leader.style.visibility = 'visible';
  }, dispose() { overlay.remove(); } };
}

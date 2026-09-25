import { BODIES } from '../data/catalog';
import { publicAsset } from '../data/publicAsset';
import type { TextureLoadItem } from './PanoramaTextureLoader';
import './TextureLoadStatus.css';
const names = new Map([...BODIES.filter(body => body.texture).map(body => [body.texture!, body.name] as const),
  [publicAsset('/textures/earth-clouds.jpg'), '地球云层']]);
export function TextureLoadStatus({ items, onRetry }: { items: TextureLoadItem[]; onRetry: () => void }) {
  const pending = items.filter(item => item.status === 'loading');
  const failed = items.filter(item => item.status === 'error');
  if (!items.length) return null;
  return <details className="panorama-textures" data-state={failed.length ? 'error' : pending.length ? 'loading' : 'ready'} data-texture-status>
    <summary><span>全景表面贴图</span><span role="status">{failed.length ? `${failed.length} 项未就绪` : pending.length ? `正在读取 ${pending.length} 项` : '已就绪'}</span></summary>
    <p>太阳、行星、月球与地球云层的静态外观素材，不是实时影像。贴图与历表分别加载；这里列出全景已使用的素材，教学演示的贴图单独加载。</p>
    {(pending.length > 0 || failed.length > 0) && <p>缺少表面贴图时使用基础颜色，云图缺失时隐藏云层；仍可拖动和缩放。超过 30 秒等待后可重试。</p>}
    <ul>{items.map(item => <li key={item.url}><span>{names.get(item.url) ?? '表面素材'}</span><span>{item.status === 'ready' ? '已就绪' : item.status === 'error' ? '未就绪' : '读取中'}</span></li>)}</ul>
    {failed.length > 0 && <button type="button" onClick={onRetry}>重试未就绪贴图</button>}
  </details>;
}

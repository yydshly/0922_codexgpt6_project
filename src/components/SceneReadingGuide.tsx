import { useEffect, useRef, type KeyboardEvent } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import './SceneReadingGuide.css';

interface Props { onClose: () => void; }

const STAR_MARKS = [
  { mark: '✦', name: '背景星点', where: '观测、宏观结构与宇宙镜头', meaning: '程序生成的远方星空，绘制在跟随镜头的虚拟背景上；这不表示恒星围成太阳系外的一层球壳。它不是实测星表，每一点都不对应已测恒星，也不能据此量取距离。' },
  { mark: '●', name: '带名称的天体', where: '太阳系与邻近恒星系统', meaning: '太阳是本太阳系的恒星；有名称的邻星标记代表真实恒星系统，但它们在宇宙镜头中的方向、大小和间距只作概念展示。行星和卫星球体也有名称，却不是恒星。' },
  { mark: '·', name: '区域粒子', where: '小行星带、柯伊伯带、散射盘、奥尔特云', meaning: '这些彩色点代表区域形态的固定随机样本，不是逐颗已发现天体；它们不随时间轴按真实轨道公转。' },
];

const RING_MARKS = [
  { mark: '线', name: '行星或卫星的细轨迹', where: '真实太阳系观测与综合全景', meaning: '由当前历表位置和速度计算的瞬时双体参考轨道，帮助理解公转方向与尺度；不是一圈物质，也不保证是未来的精确路径。' },
  { mark: '迹', name: '较亮的短弧', where: '播放时间后的观测场景', meaning: '记录本次播放中天体已经走过的位置。切换日期或视图可能清空它；它不是持续存在的空间结构。' },
  { mark: '圈', name: '固定同心圆与小圆圈', where: '宏观结构、黄道网格与类别示意', meaning: '宏观细圆环只标行星轨道尺度；黄道网格是参考坐标；卫星旁或邻星旁的小圈是教学标记。它们都不是实体环，宏观圆圈也不是准确的椭圆轨道。' },
  { mark: '点', name: '小行星带与柯伊伯带', where: '围绕太阳的颗粒区域', meaning: '这是稀疏天体群的区域示意，并非连续的固体圆盘；画面颗粒不代表真实数量和逐体位置。' },
  { mark: '环', name: '土星环', where: '贴近土星球体', meaning: '这是确有其物的行星环，主要由大量冰质颗粒和其他物质组成，颗粒绕土星运动。网页用纹理和光照表现整体外观，没有逐粒模拟。' },
  { mark: '壳', name: '透明球壳', where: '日球层与奥尔特云', meaning: '日球层轮廓是太阳风影响区的概念边界；奥尔特云球壳是推断的分布模型。它们都不是硬壳或物质圆环。' },
];

export function SceneReadingGuide({ onClose }: Props) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButton.current?.focus({ preventScroll: true });
    return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') { event.stopPropagation(); onClose(); return; }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]') ?? []);
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  return <div className="reading-guide-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialog} className="reading-guide" role="dialog" aria-modal="true" aria-labelledby="reading-guide-title" onKeyDown={onKeyDown}>
      <header className="reading-guide-header">
        <div><span>SCENE READING GUIDE</span><h2 id="reading-guide-title">星点与环，分别代表什么？</h2><p>先区分真实天体、参考线和示意标记，再看画面里的空间关系。</p></div>
        <button ref={closeButton} onClick={onClose} aria-label="关闭星点与环图例"><X size={18}/></button>
      </header>
      <div className="reading-guide-content">
        <section><h3>看到的“星星”</h3><p className="reading-guide-intro">现实中，太阳也是一颗恒星；夜空中多数恒星远在太阳系之外。画面上的小亮点还可能是行星、卫星或区域粒子，不能只凭“会发光的点”认定它是恒星。</p>
          <div className="reading-guide-list">{STAR_MARKS.map(item => <article key={item.name}><i>{item.mark}</i><div><h4>{item.name}</h4><small>{item.where}</small><p>{item.meaning}</p></div></article>)}</div>
        </section>
        <section><h3>看到的“环”</h3><p className="reading-guide-intro">一条画出来的轨道线并不是太空中的轨道“轨道管”；真正有物质的行星环，当前画面里主要是土星环。</p>
          <div className="reading-guide-list">{RING_MARKS.map(item => <article key={item.name}><i>{item.mark}</i><div><h4>{item.name}</h4><small>{item.where}</small><p>{item.meaning}</p></div></article>)}</div>
        </section>
        <div className="reading-guide-sources"><span>核对真实天体与物理现象</span><a href="https://science.nasa.gov/universe/stars/" target="_blank" rel="noreferrer">NASA 恒星资料<ArrowUpRight size={12}/></a><a href="https://science.nasa.gov/solar-system/orbits-and-keplers-laws/" target="_blank" rel="noreferrer">NASA 轨道与开普勒定律<ArrowUpRight size={12}/></a><a href="https://science.nasa.gov/saturn/facts/" target="_blank" rel="noreferrer">NASA 土星环资料<ArrowUpRight size={12}/></a></div>
      </div>
    </section>
  </div>;
}
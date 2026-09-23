import { useEffect, useRef } from 'react';
import { ArrowUpRight, CheckCircle2, Clock3, GitCommitHorizontal, X } from 'lucide-react';
import './ProductProgress.css';

const completed = [
  { title: '真实太阳系观测', detail: '太阳、八大行星、月球、选定卫星，以及谷神星、冥王星和卡戎读取 2026—2027 年预置历表；日期、速度、视角与天体参数共用同一观测状态。' },
  { title: '物理验证与科学边界', detail: '十体引力推演与真实历表分开显示，提供逐日差异报告，并明确区分历表、模型和说明性外观。' },
  { title: '从行星到宏观结构', detail: '加入卫星系统、图鉴、区域与宇宙邻域结构导览；点云与远缘球壳明确标记为示意或推断。' },
];

const improvements = [
  { title: '谷神星与冥王星—卡戎动态观测', detail: '三颗目标接入 2026—2027 年 JPL 几何历表；目录、图鉴、近景与时间轴使用同一时刻状态。' },
  { title: '双体质心与清晰镜头', detail: '冥王星和卡戎依据各自中心状态围绕双体质心运动；空间观测、真实比例和瞬时参考轨道分别标注。' },
  { title: '来源与校验可追溯', detail: '保留原始查询、每月数据包、插值检查结果和科学边界；新增对象不混入独立的十体引力验证。' },
];

export function ProductProgress({ onClose }: { onClose: () => void }) {
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return <div className="product-progress-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="product-progress-dialog" role="dialog" aria-modal="true" aria-labelledby="product-progress-title">
      <header className="product-progress-header"><div><span className="eyebrow">BUILD LOG / ORBIT</span><h2 id="product-progress-title">建设记录</h2><p>记录已实现的能力、当前优化和下一步验收依据。</p></div><button ref={closeButton} className="product-progress-close" onClick={onClose} aria-label="关闭建设记录"><X size={18}/></button></header>
      <div className="product-progress-content">
        <p className="product-progress-intro">我们将真实数据、物理近似和视觉示意分别标注。每轮先提交可运行的基线，再记录问题、优化和验证结果，便于对照验收。</p>
        <section><div className="product-progress-section-heading"><CheckCircle2 size={16}/><h3>已有能力 · 基线已提交</h3></div><div className="product-progress-list">{completed.map(item => <article key={item.title}><strong>{item.title}</strong><p>{item.detail}</p></article>)}</div></section>
        <section><div className="product-progress-section-heading"><Clock3 size={16}/><h3>本轮优化 · 待验收</h3></div><ol className="product-progress-steps">{improvements.map(item => <li key={item.title}><strong>{item.title}</strong><p>{item.detail}</p></li>)}</ol></section>
        <section className="product-progress-next"><h3>验收时重点看什么？</h3><p>打开全景确认 32 个动态目标加载；从目录进入谷神星与冥王星—卡戎，播放时间观察位置变化；切换空间观测与真实比例，再从图鉴进入同一目标。</p><p>真实比例下天体非常小是物理尺度的结果。查看参数与数据清单时，注意球体外观、瞬时参考轨道、真实历表位置和十体物理模型的不同来源。</p></section>
        <nav className="product-progress-links" aria-label="建设记录相关资料"><a href="https://github.com/yydshly/0922_codexgpt6_project/commits/main/" target="_blank" rel="noreferrer"><GitCommitHorizontal size={14}/>查看提交记录<ArrowUpRight size={13}/></a><a href="https://github.com/yydshly/0922_codexgpt6_project/blob/main/docs/PRODUCT-PROGRESS.md" target="_blank" rel="noreferrer">查看完整建设记录<ArrowUpRight size={13}/></a></nav>
      </div>
    </section>
  </div>;
}

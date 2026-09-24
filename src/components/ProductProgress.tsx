import { useEffect, useRef } from 'react';
import { ArrowUpRight, CheckCircle2, Clock3, GitCommitHorizontal, X } from 'lucide-react';
import './ProductProgress.css';

const completed = [
  { title: '真实太阳系观测', detail: '太阳、八大行星、月球、选定卫星，以及谷神星、冥王星和卡戎读取 2026—2027 年预置历表；日期、速度、视角与天体参数共用同一观测状态。' },
  { title: '物理验证与科学边界', detail: '十体引力推演与真实历表分开显示，提供逐日差异报告，并明确区分历表、模型和说明性外观。' },
  { title: '从行星到宏观结构', detail: '加入卫星系统、图鉴、区域与宇宙邻域结构导览；点云与远缘球壳明确标记为示意或推断。' },
];

const improvements = [
  { title: '宏观优化已发布', detail: '2026-09-24 已推送并部署宏观全景、图层与来源分栏、文字避让及镜头状态修复。远端基线提交 b749f87。' },
  { title: '两颗真实彗星 · 本地待验收', detail: '宏观页新增哈雷和 67P 的 2026—2027 年 JPL 历表位置、速度及两年逐日路径。日期控制与主页共用；主观测页仍为 32 个动态天体，彗星暂不参与十体引力模型。' },
  { title: '区分位置、轨迹与彗尾', detail: '亮线为覆盖期路径，淡线为瞬时参考椭圆。彗尾原理示意默认关闭，独立于两颗当日彗核；来源页可查看解版本、单位与误差检查。' },
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
        <section className="product-progress-next"><h3>验收时重点看什么？</h3><p>打开“宏观结构 → 天体与物质 → 彗星”，点击“后 30 天”查看日期、位置与参数变化；播放、暂停后返回观测，确认同一时间。再开关彗尾示意，核对其独立说明。地月课程仍后移。</p><p>真实比例下天体非常小是物理尺度的结果。查看参数与数据清单时，注意球体外观、瞬时参考轨道、真实历表位置和十体物理模型的不同来源。</p></section>
        <nav className="product-progress-links" aria-label="建设记录相关资料"><a href="https://github.com/yydshly/0922_codexgpt6_project/commits/main/" target="_blank" rel="noreferrer"><GitCommitHorizontal size={14}/>查看提交记录<ArrowUpRight size={13}/></a><a href="https://github.com/yydshly/0922_codexgpt6_project/blob/main/docs/PRODUCT-PROGRESS.md" target="_blank" rel="noreferrer">查看完整建设记录<ArrowUpRight size={13}/></a></nav>
      </div>
    </section>
  </div>;
}

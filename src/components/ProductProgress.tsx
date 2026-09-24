import { useEffect, useRef } from 'react';
import { ArrowUpRight, CheckCircle2, Clock3, GitCommitHorizontal, X } from 'lucide-react';
import './ProductProgress.css';

const completed = [
  { title: '真实太阳系观测', detail: '太阳、八大行星、月球、选定卫星，以及谷神星、冥王星和卡戎读取 2026—2027 年预置历表；日期、速度、视角与天体参数共用同一观测状态。' },
  { title: '物理验证与科学边界', detail: '十体引力推演与真实历表分开显示，提供逐日差异报告，并明确区分历表、模型和说明性外观。' },
  { title: '从行星到宏观结构', detail: '加入卫星系统、图鉴、区域与宇宙邻域结构导览；点云与远缘球壳明确标记为示意或推断。' },
];

const improvements = [
  { title: '全景地球云层与大气（本地验收）', detail: '把主观测已有的静态云图和薄层大气接入综合全景，支持独立开关、靠近观察、云图加载反馈和重试。跟随地球位置与参考自转，太阳方向随位置更新；不代表当日天气，不新增天体或改变物理半径。' },
  { title: '全景太阳与八大行星点选（已发布）', detail: '新增本体名称、球体和面板定位；水星与金星也能在同一画布跟随日期。展示质量、半径、自转、公转、倾角及日心参数，太阳改用太阳系质心参照；可继续进入已有卫星家族。基础行星不依赖阶段 04，卫星和环仍受该阶段控制。不新增目标或历表。' },
  { title: '全景区域成员跟随（已发布）', detail: '六个区域代表成员集中进入全景侧栏；定位后随日期持续跟随，显示北京时间、日心参数与黄道高度，支持前后 30 天。跨月份等待匹配历表；成员、彗星和双体之间切换保留返回视角，选择区域或镜头预设退出跟随。不新增目标。' },
  { title: '全景彗星定位与轨迹控制（已发布）', detail: '哈雷与 67P 支持彗核和名称点选、同场景定位、日期跟随、日心参数及黄道高度。两年路径与参考椭圆分别开关；背日箭头长度固定，彗尾另有明确标注非当日活动的示例定位。受阶段 02 控制，不新增目标或事件数据。' },
  { title: '全景冥王星—卡戎（已发布）', detail: '冥王星与卡戎可在同一全景中定位、点选并按日期运行，补双体质心、参考轨道、相对距离、速度和黄道高度。局部半径与间距统一比例，外部距离仍压缩；与阶段 04、卫星图层及区域冥王星入口关联。本轮不新增目标，另四颗冥王星卫星尚未导入。' },
  { title: '全景卫星与环系（已发布）', detail: '地月、火星及四大巨行星家族直接接入综合全景，共 20 颗已有卫星。支持同场景定位、球体和名称点选、相对母星参数、前后一天与播放公转；四大巨行星环和参考轨道分别开关，并受阶段 04 控制。距离与大小为展示缩放，后续已将卡戎补入全景双体模块，没有新增目标。' },
  { title: '综合全景整合（已发布）', detail: '太阳活动、地球磁层与粒子带、碎屑流和流星示例、日鞘与星际介质已绘入同一个宏观画布。点击标记或全景现象定位，地球周围效果跟随历表位置；支持开关、独立进度与原视角返回。独立课程作为进一步阅读入口。' },
  { title: '第九批：日球层与星际空间（已发布）', detail: '展开六类环境图层，支持剖示、完整轮廓、侧视与独立流动演示；说明太阳风边界不等于引力终点，关联奥尔特云和太阳活动。球面不是实测外形，不接入探测器轨迹。' },
  { title: '第八批：行星际尘埃与流星（已发布）', detail: '从有厚度的尘埃云和倾斜碎屑流，切换到进入大气的流星示例。支持分层开关、侧视、暂停和进度控制；区分流星体、流星与陨石，并关联真实彗星。仅为原理示意，不增加事件或历表。' },
  { title: '第七批：太阳活动 · 已发布', detail: '补日冕、太阳风、耀斑与 CME 的可控原理演示；可暂停、拖动和重播，独立开关四层，并关联地球磁层和真实太阳近景。不是当日事件或传播时间预测。' },
  { title: '第六批：近地粒子区域', detail: '新增内辐射带、外辐射带与等离子体层的三维点云和透明体积，支持独立开关、完整 / 剖示切换；可与第五批磁层、极光组合。形态和颜色为科普示意，不提供粒子通量或辐射剂量。' },
  { title: '第五批：地球磁层与极光', detail: '新增独立三维原理图，分层控制太阳风、弓形激波、磁层顶与磁尾、磁力线和极光。可侧看磁尾、靠近看极光，并关联真实地球近景。明确不是当日实测或等比例模型。' },
  { title: '按阶段控制新增内容', detail: '顶部“阶段导览”按九批说明新增内容、画面含义和观察顺序；支持独立开关、只看一批和恢复全部阶段。01–03 筛选宏观页，04 控制全景卫星、环系与家族讲解，05 控制磁层与极光，06 控制辐射带与等离子体层，07 控制太阳活动演示，08 控制尘埃与流星演示，09 控制日球层与星际空间详解。' },
  { title: '四大巨行星的环与卫星', detail: '接通木星、土星、天王星、海王星家族，补三颗巨行星的暗淡环，保留土星环。细环宽度增强可关闭；来源、代表环段及未绘制范围明确列出。这一批没有新增卫星数量。' },
  { title: '宏观优化已发布', detail: '第一至第九批及综合全景整合已随 7bb7473 完成部署，包含空间现象、20 颗卫星、环系、冥王星双体与彗星定位跟随。提交正文包含功能、来源边界和验证。' },
  { title: '从区域找到成员', detail: '新增灶神星、妊神星、鸟神星和阋神星的两年 JPL 历表，与谷神星、冥王星组成 6 个可点选的代表成员。主带、柯伊伯带和远伸轨道区域各自关联清单。' },
  { title: '点选、参数与近景连起来', detail: '点击球体、名称或成员清单定位；查看距日距离、速度、黄道高度和来源，展开外观近景，再恢复区域镜头。图鉴可直达所属区域。' },
  { title: '接入范围明确', detail: '主观测页 32 个动态目标，宏观页另有 4 个区域成员与 2 颗彗星，合计 38 个不同对象；不是太阳系总数。点云仍为示意，十体物理模型保持独立。探测器待定。' },
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
        <section><div className="product-progress-section-heading"><Clock3 size={16}/><h3>近期更新 · 发布与本地验收</h3></div><ol className="product-progress-steps">{improvements.map(item => <li key={item.title}><strong>{item.title}</strong><p>{item.detail}</p></li>)}</ol></section>
        <section className="product-progress-next"><h3>验收时重点看什么？</h3><p>先从主页打开“综合全景 → 全景现象”，定位土星或天王星系统，点选卫星并前进一天，核对参数与位置一起变化；再依次定位太阳活动、地球磁层和日球层环境。应在同一画布内靠近，返回原视角后仍看到整体结构；改变观测日期时近地效果随地球移动。独立详解需明确点击阅读入口。示意进度不改变观测日期，放大现象不是当日实测。</p><p>真实比例下天体非常小是物理尺度的结果。查看参数与数据清单时，注意球体外观、瞬时参考轨道、真实历表位置和十体物理模型的不同来源。</p></section>
        <nav className="product-progress-links" aria-label="建设记录相关资料"><a href="https://github.com/yydshly/0922_codexgpt6_project/commits/main/" target="_blank" rel="noreferrer"><GitCommitHorizontal size={14}/>查看提交记录<ArrowUpRight size={13}/></a><a href="https://github.com/yydshly/0922_codexgpt6_project/blob/main/docs/PRODUCT-PROGRESS.md" target="_blank" rel="noreferrer">查看完整建设记录<ArrowUpRight size={13}/></a></nav>
      </div>
    </section>
  </div>;
}

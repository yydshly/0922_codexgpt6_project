import { useId, useState } from 'react';

/** A conceptual route diagram, independent of the current flight and its telemetry. */
export function SatelliteNetworkGuide() {
  const [route, setRoute] = useState<'gateway'|'laser'|'mobile'>('gateway');
  const id=useId().replace(/:/g,'');
  const mobile=route==='mobile', relay=route!=='gateway';
  return <section className="satellite-network-guide" data-guide-section="network">
    <h3>Starlink：把网络送到用户，而不是采集地球照片</h3>
    <p>SpaceX 的 Starlink（星链）主要提供通信连接。终端用无线电连接卫星；卫星把数据送到地面网关，接入地面互联网。部分路径会先通过星间激光中转。相控阵天线用电子方式调整波束方向，卫星运动时网络需要切换服务卫星。</p>
    <div className="network-route-tabs" aria-label="选择通信原理路径">{([['gateway','终端宽带'],['laser','加入星间中转'],['mobile','手机直连']] as const).map(([value,label])=><button key={value} aria-pressed={route===value} onClick={()=>setRoute(value)}>{label}</button>)}</div>
    <figure className="satellite-network-diagram">
      <svg viewBox="0 0 500 280" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
        <title id={`${id}-title`}>{mobile?'手机直连':relay?'带星间激光中转的宽带':'终端宽带'}通信路径示意</title>
        <desc id={`${id}-desc`}>用户{mobile?'手机':'终端'}与卫星 A 双向通信，{relay?'经激光链路到卫星 B，再':''}连接地面网关及地面网络；不是本次模拟的实时链路。</desc>
        <defs><marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="context-stroke"/></marker></defs>
        <path d="M0 221Q250 145 500 221V280H0Z" fill="#193d4b" stroke="#427483"/>
        <text x="14" y="264" fill="#9ac2ce">地面 / 海上 / 空中用户（位置示意）</text>
        <g className="network-links" markerStart={`url(#${id}-arrow)`} markerEnd={`url(#${id}-arrow)`}>
          <path d="M76 193L130 81" stroke="#eac184"/>
          {relay?<><path d="M151 67L328 67" stroke="#c3acef"/><path d="M350 83L367 187" stroke="#8fe7a6"/></>:<path d="M145 84L355 186" stroke="#8fe7a6"/>}
          <path d="M376 219L438 219" stroke="#8acddf"/>
        </g>
        <g className="network-satellite" transform="translate(134 66)"><rect x="-10" y="-10" width="20" height="20" rx="3"/><path d="M-38-8h22v16h-22zM16-8h22v16H16z"/><text x="0" y="-25">卫星 A{mobile?' · 手机直连载荷':''}</text></g>
        {relay&&<g className="network-satellite" transform="translate(349 66)"><rect x="-10" y="-10" width="20" height="20" rx="3"/><path d="M-38-8h22v16h-22zM16-8h22v16H16z"/><text x="0" y="-25">卫星 B</text></g>}
        <text className="network-link-label" x="26" y="137" fill="#eac184">① {mobile?'蜂窝无线电':'终端无线电'}</text>
        {relay&&<text className="network-link-label" x="189" y="95" fill="#c3acef">② 星间激光</text>}
        <text className="network-link-label" x={relay?371:227} y="151" fill="#8fe7a6">{relay?'③':'②'} 回到地面</text>
        <g className="network-ground"><rect x="23" y="197" width="120" height="43" rx="6"/><text x="83" y="215">{mobile?'普通 LTE 手机':'Starlink 专用终端'}</text><text x="83" y="231">{mobile?'需合作运营商支持':'再经路由器连接设备'}</text><rect x="309" y="192" width="108" height="46" rx="6"/><text x="363" y="211">地面网关</text><text x="363" y="228">{mobile?'连接运营商网络':'连接地面互联网'}</text><rect x="440" y="197" width="56" height="43" rx="5"/><text x="468" y="222">网络</text></g>
      </svg>
      <figcaption>双向箭头表示数据往返。原理示意，不按比例；没有新增真实星链卫星、覆盖地图或本次任务的实时网络。</figcaption>
    </figure>
    <p className="satellite-guide-note" aria-live="polite">{mobile?'手机直连：带专用蜂窝载荷的卫星相当于空中的基站，经卫星网络与合作运营商对接。可提供消息、数据及受支持的通话/物联网业务；具体功能取决于地区、运营商、设备和服务开放情况。不是普通手机直接连接家用 Starlink 天线的宽带信号。':relay?'星间中转：A 用激光把数据交给 B，再到可连接的地面网关。中转可跨越海洋等缺少网关的区域；并非每次上网都经过这条固定路线，也不意味着不需要地面互联网。':'终端宽带：家里、船上或飞机上的专用天线收发卫星信号，再由本地网络连接手机和电脑。这里画的是简化直接回传路径，实际路由随卫星与网关条件变化。'}</p>
    <h3>范围与能力由整套系统决定</h3>
    <p>一颗低轨卫星不断飞过，无法始终服务同一地点。持续服务依赖多颗卫星接替、地面终端、网关与网络调度。可见卫星不等于有可用业务；波束、容量、遮挡、天气、终端和当地服务许可都会影响使用。本项目没有计算星链的实时覆盖、带宽或延迟。</p>
    <h3>卫星还有哪些用途？</h3>
    <table><caption>任务不同，搭载的设备与交付结果也不同</caption><thead><tr><th>任务</th><th>怎么实现 / 交付什么</th></tr></thead><tbody>
      <tr><th>通信与中继</th><td>天线与通信设备转发用户数据，提供宽带或移动连接；星链主要属于这一类。</td></tr>
      <tr><th>对地遥感</th><td>光学、红外或雷达载荷测量地表，形成影像与分析数据；我们当前只演示采集和交付流程。</td></tr>
      <tr><th>气象监测</th><td>测量云、水汽和辐射等，由地面系统处理，再结合其他观测用于预报；不靠卫星直接“看见未来”。</td></tr>
      <tr><th>导航与授时</th><td>例如 GPS / Galileo：广播精密时间与轨道信息，接收机联合多颗卫星求位置和时间；不同于提供互联网。</td></tr>
      <tr><th>科学观测</th><td>望远镜或探测仪研究天体、太阳与空间环境；属于专门任务，不是所有通信卫星都兼具。</td></tr>
    </tbody></table>
    <p>太阳翼、电池、姿态控制和推进器是支撑任务的平台设备，不能仅因装有它们，就把通信、拍照、导航等能力互相替换。</p>
    <p className="satellite-network-sources">原理依据：<a href="https://starlink.com/technology" target="_blank" rel="noreferrer">Starlink 技术说明</a>、<a href="https://starlink.com/business/mobile" target="_blank" rel="noreferrer">Starlink Mobile</a>、<a href="https://science.nasa.gov/earth/earth-observatory/catalog-of-earth-satellite-orbits/" target="_blank" rel="noreferrer">NASA 轨道与用途</a>、<a href="https://www.esa.int/Applications/Satellite_navigation/Where_are_the_navigational_satellites" target="_blank" rel="noreferrer">ESA 导航原理</a>。核对日期：2026-09-28；不把厂商设计能力当作所有地区已经开放的服务。</p>
  </section>;
}

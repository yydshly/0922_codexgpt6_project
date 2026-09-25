import {isCoorbital,coorbitalState} from '../data/coorbital';
import type {StateBatch} from '../ephemeris/stateProvider';
import {CoorbitalReadout} from './CoorbitalReadout';
import {TidalMechanism} from './TidalMechanism';
import {OrbitalResonanceReadout} from './OrbitalResonanceReadout';
import {TIDAL_ROUTE,GANYMEDE_PERIOD,resonanceReady} from '../data/tidalModule';
import type {MacroMoon} from '../data/macroFamilies';
import {SpinOrbitReadout} from './SpinOrbitReadout';
import {spinOrbitBody,needsMoonFamily,RESONANCE_SOURCE} from '../data/spinOrbit';
import {SeasonReadout} from './SeasonReadout';
import {SEASON_DATES,seasonDate} from '../data/seasons';
import {tdbToUtc} from '../data/time';
import {MoonPhaseReadout} from './MoonPhaseReadout';
import type {StateFrame} from '../types';
import {motionPlaybackSpeed,motionCycleSeconds,motionSpeedLabel,MOTION_LESSONS,motionStepSeconds,motionSeek,spinPeriodSeconds,type MotionLesson,type MotionLessonId} from '../data/motionLessons';
import {bodyById,PHYSICAL_SOURCE} from '../data/catalog';
import type {MacroTimeControls} from './CometPanel';
import './EnvironmentJourneyPanel.css';
export function MotionLessonPanel({coorbitalBatch,coorbitalEnabled,coorbitalError,onRetryCoorbital,trackYear,trackCount,trackError,onRetryTracks,familyStates,familyError,onRetryFamily,frame,phasesEnabled,current,epoch,now,time,enabled,onSpeed,onLesson,onExit}:{coorbitalBatch:StateBatch|null;coorbitalEnabled:boolean;coorbitalError:string;onRetryCoorbital:()=>void;trackYear:number|null;trackCount:number;trackError:string;onRetryTracks:()=>void;familyStates:readonly MacroMoon[];familyError:string;onRetryFamily:()=>void;frame:StateFrame|null;phasesEnabled:boolean;current:MotionLesson|null;epoch:number|null;now:number|null;time:MacroTimeControls;enabled:boolean;onSpeed:(speed:number)=>void;onLesson:(id:MotionLessonId)=>void;onExit:()=>void}){
 const isPhase=current?.id==='moon-phase',isSeason=current?.id==='earth-seasons';
 const coorbital=isCoorbital(current?.id)?current.id:null;
 const coorbitalReady=!!coorbitalState(coorbitalBatch,now??undefined);
 const isTheory=current?.id==='tidal-cause',isJupiter=current?.id==='jupiter-resonance';
 const satellitesReady=resonanceReady(familyStates);
 const resonance=current?spinOrbitBody(current.id):null;
 const isOrbit=current?.id==='earth-orbit'||isSeason;
 const ready=enabled&&now!==null&&!time.loading&&!time.error;
 const delta=current?motionStepSeconds(current.id):0;
 const move=(seconds:number)=>{if(!ready||now===null)return;const next=motionSeek(now,seconds,time.start,time.end);if(next!==null){if(time.playing)time.onToggle();time.onSeek(next);}};
 const can=(seconds:number)=>ready&&now!==null&&motionSeek(now,seconds,time.start,time.end)!==null;
 const recommended=current?motionPlaybackSpeed(current.id):3600;
 const speedOptions=[1,recommended/2,recommended,recommended*2];
 const atEnd=now!==null&&now>=time.end;
 const duration=current?motionCycleSeconds(current.id)/time.speed:0;
 const durationLabel=duration>=3600?`${(duration/3600).toLocaleString('zh-CN',{maximumFractionDigits:1})} 小时`:duration>=60?`${(duration/60).toLocaleString('zh-CN',{maximumFractionDigits:1})} 分钟`:`${duration.toLocaleString('zh-CN',{maximumFractionDigits:1})} 秒`;
 const pause=()=>{if(time.playing)time.onToggle();};
 const unavailable=(id:string|undefined)=>isCoorbital(id)&&(!coorbitalEnabled||!coorbitalReady)||needsMoonFamily(id)&&!phasesEnabled||id==='jupiter-resonance'&&!satellitesReady;
 const index=MOTION_LESSONS.findIndex(s=>s.id===current?.id);
 return <section className="environment-journey" data-motion-lessons aria-label="自转与公转课程"><h3>运动课程：从自转到锁定与共振</h3><p>先看球体自身转动，再拉远看绕日运行，再对照金星，接着理解月相、季节、同步自转和共振。连续播放与单步对照共用观测日期，整幅太阳系同步更新。选择课程后已准备好推荐速度，点击「连续播放」即可观察。</p><h4>基础运动与受照</h4><ol>{MOTION_LESSONS.slice(0,5).map((s,i)=><li key={s.id}><button disabled={!ready||unavailable(s.id)} aria-pressed={s.id===current?.id} onClick={()=>onLesson(s.id)}>{i+1} · {s.name}</button></li>)}</ol>
 <div data-tidal-module><h3>潮汐锁定与共振</h3><p>按「形成原理 → 月球状态 → 自转—公转共振 → 卫星轨道共振」理解；这四部分的含义不同。</p><ol>{TIDAL_ROUTE.map((s,i)=><li key={s.id}><button disabled={!ready||unavailable(s.id)} aria-pressed={s.id===current?.id} onClick={()=>onLesson(s.id)}>{i+1} · {s.label}</button></li>)}</ol>
 {!phasesEnabled&&<p>月球原理/案例与木星卫星课需开启阶段 04 卫星家族。</p>}{phasesEnabled&&!satellitesReady&&<p role="status">{familyError||'正在等待当前日期的木星卫星历表…'}{familyError&&<button onClick={onRetryFamily}>重试卫星历表</button>}</p>}
 <p>当前提供机制说明与历表案例；潮汐演化、共振角及长期稳定性求解尚未实现。</p></div><div data-coorbital-module><h3>共轨与准卫星 · 同一运动，两种参照</h3><p>先看日心轨迹，再看随地球公转旋转的局部路径。切换视角不会改变日期。</p><div className="environment-controls">{MOTION_LESSONS.filter(s=>isCoorbital(s.id)).map(s=><button key={s.id} disabled={!ready||unavailable(s.id)} aria-pressed={current?.id===s.id} onClick={()=>onLesson(s.id)}>{s.name}</button>)}</div>{!coorbitalEnabled?<p>需要开启阶段 03 区域成员。</p>:!coorbitalReady&&<p role="status">{coorbitalError||'正在读取当前日期的准卫星历表…'}{coorbitalError&&<button onClick={onRetryCoorbital}>重试准卫星历表</button>}</p>}<p>全景中也有当前位置标记，可点击进入；阶段 03 与行星区域图层控制显示。它是准卫星案例，不是新增一颗地球卫星。</p></div>{!ready&&<p role="status">{!enabled?'需开启阶段 01 宏观结构。':time.error?'历表读取失败，请从时间栏重试。':time.loading?'正在读取所选日期历表…':'需要真实太阳系历表。'}</p>}{current&&<><h4>{current.title}</h4>
 {!isTheory&&<div className="motion-playback" data-motion-playback>
  <strong role="status">{time.error?'读取失败':time.loading?'正在载入历表，运动暂缓':atEnd?'已到历表末尾':time.playing?'正在连续运动':'已暂停 · 可以拖动视角观察'}</strong>
  <div className="environment-controls">
   <button className="motion-play-button" disabled={time.playing?false:!ready||atEnd} onClick={time.onToggle}>{time.playing?'暂停运动':'连续播放'}</button>
   <button disabled={!ready} onClick={()=>onSpeed(recommended)}>推荐速度</button>
  </div>
  <label>观察速度 <select aria-label="运动课程速度" value={time.speed} disabled={!ready} onChange={event=>onSpeed(Number(event.target.value))}>
   {!speedOptions.includes(time.speed)&&<option value={time.speed}>当前 · {motionSpeedLabel(time.speed)}</option>}
   {speedOptions.map((value,i)=><option key={value} value={value}>{['实时','慢速','推荐','快速'][i]} · {motionSpeedLabel(value)}</option>)}
  </select></label>
  <p data-motion-duration>当前 {motionSpeedLabel(time.speed)}；{coorbital?'365.25 日对照时段（不是精确周期）':isJupiter?'一个木卫三平均绕木星周期':resonance==='moon'?'一个平均绕地周期':resonance==='mercury'?'两个平均绕日周期':isPhase?'一个平均月相循环':isOrbit?'一个公转周期':'自转一圈'}约需屏幕时间 {durationLabel}（不含载入等待）。</p>
  <small>速度只改变观测时间推进，不改变天体自身周期。金星和地球课程的倍率不同，不能按屏幕转速比较真实快慢。到历表末尾自动暂停，不循环回放。</small>
  {atEnd&&<p>可点击下方「重置本节日期」返回起点，再连续播放。</p>}
 </div>
 }
 {isSeason&&now!==null&&<div data-season-dates><h4>同一年四个日期对照</h4><p>{tdbToUtc(now).getUTCFullYear()} 年 · 北京时间 12:00；是对照日期，不是精确节气时刻。</p><div className="environment-controls">{SEASON_DATES.map(d=>{const target=seasonDate(now,d.month,d.day);return <button key={d.month} disabled={!ready||target<time.start||target>time.end} aria-pressed={Math.abs(now-target)<1} onClick={()=>{pause();time.onSeek(target);}}>{d.month}月{d.day}日</button>;})}</div></div>}
 {resonance&&epoch!==null&&<div data-spin-orbit-jumps><h4>从本节起点比较周期</h4><div className="environment-controls">{[1,2].map(turns=>{const t=epoch+turns*bodyById[resonance].orbitalPeriodDays*86400;return <button key={turns} disabled={!ready||t<time.start||t>time.end} onClick={()=>{pause();time.onSeek(t);}}>起点 + {turns} 个平均公转周期</button>;})}</div><p>按钮用资料平均周期推进日期，不保证实际轨道位置精确回到原点。</p></div>}
 {isJupiter&&epoch!==null&&<div className="environment-controls" data-jupiter-jump><button disabled={!ready||!satellitesReady||epoch+GANYMEDE_PERIOD>time.end||epoch+GANYMEDE_PERIOD<time.start} onClick={()=>{pause();time.onSeek(epoch+GANYMEDE_PERIOD);}}>起点 + 1 个木卫三平均周期</button></div>}
 <p>{current.text}</p>{coorbital&&<p data-coorbital-tracks>{trackYear} 年轨迹 · {trackCount?`${trackCount} 个同日采样点 / 天体`:trackError||'正在读取轨迹…'}{trackError&&<button onClick={onRetryTracks}>重试全年轨迹</button>}</p>}<p className="environment-legend">{current.note}</p>{coorbital?<CoorbitalReadout mode={coorbital} batch={coorbitalBatch} now={now}/>:isTheory?<TidalMechanism key={current.id}/>:isJupiter?<OrbitalResonanceReadout now={now} epoch={epoch} states={familyStates}/>:resonance?<SpinOrbitReadout body={resonance} now={now} epoch={epoch}/>:isSeason?<SeasonReadout frame={frame}/>:isPhase?<><MoonPhaseReadout frame={frame}/><p>绕地球一周约 27.3 天；从一次新月到下一次平均约 29.5 天。后者仅用于估计观看时长，画面位置仍由历表决定。</p></>:<p>本体模型恒星自转周期：{(spinPeriodSeconds(current.body)/3600).toLocaleString('zh-CN',{maximumFractionDigits:3})} 小时；资料公转周期：{bodyById[current.body].orbitalPeriodDays.toLocaleString('zh-CN',{maximumFractionDigits:3})} 日。</p>}{!isTheory&&<><h4>单步对照 · 暂停并跳转日期</h4><div className="environment-controls"><button disabled={!can(-delta)} onClick={()=>move(-delta)}>{coorbital?'后退 30 天':isJupiter?'后退 ¼ 木卫三周期':resonance==='moon'?'后退 ¼ 平均绕地周期':resonance==='mercury'?'后退 ½ 平均绕日周期':isPhase?'后退 3 天':isOrbit?'后退 30 天':'后退 ¼ 自转周期'}</button><button disabled={!can(delta)} onClick={()=>move(delta)}>{coorbital?'前进 30 天':isJupiter?'前进 ¼ 木卫三周期':resonance==='moon'?'前进 ¼ 平均绕地周期':resonance==='mercury'?'前进 ½ 平均绕日周期':isPhase?'前进 3 天':isOrbit?'前进 30 天':'前进 ¼ 自转周期'}</button><button disabled={!ready||epoch===null||epoch<time.start||epoch>time.end} onClick={()=>{if(epoch!==null){if(time.playing)time.onToggle();time.onSeek(epoch);}}}>重置本节日期</button></div><p>每次步进 {Math.round(delta/3600*100)/100} 小时；越出内置历表范围时禁用。单步直接显示新日期，不播放中间过程；连续运动请使用上方播放按钮。课程与底部倍率同步，快进自转可能产生采样错觉。退出会暂停，保留当前日期和倍率；需要返回起点时先重置本节日期。</p></>}<div className="environment-controls"><button disabled={!ready||index===0||unavailable(MOTION_LESSONS[index-1]?.id)} onClick={()=>onLesson(MOTION_LESSONS[index-1].id)}>上一节运动</button><button disabled={!ready||index===MOTION_LESSONS.length-1||unavailable(MOTION_LESSONS[index+1]?.id)} onClick={()=>onLesson(MOTION_LESSONS[index+1].id)}>下一节运动</button></div><button onClick={()=>{pause();onExit();}}>退出运动课并恢复全景</button><p><a href={current.source} target="_blank" rel="noreferrer">NASA 概念解释 ↗</a> · <a href={PHYSICAL_SOURCE} target="_blank" rel="noreferrer">JPL 参数 ↗</a> · <a href="https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc" target="_blank" rel="noreferrer">NAIF 自转常数 ↗</a></p>{coorbital?<small>当前两年位置与采样路径来自 Horizons；不据此求解共轨捕获史、长期稳定性或未来撞击风险。</small>:isTheory||isJupiter?<small>来源分别支持形成机制和已知轨道共振关系；原理图不对应当天形变，周期对照不代替独立共振动力学验证。</small>:resonance?<small>月球同步自转与水星 3:2 是两种周期关系，不代表本课已经模拟其形成过程。<a href={RESONANCE_SOURCE} target="_blank" rel="noreferrer">水星 3:2 共振原始研究 ↗</a></small>:isSeason?<small>两半球对照采用既有地轴姿态近似与同日历表；四个日期用于观察变化，未求解精确分至点。<a href="https://www.weather.gov/fgz/Seasons" target="_blank" rel="noreferrer">NWS：理想昼长与实测日出日落的区别 ↗</a></small>:isPhase?<small>主画面的月球亮面取决于当前自由镜头，旁边的月相圆面固定地心参照，所以二者不必相同。太阳在局部画面外，箭头只示传播方向；地月距离压缩，不能用此图判断食的几何条件。</small>:<small>金色线和粉色标记为教学标注，标记不是地理点。自转使用原有 NAIF 线性角速度与静态极轴近似，绝对经度/姿态不用于测绘；本体周期由该角速度反算，可能与四舍五入的参数表略有差别。</small>}</>}{!current&&<p>选择课程同步定位；原有「行星运动 · 谁转得快」仍提供所有行星的参数比较。</p>}</section>;
}

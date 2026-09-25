import {ENVIRONMENT_STEPS,type EnvironmentStep,type EnvironmentStepId} from '../data/environmentJourney';
import type {StageFlags} from '../data/stages';
import './EnvironmentJourneyPanel.css';
interface Props {current:EnvironmentStep|null;stages:StageFlags;ready:boolean;ioReady:boolean;ioError:string;onRetryIo:()=>void;playing:boolean;progress:number;onStep:(id:EnvironmentStepId)=>void;onPlaying:()=>void;onReset:()=>void;onStages:()=>void}
export function EnvironmentJourneyPanel({current,stages,ready,ioReady,ioError,onRetryIo,playing,progress,onStep,onPlaying,onReset,onStages}:Props){
 const reason=(step:EnvironmentStep)=>!stages[step.stage]?'需开启对应阶段':!ready?'等待当前日期历表':step.id==='io-torus'&&!stages.families?'需开启卫星家族阶段':step.id==='io-torus'&&!ioReady?(ioError?'木卫一历表读取失败':'等待木卫一当前历表'):'';
 const index=ENVIRONMENT_STEPS.findIndex(step=>step.id===current?.id);
 return <section className="environment-journey" aria-label="太阳与行星环境观察路线" data-environment-journey>
 <h3>太阳与行星环境</h3><p>先看太阳 → 太阳风 → 地球磁层与极光，再对照木星和木卫一。七步在同一全景定位，解释联系，不代表同一次真实事件。</p>
 <ol>{ENVIRONMENT_STEPS.map((step,i)=><li key={step.id}><button aria-pressed={current?.id===step.id} disabled={!!reason(step)} title={reason(step)||step.title} onClick={()=>onStep(step.id)}>{i+1} · {step.name}</button>{reason(step)&&<small>{reason(step)}</small>}</li>)}</ol>
 {current?<div aria-live="polite"><h4>{current.title}</h4><p>{current.description}</p><p><strong>观察：</strong>{current.look}</p><p className="environment-legend">{current.legend}</p><div className="environment-controls"><button disabled={index===0||!!reason(ENVIRONMENT_STEPS[Math.max(index-1,0)])} onClick={()=>onStep(ENVIRONMENT_STEPS[index-1].id)}>上一步联系</button><button disabled={index===ENVIRONMENT_STEPS.length-1||!!reason(ENVIRONMENT_STEPS[Math.min(index+1,ENVIRONMENT_STEPS.length-1)])} onClick={()=>onStep(ENVIRONMENT_STEPS[index+1].id)}>下一步联系</button></div>{current.id==='wind'||current.id==='magnet'?<div className="environment-controls"><button aria-pressed={playing} onClick={onPlaying}>{playing?'暂停来流示意':'播放来流示意'}</button><button onClick={onReset}>重播来流</button><small>示意循环 {Math.round(progress*100)}%</small></div>:<small>当前是静态结构示意；拖动旋转、滚轮靠近。</small>}<p><a href={current.source} target="_blank" rel="noreferrer">NASA 依据与解释 ↗</a></p></div>:<p>请选择一步开始；改变现象开关后将按实际画面取消步骤选中。</p>}
 {!ioReady&&ioError&&<p role="status">{ioError}<button onClick={onRetryIo}>重试木卫一资料</button></p>}
 <details><summary>地球与木星，有什么不同？</summary><table><thead><tr><th>对照项</th><th>地球</th><th>木星</th></tr></thead><tbody><tr><th>环境联系</th><td>太阳风与磁层相互作用</td><td>太阳风、自转和内部物质供给共同参与</td></tr><tr><th>本节物质</th><td>向阳侧太阳风来流</td><td>木卫一相关的等离子体环</td></tr><tr><th>极光显示</th><td>绿色示意光带</td><td>蓝紫解释着色，非肉眼影像</td></tr></tbody></table><p>两处均独立缩放。该表比较机制，不比较画面尺寸、粒子数量或当日强度；来源见各步。</p></details>
 <small>独立教学进度，不更改观测日期。不提供当天活动、传播时长或空间天气预测。</small>
 {(!stages.solarActivity||!stages.environment)&&<button onClick={onStages}>开启相关阶段</button>}
 </section>;
}

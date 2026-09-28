import {MEMBER_DIRECTORY,searchMembers,type DirectoryMember} from '../data/memberDirectory';
import {publicAsset} from '../data/publicAsset';
import './MemberDirectory.css';
export interface DirectoryStatus {text:string;blocked:boolean;retry:boolean;stages:boolean;}
export function MemberDirectory({query,onQuery,status,onVisit,onRetry,onStages}:{query:string;onQuery:(query:string)=>void;status:(entry:DirectoryMember)=>DirectoryStatus;onVisit:(entry:DirectoryMember)=>void;onRetry:(entry:DirectoryMember)=>void;onStages:()=>void}){
 const members=searchMembers(query);
 const dynamic=MEMBER_DIRECTORY.filter(m=>m.kind!=='history');const ready=dynamic.filter(m=>!status(m).blocked).length;
 const url=(value:string)=>value.startsWith('/')?publicAsset(value):value;
 return <section className="member-directory" data-member-directory aria-label="已收录成员逐体清单">
  <h2>找天体</h2><p>先搜索，再点“定位并查看参数”，主画面会靠近该天体。仅打开清单不会移动镜头。</p>
  <label>名称或所属系统<input type="search" value={query} onChange={e=>onQuery(e.target.value)} placeholder="例如：地球、海王星卫星、Nix"/></label>
  <p role="status">找到 {members.length} 项{query&&<button onClick={()=>onQuery('')}>清除筛选</button>}</p>
  <details className="member-directory-scope"><summary>收录范围 · {dynamic.length} 个当前成员 + 1 个历史案例</summary><p>{ready} 个当前成员已就绪可定位。这里列的是已接入样本，不是太阳系全部天体。就绪不代表当前在视野内；历史案例使用独立时间窗口。</p></details>
  <div className="member-directory-list">{members.map(m=>{const s=status(m);return <article key={m.id} data-directory-member={m.id}><h4>{m.name}<small>{m.group} · {m.alias}</small></h4><p>{s.text}</p><div><button disabled={s.blocked} onClick={()=>onVisit(m)}>{m.kind==='history'?'切换历史并查看参数':'定位并查看参数'}</button>{s.stages&&<button onClick={onStages}>开启所需阶段</button>}{s.retry&&<button onClick={()=>onRetry(m)}>重试此类资料</button>}<a href={url(m.dataset)} target="_blank" rel="noreferrer">历表来源</a><a href={url(m.source)} target="_blank" rel="noreferrer">介绍 / 参数依据</a></div></article>;})}</div>
  {!members.length&&<p>未找到已收录成员，可按中文名、英文名或母星名查找。</p>}
 </section>;
}

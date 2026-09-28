import {useRef} from 'react';
import './MacroPanelNavigation.css';

export type MacroPanel = 'integrated' | 'members' | 'learn' | 'layers' | 'sources' | 'coverage';
const primary = [
  {id:'integrated', label:'全景现象', hint:'查看观察控制与现象说明'},
  {id:'members', label:'找天体', hint:'按名称查找已收录成员，再定位到主画面'},
  {id:'layers', label:'场景清单', hint:'核对哪些图层已显示、隐藏或需要靠近'},
] as const;
const reference = [
  {id:'learn', label:'认识这里', hint:'当前区域或类别的说明'},
  {id:'coverage', label:'内容总表', hint:'已接入范围与尚待补充的内容'},
  {id:'sources', label:'数据来源', hint:'历表、示意模型与来源边界'},
] as const;

/** Changing a sidebar panel is a reading action; the caller preserves the scene and time. */
export function MacroPanelNavigation({panel,onSelect}:{panel:MacroPanel;onSelect:(panel:MacroPanel)=>void}) {
  const menu=useRef<HTMLDetailsElement>(null);
  const current=reference.find(item=>item.id===panel);
  return <nav className="macro-panel-navigation" aria-label="全景侧栏用途">
    {primary.map(item=><button key={item.id} aria-pressed={panel===item.id} title={item.hint} onClick={()=>onSelect(item.id)}>{item.label}</button>)}
    <details ref={menu} className="macro-reference-menu">
      <summary data-active={!!current} title="区域说明、内容总表与数据来源">{current?.label??'资料'}</summary>
      <div className="macro-reference-options">
        <p>查阅资料保持当前镜头和日期</p>
        {reference.map(item=><button key={item.id} aria-pressed={panel===item.id} onClick={()=>{
          onSelect(item.id);
          if(menu.current){menu.current.open=false;menu.current.querySelector('summary')?.focus();}
        }}><strong>{item.label}</strong><small>{item.hint}</small></button>)}
      </div>
    </details>
  </nav>;
}

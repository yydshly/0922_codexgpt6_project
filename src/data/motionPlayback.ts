/** Shared guard for the right-side shortcut and the detailed lesson player. */
export function motionPlaybackBlock({enabled,now,loading,error,start,end}:{enabled:boolean;now:number|null;loading:boolean;error:string;start:number;end:number}):string {
 if(!enabled)return '需开启阶段 01 宏观结构';
 if(error)return '历表读取失败，请从时间栏重试';
 if(loading)return '正在读取历表，运动暂缓';
 if(now===null||!Number.isFinite(now))return '等待当前日期的历表';
 if(now<start||now>end)return '当前日期不在本节可播放范围';
 if(now===end)return '已到播放范围末尾，请重置本节日期';
 return '';
}

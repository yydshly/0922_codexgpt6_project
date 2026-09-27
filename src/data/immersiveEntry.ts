import type { ImmersiveViewId } from './immersiveViews';

export interface ImmersiveEntry { viewId: ImmersiveViewId; focusId?: string; notice?: string }
export function immersiveEntry(context: { scope: string; member: string | null; target: string | null; family: string | null; moon: string | null }): ImmersiveEntry {
  if (context.scope === 'solar') {
    const id = context.member ?? context.moon ?? context.target?.replace('body:', '');
    if (id === 'moon') return { viewId: 'earth-moon', focusId: 'moon' };
    if (['enceladus', 'rhea', 'titan'].includes(id ?? '')) return { viewId: 'saturn-family', focusId: id! };
    if (context.family === 'saturn') return { viewId: 'saturn-family', notice: context.moon ? '当前卫星尚未接入沉浸取景，先展示土星及三颗已接入的代表卫星。' : undefined };
    if (context.family === 'earth') return { viewId: 'earth-moon' };
    if (id === 'sun') return { viewId: 'sun-limb' };
    if (id === 'earth') return { viewId: 'earth-limb' };
    if (id === 'saturn') return { viewId: 'saturn-rings' };
    if (!id) return { viewId: 'saturn-rings' };
  }
  return { viewId: 'saturn-rings', notice: '当前对象尚未提供沉浸预设，已打开土星环示例。可在下方选择已接入的近景或同景。' };
}

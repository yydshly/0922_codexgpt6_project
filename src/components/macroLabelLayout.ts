export interface LabelAnchor { id: string; x: number; y: number; width: number; height: number }
export interface LabelBox { id: string; x: number; y: number; width: number; height: number; anchorX: number; anchorY: number }

/** Greedy label placement in screen pixels; never modifies scientific positions. */
export function placeMacroLabels(anchors: LabelAnchor[], width: number, height: number, top = 90, bottom = 110, obstacles: {x:number; y:number; width:number; height:number}[] = []): LabelBox[] {
  const boxes: LabelBox[] = [];
  const gap = 7;
  for (const a of anchors) {
    if (![a.x,a.y,a.width,a.height].every(Number.isFinite) || a.x < 0 || a.y < top || a.x > width || a.y > height-bottom) continue;
    const positions = [[a.x+16,a.y-a.height-12],[a.x-a.width-16,a.y-a.height-12],[a.x+16,a.y+14],[a.x-a.width-16,a.y+14],[a.x-a.width/2,a.y-a.height-36]];
    for (const [x,y] of positions) {
      if (x<12 || y<top || x+a.width>width-12 || y+a.height>height-bottom) continue;
      if ([...boxes,...obstacles].some(b => x < b.x+b.width+gap && x+a.width+gap > b.x && y < b.y+b.height+gap && y+a.height+gap > b.y)) continue;
      boxes.push({id:a.id,x,y,width:a.width,height:a.height,anchorX:a.x,anchorY:a.y}); break;
    }
  }
  return boxes;
}

/** Normalized illustration geometry; never used as an ephemeris or entry solver. */
export const dustProgress = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
export function advanceDustDemo(progress: number, seconds: number) {
  return dustProgress(dustProgress(progress) + (Number.isFinite(seconds) ? Math.max(0, seconds) : 0) / 18);
}
export function meteorDemoState(value: number) {
  const progress = dustProgress(value);
  const x = -5 + 5.8 * progress, y = 4.5 - 4.15 * progress;
  const radius = Math.hypot(x, y + 2.5);
  const inAtmosphere = radius < 3.3;
  const visible = progress < .96;
  return { progress, x, y, inAtmosphere, visible, glow: inAtmosphere && visible,
    phase: !visible ? '本例消融结束 · 没有形成陨石' : inAtmosphere ? '进入大气 · 发光现象称为流星' : '太空中的固体 · 流星体' };
}
/** A deliberately inclined, generic debris stream, not a named meteor shower. */
export function debrisPoint(angle: number): [number, number, number] {
  return [6 * Math.cos(angle) - 2, 4 * Math.sin(angle) * Math.sin(.65), 4 * Math.sin(angle) * Math.cos(.65)];
}
export const DUST_SOURCES = [
  {title:'NASA：行星际尘埃的性质与来源',url:'https://ntrs.nasa.gov/citations/20140002866',note:'彗星物质释放、小行星碰撞与黄道光。来源贡献仍有研究，不据此分配画面点数。'},
  {title:'NASA：黄道光与尘埃研究',url:'https://www.nasa.gov/missions/serendipitous-juno-spacecraft-detections-shatter-ideas-about-origin-of-zodiacal-light/',note:'黄道光来自尘埃散射太阳光；来源机制仍在研究。'},
  {title:'NASA：流星体、流星与陨石',url:'https://science.nasa.gov/solar-system/meteors-meteorites/facts/',note:'区分太空固体、大气中的发光现象与落地残余。'},
  {title:'NASA：流星雨',url:'https://science.nasa.gov/solar-system/meteors-meteorites/meteor-showers/',note:'地球经过碎屑分布区域时可出现流星雨；本图不是流星雨日历。'},
];

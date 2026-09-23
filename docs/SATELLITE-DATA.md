# 主要卫星的真实历表

本层增加木卫一、二、三、四，土卫一、二、三、四、五、六、八，海卫一、火卫一、二，以及天王星的天卫五、一、二、三、四。月球继续使用原有十天体历表。这十九颗卫星用于真实历表观测，不会加入现有十天体牛顿引力积分，避免与行星系统质心的总质量重复计算。

## 当前观测入口

默认太阳系全景把太阳、八大行星和二十颗选定卫星（含月球），共 29 个动态天体放入同一个三维场景，使用同一时间轴。十九颗扩展卫星在真实观测的全景、内外行星区域和跟随视图中，先按当前时刻读取父星相对状态，再与相同时间的母星中心位置、速度相加。空间观测的距离和球体大小增强只作用于画面；切换真实比例恢复科学长度比例。

「太阳系成员」汇总显示动态成员加载进度，可进入各行星家族；侧栏与「更多图鉴」另可查看资料。29 是本项目已接入动态历表的成员数，不是太阳系的天体或卫星总数。图鉴另有五颗矮行星、灶神星与 67P 彗星，共七个只提供资料和外观示意的成员，不能声称已显示它们的真实轨道。小行星带与柯伊伯带的随机区域点也不计入动态成员：点数没有实际数量含义，没有逐体真实轨道，也不构成观测统计分布。

切换物理验证时，十九颗扩展卫星不参与显示推演或质量计算，仍使用原有十体基准。当前观测方式变化不改变旧数值基准的对象、初值或误差定义。

## 坐标与范围

- 覆盖 2026-01-01 00:00:00 UTC 至 2028-01-01 00:00:00 UTC，首尾均可取样。
- 时间是 J2000 起算的 TDB 秒；位置为 km，速度为 km/s。
- `ECLIPJ2000` 为固定 J2000 黄道坐标，不是随行星转动的局部坐标系。
- 每颗卫星相对其所属**行星中心**：木星 599、土星 699、海王星 899、火星 499、天王星 799，绝不以系统质心冒充中心。
- CSPICE 使用 `NONE` 几何状态，没有光行时、恒星光行差或观测者视角修正。要显示太阳系绝对位置，应将相对向量加到同一时刻的父行星中心位置；速度也同样相加。
- 当前闰秒表 `naif0012.tls` 对 2027 年假定 TAI−UTC 仍为 37 秒。如 IERS 宣布新的闰秒，应刷新时间转换资料并重建分包。

## 原始来源与复现

数据来自 [NASA/JPL NAIF 公开 SPK 目录](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/satellites/) 的固定版本：`jup365.bsp`、`sat441.bsp`、`nep098_part-1.bsp`、`mar099s.bsp`、`ura184_part-3.bsp`。它们与原有父行星中心的 Horizons 源记录属于相同的 JUP365 / SAT441 / NEP098 / MAR099 / URA184 解系列。这些是可追溯的 JPL 解，并非宣称所有系统都采用当天最新发布的解。

导入器只通过串行 HTTP Range 请求下载上述文件中相关目标、父中心和日期范围的原始 Chebyshev 系数。使用 jplephem 截取时不重新拟合，不改变科学系数，随后使用官方 CSPICE 计算状态。为兼容 CSPICE，截取文件的最后一个 DAF 物理记录补齐到 1,024 字节。

每份 `data-sources/satellites/*.source.json` 记录远端 URL、目标编号、提取时间、ETag、Last-Modified、Content-Range、每次响应的 SHA-256 和本地片段 SHA-256。原始说明保留在 SPK 注释区内。导入器核验范围响应与缓存校验和、串行请求、失败退避，并复用现有文件。

运行时只请求 `public/data/satellites/` 下的本地文件，120 个行星系统/月分包合计约 27.68 MB；无需下载全部月份。五份原始 SPK 片段合计约 6.54 MB。

复现：安装 Python 的 `numpy`、`jplephem`、`spiceypy` 后，在项目目录运行 `python scripts/prepare-satellites.py`。已有缓存时完全离线；缺少缓存时从上述官方静态目录下载必要片段。无需设置 SSD API 联系信息，因为此过程没有调用 SSD API。

已核实 [JPL SSD API 的实际公平使用规则](https://ssd-api.jpl.nasa.gov/doc/)：自动访问 API 的 User-Agent 需要产品名、版本和真实联系信息。Horizons 的 `EMAIL_ADDR` 参数可选，并不取消该要求。原有 `prepare-data.py` 的真实联系信息限制因此保留；此卫星导入器使用独立的静态数据发布渠道，不伪造身份。

## 插值验证

对每个保存节点之间的中点，直接由 SPK 重新计算完整位置与速度作独立真值；中点数据不会加入 Hermite 插值。若任意中点位置误差达到 1 km，采样间隔减半并重新验证。全覆盖检查包括末端所需的少量边界补齐时间。

| 卫星 | 最终采样间隔 | 最大中点位置误差 km |
| --- | ---: | ---: |
| 木卫一 Io | 1 小时 | 0.544561 |
| 木卫二 Europa | 2 小时 | 0.890601 |
| 木卫三 Ganymede | 3 小时 | 0.416771 |
| 木卫四 Callisto | 6 小时 | 0.442680 |
| 土卫六 Titan | 6 小时 | 0.377304 |
| 土卫二 Enceladus | 1 小时 | 0.857425 |
| 海卫一 Triton | 3 小时 | 0.295313 |
| 火卫一 Phobos | 30 分钟 | 0.779270 |
| 火卫二 Deimos | 1 小时 | 0.113215 |
| 天卫五 Miranda | 1 小时 | 0.402511 |
| 天卫一 Ariel | 2 小时 | 0.930193 |
| 天卫二 Umbriel | 2 小时 | 0.182973 |
| 天卫三 Titania | 3 小时 | 0.077781 |
| 天卫四 Oberon | 6 小时 | 0.294690 |
| 土卫一 Mimas | 30 分钟 | 0.210520 |
| 土卫三 Tethys | 1 小时 | 0.284436 |
| 土卫四 Dione | 1 小时 | 0.083839 |
| 土卫五 Rhea | 2 小时 | 0.250011 |
| 土卫八 Iapetus | 1 天 | 0.652190 |

237,575 个独立中点全部通过；完整误差和每轮加密结果在 `public/data/satellites/interpolation-report.json`。浏览器使用的 TypeScript 插值另以分布于两年内的 456 个独立 SPICE 检查点复核，并检查所有月份边界、UTC 首尾、真实相对距离量级与数据不被画面修改。

这说明插值与选定历表之间的差异，不代表轨道解本身相对真实自然界只有 1 km 的不确定度，也不表示航天导航精度。

土星全景另以三个历元、每个历元七颗卫星检查「母星中心＋卫星相对状态」的坐标合成。此组检查的母星位置差最大约 0.75 米，卫星相对位置差约 349 米；两种误差分别验收，不把相对状态的 1 km 门槛冒充为绝对位置的不确定度。程序还验证旧版两卫星月份包会明确报错，并可在重试后读取完整七卫星包。

## 参数与外观

半径来自 [NAIF PCK 00011](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc) 的三轴半径，目录同时保留三轴和体积等效半径。火卫一、二形状不规则，三轴缩放仍只是外观示意，不是地形模型。

全景空间观测为土星家族统一保留额外 0.03 个土星展示半径的径向间隔，防止放大的土卫一球体切入环面；球体和参考轨道使用同一显示映射。此间隔只服务于压缩后的画面，真实比例与科学状态不变。

土星七卫星的引力参数 GM 引用 [SAT441 注释](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/satellites/sat441.cmt)，数值与保存的 [NAIF GM DE440](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/gm_de440.tpc) 一致；木星、火星和海王星的扩展卫星使用 GM DE440。天王星五卫星使用 [URA184 注释记录的 URA182 拟合值](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/satellites/ura184_part-3.cmt)。单位为 km³/s²，用于可选的瞬时参考轨道，不替换十体模型常数。目录中的概略公转周期只用于说明，不用来生成位置；土星与天王星的周期来源链接指向 JPL 平均轨道根数资料。知识描述与说明性外观引用各卫星 NASA 页面，具体链接在 `src/data/satellites.ts` 所引用的 `src/data/atlas.ts` 中。专门来源与复现说明见 [土星卫星来源](SATURN-SOURCES.md) 和 [天王星卫星来源](URANUS-SOURCES.md)。

## 程序接口

`src/data/satellites.ts` 导出 `SATELLITES`、`satelliteById` 和 `SatelliteDefinition`；保持原 `BODY_IDS`、`StateFrame` 与物理模型不变。

`src/ephemeris/satellites.ts` 导出 `loadSatelliteManifest()`、`getSatelliteFrame(time,parentId)`、`sampleSatelliteFrame(time,parentId)` 与 `preloadSatelliteTime(time,parentId)`。状态结构是 `{time,states:[{id,position,velocity}]}`，三个分量始终保持科学单位和坐标。同步读取尚未缓存时返回 `null`；不支持的父天体返回空列表；支持的父天体若缺数据则报错。超出日期范围不会静默外推。

`src/hooks/useOverviewSatellites.ts` 按固定的木星、土星、海王星、火星、天王星顺序调用五个系统读取入口，返回包含目录资料的 `states`、`loading`、`error` 和 `retry`。它与各家族近景共用月份缓存和请求去重；未加载的系统不会沿用其他时刻的位置。输出仍是父星相对科学状态，由场景完成合成与显示缩放。

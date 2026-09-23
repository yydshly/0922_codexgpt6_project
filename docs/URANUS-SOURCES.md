# 天王星五颗主要卫星：历表、参数与验证

本轮接入天卫五 Miranda、天卫一 Ariel、天卫二 Umbriel、天卫三 Titania、天卫四 Oberon。项目动态成员由 19 个增加到 24 个，其中 15 颗是选定卫星（包含原有月球）；这不是太阳系卫星总数。本轮没有增加新的土星卫星，也没有改动原有十体引力积分的质量、状态或验证对象。

## 真实运动数据

采用 [NASA/JPL NAIF 的 URA184 第三分包](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/satellites/ura184_part-3.bsp)，官方[分包说明](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/satellites/ura184_part-3.cmt)列明其包含上述五颗卫星和天王星中心。它与项目原有天王星中心 Horizons 响应中的 `ura184_merged` 属于相同解系列。原始分包中的五颗主要卫星采用 URA182 解，URA184 同时汇入其他卫星的更新。

只提取 NAIF 705、701、702、703、704、799 在所需日期附近的原始 Chebyshev 系数，不重新拟合。生成的 SPK 片段为 898,048 字节；串行 HTTP Range 请求共下载 2,001,800 字节。ETag、Content-Range、逐响应及片段 SHA-256 保存在 `data-sources/satellites/ura184_part-3-2026-2027.source.json`，原始注释保留在 SPK 片段内。

每颗卫星通过 CSPICE 求相对天王星**中心 799**的状态，不以系统质心 7 代替中心。使用固定 `ECLIPJ2000` 坐标、TDB 秒、km 与 km/s，以及 `NONE` 几何状态；无光行时或恒星光行差修正。天王星的轴倾与卫星轨道平面不被压到黄道面。显示太阳系坐标时，在同一时刻加上天王星中心的位置和速度。

UTC 覆盖为 **2026-01-01 00:00:00 至 2028-01-01 00:00:00，包含首尾**；首尾 TDB 数值与原十体数据清单完全一致。2027 年仍使用已记录的无新增闰秒假定。为覆盖插值末端，源系数和检查点另含少量边界补齐时间。

新增的 `public/data/satellites/uranus-YYYY-MM.json` 共 24 个月包，合计 5,124,610 字节。扩展卫星层目前共 14 颗卫星、120 个父星/月包，合计 18,463,347 字节。月球仍属于原十体数据层，不能再次计算。

## 参数来源

三轴半径来自本项目保存的 [NAIF PCK 00011](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc)。球体资料半径按三轴乘积的立方根计算；表中显示值作了舍入，不能视为新增测量精度。

| ID | 天体 | PCK 三轴半径 km | 体积等效半径约 km | 平均公转周期 d |
| --- | --- | --- | ---: | ---: |
| 705 | 天卫五 Miranda | 240.4 × 234.2 × 232.9 | 235.8 | 1.413479 |
| 701 | 天卫一 Ariel | 581.1 × 577.9 × 577.7 | 578.9 | 2.520379 |
| 702 | 天卫二 Umbriel | 584.7 × 584.7 × 584.7 | 584.7 | 4.144177 |
| 703 | 天卫三 Titania | 788.9 × 788.9 × 788.9 | 788.9 | 8.705869 |
| 704 | 天卫四 Oberon | 761.4 × 761.4 × 761.4 | 761.4 | 13.463237 |

周期取自 [JPL 卫星平均轨道要素表](https://ssd.jpl.nasa.gov/sats/elem/)的 URA182 条目，用于知识说明。实际运动始终使用历表插值，不通过固定周期或匀速圆轨道生成。

卫星目录的 GM 使用 URA184 官方注释中列出的 URA182 拟合值，单位 km³/s²：Miranda `4.105527241181560`，Ariel `83.43074677282458`，Umbriel `85.40300422326412`，Titania `222.8006351879754`，Oberon `214.2098399407347`。这些比既有 `gm_de440.tpc` 中的相应值更新，来源链接逐条写入 `gmSourceUrl`；没有覆盖原十体物理模型的常数。GM 可用于观察场景的瞬时二体参考轨道，不能在系统总 GM 之外再次加入积分器。

知识介绍使用 NASA 的 [Miranda](https://science.nasa.gov/uranus/moons/miranda/)、[Ariel](https://science.nasa.gov/uranus/moons/ariel/)、[Umbriel](https://science.nasa.gov/uranus/moons/umbriel/)、[Titania](https://science.nasa.gov/uranus/moons/titania/) 与 [Oberon](https://science.nasa.gov/uranus/moons/oberon/)页面。三维颜色、表面纹理和近似形状是说明性外观，不是实时影像或精密地形模型。

## 独立插值检查

每对保存节点之间的中点都由原始 SPK 独立计算，位置与速度均不参与 Hermite 插值。任一中点误差达到 1 km 时，将该天体采样间隔减半并重新检查。

| 卫星 | 最终间隔 | 独立中点数 | 最大位置插值差异 km |
| --- | ---: | ---: | ---: |
| Miranda | 1 小时 | 17,544 | 0.402511 |
| Ariel | 2 小时 | 8,772 | 0.930193 |
| Umbriel | 2 小时 | 8,772 | 0.182973 |
| Titania | 3 小时 | 5,848 | 0.077781 |
| Oberon | 6 小时 | 2,924 | 0.294690 |

新增五颗卫星共 **43,860 个独立中点**通过，最大差异 **0.930193 km**；天王星接入时扩展卫星层累计 **157,896 个独立中点**。后续土星接入后的累计数量见 [卫星数据说明](SATELLITE-DATA.md)。完整结果和加密过程见 `public/data/satellites/interpolation-report.json`。这衡量插值与选定轨道解之间的差异，不代表自然界真实位置具有同样的不确定度。

每颗卫星另保存 25 个分布于数据范围的 SPICE 检查点，供 TypeScript 读取路径复核。`data-sources/satellites/uranus-composition-checkpoints.json` 额外记录三个原有天王星中心 Horizons 三小时时间网格上的独立 SPICE 相对状态，可与原始 799 响应核对全景合成；其中的历表日历时刻表示 TDB，不是 UTC。

## 复现与缓存检查

本轮执行环境为 Python 3.10.11、SpiceyPy 8.2.0、jplephem 2.24、NumPy 2.2.6。运行 `python scripts/prepare-satellites.py` 即可重建；现有缓存齐全时不需要联网。在线获取只读取 NASA/NAIF 公开静态 SPK 文件，不调用 SSD API。

缓存不仅检查文件 SHA-256，还通过 CSPICE 核对实际目标集合和完整连续时间窗。若目标列表扩展或需要的日期未覆盖，旧子集不会被静默复用，必须重新提取完整片段。已检查现有六目标通过、追加未包含的目标 706 被拒绝，以及越过片段末端的时间请求被拒绝。新片段也须通过同样检查后才替换缓存。

# 扩展天体图鉴：来源与边界

核对日期：2026-09-22。数据模块为 `src/data/atlas.ts`，包含 26 个扩展对象和 6 篇分类短文。

**图鉴预览与真实公转分开。** 默认太阳系全景现将已接入的 29 个动态天体汇总在同一场景与时间轴中：太阳、八大行星和二十颗选定卫星（含月球）。本图鉴中的十九颗扩展卫星使用独立的 NASA/JPL 卫星几何历表，在全景、内外行星区域及跟随视图中按相同时间的母星中心状态合成坐标，也可进入对应家族观察真实公转。十体引力验证保持太阳、八大行星和月球的既有系统，不额外叠加十九颗扩展卫星质量。颜色和 `appearance` 只是科普外观示意，不是观测图或地形测绘。

「太阳系成员」汇总入口提供已加载动态成员数与各行星家族入口；「更多图鉴」和侧栏图鉴入口提供扩展资料。其中谷神星、冥王星、妊神星、鸟神星、阋神星、灶神星和 67P 彗星共七个成员尚未接入动态历表，不能把它们的预览称为真实轨道或实时位置。29 个动态成员与另外七个资料成员都是本项目的收录范围，不能称为太阳系全部天体或全部卫星。

下表说明图鉴原有科普尺寸口径。实际卫星场景与参数目录 `src/data/satellites.ts` 另采用 NAIF PCK 三轴半径的体积等效半径；因此少数近似值与图鉴科普值稍有差别。五颗天王星主要卫星及本轮新增的五颗土星卫星在图鉴与动态目录中均直接使用同一组三轴半径的体积等效值，不另用 NASA 科普页上的整数直径换算。火卫一、火卫二仍呈现不规则外形，等效半径不表示它们是规则球体。

## 对象来源

每个对象的 `sourceUrl` 指向下列 NASA 官方介绍。平均半径、概览半径、赤道直径换算值并不完全相同；界面应同时显示 `radiusNote`，避免把科普近似值当作精密形状解。`null` 表示本图鉴不以单一半径描述该对象，不表示尺寸为零。

| 对象 | 官方介绍 | 本图鉴半径口径 |
|---|---|---|
| 谷神星 | [NASA Ceres Facts](https://science.nasa.gov/dwarf-planets/ceres/facts/) | NASA 概览约 476 km；高精度工作应另取形状模型 |
| 冥王星 | [NASA Pluto Facts](https://science.nasa.gov/dwarf-planets/pluto/facts/) | NASA 约 2,377 km 直径除以 2 |
| 妊神星 | [NASA Haumea](https://science.nasa.gov/dwarf-planets/haumea/) | 长椭球形，不给单一球半径 |
| 鸟神星 | [NASA Makemake](https://science.nasa.gov/dwarf-planets/makemake/) | NASA 概览约 715 km |
| 阋神星 | [NASA Eris](https://science.nasa.gov/dwarf-planets/eris/) | NASA 概览约 2,400 km 直径除以 2；仅近似量级 |
| 木卫一 | [NASA Io Facts](https://science.nasa.gov/jupiter/jupiter-moons/io/facts/) | NASA 木星卫星科普表平均半径 1,821.6 km |
| 木卫二 | [NASA Europa](https://science.nasa.gov/jupiter/jupiter-moons/europa/) | 同表平均半径 1,560.8 km |
| 木卫三 | [NASA Ganymede Facts](https://science.nasa.gov/jupiter/jupiter-moons/ganymede/facts/) | 同表平均半径约 2,631 km |
| 木卫四 | [NASA Callisto Facts](https://science.nasa.gov/jupiter/jupiter-moons/callisto/facts/) | 同表平均半径约 2,410 km |
| 土卫六 | [NASA Titan Facts](https://science.nasa.gov/saturn/moons/titan/facts/) | NASA 概览约 2,575 km |
| 土卫二 | [NASA Enceladus](https://science.nasa.gov/saturn/moons/enceladus/) | NAIF 三轴半径的体积等效值，取一位小数 |
| 土卫一 | [NASA Mimas](https://science.nasa.gov/saturn/moons/mimas/) | NAIF PCK 三轴半径 207.8 × 196.7 × 190.6 km 的体积等效值 |
| 土卫三 | [NASA Tethys](https://science.nasa.gov/saturn/moons/tethys/) | NAIF PCK 三轴半径 538.4 × 528.3 × 526.3 km 的体积等效值 |
| 土卫四 | [NASA Dione](https://science.nasa.gov/saturn/moons/dione/) | NAIF PCK 三轴半径 563.4 × 561.3 × 559.6 km 的体积等效值 |
| 土卫五 | [NASA Rhea](https://science.nasa.gov/saturn/moons/rhea/) | NAIF PCK 三轴半径 765 × 763.1 × 762.4 km 的体积等效值 |
| 土卫八 | [NASA Iapetus](https://science.nasa.gov/saturn/moons/iapetus/) | NAIF PCK 三轴半径 745.7 × 745.7 × 712.1 km 的体积等效值 |
| 天卫五 | [NASA Miranda](https://science.nasa.gov/uranus/moons/miranda/) | NAIF PCK 三轴半径 240.4 × 234.2 × 232.9 km 的体积等效值 |
| 天卫一 | [NASA Ariel](https://science.nasa.gov/uranus/moons/ariel/) | NAIF PCK 三轴半径 581.1 × 577.9 × 577.7 km 的体积等效值 |
| 天卫二 | [NASA Umbriel](https://science.nasa.gov/uranus/moons/umbriel/) | NAIF PCK 三轴半径均为 584.7 km |
| 天卫三 | [NASA Titania](https://science.nasa.gov/uranus/moons/titania/) | NAIF PCK 三轴半径均为 788.9 km |
| 天卫四 | [NASA Oberon](https://science.nasa.gov/uranus/moons/oberon/) | NAIF PCK 三轴半径均为 761.4 km |
| 海卫一 | [NASA Triton](https://science.nasa.gov/neptune/moons/triton/) | NASA 约 2,700 km 直径除以 2 |
| 火卫一 | [NASA Phobos](https://science.nasa.gov/mars/moons/phobos/) | 采用三轴全长约 27 × 22 × 18 km，不给单一半径 |
| 火卫二 | [NASA Deimos](https://science.nasa.gov/mars/moons/deimos/) | 采用三轴全长约 15 × 12 × 11 km，不给单一半径 |
| 灶神星 | [NASA 4 Vesta](https://science.nasa.gov/solar-system/asteroids/4-vesta/) | NASA 约 525 km 平均直径除以 2，注明非规则球体 |
| 67P 彗星 | [NASA 67P](https://science.nasa.gov/solar-system/comets/67p-churyumov-gerasimenko/) | 双叶不规则彗核，不给单一半径 |

补充尺寸来源：

- [NASA Moons of Jupiter 科普表](https://www.nasa.gov/wp-content/uploads/2009/12/moons_of_jupiter_lithograph.pdf)，第二页 Fast Facts。
- [NASA/NAIF pck00011](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc)，`BODY602_RADII = (256.6, 251.4, 248.3)` km。土卫二体积等效球半径采用 `(a × b × c)^(1/3)`，四舍五入为 252.1 km。本项目已保存该原始内核。
- 同一 PCK 内核的 `BODY701_RADII` 至 `BODY705_RADII` 提供五颗天王星卫星的三轴半径；图鉴与动态目录均直接计算 `(a × b × c)^(1/3)`。天王星卫星的参考公转周期取 [JPL 平均轨道要素表](https://ssd.jpl.nasa.gov/sats/elem/) 的 URA182 解，只用于文字说明，不驱动轨道位置。
- 同一 PCK 内核的 `BODY601_RADII`、`BODY603_RADII`、`BODY604_RADII`、`BODY605_RADII` 和 `BODY608_RADII` 提供本轮五颗土星卫星的半径。参考周期取同一 JPL 平均要素表的 SAT441 解；引力参数可核对 [SAT441 官方说明](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/satellites/sat441.cmt)。周期与 GM 用于参数说明和瞬时参考轨道，不替代真实几何历表。
- [NASA Astrobiology 灶神星介绍](https://astrobiology.nasa.gov/news/where-did-vesta-come-from/)，约 525 km 直径。本文不给出仍在研究中的内部结构定论。
- [NASA/JPL 罗塞塔号彗星活动介绍](https://www.jpl.nasa.gov/news/rosettas-target-comet-is-becoming-active/)，说明受热升华与气尘释放。

## 分类短文来源

- 岩质与气体巨行星：[NASA About the Planets](https://science.nasa.gov/solar-system/planets/)。
- 冰巨行星：[NASA Uranus Facts](https://science.nasa.gov/uranus/facts/)。
- 矮行星：[NASA Pluto & Dwarf Planets](https://science.nasa.gov/dwarf-planets/)。
- 彗星：[NASA Comet Facts](https://science.nasa.gov/solar-system/comets/facts/)。
- 区域：[NASA 太阳系概览](https://science.nasa.gov/solar-system/solar-system-facts/)、[柯伊伯带](https://science.nasa.gov/solar-system/kuiper-belt/facts/)、[奥尔特云](https://science.nasa.gov/solar-system/oort-cloud/)。

图鉴保留“可能”“证据支持”等区别：木卫二海洋、木卫四可能的地下海洋、海卫一捕获起源均不写作直接观测到的完整过程；存在宜居条件也不等于发现生命。容易随发现更新的卫星总数不写入固定教材。

## 天王星家族的外观与观察方向

天卫五、天卫一、天卫二、天卫三和天卫四的地貌说明分别依据上表 NASA 页面。颜色、裂纹与凹凸由说明性材质生成，不是旅行者 2 号真实纹理，也不复原特定撞击坑或断层的位置；不能把可旋转预览理解为完整实测地形。

母星的极轴使用现有 IAU 参考朝向，卫星位置和速度直接使用相对母星的几何历表；轨道线从当时的位置与速度构造瞬时二体参考。展示压缩只改变母星距离，不把天王星家族旋转到黄道平面，也不抹去天卫五相对其他主要卫星的倾角差异。默认镜头根据家族轨道法向选取斜视角，帮助观察倾斜的轨道；镜头取景不改变科学状态。家族说明可对照 [NASA 天王星事实](https://science.nasa.gov/uranus/facts/) 和 [NASA 天卫一轨道介绍](https://science.nasa.gov/uranus/moons/ariel/)。

## 土星家族的新增外观与远近关系

新增五颗对象使用上表 NASA 科普资料构造可辨识的说明性表面：土卫一的大坑与中央峰提示赫歇尔撞击坑；土卫三的宽浅盆地与裂谷提示奥德修斯撞击坑和伊萨卡大裂谷；土卫四的亮色断裂提示暴露水冰的谷壁；土卫五呈现古老的冰质撞击地形；土卫八呈现明暗两面与赤道山脊。这些颜色、凹凸、位置及尺寸细节由程序绘制，不是卡西尼号贴图，不是特征经纬度复原，也不能用于测绘。球体仍按体积等效半径绘制，并非精细椭球或山脊形状模型。

土卫八的深浅色是固定在表面的反照率差异示意，太阳光另外计算昼夜。其迎向公转方向的一面较暗；暗物质与热迁移的共同作用是相关解释，不能把具体形成历史写成已确定事实。此说明依据 [NASA Iapetus](https://science.nasa.gov/saturn/moons/iapetus/)。

土星家族当前接入七颗选定卫星，不代表土星只有七颗卫星。真实比例使用统一公里尺度；空间观测使用同一径向压缩函数绘制卫星和瞬时参考线，同时增强小卫星可见性。两种模式都保留真实方位、公转方向和轨道平面，土卫八仍位于更远的倾斜轨道上，不会为排版而摊平或移动到内侧。默认取景同时容纳土星环及七颗卫星的参考轨道。近景可观察表面示意，参数面板始终显示未压缩的真实距离与速度。

## 区域与地球视觉图层

主场景中的小行星主带和柯伊伯带采用固定随机点表示区域范围。主带示意选取约 2.2—3.2 AU，柯伊伯带示意选取约 30—50 AU；不应把这些选取范围理解为所有小天体种群的完整边界。点云不是观测统计分布，每个点没有逐体真实轨道，点数也不对应实际天体数量。带区入口可引导阅读相关图鉴，但不会将资料天体自动变成动态历表成员。

地球的静态云图和大气散射示意为独立可开关图层，绘制半径分别为 `1.002 R` 与 `1.018 R`，`R` 为地球球面半径；另提供简化云影。这些是显示参数，不代表真实云高或精确大气外边界。云图不是实时气象，大气效果不是精密辐射输运模拟，均不改变科学半径、位置或引力计算。静态云图的来源与授权见 `public/textures/sources.json`。

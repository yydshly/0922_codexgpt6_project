# 谷神星、冥王星与卡戎动态历表

本轮新增三个真实运行目标：谷神星小天体中心、冥王星天体中心、卡戎天体中心。数据覆盖 **UTC 2026-01-01 至 2028-01-01**（用户界面显示北京时间），仅用于真实太阳系观测。原十体引力验证仍保持独立，不将这些目标的状态或质量悄悄加入积分器。

## 来源与身份

使用 [NASA/JPL Horizons](https://ssd.jpl.nasa.gov/horizons/manual.html) 的向量表，查询参数和原始响应的 SHA-256 见 [在线清单](../public/data/dwarfs/manifest.json)。目标编号为谷神星 `1;`（小天体）、冥王星 `999`、卡戎 `901`。三者均选择目标中心而非冥王星系统质心。`CENTER=500@0` 表示太阳系质心原点；`REF_SYSTEM=ICRF` 与 `REF_PLANE=ECLIPTIC` 给出 J2000 黄道坐标，位置为 km、速度为 km/s。`VEC_CORR=NONE` 保留几何状态，不做光行时改正；时间为 TDB。

半径和介绍分别参考 [NASA 谷神星](https://science.nasa.gov/dwarf-planets/ceres/facts/)、[NASA 冥王星](https://science.nasa.gov/dwarf-planets/pluto/facts/)及 [NASA 卡戎](https://science.nasa.gov/dwarf-planets/pluto/moons/charon/)。实际绘制半径与质量优先使用 [JPL 矮行星物理参数表](https://ssd.jpl.nasa.gov/planets/phys_par.html)：谷神星平均半径 469.7 km、质量 9.38416×10²⁰ kg；冥王星平均半径 1188.3 km、质量 1.30246×10²² kg。卡戎采用 [JPL 卫星物理参数表](https://ssd.jpl.nasa.gov/sats/phys_par/sep.html)的 606.0 km 与 GM 106.1 km³/s²，显示质量以 CODATA 2018 的 G 换算。NASA 入门页对谷神星和冥王星尺寸采用近似取整值。球面颜色和纹理为说明性外观，未宣称是实时影像或精密地形。

## 处理与供数

`scripts/prepare-dwarf-data.py` 下载每 3 小时的原始向量文本，压缩保存在 `data-sources/dwarfs/`，发布包则按 UTC 月份放在 `public/data/dwarfs/`。发布采样间距 6 小时；浏览器根据同一时刻的端点位置与速度作三次 Hermite 插值，并从多项式解析求出速度。`LocalMonthlyStateProvider` 使用明确的天体 ID、时间、原点、坐标与单位接口；合并十体状态时会拒绝历元、坐标、单位不一致或重复身份。切换月份时加载对应本地分包，不用旧月份状态冒充新日期。

重建数据：`python scripts/prepare-dwarf-data.py --contact https://github.com/yydshly/0922_codexgpt6_project/issues`。仓库已保存原始响应，缓存完整时无需重新下载。清单保留精确查询 URL、目标解析结果、原始文件哈希、包哈希和生成时间。查询为外部服务结果；若 JPL 后续更新模型，可重建并比较版本。

## 验证与画面边界

每个目标使用 **2,921 个未参与发布插值的 3 小时中点**独立检查。最大位置差：谷神星 `0.0000017 km`、冥王星 `0.0204 km`、卡戎 `0.1665 km`；三者均低于项目的 `1 km` 插值门槛。最大速度差低于 `0.0001 km/s`。这是发布插值相对同一次 JPL 原始数据的差异，不是实际轨道绝对误差，也不说明简化引力模型的误差。

场景中的球体中心由每个时刻的真实历表状态驱动。所画轨道线是利用该时刻的位置、速度和二体近似生成的**瞬时参考轨道**，不是逐点下载的未来真实路径。空间观测会压缩距离、放大球体；真实比例恢复统一的空间长度比例。冥王星—卡戎视图的两个球体都采用各自中心状态；以 [JPL PLU060 参数](https://ssd.jpl.nasa.gov/sats/phys_par/sep.html)中冥王星 869.3、卡戎 106.1 km³/s² 的 GM 估计双体质心，两个球体都相对质心运动。视觉放大时的球体可能遮住质心位置。谷神星与冥王星按参考周期转动，卡戎保持面向冥王星的潮汐锁定示意；自转相位、极轴姿态和表面图案仍是视觉近似。

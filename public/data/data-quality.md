# 太阳系数据与精度说明

本项目的平移位置和速度来自 NASA/JPL Horizons，并非按圆轨道生成的动画。首次数据采集于 2026-09-22，覆盖 UTC 2026-01-01 00:00 至 2028-01-01 00:00，按 24 个自然月打包。

## 坐标、时间与对象

- 原点：太阳系质心（NAIF 0）。坐标系：J2000 黄道面，ICRF 参考基准。单位：km、km/s。输出为几何状态，没有光行时和恒星光行差修正。
- 时间：J2000 起算的 TDB 秒。界面显示北京时间（UTC+08:00）；程序先由 UTC 加闰秒得到 TAI，再加 32.184 秒得到 TT，并使用 NAIF DELTET 周期项得到 TDB。
- NAIF 时间近似自身精度约 30 微秒，不等于完整天文时间转移模型。IERS Bulletin C 72 已确认 2026 年末无闰秒；2027 年暂沿用 TAI−UTC=37 秒，后续若发布新闰秒需更新转换表。
- 观测模式的 NAIF 目标依次为 `10,199,299,399,301,499,599,699,799,899`，对应太阳、水星、金星、地球、月球、火星、木星、土星、天王星、海王星的中心。
- 牛顿模型采用 `10,1,2,399,301,4,5,6,7,8`。未展开卫星的行星使用系统质心及系统 GM；地球与月球分别处理。比较误差时必须使用同一 NAIF 目标，不能把木星中心与木星系统质心混比。

## 插值验证

6 小时节点保留 Horizons 位置与速度，使用三次 Hermite 插值，速度由该插值的解析导数获得。原始导出另含所有相隔 3 小时的中点；这些中点没有用于构造插值，仅作为独立检验真值。

17 个目标、每个 2,921 个中点，合计 **49,657 个独立检查点全部通过 1 km 阈值**。最大位置偏差为 **0.078370 km（约 78.4 米，水星）**；月球最大 0.019759 km；木星中心最大 0.034698 km。每个目标的最大值、RMS、速度误差和最差时刻保存在 [interpolation-report.json](./interpolation-report.json)。

这度量的是导出表插值相对 Horizons 的误差，不能解释为真实天体位置的不确定度。检查采用全部中点，并不证明任意连续时刻都有严格的误差上界。

程序测试还覆盖：UTC/TDB 往返、2017 闰秒生效、北京时间对应 UTC 的同一时刻、两年端点、越界拒绝、节点位置与速度、天体排序、中心与质心区分，以及从保存的原始 Horizons 响应交叉检查运行时插值。

## 物理量与画面

- 半径使用 JPL 体积等效平均半径。质量和周期来自 JPL 物理参数表，显示质量保留原表有效位数；引力计算直接使用 DE440 引力参数 GM，不用四舍五入后的质量乘 G。
- 自转方向与轴向来自 IAU/NAIF。画面使用 J2000 静态轴向加原初子午线匀速转动，忽略进动、章动、月球天平动与气体行星差异自转。火星采用 pck00011 内记录的 IAU 2009 近似；姿态不是导航级定向解。
- 行星画面为球形近似，不表示精确三轴椭球。半长轴、倾角等介绍性数值不用于计算权威平移位置。
- 纹理来自 **Solar System Scope / INOVE，CC BY 4.0**，基于 NASA 图像与高程资料。原始 2K 文件未修改；运行时施加照明与大气效果。纹理有色彩增强与部分重建地形，**不是实时影像**，云层与风暴不跟随历表日期。
- 小行星带和柯伊伯带应视为范围示意；粒子不对应真实天体目录，亦不参与首版引力计算。

## 复现与资料

在项目根目录运行 `python scripts/prepare-data.py` 可读取缓存或串行请求 Horizons，生成月度数据与插值报告。`python scripts/prepare-data-assets.py` 获取纹理与参数源文件。原始 Horizons 响应以 gzip 保存在 `data-sources/horizons`，保留请求参数、目标名称、内核来源、原始取样及说明；各文件的 SHA-256 与 URL 记录于 manifest。

使用现有缓存重建无需联网或联系信息。缺少缓存、确需访问 JPL API 时，必须通过 `--contact` 参数或 `SOLAR_DATA_CONTACT` 环境变量提供维护者的真实联系邮箱或联系页面；该信息用于 API 的 User-Agent。程序不预填或虚构邮箱。下载保持串行，并保留缓存和失败退避重试。

- [NASA/JPL Horizons 使用手册](https://ssd.jpl.nasa.gov/horizons/manual.html)
- [JPL 行星物理参数](https://ssd.jpl.nasa.gov/planets/phys_par.html)
- [JPL 卫星物理参数](https://ssd.jpl.nasa.gov/sats/phys_par/)
- [JPL 天体动力学常量](https://ssd.jpl.nasa.gov/astro_par.html)
- [NAIF DE440 GM](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/gm_de440.tpc)
- [NAIF IAU 姿态与形状参数](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc)
- [NAIF 闰秒与 DELTET 模型](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/naif0012.tls)
- [IERS Bulletin C 72](https://datacenter.iers.org/data/html/bulletinc-072.html)
- [NASA 太阳系结构](https://science.nasa.gov/solar-system/solar-system-facts/)
- [Solar System Scope 纹理说明与署名](https://www.solarsystemscope.com/textures/)，[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

牛顿积分的数值收敛、守恒量与相对 Horizons 的模型偏差见独立物理验证报告。相对论、天体非球形引力、未纳入天体及卫星等均属于模型简化；不将这些偏差归因于历表插值。

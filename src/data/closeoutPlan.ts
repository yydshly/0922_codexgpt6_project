import release from '../../public/release.json';
export const CURRENT_RELEASE = release;
export const CLOSEOUT_STEPS = [
  {
    "id": "C01",
    "title": "统一当前进度",
    "status": "整理完成",
    "done": "规划、覆盖清单、版本与发布状态一致；用户验收不自动勾选。"
  },
  {
    "id": "C02",
    "title": "核对内容完整性",
    "status": "第三组复验中",
    "done": "25 项均已登记；E01–E16 完成入口与代表交互复验，完整子项与其余 9 项仍需继续，不等同 16 类全面验收。"
  },
  {
    "id": "C03",
    "title": "关闭首版缺口",
    "status": "待执行",
    "done": "只修复核对发现的首版缺口；标准变更须明确确认，不能静默删项。"
  },
  {
    "id": "C04",
    "title": "完成性能验收",
    "status": "待执行",
    "done": "冻结参考设备、分辨率和场景，完成载入、真实呈现与持续操作测量；按结果决定优化。"
  },
  {
    "id": "C05",
    "title": "正式验收交付",
    "status": "待用户验收",
    "done": "提供固定验收路线和已知限制，处理反馈；用户明确确认后才称认知版完成。"
  }
];
export const OPEN_FINDINGS = [
  {
    "id": "F01",
    "title": "主全景星表背景与原标准不一致",
    "packages": [
      "M2.1"
    ],
    "kind": "实现与标准差距",
    "current": "独立恒星视图有真实星表；太阳系主全景背景仍为随机装饰点。",
    "close": "接入可追溯星表背景并验证方向，或经用户明确确认修改原标准；当前保持未关闭。",
    "evidence": [
      "src/components/MacroStructure.tsx",
      "src/components/stellarScene.ts",
      "docs/R08-STELLAR-CONTEXT.md"
    ]
  },
  {
    "id": "F02",
    "title": "资源预算与画质分级未闭环",
    "packages": [
      "M1.3",
      "M6.2"
    ],
    "kind": "工程验收待完成",
    "current": "已做工具分包、历表与贴图失败恢复；主包仍有体积提示，贴图总下载量未降低。",
    "close": "给出冷/热启动、带宽和资源预算，依据实测确定画质与按需加载策略；不以体积减少替代加载时间结论。",
    "evidence": [
      "docs/LOADING-OPTIMIZATION.md",
      "docs/EPHEMERIS-LOADING.md",
      "docs/TEXTURE-LOADING.md"
    ]
  },
  {
    "id": "F03",
    "title": "实际设备的呈现与长时间操作未验收",
    "packages": [
      "M6.2"
    ],
    "kind": "实际体验待验收",
    "current": "已有参考无头浏览器的绘制提交速率、40 次切换和窗口检查；不是实际屏幕帧率保证。",
    "close": "在约定实际设备上检查流畅度、连续使用、交互与资源趋势，记录结果和修复；未测量不判通过。",
    "evidence": [
      "docs/R09-VALIDATION.md",
      "docs/VIEWPORT-ACCEPTANCE.md"
    ]
  },
  {
    "id": "F04",
    "title": "用户总验收未完成",
    "packages": [
      "M6.3"
    ],
    "kind": "用户验收待完成",
    "current": "代码、数据和报告已交付，发布与自动检查不等于用户验收。",
    "close": "按固定路线核对画面、解释与操作，处理首版阻断项，取得明确验收确认。",
    "evidence": [
      "docs/RELEASE-2026-09-25.md",
      "docs/PRODUCT-PROGRESS.md"
    ]
  }
];
export const COVERAGE_AUDIT = [
  {
    "id": "E01",
    "reports": [
      "docs/R04-APPEARANCE.md",
      "docs/R05-ENVIRONMENT-LINKS.md",
      "docs/C02-CORE-COVERAGE-AUDIT.md"
    ],
    "check": "选择太阳；更多工具 → 太阳活动。 核对：复验太阳各层、活动与粒子示意的区别；当日太阳活动和差异自转属于明确未实现的深化能力。",
    "review": "已复验入口、代表画面与基本交互；完整子项、异常场景和用户验收仍待完成（C02 第一组）",
    "findingIds": []
  },
  {
    "id": "E02",
    "reports": [
      "docs/R04-APPEARANCE.md",
      "docs/TEXTURE-LOADING.md",
      "docs/C02-CORE-COVERAGE-AUDIT.md"
    ],
    "check": "点选行星；全景目录 → 地球外观。 核对：复验尺度、昼夜、自转说明和贴图恢复；实时天气、精细地形和完整姿态不计作已实现。",
    "review": "已复验入口、代表画面与基本交互；完整子项、异常场景和用户验收仍待完成（C02 第一组）",
    "findingIds": []
  },
  {
    "id": "E03",
    "reports": [
      "docs/R03-SYSTEMS-AND-RINGS.md",
      "docs/TOPIC-FAMILY-ACCEPTANCE.md",
      "docs/C02-CORE-COVERAGE-AUDIT.md"
    ],
    "check": "阅读天然卫星；全景现象 → 定位家族。 核对：复验父子关系、母星附近的局部尺度和日期一致性；不是全部天然卫星名录。",
    "review": "已复验入口、代表画面与基本交互；完整子项、异常场景和用户验收仍待完成（C02 第一组）",
    "findingIds": []
  },
  {
    "id": "E04",
    "reports": [
      "docs/R03-SYSTEMS-AND-RINGS.md",
      "docs/C02-CORE-COVERAGE-AUDIT.md"
    ],
    "check": "选择巨行星家族，比较环系和轨道开关。 核对：复验四大巨行星代表环和女凯龙星双环的比例、开关与来源；完整暗淡外延和真实厚度仍为已知限制。",
    "review": "已复验入口、代表画面与基本交互；完整子项、异常场景和用户验收仍待完成（C02 第一组）",
    "findingIds": []
  },
  {
    "id": "E05",
    "reports": [
      "docs/R07-TOPIC-ROUTES.md",
      "docs/C02-CORE-COVERAGE-AUDIT.md"
    ],
    "check": "从矮行星成员清单定位，再展开参数。 核对：复验五颗矮行星的定位、参数和家族往返，不重复开发既有目录。",
    "review": "已复验入口、代表画面与基本交互；完整子项、异常场景和用户验收仍待完成（C02 第一组）",
    "findingIds": []
  },
  {
    "id": "E06",
    "reports": [
      "docs/R01-SMALL-BODIES.md",
      "docs/R07-TOPIC-ROUTES.md",
      "docs/C02-CORE-COVERAGE-AUDIT.md"
    ],
    "check": "侧视主带，再定位谷神星或灶神星。 核对：复验区域点云与具名成员的辨识；主带点云不承诺逐颗真实坐标。",
    "review": "已复验入口、代表画面与基本交互；完整子项、异常场景和用户验收仍待完成（C02 第一组）",
    "findingIds": []
  },
  {
    "id": "E07",
    "reports": [
      "docs/C02-OUTER-COVERAGE-AUDIT.md",
      "docs/R01-SMALL-BODIES.md",
      "docs/R06-MOTION-AND-EVENTS.md"
    ],
    "check": "全景目录 → 共轨与准卫星；日心/地心旋转视角切换，日期不变。爱神星原入口保留。 核对：复验两个参照系保持同一日期；准卫星不是绕地球的天然卫星。",
    "review": "本轮复验爱神星入口与形状对照；共轨/准卫星参照系等完整子项及用户验收待继续（C02 第二组）",
    "findingIds": []
  },
  {
    "id": "E08",
    "reports": [
      "docs/C02-OUTER-COVERAGE-AUDIT.md",
      "docs/R01-SMALL-BODIES.md",
      "docs/R03-SYSTEMS-AND-RINGS.md"
    ],
    "check": "半人马族与特洛伊群 → 分别定位 L4/L5，比较相对木星方位。 核对：复验 L4/L5、双体与木星的关系；保留背景点群为示意的说明。",
    "review": "本轮复验 L4/L5 入口、参数与切换；双体和共振等完整子项及用户验收待继续（C02 第二组）",
    "findingIds": []
  },
  {
    "id": "E09",
    "reports": [
      "docs/C02-OUTER-COVERAGE-AUDIT.md",
      "docs/R01-SMALL-BODIES.md",
      "docs/R03-SYSTEMS-AND-RINGS.md"
    ],
    "check": "半人马族与特洛伊群 → 女凯龙星；观察高度、轨道；主全景可定位并控制双环参考示意。 核对：复验代表的跨区域轨道和双环示意；不要求全量半人马天体。",
    "review": "本轮复验女凯龙星入口与双环显隐；完整轨道、异常场景及用户验收待继续（C02 第二组）",
    "findingIds": []
  },
  {
    "id": "E10",
    "reports": [
      "docs/C02-OUTER-COVERAGE-AUDIT.md",
      "docs/R02-OUTER-VISITORS.md",
      "docs/R07-TOPIC-ROUTES.md"
    ],
    "check": "全景内容总表进入；展开四类轨道说明对照夸奥尔与冥王星。 核对：复验经典/共振分类、侧视厚度与具名代表；区域点云为结构示意，不是观测普查。",
    "review": "本轮复验夸奥尔入口与尺寸边界说明；四类轨道、区域侧视及用户验收待继续（C02 第二组）",
    "findingIds": []
  },
  {
    "id": "E11",
    "reports": [
      "docs/C02-OUTER-COVERAGE-AUDIT.md",
      "docs/R02-OUTER-VISITORS.md"
    ],
    "check": "全景内容总表定位塞德娜；查看黄道高度、日期变化及分类依据。 核对：复验散射/脱离分类和两类代表轨道；共用区域点云尚非两个实测分布重建，不将其标为已完成。",
    "review": "本轮复验塞德娜入口与分类边界说明；两类代表轨道、完整日期及用户验收待继续（C02 第二组）",
    "findingIds": []
  },
  {
    "id": "E12",
    "reports": [
      "docs/C02-OUTER-COVERAGE-AUDIT.md",
      "docs/R02-OUTER-VISITORS.md",
      "docs/R05-ENVIRONMENT-LINKS.md"
    ],
    "check": "内容总表 → 彗星 → 海尔—波普；可切换三颗彗星。 核对：复验三颗彗星、彗尾方向与轨迹区别；活动演示不等于所选日期的实况。",
    "review": "本轮复验三颗彗星切换、日期参数联动和控件独立性；轨迹逐项画面、活动与用户验收待继续（C02 第二组）",
    "findingIds": []
  },
  {
    "id": "E13",
    "reports": [
      "docs/C02-ENVIRONMENT-COVERAGE-AUDIT.md",
      "docs/R05-ENVIRONMENT-LINKS.md"
    ],
    "check": "全景现象 → 太阳系的边界是哪一种？ → 遥远冰质天体 / 放在同一空间。 核对：复验日球层与奥尔特云的不同边界含义；不以虚构逐体实测补齐推断模型。",
    "review": "本轮复验奥尔特云入口、三步边界对照与阶段关闭后的基础说明；完整角度和用户验收待继续（C02 第三组）",
    "findingIds": []
  },
  {
    "id": "E14",
    "reports": [
      "docs/C02-ENVIRONMENT-COVERAGE-AUDIT.md",
      "docs/R05-ENVIRONMENT-LINKS.md"
    ],
    "check": "全景现象 → 物质从哪里来，会变成什么？六步定位；独立详解仍可阅读。 核对：复验碎屑—流星、尘埃—黄道光、喷流—E 环六步联系；不承诺流星雨预报。",
    "review": "本轮复验碎屑入口、六步选中状态与流星演示独立时间；完整画面和异常场景待继续（C02 第三组）",
    "findingIds": []
  },
  {
    "id": "E15",
    "reports": [
      "docs/C02-ENVIRONMENT-COVERAGE-AUDIT.md",
      "docs/R05-ENVIRONMENT-LINKS.md"
    ],
    "check": "全景现象 → 太阳系边界对照 / 看不见的空间；独立详解继续保留。 核对：复验五种不可见环境解释与三步边界对照；实时通量和完整数值场不在首版范围。",
    "review": "本轮复验日球层入口、五类空间解释切换与代表画面；完整流动和用户验收待继续（C02 第三组）",
    "findingIds": []
  },
  {
    "id": "E16",
    "reports": [
      "docs/C02-ENVIRONMENT-COVERAGE-AUDIT.md",
      "docs/R05-ENVIRONMENT-LINKS.md"
    ],
    "check": "全景现象 → 太阳与行星环境七步定位；阶段 05 控制地球/木星环境，木卫一步骤另需阶段 04。 核对：复验太阳—地球及木星环境联系、开关和日期/示意进度的区别。",
    "review": "本轮复验磁层入口、七步选中状态与手动开关取消高亮；辐射带完整子项及用户验收待继续（C02 第三组）",
    "findingIds": []
  },
  {
    "id": "E17",
    "reports": [
      "docs/PHENOMENA-AUDIT.md",
      "docs/EVENT-ACCEPTANCE.md"
    ],
    "check": "全景目录 → 日月食与遮掩；场景清单 → 日食/月食/遮掩案例；遮掩提供可拖动三维空间与固定地球所见。保留运动课程入口。 核对：复验课程、参照对象、事件窗口与误差说明；当地预报和长期潮汐/共振动力学不在首版范围。",
    "review": "代码与既有证据已核对；本轮逐类画面验收待完成",
    "findingIds": []
  },
  {
    "id": "E18",
    "reports": [
      "docs/R08-STELLAR-CONTEXT.md",
      "docs/R09-VALIDATION.md"
    ],
    "check": "恒星系统与其他星系 → 邻近恒星；切换天空方向/空间距离并点选资料。全景背景差距见 F01。 核对：未关闭 F01：原 M2.1 背景星点可追溯的标准尚未覆盖主全景；需要接入或经明确确认修订范围，不能直接判完成。",
    "review": "代码与既有证据已核对；本轮逐类画面验收待完成",
    "findingIds": [
      "F01"
    ]
  },
  {
    "id": "E19",
    "reports": [
      "docs/R08-STELLAR-CONTEXT.md"
    ],
    "check": "从银河系切换银河系之外，比较尺度说明。 核对：复验太阳系—邻星—银河系—邻近星系的尺度与返回；概念模型不冒充实测星图。",
    "review": "代码与既有证据已核对；本轮逐类画面验收待完成",
    "findingIds": []
  },
  {
    "id": "E20",
    "reports": [
      "docs/R02-OUTER-VISITORS.md"
    ],
    "check": "内容总表 → 星际访客直接进入；彗星面板也提供历史窗口。 核对：复验独立历史时间窗口和返回当前观测；不把访客计作长期束缚成员。",
    "review": "代码与既有证据已核对；本轮逐类画面验收待完成",
    "findingIds": []
  },
  {
    "id": "S01",
    "reports": [
      "docs/R03-SYSTEMS-AND-RINGS.md",
      "docs/R04-APPEARANCE.md"
    ],
    "check": "全景定位爱神星，切换形状/球形；再定位 Patroclus 双体并查看来源。",
    "review": "代码与既有证据已核对；本轮逐类画面验收待完成",
    "findingIds": []
  },
  {
    "id": "S02",
    "reports": [
      "docs/R02-OUTER-VISITORS.md",
      "docs/R06-MOTION-AND-EVENTS.md"
    ],
    "check": "在准卫星两种参照系之间切换；再比较冥王星、夸奥尔、塞德娜的分类与轨道。",
    "review": "代码与既有证据已核对；本轮逐类画面验收待完成",
    "findingIds": []
  },
  {
    "id": "S03",
    "reports": [
      "docs/R04-APPEARANCE.md",
      "docs/R05-ENVIRONMENT-LINKS.md"
    ],
    "check": "太阳分层、黑子/日珥、耀斑/CME 分别控制并查看说明。",
    "review": "代码与既有证据已核对；本轮逐类画面验收待完成",
    "findingIds": []
  },
  {
    "id": "S04",
    "reports": [
      "docs/R04-APPEARANCE.md",
      "docs/R05-ENVIRONMENT-LINKS.md"
    ],
    "check": "定位土卫二，依次查看喷流、剖面和 E 环补给联系；区分观测与推断。",
    "review": "代码与既有证据已核对；本轮逐类画面验收待完成",
    "findingIds": []
  },
  {
    "id": "S05",
    "reports": [
      "docs/R05-ENVIRONMENT-LINKS.md"
    ],
    "check": "分别打开磁场、电流片、光、带电粒子、中性原子；核对图形、开关与解释一致。",
    "review": "代码与既有证据已核对；本轮逐类画面验收待完成",
    "findingIds": []
  }
];

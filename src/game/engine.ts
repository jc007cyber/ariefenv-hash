/**
 * Pseudo-3D Ink Wash Stickman Combat Engine
 * v2: 暂停安全调度器 / 攻击前摇预警 / Boss技能组 / 精英词缀 / 词条全量生效 / DPR高清 / 帧率无关物理
 */



import bgImg from '@/src/assets/images/ink_wash_mountain_backdrop_1790306562587.jpg';
import { sound } from '../utils/audio';
import { ALL_AFFIXES, drawRandomAffixes } from './affixes';
import { GestureRecognizer, StrokePoint } from './gestureRecognizer';
import { StickmanSkeleton } from './skeleton';
import {
  ActionState,
  Affix,
  BossHudInfo,
  BossSkillState,
  BossTier,
  ControlMode,
  DashGhost,
  Difficulty,
  EliteInfo,
  EliteModifier,
  EnemyEntity,
  EnemyType,
  FloatingText,
  GameMode,
  GestureResult,
  GroundDecal,
  InkParticle,
  InkSlash,
  PlayerEntity,
  Projectile,
  RunSnapshot,
  RunStats,
  ShockRing,
  SlashLink,
  TelegraphRing,
  Vec3,
} from '../types/game';

/** 通关折数（击败该折 Boss 后达成「墨武大成」） */
export const VICTORY_WAVE = 15;

export type { Difficulty, GameMode };

const DIFFICULTY_TUNING: Record<Difficulty, { enemyHp: number; enemyDmg: number; spawnRate: number }> = {
  EASY: { enemyHp: 0.85, enemyDmg: 0.75, spawnRate: 1.25 },
  NORMAL: { enemyHp: 1.0, enemyDmg: 1.0, spawnRate: 1.0 },
  HARD: { enemyHp: 1.2, enemyDmg: 1.3, spawnRate: 0.82 },
  // 天劫墨难：妖墨狂性大发（血厚 45%/伤重 60%/刷怪提速 35%），配玩家 70 气血——为墨道巅峰强者准备的九死一生
  EXTREME: { enemyHp: 1.45, enemyDmg: 1.6, spawnRate: 0.65 },
};

/**
 * 无双演武特化调参 v2「势如潮涌」：刷怪更密（间隔×0.26）、怪海量再升级、
 * Boss 海每 2 阵一煞（5 阵双煞、13 阵三煞同屏）、连招链系统（变招加成）、
 * 斩罡余波（每一击都群体波及）、墨经济宽松（杀敌回墨+墨耗减免），攻击更顺畅。
 */
const MUSOU_TUNING = {
  enemyHpMult: 0.62,       // 敌单体 HP 乘数（怪海量翻倍后单体更脆，一刀一片）
  bossHpMult: 0.52,        // Boss HP 额外乘数（Boss 海高频登场，单体血量再压防磨血拖节奏）
  enemyDmgMult: 0.8,       // 敌伤乘数（被围殴时不至于秒死）
  spawnIntervalMult: 0.26, // 刷怪间隔乘数（妖墨如怒潮拍岸，密不透风）
  clusterSpawnChance: 0.5, // 簇刷概率：每次刷怪后 50% 概率同帧再补一只（成群结队）
  clusterFromWave: 2,      // 该阵起启用簇刷
  maxAlive: 34,            // 同屏存活上限基准（经典 22；受自适应画质档位收敛保护）
  waveCountBase: 10,       // 每阵怪海基数（v1 为 8）
  waveCountPerWave: 5,     // 每阵递增（v1 为 4）
  waveCountCap: 60,        // 阵怪数上限（v1 为 48）
  bossEveryWaves: 2,       // Boss 间隔（v1 每 3 阵 → 每 2 阵一煞，Boss 海名副其实）
  dualBossFromWave: 5,     // 该阵起 Boss 波双煞同屏（v1 为 9）
  tripleBossFromWave: 13,  // 该阵起 Boss 波三煞齐临（终极怪海考验）
  eliteCap: 4,             // 每阵精英上限（v1 为 3）
  comboWindowSec: 6.5,     // 连击窗口（v1 5s）：更宽裕的连招呼吸感
  gestureDmgBonus: 1.18,   // 手势伤害乘数（v1 1.1：怪海清场效率再提升）
  comboDmgPerStack: 0.002, // 连击气魄：每连击 +0.2% 手势伤害（上限 150 连 +30%）
  comboDmgCap: 150,        // 连击气魄上限连击数（v1 100）
  killInk: 30,             // 击杀回墨（v1 22）：杀得多回得快，招式循环永动机
  killInkElite: 42,        // 精英击杀回墨（v1 32）
  inkRegen: 18,            // 无双被动回墨/秒（经典 14）：墨足则招式连绵不绝
  gestureCostMult: 0.55,   // 无双手势墨耗乘数（招式放得勤快，不能力不济卡壳）
  awakeningPerKill: 9,     // 觉醒充能/杀（v1 7）：怪海量下大招更是源源不断
  awakeningPerHitMult: 1.3,// 无双命中充能额外乘数
  hitStopSec: 0.03,        // 无双命中停帧（经典 0.055）：短停帧保打击感但不粘滞
  animSpeedMult: 0.78,     // 无双攻击动画时长乘数（收招更快，连绵如疾风）
  aoeRangeMult: 1.3,       // 无双全体攻击横向范围乘数（横扫千军）
  aoeRangeZMult: 1.5,      // 无双纵深范围乘数（一扫一片）
  wakeRadius: 125,         // 斩罡余波半径：每一击荡开墨浪波及近旁妖墨
  wakeDmgMult: 0.4,        // 斩罡余波伤害乘数（基础手势伤的 40%）
  chainWindowSec: 1.8,     // 连招链窗口：连续出招间隔小于此值则链不断
  chainPerSame: 1,         // 同招式连招链增量
  chainPerDiff: 2,         // 变招增量（策略：交替不同招式链涨更快，范围/伤害滚雪球）
  chainDmgPerStack: 0.12,  // 连招链每层 +12% 手势伤害
  chainDmgCap: 0.72,       // 连招链伤害加成上限（+72%）
  chainRangePerStack: 0.07,// 连招链每层 +7% 攻击范围
  chainRangeCap: 0.5,      // 连招链范围加成上限（+50%）
  corpseLife: 0.55,        // 无双小怪尸体消散时长（经典 0.9s）：快清场减渲染负担
  musouRetry: 0.4,         // 拥挤保护触发后的重试间隔（经典 0.75s）
  spawnGraceSec: 0.85,     // 无双出生宽限（经典 0.6s）：怪海密集下出生淡入更久，不被落地围欧
  enemyAttackCdMult: 1.35, // 无双敌近战攻击冷却乘数：怪海围压但不高速轮炊，保玩家喘息空间
  ultRadiusMult: 1.15,     // 无双奥义范围额外乘数：怪海覆盖更大，满槽一刀清大场
  ultFxOrangeBudget: 24,   // 奥义全额特效预算：前 N 只全额墨花浮字，其余静默结算（怪海帧率护栏）
};

/** 无双普通阵名池：随阵号轮换，营造「杀不完的妖墨浪潮」氛围 */
const MUSOU_WAVE_TITLES = ['妖墨狂潮', '群魔夜袭', '血战到底', '万军丛中', '墨海翻涌', '十面埋伏', '风声鹤唳', '杀阵突开'];

/** 无双连杀里程碑：连击达到节点触发全屏演出（字→激波→锣声） */
const MUSOU_KILL_MILESTONES: { at: number; hanzi: string }[] = [
  { at: 25, hanzi: '杀！' },
  { at: 50, hanzi: '破！' },
  { at: 100, hanzi: '灭！' },
  { at: 200, hanzi: '无双！' },
  { at: 400, hanzi: '天人不败！' },
];

export interface GameEngineCallbacks {
  onHpChange: (hp: number, maxHp: number) => void;
  onInkChange: (ink: number, maxInk: number) => void;
  onShieldChange: (shield: number, shieldMax: number) => void;
  onWaveChange: (wave: number, waveTitle: string, enemiesLeft: number) => void;
  onWaveBanner: (title: string, isBossWave: boolean) => void;
  onBossUpdate: (boss: BossHudInfo | null) => void;
  onComboChange: (combo: number) => void;
  onGestureRecognized: (gesture: GestureResult) => void;
  onWaveCleared: (affixes: Affix[]) => void;
  onGameOver: (stats: RunStats, isVictory: boolean) => void;
  onScoreChange?: (score: number) => void;
  onPauseChange: (paused: boolean) => void;
  onControlModeChange?: (mode: ControlMode) => void;
  /** 觉醒槽变化（0~100，满槽可释放「万墨归宗」） */
  onAwakeningChange?: (value: number, maxValue: number) => void;
  /** 自动存档：暂停时 / 每折开战时触发，App 层落盘 localStorage */
  onAutoSave?: (snapshot: RunSnapshot) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: GameEngineCallbacks;

  // Background asset
  private bgImage: HTMLImageElement | null = null;
  private bgLoaded: boolean = false;

  // Control Mode: 'FULL_GESTURE' (Flagship: slice across enemies to warp & combo) vs 'SPLIT_SCREEN'
  public controlMode: ControlMode = 'FULL_GESTURE';
  public slashLinks: SlashLink[] = [];
  public dashGhosts: DashGhost[] = [];
  public slideTarget: { x: number; z: number } | null = null;
  public isSlidingMove: boolean = false;

  // Game loop
  private isRunning: boolean = false;
  private animFrameId: number | null = null;
  private lastTime: number = 0;
  private hitStopTimer: number = 0;

  // Camera & Screen Shake
  private cameraX: number = 0;
  private cameraShake: number = 0;
  private screenWidth: number = 1200;
  private screenHeight: number = 700;
  private dpr: number = 1;
  /** 触屏设备（粗指针）：用于触控专属 DPR 上限与笔锋指引 */
  private coarsePointer: boolean = false;

  // 觉醒技「万墨归宗」：命中/击杀充能，满槽释放全屏墨爆
  private awakening: number = 0;
  private readonly awakeningMax: number = 100;
  private lastAwakeningEmitted: number = -1;

  // Player
  public player: PlayerEntity;
  private walkCycle: number = 0;

  // Enemies & Projectiles
  public enemies: EnemyEntity[] = [];
  private projectiles: Projectile[] = [];
  private particles: InkParticle[] = [];
  private floatingTexts: FloatingText[] = [];
  private telegraphs: TelegraphRing[] = [];

  // --- 特效增强子系统 ---
  private inkSlashes: InkSlash[] = [];      // 笔刷剑弧
  private groundDecals: GroundDecal[] = []; // 地面墨渍/地裂
  private shockRings: ShockRing[] = [];     // 冲击激波环
  private slowMotionTimer: number = 0;      // 电影化慢动作剩余
  private slowMoVis: number = 0;            // 慢动作视觉权重（平滑）
  private zoomPunch: number = 0;            // 镜头缩放冲击
  private inkEdgeTimer: number = 0;         // 屏缘泼墨闪烁
  private stepDustTimer: number = 0;        // 脚步扬尘节流
  private groundSlamDustTimer: number = 0;  // 冲击波扬尘节流

  // --- 性能优化子系统（v3） ---
  private nowMs: number = 0;                // 每帧缓存时间戳（替代热路径多处 performance.now()）
  private _proj: { sx: number; sy: number; scale: number; groundY: number } = { sx: 0, sy: 0, scale: 1, groundY: 0 }; // 共享投影 scratch（零分配）
  private renderQueue: { z: number; draw: () => void }[] = []; // 复用的深度排序队列
  // 自适应画质：帧率过低时自动降粒子量（只降不升，避免震荡；不降分辨率保清晰度）
  private frameEma: number = 16.7;          // 帧耗时指数滑动平均（ms）
  private qualityCheckTimer: number = 0;    // 画质判定累计器
  private qualityLevel: 2 | 1 | 0 = 2;      // 2 高 / 1 中 / 0 低
  private particleCap: number = 460;        // 粒子池上限（随画质档位）
  private ambientCap: number = 26;          // 环境飘墨上限
  private trailChance: number = 0.62;       // 弹道尾迹概率
  // 离屏静态图层缓存（免每帧重建渐变/大范围径向填充）
  private paperCanvas: HTMLCanvasElement | null = null;        // 宣纸底色渐变
  private vignetteCanvas: HTMLCanvasElement | null = null;     // 暖墨暗角
  private hurtVignetteCanvas: HTMLCanvasElement | null = null; // 受击红晕（全强度，绘制时 globalAlpha 调制）
  private lowHpVignetteCanvas: HTMLCanvasElement | null = null; // 低血红晕
  private inkEdgeCanvas: HTMLCanvasElement | null = null;      // 屏缘泼墨（含四角晕点）
  private slowMoTopCanvas: HTMLCanvasElement | null = null;    // 慢动作上墨帘
  private slowMoBottomCanvas: HTMLCanvasElement | null = null; // 慢动作下墨帘
  private groundGrad: CanvasGradient | null = null;            // 地面渐变缓存
  private layerCacheW: number = 0;
  private layerCacheH: number = 0;
  private layerCacheDpr: number = 0;

  // Gesture stroke drawing (Right half / Mouse)
  public activeStroke: StrokePoint[] = [];
  public isDrawingStroke: boolean = false;

  // Touch Virtual Joystick on Left half
  public touchMoveOrigin: { x: number; y: number } | null = null;
  public touchMoveCurrent: { x: number; y: number } | null = null;
  public touchMoveActive: boolean = false;

  // Multi-touch isolation: track specific pointer IDs so left thumb & right brush never conflict
  private movePointerId: number | null = null;
  private drawPointerId: number | null = null;
  private moveStartTime: number = 0;
  private eventCleanupFns: (() => void)[] = [];

  // Keyboard input state
  private keys: Record<string, boolean> = {};

  // Progression & Waves
  public wave: number = 1;
  public waveTitle: string = '第一折 · 墨卒现世';
  public enemiesSpawnedInWave: number = 0;
  public totalEnemiesInWave: number = 6;
  public enemiesKilledInWave: number = 0;
  private spawnTimer: number = 0;
  private eliteCountThisWave: number = 0;
  public isWaveClearing: boolean = false;
  public score: number = 0;
  public isPaused: boolean = false;
  public runEnded: boolean = false;
  public endlessMode: boolean = false;
  public difficulty: Difficulty = 'NORMAL';
  /** 玩法模式：经典征战 / 无双演武（无双无通关概念，怪海量翻倍、Boss 高频、双 Boss 同屏） */
  public gameMode: GameMode = 'CLASSIC';
  // 词条三选一弹窗挂起中：封ESC暂停/恢复，防弹窗底下游戏照跑、玩家被看不见的敌人打死
  private affixPickPending: boolean = false;
  // 玩家主动收笔（暂停菜单「结束本局」）：结算时给出收笔小结局
  private voluntaryEnd: boolean = false;
  // --- 无双连招链系统：连续出招叠层，变招（交替不同招式）涨层更快，
  // 链层提供伤害/范围加成，窗口超时清零（策略深度 + 割草滚雪球爽感）
  private gestureChain: number = 0;
  private gestureChainTimer: number = 0;
  private lastGestureType: GestureResult['type'] | null = null;
  // resetGame 内抑制波次自动存：回标题/重开时不能把玩家「续战第N折」的存档点覆盖成重置后的第1折
  private suppressAutoSave: boolean = false;

  // 同屏存活妖墨上限：无尽模式后期防生成堆积压垮帧率（Boss 本体不受限）；
  // 无双怪海基准 34，但随自适应画质档位收敛（弱机自动降怪海密度，帧率优先）
  private get maxAliveEnemies() {
    if (this.gameMode !== 'MUSOU') return 22;
    return this.qualityLevel === 2 ? MUSOU_TUNING.maxAlive : this.qualityLevel === 1 ? 27 : 21;
  }
  // 暂停/结算时画面静止，仅在标记脏时重绘一帧（防移动端持续满帧渲染发热降频→卡顿）
  private renderDirty: boolean = true;

  // Run statistics (结算统计)
  private runStartTime: number = performance.now();
  private runStats: RunStats = {
    kills: 0, maxCombo: 0, eliteKills: 0, bossKills: 0,
    timeSurvived: 0, score: 0, wave: 1, affixes: [],
  };

  // Pause-safe scheduler (替代所有 setTimeout 战斗逻辑)
  private scheduledActions: { time: number; fn: () => void }[] = [];

  // Feedback state
  private hurtFlashTimer: number = 0;
  private ambientTimer: number = 0;
  private lastInkEmitted: number = -1;
  private lastShieldEmitted: number = -1;
  private lastBossEmitted: string = '';
  private lastScoreEmitted: number = -1;
  private activeBoss: EnemyEntity | null = null; // Boss 引用缓存：免每帧 enemies.find 扫描+闭包分配

  constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false }); // 画布全帧不透明覆盖，免浏览器逐帧与页面背景合成（移动端收益明显）
    if (!context) throw new Error('Cannot get 2d context');
    this.ctx = context;
    this.callbacks = callbacks;
    // 触屏检测：粗指针设备降 DPR 上限（1.75）省像素填充，水墨风视觉无损
    this.coarsePointer =
      typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;

    this.player = this.createInitialPlayer();
    this.initBackground();
    this.setupEvents();
    this.startWave(1);
  }

  private createInitialPlayer(): PlayerEntity {
    return {
      pos: { x: 0, y: 0, z: 0 },
      vel: { x: 0, y: 0, z: 0 },
      facing: 1,
      hp: 120,
      maxHp: 120,
      ink: 100,
      maxInk: 100,
      shield: 0,
      shieldMax: 0,
      state: 'IDLE',
      stateTimer: 0,
      stateDuration: 0,
      comboCount: 0,
      comboTimer: 0,
      maxCombo: 0,
      isInvincible: false,
      invincibleTimer: 0,
      dashTrail: [],
      ribbonWave: 0,
      affixes: [],
      reviveUsed: false,
    };
  }

  private initBackground() {
    this.bgImage = new Image();
    this.bgImage.src = bgImg;
    this.bgImage.onload = () => {
      this.bgLoaded = true;
      this.renderDirty = true;
    };
  }

  public setSize(w: number, h: number) {
    // DPR 高清渲染：高分屏不再模糊；触屏设备上限 1.75（水墨笔触柔和，肉眼无损，省约 1/4 像素填充）
    this.dpr = Math.min(this.coarsePointer ? 1.75 : 2, window.devicePixelRatio || 1);
    this.screenWidth = w;
    this.screenHeight = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.invalidateLayerCaches();
    this.renderDirty = true;
  }

  /** 尺寸/DPR 变化时作废全部离屏图层缓存（懒重建） */
  private invalidateLayerCaches() {
    this.paperCanvas = null;
    this.vignetteCanvas = null;
    this.hurtVignetteCanvas = null;
    this.lowHpVignetteCanvas = null;
    this.inkEdgeCanvas = null;
    this.slowMoTopCanvas = null;
    this.slowMoBottomCanvas = null;
    this.groundGrad = null;
    this.layerCacheW = 0;
    this.layerCacheH = 0;
    this.layerCacheDpr = 0;
  }

  private buildSprite(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return [c, c.getContext('2d') as CanvasRenderingContext2D];
  }

  /** 惰性重建离屏静态图层（渐变本身平滑，用 CSS 分辨率构建即可，省一半以上显存） */
  private ensureLayerCaches(w: number, h: number) {
    if (
      this.paperCanvas &&
      this.layerCacheW === w && this.layerCacheH === h && this.layerCacheDpr === this.dpr
    ) return;

    // 1. 宣纸底色渐变
    {
      const [c, g2] = this.buildSprite(w, h);
      const grad = g2.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#efe8d6');
      grad.addColorStop(0.55, '#e6dcc4');
      grad.addColorStop(1, '#ddd2b6');
      g2.fillStyle = grad;
      g2.fillRect(0, 0, w, h);
      this.paperCanvas = c;
    }

    // 2. 暖墨暗角
    {
      const [c, g2] = this.buildSprite(w, h);
      const grad = g2.createRadialGradient(w / 2, h / 2, w * 0.35, w / 2, h / 2, w * 0.7);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(1, 'rgba(94, 76, 50, 0.22)');
      g2.fillStyle = grad;
      g2.fillRect(0, 0, w, h);
      this.vignetteCanvas = c;
    }

    // 3. 受击红晕（全强度烘焙，运行时 globalAlpha 调制）
    {
      const [c, g2] = this.buildSprite(w, h);
      const grad = g2.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.72);
      grad.addColorStop(0, 'rgba(153, 27, 27, 0)');
      grad.addColorStop(1, 'rgba(153, 27, 27, 1)');
      g2.fillStyle = grad;
      g2.fillRect(0, 0, w, h);
      this.hurtVignetteCanvas = c;
    }

    // 4. 低血红晕（全强度烘焙）
    {
      const [c, g2] = this.buildSprite(w, h);
      const grad = g2.createRadialGradient(w / 2, h / 2, w * 0.32, w / 2, h / 2, w * 0.72);
      grad.addColorStop(0, 'rgba(185, 28, 28, 0)');
      grad.addColorStop(1, 'rgba(185, 28, 28, 1)');
      g2.fillStyle = grad;
      g2.fillRect(0, 0, w, h);
      this.lowHpVignetteCanvas = c;
    }

    // 5. 屏缘泼墨（主径向晕 + 四角墨笔晕点，全强度烘焙）
    {
      const [c, g2] = this.buildSprite(w, h);
      const grad = g2.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.62);
      grad.addColorStop(0, 'rgba(28, 23, 18, 0)');
      grad.addColorStop(0.82, 'rgba(28, 23, 18, 0.14)');
      grad.addColorStop(1, 'rgba(28, 23, 18, 0.5)');
      g2.fillStyle = grad;
      g2.fillRect(0, 0, w, h);
      const cornerR = Math.min(w, h) * 0.2;
      const corners: [number, number][] = [[0, 0], [w, 0], [0, h], [w, h]];
      for (const [cx, cy] of corners) {
        const cg = g2.createRadialGradient(cx, cy, 0, cx, cy, cornerR);
        cg.addColorStop(0, 'rgba(28, 23, 18, 0.4)');
        cg.addColorStop(1, 'rgba(28, 23, 18, 0)');
        g2.fillStyle = cg;
        g2.fillRect(cx - cornerR, cy - cornerR, cornerR * 2, cornerR * 2);
      }
      this.inkEdgeCanvas = c;
    }

    // 6. 慢动作上下墨帘（烘焙最大高度，运行时缩放绘制 + globalAlpha）
    const barMaxH = h * 0.14;
    {
      const [c, g2] = this.buildSprite(w, barMaxH);
      const grad = g2.createLinearGradient(0, 0, 0, barMaxH);
      grad.addColorStop(0, 'rgba(24, 20, 16, 0.88)');
      grad.addColorStop(1, 'rgba(24, 20, 16, 0)');
      g2.fillStyle = grad;
      g2.fillRect(0, 0, w, barMaxH);
      this.slowMoTopCanvas = c;
    }
    {
      const [c, g2] = this.buildSprite(w, barMaxH);
      const grad = g2.createLinearGradient(0, 0, 0, barMaxH);
      grad.addColorStop(0, 'rgba(24, 20, 16, 0)');
      grad.addColorStop(1, 'rgba(24, 20, 16, 0.88)');
      g2.fillStyle = grad;
      g2.fillRect(0, 0, w, barMaxH);
      this.slowMoBottomCanvas = c;
    }

    this.layerCacheW = w;
    this.layerCacheH = h;
    this.layerCacheDpr = this.dpr;
  }

  /** 自适应画质降档（只降不升；立即裁剪存量粒子） */
  private setQualityLevel(lvl: 2 | 1 | 0) {
    if (lvl === this.qualityLevel) return;
    this.qualityLevel = lvl;
    this.particleCap = lvl === 2 ? 460 : lvl === 1 ? 280 : 150;
    this.ambientCap = lvl === 2 ? 26 : lvl === 1 ? 16 : 8;
    this.trailChance = lvl === 2 ? 0.62 : lvl === 1 ? 0.45 : 0.28;
    if (this.particles.length > this.particleCap) {
      this.particles.splice(0, this.particles.length - this.particleCap);
    }
    this.renderDirty = true;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.runStartTime = performance.now();
    sound.startAmbientBgm();
    this.loop(this.lastTime);
  }

  public stop() {
    this.isRunning = false;
    this.resetTouches();
    sound.stopHeartbeat();
    sound.stopAmbientBgm();
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  /** 彻底销毁引擎：移除全部事件监听并停止循环（防卸载后僵尸监听器持有引擎致内存泄漏） */
  public destroy() {
    this.stop();
    for (const fn of this.eventCleanupFns) {
      try {
        fn();
      } catch {
        // 清理异常不阻断后续清理
      }
    }
    this.eventCleanupFns.length = 0;
  }

  /** 暂停/继续（ESC 或按钮），战斗中才可暂停 */
  public togglePause(): boolean {
    if (this.runEnded) return this.isPaused;
    // 词条三选一弹窗挂起时禁止 ESC 翻动暂停态：否则弹窗底下战斗照跑，
    // 玩家看不见敌意却照常掉血（隐性状态机漏洞，与无尽入口死机同源）
    if (this.affixPickPending) return this.isPaused;
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.resetTouches();
      sound.stopHeartbeat();
      sound.stopAmbientBgm();
      // 暂停即存：玩家可能直接杀后台而非退到后台，此刻快照就是最后恢复点
      if (this.hasStartedRun) this.callbacks.onAutoSave?.(this.exportSnapshot());
    } else {
      sound.startAmbientBgm();
    }
    this.renderDirty = true;
    this.callbacks.onPauseChange(this.isPaused);
    return this.isPaused;
  }

  public setPaused(paused: boolean) {
    if (paused !== this.isPaused) this.togglePause();
  }

  public setControlMode(mode: ControlMode) {
    this.controlMode = mode;
    this.resetTouches();
    if (this.callbacks.onControlModeChange) {
      this.callbacks.onControlModeChange(mode);
    }
  }

  public setDifficulty(d: Difficulty) {
    this.difficulty = d;
  }

  /** 设置玩法模式（开局前调用；resetGame 不清除，由 App 在每次开新局时重设） */
  public setGameMode(mode: GameMode) {
    this.gameMode = mode;
  }

  /** 词条选定，恢复战斗（清弹窗挂起锁，与 onWaveCleared 成对） */
  public confirmAffixPick() {
    this.affixPickPending = false;
    this.isPaused = false;
    this.renderDirty = true;
    this.callbacks.onPauseChange(false);
  }

  /** 胜利后进入无尽模式继续征战 */
  public continueEndless() {
    this.endlessMode = true;
    this.runEnded = false;
    this.isPaused = false;
    this.affixPickPending = false;
    this.voluntaryEnd = false;
    // 清掉终折 Boss 战残留（未落地的墨雨预警圈/震地锁点/突进锁点等），
    // 防止陈旧技能判定泄入无尽第一折造成无源伤害或画面异常
    this.clearScheduled();
    this.pendingSlam = null;
    this.pendingCharge = null;
    sound.startAmbientBgm();
    this.renderDirty = true;
    this.callbacks.onPauseChange(false);
    this.startWave(this.wave + 1);
  }

  // World (X, Y, Z) to Screen (sx, sy, scale, groundY)
  public project(pos: Vec3): { sx: number; sy: number; scale: number; groundY: number } {
    const w = this.screenWidth;
    const h = this.screenHeight;
    const horizonY = h * 0.48;
    const depthFactor = (pos.z + 180) / 360;
    const scale = 0.85 + depthFactor * 0.45;
    const sx = (pos.x - this.cameraX) * scale + w / 2;
    const groundY = horizonY + 80 + depthFactor * (h * 0.42);
    const sy = groundY - pos.y * scale;
    return { sx, sy, scale, groundY };
  }

  /**
   * 渲染热路径专用投影：写入共享 scratch 并返回（零对象分配）。
   * 调用方必须立即解构使用，不得长期持有返回值（下一次调用会覆盖）。
   */
  private projectXYZ(x: number, y: number, z: number): { sx: number; sy: number; scale: number; groundY: number } {
    const p = this._proj;
    const df = (z + 180) / 360;
    const scale = 0.85 + df * 0.45;
    p.sx = (x - this.cameraX) * scale + this.screenWidth * 0.5;
    p.groundY = this.screenHeight * 0.48 + 80 + df * (this.screenHeight * 0.42);
    p.sy = p.groundY - y * scale;
    p.scale = scale;
    return p;
  }

  // Screen (sx, sy) to World ground (x, z)
  public unproject(sx: number, sy: number): { x: number; z: number } {
    const w = this.screenWidth;
    const h = this.screenHeight;
    const horizonY = h * 0.48;
    const planeTop = horizonY + 80;
    const planeH = Math.max(1, h * 0.42);
    const depthFactor = Math.max(0, Math.min(1, (sy - planeTop) / planeH));
    const z = depthFactor * 360 - 180;
    const scale = 0.85 + depthFactor * 0.45;
    const x = (sx - w / 2) / scale + this.cameraX;
    return { x, z };
  }

  public distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  /** 暂停安全的延迟调度（替代 setTimeout：暂停冻结、重开清空） */
  private schedule(delaySec: number, fn: () => void) {
    this.scheduledActions.push({ time: delaySec, fn });
  }

  private processScheduled(dt: number) {
    for (let i = this.scheduledActions.length - 1; i >= 0; i--) {
      const action = this.scheduledActions[i];
      action.time -= dt;
      if (action.time <= 0) {
        this.scheduledActions.splice(i, 1);
        action.fn();
      }
    }
  }

  private clearScheduled() {
    this.scheduledActions = [];
    this.telegraphs = [];
  }

  /** 主动收笔：暂停菜单「结束本局」，保留完整战绩并触发收笔小结局结算 */
  public endRunVoluntarily() {
    if (this.runEnded || !this.hasStartedRun) return;
    this.runEnded = true;
    this.affixPickPending = false;
    this.voluntaryEnd = true;
    // 清掉未触发的调度（词条抽取/胜利结算/Boss 技能回调等），防收笔后弹窗串台
    this.clearScheduled();
    this.pendingSlam = null;
    this.pendingCharge = null;
    this.isPaused = true;
    this.resetTouches();
    sound.stopHeartbeat();
    sound.stopAmbientBgm(); // 故事终了，世界归于寂静（重开/回标题时由 resetGame 恢复 BGM）
    this.renderDirty = true;
    this.callbacks.onGameOver(this.getRunStats(), false);
  }

  /**
   * 导出单局进度快照（暂停/波次开战/切后台时由 App 层落盘）。
   * 战场实体（敌人/弹幕/特效）不序列化——恢复粒度为「该折开头重打」，
   * 只保留玩家成长与结算累计，肉鸽标准做法且天然规避陈旧实体泄漏。
   */
  public exportSnapshot(): RunSnapshot {
    const p = this.player;
    return {
      version: 1,
      savedAt: Date.now(),
      elapsedSec: (performance.now() - this.runStartTime) / 1000,
      wave: this.wave,
      score: this.score,
      difficulty: this.difficulty,
      endlessMode: this.endlessMode,
      mode: this.gameMode,
      awakening: this.awakening,
      stats: {
        kills: this.runStats.kills,
        maxCombo: this.runStats.maxCombo,
        eliteKills: this.runStats.eliteKills,
        bossKills: this.runStats.bossKills,
      },
      player: {
        hp: p.hp,
        maxHp: p.maxHp,
        ink: p.ink,
        maxInk: p.maxInk,
        shield: p.shield,
        shieldMax: p.shieldMax,
        reviveUsed: p.reviveUsed,
        pos: { ...p.pos },
        affixes: p.affixes.map((a) => ({ ...a })),
      },
    };
  }

  /**
   * 从快照恢复单局：玩家成长/词条/计分/难度/无尽标记全量还原，
   * 战场清空后从快照波次重新开打（startWave 重刷该折敌人并自动落盘新存档点）。
   */
  public restoreFromSnapshot(snap: RunSnapshot) {
    if (snap.version !== 1) return;
    this.player = this.createInitialPlayer();
    const p = this.player;
    p.hp = Math.max(1, snap.player.hp);
    p.maxHp = Math.max(1, snap.player.maxHp);
    p.hp = Math.min(p.hp, p.maxHp);
    p.ink = Math.min(Math.max(0, snap.player.ink), snap.player.maxInk || 100);
    p.maxInk = snap.player.maxInk || 100;
    p.shield = Math.min(Math.max(0, snap.player.shield), snap.player.shieldMax || 0);
    p.shieldMax = snap.player.shieldMax || 0;
    p.reviveUsed = !!snap.player.reviveUsed;
    p.pos = { ...snap.player.pos };
    p.affixes = (snap.player.affixes || []).map((a) => ({ ...a }));

    // 清空战场残留（快照不含敌人/特效，防陈旧实体泄入恢复局）
    this.enemies = [];
    this.activeBoss = null;
    this.projectiles = [];
    this.particles = [];
    this.slashLinks = [];
    this.floatingTexts = [];
    this.dashGhosts = [];
    this.activeStroke = [];
    this.inkSlashes = [];
    this.groundDecals = [];
    this.shockRings = [];
    this.clearScheduled();
    this.pendingSlam = null;
    this.pendingCharge = null;
    this.slowMotionTimer = 0;
    this.slowMoVis = 0;
    this.zoomPunch = 0;
    this.inkEdgeTimer = 0;
    this.hurtFlashTimer = 0;
    // 连招链状态重置（续战不残留旧链层）
    this.gestureChain = 0;
    this.gestureChainTimer = 0;
    this.lastGestureType = null;

    this.wave = snap.wave;
    this.score = snap.score;
    this.difficulty = snap.difficulty;
    this.endlessMode = !!snap.endlessMode;
    this.gameMode = snap.mode ?? 'CLASSIC'; // 旧快照无 mode 字段，视为经典（向后兼容）
    this.awakening = Math.min(this.awakeningMax, Math.max(0, snap.awakening || 0));
    this.runStats = {
      kills: snap.stats?.kills || 0,
      maxCombo: snap.stats?.maxCombo || 0,
      eliteKills: snap.stats?.eliteKills || 0,
      bossKills: snap.stats?.bossKills || 0,
      timeSurvived: snap.elapsedSec || 0,
      score: snap.score,
      wave: snap.wave,
      affixes: [...p.affixes],
      voluntaryEnd: false,
    };
    // 生存计时回拨：恢复前已生存时长计入本局总时长
    this.runStartTime = performance.now() - (snap.elapsedSec || 0) * 1000;
    this.isWaveClearing = false;
    this.isPaused = false;
    this.runEnded = false;
    this.affixPickPending = false;
    this.voluntaryEnd = false;
    this.hasStartedRun = true;

    // 全量同步 UI
    this.emitHp();
    this.emitInk();
    this.emitShield(true);
    this.emitScore(true);
    this.emitAwakening(true);
    this.callbacks.onBossUpdate(null);
    this.callbacks.onComboChange(0);
    sound.stopHeartbeat();
    sound.startAmbientBgm();
    this.renderDirty = true;
    this.startWave(snap.wave); // 重刷该折敌人（末尾会自动落盘新的存档点）
  }

  public resetGame() {
    this.suppressAutoSave = true; // resetGame 内的 startWave(1) 不落盘（防覆盖玩家续战存档点）
    this.player = this.createInitialPlayer();
    this.enemies = [];
    this.activeBoss = null;
    this.projectiles = [];
    this.particles = [];
    this.slashLinks = [];
    this.floatingTexts = [];
    this.dashGhosts = [];
    this.activeStroke = [];
    this.clearScheduled();
    this.pendingSlam = null;
    this.pendingCharge = null;
    this.inkSlashes = [];
    this.groundDecals = [];
    this.shockRings = [];
    this.slowMotionTimer = 0;
    this.slowMoVis = 0;
    this.zoomPunch = 0;
    this.inkEdgeTimer = 0;
    this.score = 0;
    this.isWaveClearing = false;
    this.isPaused = false;
    this.runEnded = false;
    this.endlessMode = false;
    this.affixPickPending = false;
    this.voluntaryEnd = false;
    // 连招链状态重置（重开/回标题不残留旧链层）
    this.gestureChain = 0;
    this.gestureChainTimer = 0;
    this.lastGestureType = null;
    this.hurtFlashTimer = 0;
    this.runStats = {
      kills: 0, maxCombo: 0, eliteKills: 0, bossKills: 0,
      timeSurvived: 0, score: 0, wave: 1, affixes: [],
    };
    this.lastInkEmitted = -1;
    this.lastShieldEmitted = -1;
    this.lastBossEmitted = '';
    this.awakening = 0;
    this.emitAwakening(true);
    this.runStartTime = performance.now(); // 重置生存计时
    this.callbacks.onBossUpdate(null);
    sound.stopHeartbeat();
    sound.startAmbientBgm(); // 重开恢复 BGM（暂停期间已停）
    this.renderDirty = true;
    // 状态全量同步给 UI（修复重开后血条/墨条残留旧值）
    this.emitHp();
    this.emitInk();
    this.emitShield(true);
    this.callbacks.onComboChange(0);
    this.emitScore(true); // 分数归零同步 UI（防重开后残留旧分）
    this.startWave(1);
    this.suppressAutoSave = false;
  }

  public getRunStats(): RunStats {
    return {
      ...this.runStats,
      timeSurvived: (performance.now() - this.runStartTime) / 1000,
      score: this.score,
      wave: this.wave,
      affixes: [...this.player.affixes],
      voluntaryEnd: this.voluntaryEnd,
      mode: this.gameMode,
    };
  }

  /** 连击加成计分（难度加成：天劫墨难 ×1.5 / 宗师绝顶 ×1.25 / 初入江湖 ×0.85——高风险高回报） */
  private addScore(base: number) {
    const comboMult = 1 + Math.min(50, this.player.comboCount) * 0.02;
    const diffMult = this.difficulty === 'EXTREME' ? 1.5 : this.difficulty === 'HARD' ? 1.25 : this.difficulty === 'EASY' ? 0.85 : 1.0;
    this.score += Math.round(base * comboMult * diffMult);
    this.runStats.score = this.score;
    this.emitScore();
  }

  /** 功绩值变化同步 UI（此前 HUD 分数仅在血/墨等其它状态更新时被顺带刷新，明显滞后） */
  private emitScore(force: boolean = false) {
    if (!this.callbacks.onScoreChange) return;
    if (!force && this.score === this.lastScoreEmitted) return;
    this.lastScoreEmitted = this.score;
    this.callbacks.onScoreChange(this.score);
  }

  // --- 觉醒技「万墨归宗」 ---

  /** 觉醒充能：命中/击杀积累，词条加速 */
  private gainAwakening(base: number) {
    if (this.runEnded || this.awakening >= this.awakeningMax) return;
    const gainMult = 1 + this.sumStat('awakeningGainBonus') / 100;
    this.awakening = Math.min(this.awakeningMax, this.awakening + base * gainMult);
    this.emitAwakening();
  }

  private emitAwakening(force: boolean = false) {
    if (!this.callbacks.onAwakeningChange) return;
    const val = Math.floor(this.awakening);
    if (!force && val === this.lastAwakeningEmitted) return;
    this.lastAwakeningEmitted = val;
    this.callbacks.onAwakeningChange(val, this.awakeningMax);
  }

  /** 满槽释放「万墨归宗」：全屏墨爆 + 短暂无敌 + 慢镜演出（G 键 / HUD 觉醒按钮） */
  public triggerAwakening() {
    const player = this.player;
    if (this.isPaused || this.runEnded || player.hp <= 0) return;
    if (this.awakening < this.awakeningMax) {
      this.addFloatingText('觉醒未满', player.pos.x, player.pos.y + 85, '#9ca3af', 1.0);
      return;
    }

    this.awakening = 0;
    this.emitAwakening(true);

    // 演出：慢镜 + 镜头冲击 + 屏缘泼墨 + 双激波 + 大字
    this.triggerSlowMo(0.55);
    this.triggerZoomPunch(0.06);
    this.triggerInkEdge(0.6);
    this.cameraShake = Math.max(this.cameraShake, 22);
    // 奥义大范围：基础 560（原 340）+ 无双怪海再 ×1.15 + 觉醒范围词条 → 一发覆盖近半战场
    const ultRadiusMusouMult = this.gameMode === 'MUSOU' ? MUSOU_TUNING.ultRadiusMult : 1;
    const R = 560 * ultRadiusMusouMult * (1 + this.sumStat('awakeningRadiusBonus') / 100);
    this.spawnShockRing(player.pos.x, player.pos.z, 14, R, 0.75, '#1a1611', 5);
    this.spawnShockRing(player.pos.x, player.pos.z, 8, R * 0.62, 0.5, '#b91c1c', 4);
    this.spawnInkBurst(player.pos, 40, '#171513');
    this.spawnInkBurst(player.pos, 22, '#b91c1c');
    this.addCrackDecal(player.pos, 1.6);
    this.addSplatDecal(player.pos, 1.8, '#1a1611', 9);
    this.addFloatingText('『万墨归宗』', player.pos.x, player.pos.y + 100, '#fbbf24', 2.0, true, true);
    sound.playCalligraphyGong('万墨归宗');
    sound.playBossWarn();

    // 全域墨浪伤害 + 击退硬直
    // 伤害大改：基础 320（原 90）× 词条攻 × 觉醒词条 × 无双连招链（连招越高奥义越重）；
    // 35% 真·暴击（这次真乘暴击倍率，原先只换红字演出不加伤）；
    // Boss/精英额外吃最大气血 6%/3% 的压制伤害——高阵 Boss 血量线性成长也压得住
    const ultMult = 1 + this.sumStat('awakeningDamageBonus') / 100;
    const baseDmg = Math.round(320 * this.getAffixDamageMultiplier() * ultMult * this.chainDmgMult);
    let fxBudget = MUSOU_TUNING.ultFxOrangeBudget; // 特效预算：前 N 只全额墨花浮字，其余静默结算（怪海帧率护栏）
    let ultHitCount = 0;
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      const d = Math.hypot(enemy.pos.x - player.pos.x, enemy.pos.z - player.pos.z);
      if (d > R) continue;
      const dirX = (enemy.pos.x - player.pos.x) / (d || 1);
      const dirZ = (enemy.pos.z - player.pos.z) / (d || 1);
      enemy.vel.x = dirX * 16;
      enemy.vel.z = dirZ * 8;
      enemy.hitStun = Math.max(enemy.hitStun, 0.95);
      enemy.maxHitStun = enemy.hitStun;
      ultHitCount++;
      const isCrit = Math.random() < 0.35;
      let dmg = isCrit ? baseDmg * this.getCritMultiplier() : baseDmg;
      if (enemy.isBoss) dmg += enemy.maxHp * 0.06;
      else if (enemy.elite) dmg += enemy.maxHp * 0.03;
      const fx: 1 | 0 = fxBudget > 0 ? (fxBudget--, 1) : 0;
      if (fx) this.spawnInkBurst(enemy.pos, 8, '#171513');
      // 觉醒墨浪全方位冲击：绕过墨盾武僧正面格挡，全额结算
      this.damageEnemy(enemy, Math.round(dmg), isCrit, 0.6, false, true, fx);
    }
    if (ultHitCount >= 18) {
      // 大范围收割演出：覆盖妖墨众多时补一次镜头冲击 + 荡字
      this.triggerZoomPunch(0.035);
      this.addFloatingText('荡', player.pos.x, player.pos.y + 130, '#fbbf24', 1.6, true, true);
    }

    // 释放后短暂无敌 + 墨意回补，鼓励绝境反打
    player.isInvincible = true;
    player.invincibleTimer = Math.max(player.invincibleTimer, 1.0);
    player.ink = Math.min(player.maxInk, player.ink + 20);
    this.emitInk();
  }

  // --- WAVE CONFIGURATION ---
  public startWave(waveNum: number) {
    this.wave = waveNum;
    this.enemiesKilledInWave = 0;
    this.enemiesSpawnedInWave = 0;
    this.eliteCountThisWave = 0;
    this.isWaveClearing = false;
    this.spawnTimer = 0.5;
    this.lastBossEmitted = '';
    this.callbacks.onBossUpdate(null);

    let title = `第${this.getChineseNumeral(waveNum)}折 · `;
    let count = 5 + waveNum * 3;
    let isBossWave = false;

    // --- 无双演武：怪海阵次生成（无通关概念，Boss 每隔一阵拦路，双/三煞同屏） ---
    if (this.gameMode === 'MUSOU') {
      const isMusouBoss = waveNum % MUSOU_TUNING.bossEveryWaves === 0;
      const tripleBoss = isMusouBoss && waveNum >= MUSOU_TUNING.tripleBossFromWave;
      const dualBoss = isMusouBoss && !tripleBoss && waveNum >= MUSOU_TUNING.dualBossFromWave;
      const isEmperor = isMusouBoss && waveNum % (MUSOU_TUNING.bossEveryWaves * 5) === 0; // 每 10 阵大帝亲临
      title = `无双·第${this.getChineseNumeral(waveNum)}阵 · `;
      if (isEmperor) {
        title += '墨煞大帝 · 亲临';
      } else if (tripleBoss) {
        title += '三煞齐临';
      } else if (dualBoss) {
        title += '双煞同临';
      } else if (isMusouBoss) {
        title += '墨煞拦路';
      } else {
        title += MUSOU_WAVE_TITLES[(waveNum - 1) % MUSOU_WAVE_TITLES.length];
      }
      count = MUSOU_TUNING.waveCountBase + waveNum * MUSOU_TUNING.waveCountPerWave;
      isBossWave = isMusouBoss;
    } else if (waveNum === 1) {
      title += '墨卒突袭';
      count = 5;
    } else if (waveNum === 2) {
      title += '墨弓飞矢';
      count = 7;
    } else if (waveNum === 3) {
      title += '巨力狂墨';
      count = 9;
    } else if (waveNum === 4) {
      title += '暗影无极';
      count = 11;
    } else if (waveNum === 6) {
      title += '墨盾结阵';
      count = 14;
    } else if (waveNum === 7) {
      title += '爆墨焚野';
      count = 17;
    } else if (waveNum === 8) {
      title += '妖道符召';
      count = 20;
    } else if (waveNum === 9) {
      title += '鹤噪墨空';
      count = 22;
    } else if (waveNum === 10) {
      // 生成器本就将 5 的倍数折视为 Boss 波（首刷即宗师）——标题同步修正为 Boss 波，砚甲龟护法随行
      title += '砚甲横江 · 宗师亲征';
      count = 16;
      isBossWave = true;
    } else if (waveNum === 11) {
      title += '醉剑狂歌';
      count = 26;
    } else if (waveNum === VICTORY_WAVE) {
      title += '墨煞大帝 · 终折';
      count = 3 + Math.floor(waveNum / 2);
      isBossWave = true;
    } else if (waveNum % 5 === 0) {
      // Boss 三强线：5折先锋→10折宗师→15折大帝；无尽 20+ 大帝再临连袭
      title += waveNum === 5 ? '墨煞先锋 · 破阵'
        : waveNum === 10 ? '墨煞宗师降临'
        : waveNum === 20 ? '墨煞大帝 · 再临'
        : `墨煞大帝 · 第${this.getChineseNumeral(waveNum / 5 - 2)}袭`;
      count = 1 + waveNum;
      isBossWave = true;
    } else {
      title += '群魔乱舞';
      count = 10 + waveNum * 2;
    }

    this.waveTitle = title;
    // 无尽模式后期波次数量软上限：压力靠敌种构成而非无界数量（防生成/清理失衡堆场）；无双阵次上限另调
    this.totalEnemiesInWave = Math.min(
      count,
      this.gameMode === 'MUSOU' ? MUSOU_TUNING.waveCountCap : 42,
    );

    // 玄武镇岳：每波开战直接获得觉醒充能
    const waveStartAwakening = this.sumStat('awakeningOnWaveStart');
    if (waveStartAwakening > 0 && waveNum > 1) {
      this.gainAwakening(waveStartAwakening);
    }

    // 凝墨为甲：波次开始时获得墨盾
    const shieldGain = this.player.affixes.reduce((s, a) => s + (a.stats.shieldOnWaveStart ?? 0), 0);
    if (shieldGain > 0) {
      this.player.shieldMax = Math.max(this.player.shieldMax, shieldGain);
      this.player.shield = Math.max(this.player.shield, shieldGain);
      this.emitShield(true);
      this.addFloatingText(`墨盾 +${shieldGain}`, this.player.pos.x, this.player.pos.y + 55, '#38bdf8', 1.2);
    }

    this.callbacks.onWaveChange(this.wave, this.waveTitle, this.totalEnemiesInWave - this.enemiesKilledInWave);
    this.callbacks.onWaveBanner(title, isBossWave);
    if (isBossWave) sound.playBossWarn();
    // 每折开战自动存档：波内阵亡/杀后台后可从本折开头续战
    if (this.hasStartedRun && !this.runEnded && !this.suppressAutoSave) {
      this.callbacks.onAutoSave?.(this.exportSnapshot());
    }
  }

  /**
   * 中文数字（支持 0 ~ 9999，万位以上兜底为阿拉伯数字）
   * 修复：原实现仅覆盖 0~99，且整十数会输出「五十零」，
   *      100 阵以上 chars[Math.floor(n/10)] 越界返回 undefined，横幅直接显示「undefined十X」。
   */
  private getChineseNumeral(n: number): string {
    const chars = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    if (!Number.isFinite(n) || n < 0) return '零';
    const i = Math.floor(n);

    if (i <= 10) return i === 10 ? '十' : chars[i];
    if (i < 20) return `十${chars[i - 10]}`;

    // 20 ~ 99
    if (i < 100) {
      const tens = Math.floor(i / 10);
      const ones = i % 10;
      return `${chars[tens]}十${ones > 0 ? chars[ones] : ''}`;
    }

    // 100 ~ 999
    if (i < 1000) {
      const hundreds = Math.floor(i / 100);
      const rest = i % 100;
      const head = `${chars[hundreds]}百`;
      if (rest === 0) return head;
      if (rest < 10) return `${head}零${chars[rest]}`;
      // 十位为 1 时保留「一」：一百一十 / 一百一十五
      const tens = Math.floor(rest / 10);
      const ones = rest % 10;
      if (tens === 1) return `${head}一十${ones > 0 ? chars[ones] : ''}`;
      return `${head}${chars[tens]}十${ones > 0 ? chars[ones] : ''}`;
    }

    // 1000 ~ 9999
    if (i < 10000) {
      const thousands = Math.floor(i / 1000);
      const rest = i % 1000;
      const head = `${chars[thousands]}千`;
      if (rest === 0) return head;
      if (rest < 100) return `${head}零${this.getChineseNumeral(rest)}`;
      return head + this.getChineseNumeral(rest);
    }

    // 一万以上（无尽极限局）兜底：直接阿拉伯数字，绝不再出现 undefined
    return String(i);
  }

  // --- ELITE MODIFIERS ---
  private makeElite(type: EnemyType): EliteInfo {
    const pool: EliteModifier[] = ['SWIFT', 'IRONCLAD', 'FRENZIED', 'SOULSIP'];
    const modifier = pool[Math.floor(Math.random() * pool.length)];
    switch (modifier) {
      case 'SWIFT':
        return { modifier, name: '迅捷', hanzi: '迅', color: '#f97316' };
      case 'IRONCLAD':
        return { modifier, name: '铁壁', hanzi: '岳', color: '#94a3b8' };
      case 'FRENZIED':
        return { modifier, name: '狂暴', hanzi: '狂', color: '#ef4444' };
      case 'SOULSIP':
        return { modifier, name: '汲影', hanzi: '汲', color: '#a855f7' };
    }
  }

  private spawnNextEnemy(): boolean {
    if (this.enemiesSpawnedInWave >= this.totalEnemiesInWave) return true;

    // Boss 波判定：经典每 5 折（含终折 15）；无双每隔一阵（Boss 海）
    const isBossWave = this.gameMode === 'MUSOU'
      ? this.wave % MUSOU_TUNING.bossEveryWaves === 0
      : this.wave % 5 === 0 || this.wave === VICTORY_WAVE;
    // 无双双/三煞：第 5 阵起 Boss 波双煞同屏，第 13 阵起三煞齐临（血量各自独享 tier 乘减）
    const musouBossQuota = this.gameMode === 'MUSOU'
      ? (this.wave >= MUSOU_TUNING.tripleBossFromWave ? 3 : this.wave >= MUSOU_TUNING.dualBossFromWave ? 2 : 1)
      : 1;
    // Boss 本体豁免同屏上限（否则 Boss 波开场即被拥挤保护卡住）
    const willBeBoss = isBossWave && (this.gameMode === 'MUSOU'
      ? this.enemiesSpawnedInWave < musouBossQuota
      : this.enemiesSpawnedInWave === 0);

    // 同屏拥挤保护：存活妖墨达上限时推迟生成（不消耗波次配额，防无尽后期堆积压垮帧率→卡死）
    if (!willBeBoss) {
      let alive = 0;
      for (let i = 0; i < this.enemies.length; i++) {
        if (this.enemies[i].hp > 0) alive++;
      }
      if (alive >= this.maxAliveEnemies) return false;
    }

    this.enemiesSpawnedInWave++;
    const isBoss = isBossWave && (this.gameMode === 'MUSOU'
      ? this.enemiesSpawnedInWave <= musouBossQuota
      : this.enemiesSpawnedInWave === 1);

    let type: EnemyType = 'INK_MINION';
    if (isBoss) {
      type = 'INK_BOSS';
    } else if (this.gameMode === 'MUSOU') {
      // 无双怪海池：炮灰权重放大（MINION 主导），机制敌点缀且全解锁提前——
      // 割草节奏里机制敌是「调料」而非「主菜」，重度坦克/召唤克制堆场
      const pool: { type: EnemyType; w: number }[] = [{ type: 'INK_MINION', w: 20 }];
      if (this.wave >= 2) pool.push({ type: 'INK_ARCHER', w: 5 });
      if (this.wave >= 3) pool.push({ type: 'INK_BRUTE', w: 3.5 });
      if (this.wave >= 4) pool.push({ type: 'SHADOW_NINJA', w: 4 });
      if (this.wave >= 5) pool.push({ type: 'INK_BOMBER', w: 4 });
      if (this.wave >= 6) pool.push({ type: 'INK_SHIELD_GUARD', w: 3 });
      if (this.wave >= 7) pool.push({ type: 'INK_SUMMONER', w: 1.5 });
      if (this.wave >= 8) pool.push({ type: 'INK_CRANE', w: 2.5 });
      if (this.wave >= 9) pool.push({ type: 'INK_TURTLE', w: 1.5 });
      if (this.wave >= 10) pool.push({ type: 'INK_DRUNKARD', w: 3 });
      let filtered = pool;
      if (this.enemies.some((e) => e.type === 'INK_SUMMONER' && e.hp > 0)) {
        filtered = filtered.filter((p) => p.type !== 'INK_SUMMONER');
      }
      if (this.enemies.some((e) => e.type === 'INK_TURTLE' && e.hp > 0)) {
        filtered = filtered.filter((p) => p.type !== 'INK_TURTLE');
      }
      if (this.enemies.filter((e) => e.type === 'INK_CRANE' && e.hp > 0).length >= 2) {
        filtered = filtered.filter((p) => p.type !== 'INK_CRANE');
      }
      const totalW = filtered.reduce((s, p) => s + p.w, 0);
      let roll = Math.random() * totalW;
      for (const p of filtered) {
        roll -= p.w;
        if (roll <= 0) {
          type = p.type;
          break;
        }
      }
    } else {
      // 加权生成池：随折数逐步解锁新妖墨（机制互补：近战/远程/重击/背刺/自爆/格挡/召唤）
      const pool: { type: EnemyType; w: number }[] = [{ type: 'INK_MINION', w: 10 }];
      if (this.wave >= 2) pool.push({ type: 'INK_ARCHER', w: 6 });
      if (this.wave >= 3) pool.push({ type: 'INK_BRUTE', w: 4.5 });
      if (this.wave >= 4) pool.push({ type: 'SHADOW_NINJA', w: 5 });
      if (this.wave >= 5) pool.push({ type: 'INK_BOMBER', w: 4 });
      if (this.wave >= 6) pool.push({ type: 'INK_SHIELD_GUARD', w: 4 });
      if (this.wave >= 8) pool.push({ type: 'INK_SUMMONER', w: 3 });
      if (this.wave >= 9) pool.push({ type: 'INK_CRANE', w: 3.5 });
      if (this.wave >= 10) pool.push({ type: 'INK_TURTLE', w: 3 });
      if (this.wave >= 11) pool.push({ type: 'INK_DRUNKARD', w: 3.5 });
      // 第十折「砚甲横江」：护法以砚甲龟为主题（同屏仍限一只）
      if (this.wave === 10) pool.push({ type: 'INK_TURTLE', w: 14 });
      // 符笔妖道同屏至多一位（超出则回退墨卒，避免召唤海啸）；砚台龟同理（反震坦克堆场拖慢节奏）
      let filtered = pool;
      if (this.enemies.some((e) => e.type === 'INK_SUMMONER' && e.hp > 0)) {
        filtered = filtered.filter((p) => p.type !== 'INK_SUMMONER');
      }
      if (this.enemies.some((e) => e.type === 'INK_TURTLE' && e.hp > 0)) {
        filtered = filtered.filter((p) => p.type !== 'INK_TURTLE');
      }
      // 飞白鹤同屏至多两只（俯冲压制过重）
      if (this.enemies.filter((e) => e.type === 'INK_CRANE' && e.hp > 0).length >= 2) {
        filtered = filtered.filter((p) => p.type !== 'INK_CRANE');
      }
      const totalW = filtered.reduce((s, p) => s + p.w, 0);
      let roll = Math.random() * totalW;
      for (const p of filtered) {
        roll -= p.w;
        if (roll <= 0) {
          type = p.type;
          break;
        }
      }
    }

    // Spawn from left or right edge of pseudo-3D arena
    const spawnSide = Math.random() > 0.5 ? 1 : -1;
    const spawnX = this.player.pos.x + spawnSide * (this.screenWidth * 0.55 + Math.random() * 80);
    const spawnZ = (Math.random() - 0.5) * 220;

    // 精英词缀掷骰（第3折起，Boss波不出；无双节奏快上限放宽到 4）
    let elite: EliteInfo | null = null;
    if (!isBoss && this.wave >= 3 && this.eliteCountThisWave < (this.gameMode === 'MUSOU' ? MUSOU_TUNING.eliteCap : 2)) {
      const eliteChance = Math.min(0.25, 0.1 + this.wave * 0.012);
      if (Math.random() < eliteChance) {
        elite = this.makeElite(type);
        this.eliteCountThisWave++;
      }
    }

    this.spawnEnemyAt(type, spawnX, spawnZ, isBoss, elite);
    return true;
  }

  /** 敌人显示名 */
  private enemyDisplayName(type: EnemyType, isBoss: boolean): string {
    if (isBoss) {
      // Boss 三强线：按折数分级（无双 Boss 海节奏再加速：≥10 阵即大帝、≥5 阵宗师）
      if (this.gameMode === 'MUSOU') {
        if (this.wave >= 10) return '墨煞大帝';
        if (this.wave >= 5) return '墨煞宗师';
        return '墨煞先锋';
      }
      if (this.wave < 10) return '墨煞先锋';
      if (this.wave < 15) return '墨煞宗师';
      return '墨煞大帝';
    }
    switch (type) {
      case 'INK_BRUTE': return '巨力狂墨';
      case 'SHADOW_NINJA': return '暗影刺客';
      case 'INK_ARCHER': return '墨羽弓手';
      case 'INK_BOMBER': return '爆墨傀儡';
      case 'INK_SHIELD_GUARD': return '墨盾武僧';
      case 'INK_SUMMONER': return '符笔妖道';
      case 'INK_CRANE': return '飞白鹤';
      case 'INK_TURTLE': return '砚台龟';
      case 'INK_DRUNKARD': return '醉墨剑客';
      default: return '普通墨卒';
    }
  }

  private spawnEnemyAt(type: EnemyType, spawnX: number, spawnZ: number, isBoss: boolean = false, elite: EliteInfo | null = null) {
    const tune = DIFFICULTY_TUNING[this.difficulty];
    const isMusou = this.gameMode === 'MUSOU';
    // 无双怪海：敌方数值全局乘减（割草爽感 + 高频围攻的生存空间）
    const musouHpMult = isMusou ? MUSOU_TUNING.enemyHpMult : 1;
    const musouDmgMult = isMusou ? MUSOU_TUNING.enemyDmgMult : 1;
    let hp = 45 + this.wave * 12;
    let damage = 12 + this.wave * 2;
    let scale = 1.0;
    let bossTierOf: BossTier | undefined;

    if (type === 'INK_BRUTE') {
      hp = 140 + this.wave * 25;
      damage = 25 + this.wave * 4;
      scale = 1.35;
    } else if (type === 'SHADOW_NINJA') {
      hp = 60 + this.wave * 10;
      damage = 18 + this.wave * 3;
      scale = 0.95;
    } else if (type === 'INK_BOMBER') {
      // 脆皮高速，爆炸伤害高（伤及敌群可借刀杀人）
      hp = 32 + this.wave * 7;
      damage = 26 + this.wave * 4;
      scale = 0.92;
    } else if (type === 'INK_SHIELD_GUARD') {
      hp = 115 + this.wave * 22;
      damage = 20 + this.wave * 3;
      scale = 1.15;
    } else if (type === 'INK_SUMMONER') {
      hp = 60 + this.wave * 10;
      damage = 13 + this.wave * 2; // 追踪符珠单发伤害
      scale = 1.0;
    } else if (type === 'INK_CRANE') {
      // 飞白鹤：空中盘旋俯冲，落地喘息时是最佳输出窗口
      hp = 55 + this.wave * 11;
      damage = 20 + this.wave * 3;
      scale = 0.95;
    } else if (type === 'INK_TURTLE') {
      // 砚台龟：反震龟壳坦克，慢速高血
      hp = 180 + this.wave * 30;
      damage = 22 + this.wave * 3;
      scale = 1.28;
    } else if (type === 'INK_DRUNKARD') {
      // 醉墨剑客：摇摆闪避，近身连斩
      hp = 70 + this.wave * 13;
      damage = 16 + this.wave * 3;
      scale = 1.0;
    } else if (type === 'INK_BOSS') {
      // Boss 三强线数值分层：先锋（快攻型）＜ 宗师（标准）＜ 大帝（终折三阶段）
      // 无双 Boss 海节奏：tier 抬升提前（≥5 阵宗师、≥10 阵大帝），多煞同屏血量另乘 0.52 防磨血拖节奏
      const bossTier: BossTier = isMusou
        ? (this.wave >= 10 ? 3 : this.wave >= 5 ? 2 : 1)
        : (this.wave >= 15 ? 3 : this.wave >= 10 ? 2 : 1);
      if (bossTier === 1) {
        hp = 280 + this.wave * 50;
        damage = 26 + this.wave * 4;
        scale = 1.38;
      } else if (bossTier === 2) {
        hp = 460 + this.wave * 75;
        damage = 34 + this.wave * 5;
        scale = 1.6;
      } else {
        hp = 620 + this.wave * 95;
        damage = 40 + this.wave * 6;
        scale = 1.75;
      }
      if (isMusou) {
        hp *= MUSOU_TUNING.bossHpMult;
        damage *= MUSOU_TUNING.enemyDmgMult;
      }
      bossTierOf = bossTier;
    }

    hp *= tune.enemyHp * musouHpMult;
    damage *= tune.enemyDmg * musouDmgMult;

    // 精英属性加成
    if (elite) {
      scale *= 1.12;
      if (elite.modifier === 'IRONCLAD') hp *= 1.9;
      if (elite.modifier === 'SWIFT') hp *= 0.9;
      if (elite.modifier === 'FRENZIED') damage *= 1.5;
    }

    hp = Math.round(hp);
    damage = Math.round(damage);

    const enemy: EnemyEntity = {
      id: Math.random().toString(),
      type,
      name: (elite ? `${elite.name}·` : '') + this.enemyDisplayName(type, isBoss),
      pos: { x: spawnX, y: 0, z: spawnZ },
      vel: { x: 0, y: 0, z: 0 },
      facing: spawnX > this.player.pos.x ? -1 : 1,
      hp,
      maxHp: hp,
      damage,
      state: 'IDLE',
      stateTimer: 0,
      stateDuration: 0,
      attackCooldown: 1.0 + Math.random() * 1.5,
      hitStun: 0,
      isAirborne: false,
      scale,
      isBoss,
      bossTier: bossTierOf,
      elite,
      frostSlowTimer: 0,
      burnTimer: 0,
      burnTickTimer: 0,
      windupTimer: 0,
      windupMax: 0,
      teleportCooldown: type === 'SHADOW_NINJA' ? 4 + Math.random() * 3 : undefined,
      deathTimer: 0,
      spawnGrace: this.gameMode === 'MUSOU' ? MUSOU_TUNING.spawnGraceSec : 0.6,
      bossPhase: isBoss ? 1 : undefined,
      // 三新敌专属初始化
      cranePhase: type === 'INK_CRANE' ? 'HOVER' : undefined,
      craneTimer: type === 'INK_CRANE' ? 1.0 + Math.random() * 1.5 : undefined,
      dodgeCooldown: type === 'INK_DRUNKARD' ? 1.2 : undefined,
      swayPhase: type === 'INK_DRUNKARD' ? Math.random() * Math.PI * 2 : undefined,
    };
    // 飞白鹤从空中入场（y 重力在 AI 分支内显式接管）
    if (type === 'INK_CRANE') {
      enemy.pos.y = 74;
      enemy.isAirborne = true;
    }

    if (isBoss) {
      // Boss 三强线技能组：先锋=突进快攻 / 宗师=震地+散射+召唤 / 大帝=全套+三阶段墨雨
      if (bossTierOf === 1) {
        enemy.bossSkills = [
          { skill: 'CHARGE_RUSH', timer: 4.0, windup: 0, active: 0 },
          { skill: 'SEISMIC_SLAM', timer: 7.0, windup: 0, active: 0 },
          { skill: 'SUMMON', timer: 12, windup: 0, active: 0 },
        ];
      } else if (bossTierOf === 2) {
        enemy.bossSkills = [
          { skill: 'SEISMIC_SLAM', timer: 4.5, windup: 0, active: 0 },
          { skill: 'INK_VOLLEY', timer: 6.5, windup: 0, active: 0 },
          { skill: 'SUMMON', timer: 9, windup: 0, active: 0 },
        ];
      } else {
        enemy.bossSkills = [
          { skill: 'SEISMIC_SLAM', timer: 5.0, windup: 0, active: 0 },
          { skill: 'INK_VOLLEY', timer: 7.0, windup: 0, active: 0 },
          { skill: 'SUMMON', timer: 10, windup: 0, active: 0 },
          { skill: 'INK_RAIN', timer: 14, windup: 0, active: 0 },
        ];
      }
      this.activeBoss = enemy;
      this.callbacks.onBossUpdate({ name: enemy.name, hp: enemy.hp, maxHp: enemy.maxHp, phase: 1 });
      this.lastBossEmitted = enemy.id;
      // 无双双 Boss：第二只入场播报名演出（HUD 血条切至新 Boss，先前的击杀后自动接力）
      if (this.gameMode === 'MUSOU') {
        const dualBossAlive = this.enemies.filter((e) => e.isBoss && e.hp > 0).length + 1;
        if (dualBossAlive >= 2) {
          this.addFloatingText('双煞齐至！', enemy.pos.x, enemy.pos.y + 100, '#dc2626', 1.8, true, true);
          sound.playBossWarn();
        }
      }
    }

    this.enemies.push(enemy);
    if (elite) {
      this.addFloatingText(`${elite.name}精锐现身！`, enemy.pos.x, enemy.pos.y + 80, elite.color, 1.3, true);
    }
  }

  // --- CONTROLS & EVENT BINDINGS ---
  private setupEvents() {
    const onKeyDown = (e: KeyboardEvent) => {
      this.keys[e.key.toLowerCase()] = true;

      // ESC 暂停/继续
      if (e.key === 'Escape') {
        e.preventDefault();
        this.togglePause();
        return;
      }

      if (this.isPaused || this.runEnded) return;

      // Quick hotkeys for gestures
      if (e.key.toLowerCase() === 'j') {
        this.triggerGestureDirect('TAP');
      } else if (e.key.toLowerCase() === 'u') {
        this.triggerGestureDirect('HORIZONTAL');
      } else if (e.key.toLowerCase() === 'i') {
        this.triggerGestureDirect('VERTICAL_DOWN');
      } else if (e.key.toLowerCase() === 'o') {
        this.triggerGestureDirect('CIRCLE');
      } else if (e.key.toLowerCase() === 'l') {
        this.triggerGestureDirect('ZIGZAG');
      } else if (e.code === 'Space' || e.key.toLowerCase() === 'k') {
        this.triggerJump();
      } else if (e.key.toLowerCase() === 'g') {
        // 觉醒技「万墨归宗」：满槽释放全屏墨爆
        this.triggerAwakening();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      this.keys[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    this.eventCleanupFns.push(() => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    });

    // Multi-touch isolated Canvas Pointer events
    const onPointerDown = (e: PointerEvent) => {
      if (this.isPaused || this.runEnded) return;
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (this.controlMode === 'FULL_GESTURE') {
        // FULL_GESTURE mode: Entire screen is active calligraphy canvas & slide-to-move
        if (this.drawPointerId === null) {
          this.drawPointerId = e.pointerId;
          this.isDrawingStroke = true;
          this.activeStroke = [{ x, y, t: performance.now() }];
          const worldPos = this.unproject(x, y);
          this.slideTarget = worldPos;
          this.isSlidingMove = true;
          sound.playBrushDraw();
        }
      } else {
        // SPLIT_SCREEN mode: Left half is joystick, right half is calligraphy
        const isLeftHalf = x < this.screenWidth * 0.48;

        if (isLeftHalf) {
          if (this.movePointerId === null) {
            this.movePointerId = e.pointerId;
            this.touchMoveOrigin = { x, y };
            this.touchMoveCurrent = { x, y };
            this.touchMoveActive = true;
            this.moveStartTime = performance.now();
          }
        } else {
          if (this.drawPointerId === null) {
            this.drawPointerId = e.pointerId;
            this.isDrawingStroke = true;
            this.activeStroke = [{ x, y, t: performance.now() }];
            sound.playBrushDraw();
          }
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // STRICT ISOLATION BY POINTER ID:
      // Movement pointer ONLY controls the virtual joystick (X / Z planar movement)
      if (e.pointerId === this.movePointerId) {
        if (this.touchMoveActive && this.touchMoveOrigin) {
          this.touchMoveCurrent = { x, y };
        }
      }
      // Drawing pointer adds brush stroke points and updates slide target
      else if (e.pointerId === this.drawPointerId) {
        if (this.isDrawingStroke) {
          // 长拖拽保护：笔迹超限时淘汰最旧四分之一（防内存与识别耗时无界增长）
          if (this.activeStroke.length >= 320) this.activeStroke.splice(0, 80);
          this.activeStroke.push({ x, y, t: performance.now() });
          if (this.controlMode === 'FULL_GESTURE') {
            const worldPos = this.unproject(x, y);
            this.slideTarget = worldPos;
          }
          if (this.activeStroke.length % 4 === 0) {
            sound.playBrushDraw();
          }
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      // Release movement joystick
      if (e.pointerId === this.movePointerId) {
        // Only trigger jump if user performed a distinct, rapid flick-up on release
        if (this.touchMoveOrigin && this.touchMoveCurrent) {
          const dy = this.touchMoveCurrent.y - this.touchMoveOrigin.y;
          const dt = performance.now() - this.moveStartTime;
          if (dy < -45 && dt < 280 && this.player.pos.y === 0) {
            this.triggerJump();
          }
        }

        this.movePointerId = null;
        this.touchMoveActive = false;
        this.touchMoveOrigin = null;
        this.touchMoveCurrent = null;
      }

      // Finalize and recognize calligraphy gesture & arrival attack
      if (e.pointerId === this.drawPointerId) {
        this.drawPointerId = null;
        this.isDrawingStroke = false;
        this.isSlidingMove = false;
        if (this.activeStroke.length > 0) {
          this.finalizeStroke(this.activeStroke);
          this.activeStroke = [];
        }
      }
    };

    const onPointerCancel = (e: PointerEvent) => {
      onPointerUp(e);
    };

    const onWindowBlur = () => {
      this.resetTouches();
      // 战斗中失焦自动暂停，防止回来时已被围殴
      if (this.isRunning && this.hasStartedRun && !this.isPaused && !this.runEnded) {
        this.togglePause();
      }
    };

    // 移动端切后台（visibilitychange 比 blur 更可靠，iOS Safari 切后台常不触发 blur）：
    // 隐藏时自动暂停 + 释放触点；回前台时重置时间基准并唤醒音频（防大帧跳变与 AudioContext 挂起）
    const onVisibilityChange = () => {
      if (document.hidden) {
        this.resetTouches();
        if (this.isRunning && this.hasStartedRun && !this.isPaused && !this.runEnded) {
          this.togglePause();
        }
      } else {
        this.lastTime = performance.now();
        sound.unlock();
      }
    };

    this.canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);

    this.eventCleanupFns.push(() => {
      this.canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    });
  }

  /** 标记本局是否真正开始（区分标题界面与战斗中的失焦暂停） */
  public hasStartedRun: boolean = false;

  public markRunStarted() {
    this.hasStartedRun = true;
    sound.unlock();
  }

  public resetTouches() {
    this.movePointerId = null;
    this.drawPointerId = null;
    this.touchMoveActive = false;
    this.touchMoveOrigin = null;
    this.touchMoveCurrent = null;
    this.isDrawingStroke = false;
    this.isSlidingMove = false;
    this.slideTarget = null;
    this.activeStroke = [];
  }

  public triggerJump() {
    if (this.isPaused || this.runEnded) return;
    if (this.player.pos.y > 2) return;
    this.player.vel.y = 12.5;
    this.player.state = 'JUMP_UP';
    this.player.stateTimer = 0;
    this.player.stateDuration = 0.5;
    sound.playJump();
  }

  private finalizeStroke(points: StrokePoint[]) {
    if (!points || points.length === 0) return;
    if (this.isPaused || this.runEnded) return;

    const result = GestureRecognizer.recognize(points);
    if (!result) return;

    const pStart = points[0];
    const pEnd = points[points.length - 1];
    const totalDist = Math.hypot(pEnd.x - pStart.x, pEnd.y - pStart.y);

    // Detect if this stroke sliced through any enemies on screen
    interface SlicedTarget {
      enemy: EnemyEntity;
      hitIndex: number;
      /** 画龙点睛：笔迹精确划过该敌头顶要穴（需持有词条） */
      eye: boolean;
    }
    const slicedTargets: SlicedTarget[] = [];
    // 点睛词条持有判定（每笔一次）
    const eyeEnabled = this.player.affixes.some((a) => a.stats.eyeStrikeEnabled);

    for (const enemy of this.enemies) {
      if (enemy.hp <= 0 || (enemy.spawnGrace ?? 0) > 0.3) continue;
      const proj = this.project(enemy.pos);
      const targetX = proj.sx;
      const targetY = proj.sy - 28 * proj.scale;
      const targetRadius = 48 * proj.scale * enemy.scale;

      // 头部要穴屏幕坐标（骷髅头顶约在脚底上方 70 刚体单位，含斗笠判定略放宽）
      const headX = proj.sx;
      const headY = proj.sy - 70 * proj.scale * enemy.scale;
      const headRadius = 12.5 * proj.scale * enemy.scale;

      let minHitIdx = -1;
      let eyeHit = false;

      // Check single-point / short tap directly on target
      if (points.length <= 2 || totalDist < 25) {
        const d = Math.hypot(targetX - pStart.x, targetY - pStart.y);
        if (d <= targetRadius) {
          minHitIdx = 0;
        }
        if (eyeEnabled && Math.hypot(headX - pStart.x, headY - pStart.y) <= headRadius) {
          eyeHit = true;
        }
      } else {
        // Multi-point stroke line segments
        for (let i = 1; i < points.length; i++) {
          const d = this.distToSegment(targetX, targetY, points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
          if (d <= targetRadius) {
            minHitIdx = i;
            break;
          }
        }
        // 点睛判定独立于躯干命中：全笔迹扫过头部小圆域即算（后段收笔点穴同样成立）
        if (eyeEnabled) {
          for (let i = 1; i < points.length; i++) {
            const d = this.distToSegment(headX, headY, points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
            if (d <= headRadius) {
              eyeHit = true;
              break;
            }
          }
        }
      }

      if (minHitIdx >= 0) {
        slicedTargets.push({ enemy, hitIndex: minHitIdx, eye: eyeHit });
      }
    }

    // Sort sliced targets in the exact chronological order the stroke hit them
    slicedTargets.sort((a, b) => a.hitIndex - b.hitIndex);
    const slicedEnemies = slicedTargets.map((t) => t.enemy);

    // 1. Sliced through one or more enemies: TRIGGER PHANTOM SLICE CHAIN! (划敌瞬杀连击)
    if (slicedEnemies.length > 0) {
      this.callbacks.onGestureRecognized(result);
      sound.playCalligraphyGong(result.name);
      this.executePhantomSliceChain(slicedTargets, result);
      return;
    }

    // 2. In FULL_GESTURE mode: "滑到哪角色就到哪，到达后自动拔剑释放一次攻击"
    if (this.controlMode === 'FULL_GESTURE') {
      const targetWorld = this.unproject(pEnd.x, pEnd.y);
      this.executeArrivalMovementAndStrike(targetWorld.x, targetWorld.z, result);
      return;
    }

    // 3. Normal gesture release in air (SPLIT_SCREEN mode)
    this.callbacks.onGestureRecognized(result);
    sound.playCalligraphyGong(result.name);
    this.executeGestureMove(result);
  }

  private executePhantomSliceChain(targets: { enemy: EnemyEntity; eye: boolean }[], gesture: GestureResult) {
    const player = this.player;

    // Ink cost（无双墨耗减免：招式循环永动机）
    const inkCost = this.musouInk(gesture.type === 'TAP' ? 6 : gesture.type === 'CIRCLE' ? 22 : 15);
    if (player.ink < inkCost) {
      this.addFloatingText('内力不济', player.pos.x, player.pos.y + 60, '#ef4444', 1.2);
      return;
    }
    player.ink = Math.max(0, player.ink - inkCost);
    this.emitInk();

    // 无双连招链登记：变招（交替不同招式）涨层更快 → 伤害/范围滚雪球
    this.registerGestureChain(gesture.type);

    // Calligraphy banner display
    this.addFloatingText(`${gesture.name} · 瞬华连斩`, player.pos.x, player.pos.y + 70, '#f59e0b', 1.6, true, true);

    // 1. IMMEDIATELY create full chain connecting lines between player and all sliced targets!
    let prevScreen = this.project(player.pos);
    const sealChars = ['斩', '裂', '断', '破', '绝', '煞', '影'];

    targets.forEach((target, i) => {
      const targetScreen = this.project(target.enemy.pos);
      const sealHanzi = sealChars[i % sealChars.length];
      this.slashLinks.push({
        id: Math.random().toString(),
        from: { x: prevScreen.sx, y: prevScreen.sy - 25 },
        to: { x: targetScreen.sx, y: targetScreen.sy - 25 },
        alpha: 1.0,
        maxAlpha: 1.0,
        color: i % 2 === 0 ? '#b91c1c' : '#38bdf8',
        width: 10,
        hanzi: sealHanzi,
      });
      prevScreen = targetScreen;
    });

    // 2. High-speed consecutive blitz execution through all targets (暂停安全调度)
    // 无双：斩击间隔更短（0.06s），连续斩如疾风骤雨
    const blitzGap = this.gameMode === 'MUSOU' ? 0.06 : 0.085;
    const comboPoses: ActionState[] = [
      'ATTACK_THRUST',
      'ATTACK_HORIZONTAL',
      'ATTACK_LAUNCH',
      'ATTACK_VERTICAL',
      'ATTACK_TAICHI',
    ];

    targets.forEach((target, idx) => {
      const enemy = target.enemy;
      this.schedule(idx * blitzGap, () => {
        if (enemy.hp <= 0 && idx > 0) return;

        const prevPlayerPos = { ...player.pos };

        // Instant dash adjacent to enemy
        const attackSide = enemy.pos.x > player.pos.x ? -1 : 1;
        player.pos.x = enemy.pos.x + attackSide * 36;
        player.pos.y = enemy.pos.y;
        player.pos.z = enemy.pos.z;
        player.facing = attackSide < 0 ? 1 : -1;

        // Spawn 6 high-fidelity ink afterimages (墨韵残影) along trajectory
        for (let i = 1; i <= 6; i++) {
          const ratio = i / 6;
          const ghostX = prevPlayerPos.x + (player.pos.x - prevPlayerPos.x) * ratio;
          const ghostY = prevPlayerPos.y + (player.pos.y - prevPlayerPos.y) * ratio;
          const ghostZ = prevPlayerPos.z + (player.pos.z - prevPlayerPos.z) * ratio;

          this.dashGhosts.push({
            id: Math.random().toString(),
            x: ghostX,
            y: ghostY,
            z: ghostZ,
            facing: player.facing,
            state: 'ATTACK_DASH',
            stateTimer: 0.1,
            stateDuration: 0.3,
            alpha: 0.85 * ratio,
            maxAlpha: 0.85,
            color: '#1a1917',
          });
        }

        // Set dynamic martial arts animation pose（无双收招更快）
        player.state = comboPoses[idx % comboPoses.length];
        player.stateTimer = 0;
        player.stateDuration = this.poseDur(0.28);
        player.isInvincible = true;
        player.invincibleTimer = 0.35;

        // Damage calculation (手势加成 + 暴伤词条全量生效)
        const baseDmg = 42 * this.getAffixDamageMultiplier() * this.getGestureDamageMultiplier() * (1 + idx * 0.35);
        let critChance = 0.3;
        for (const a of player.affixes) {
          if (a.stats.critChanceBonus) critChance += a.stats.critChanceBonus;
        }
        // 画龙点睛：笔锋划过头顶要穴——必定会心，伤害额外提升（eyeStrikeBonus 词条）
        const eyeBonus = target.eye ? this.sumStat('eyeStrikeBonus') : 0;
        const isCrit = target.eye || Math.random() < critChance;
        const finalDmg = Math.round(isCrit ? baseDmg * this.getCritMultiplier() * (1 + eyeBonus / 100) : baseDmg);

        this.damageEnemy(enemy, finalDmg, isCrit, undefined, true);

        // 点睛演出：朱砂点穴墨花 + 印章浮字（先于躯干特效，突出命中位置在头顶）
        if (target.eye) {
          this.addFloatingText('点睛', enemy.pos.x, enemy.pos.y + 76, '#b91c1c', 1.5, true, true);
          this.spawnInkBurst({ x: enemy.pos.x, y: enemy.pos.y + 64, z: enemy.pos.z }, 12, '#b91c1c');
        }

        // 招式专属剑弧 + 高密度墨花（连斩每一击都有独立笔刷特效）
        this.spawnInkSlash(enemy.pos.x, enemy.pos.y + 24, enemy.pos.z, this.slashKindOf(player.state), player.facing, 0.95,
          idx % 2 === 0 ? '#b91c1c' : '#1c1712');

        // Splatter bursts at impact point
        this.spawnInkBurst(enemy.pos, 14, '#171513');
        this.spawnInkBurst(enemy.pos, 8, idx % 2 === 0 ? '#b91c1c' : '#38bdf8');

        // Motion & Impact feedback
        if (player.state === 'ATTACK_LAUNCH') {
          enemy.vel.y = 15;
          enemy.vel.x = player.facing * 5;
        } else if (player.state === 'ATTACK_VERTICAL') {
          enemy.vel.y = 2;
          this.cameraShake = 18;
          this.spawnGroundSlamWave(enemy.pos, player.facing);
          this.addCrackDecal(enemy.pos, 1.1);
          this.spawnShockRing(enemy.pos.x, enemy.pos.z, 6, 88, 0.5, '#3a2f22', 3);
          this.triggerZoomPunch(0.03);
        } else {
          enemy.vel.x = player.facing * 12;
          enemy.vel.y = 4;
        }

        this.hitStopTimer = this.gameMode === 'MUSOU' ? MUSOU_TUNING.hitStopSec : 0.08;
        this.cameraShake = Math.max(this.cameraShake, 12 + idx * 3);
        sound.playHit(isCrit);
        sound.playSlash('heavy');

        player.comboCount += 1;
        player.comboTimer = this.gameMode === 'MUSOU' ? MUSOU_TUNING.comboWindowSec : 3.0;
        player.maxCombo = Math.max(player.maxCombo, player.comboCount);
        this.callbacks.onComboChange(player.comboCount);

        // Lifesteal
        this.applyLifesteal(finalDmg);
      });
    });
  }

  private executeArrivalMovementAndStrike(targetX: number, targetZ: number, gesture?: GestureResult) {
    const player = this.player;

    const finalX = Math.max(-1200, Math.min(1200, targetX));
    const finalZ = Math.max(-130, Math.min(130, targetZ));

    const prevX = player.pos.x;
    const prevZ = player.pos.z;
    const dx = finalX - prevX;
    const dz = finalZ - prevZ;
    const dist = Math.hypot(dx, dz);

    // If moved, leave high-speed martial arts dash ghosts (墨韵残影)
    if (dist > 25) {
      const ghostCount = Math.min(6, Math.max(2, Math.floor(dist / 45)));
      for (let i = 1; i <= ghostCount; i++) {
        const ratio = i / ghostCount;
        this.dashGhosts.push({
          id: Math.random().toString(),
          x: prevX + dx * ratio,
          y: player.pos.y,
          z: prevZ + dz * ratio,
          facing: dx >= 0 ? 1 : -1,
          state: 'ATTACK_DASH',
          stateTimer: 0.1,
          stateDuration: 0.25,
          alpha: 0.85 * ratio,
          maxAlpha: 0.85,
          color: '#1a1917',
        });
      }

      // 掠影无踪：滑步路径割伤
      const hasDashStrike = player.affixes.some((a) => a.stats.dashStrikeEnabled);
      if (hasDashStrike) {
        for (const enemy of this.enemies) {
          if (enemy.hp <= 0) continue;
          // 距离滑步线段的近似判定
          const t = Math.max(0, Math.min(1, ((enemy.pos.x - prevX) * dx + (enemy.pos.z - prevZ) * dz) / (dist * dist || 1)));
          const px = prevX + dx * t;
          const pz = prevZ + dz * t;
          if (Math.hypot(enemy.pos.x - px, enemy.pos.z - pz) < 42) {
            this.damageEnemy(enemy, Math.round(16 * this.getAffixDamageMultiplier()), false, 0.3);
          }
        }
      }
    }

    // Move to arrival point
    player.pos.x = finalX;
    player.pos.z = finalZ;
    if (Math.abs(dx) > 8) {
      player.facing = dx >= 0 ? 1 : -1;
    }
    this.slideTarget = null;

    // Airborne plunge slam
    const isAirborne = player.pos.y > 5;
    if (isAirborne) {
      player.pos.y = 0;
      player.vel.y = 0;
      this.cameraShake = 16;
      this.spawnGroundSlamWave(player.pos, player.facing);
      this.addCrackDecal(player.pos, 1.25);
      this.spawnShockRing(player.pos.x, player.pos.z, 6, 105, 0.55, '#3a2f22', 3.5);
      this.triggerZoomPunch(0.035);
      this.addFloatingText('千斤坠 · 震岳', player.pos.x, player.pos.y + 65, '#f59e0b', 1.45, true);
    }

    // Check if there are enemies nearby within auto-target attack range（无双索敌半径扩大，滑到即战）
    let nearestEnemy: EnemyEntity | null = null;
    let minEnemyDist = Infinity;
    const autoTargetRange = this.gameMode === 'MUSOU' ? 230 : 175;
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      const edx = enemy.pos.x - player.pos.x;
      const edz = enemy.pos.z - player.pos.z;
      const ed = Math.hypot(edx, edz);
      if (ed < autoTargetRange && ed < minEnemyDist) {
        minEnemyDist = ed;
        nearestEnemy = enemy;
      }
    }

    if (nearestEnemy) {
      player.facing = nearestEnemy.pos.x >= player.pos.x ? 1 : -1;
    }

    // Automatically unleash arrival strike
    const attackStances: ActionState[] = ['ATTACK_HORIZONTAL', 'ATTACK_THRUST', 'ATTACK_DASH'];
    const chosenPose = isAirborne
      ? 'ATTACK_VERTICAL'
      : gesture && gesture.type === 'VERTICAL_DOWN'
      ? 'ATTACK_VERTICAL'
      : gesture && gesture.type === 'CIRCLE'
      ? 'ATTACK_TAICHI'
      : gesture && gesture.type === 'DIAGONAL_UP'
      ? 'ATTACK_LAUNCH'
      : attackStances[Math.floor(Math.random() * attackStances.length)];

    player.state = chosenPose;
    player.stateTimer = 0;
    player.stateDuration = this.poseDur(0.32);
    player.isInvincible = true;
    player.invincibleTimer = 0.35;

    // 落地斩专属剑弧（千斤坠为力劈，其余随机挥砍形态）
    this.spawnInkSlash(player.pos.x, player.pos.y + 24, player.pos.z, this.slashKindOf(chosenPose), player.facing, 1.1);

    sound.playSlash('heavy');
    this.spawnInkBurst(player.pos, 14, '#181513');

    // Execute Arrival Strike Hitbox (with Hit-Stun)
    this.performHitCheck({
      rangeX: 155,
      rangeZ: 65,
      damageMultiplier: isAirborne ? 2.0 : 1.6,
      knockbackX: player.facing * 10,
      knockbackY: chosenPose === 'ATTACK_LAUNCH' ? 14 : isAirborne ? 1 : 2,
      isGesture: !!gesture && gesture.type !== 'TAP',
    });

    if (gesture && gesture.type !== 'TAP') {
      this.callbacks.onGestureRecognized(gesture);
      this.addFloatingText(`${gesture.name} · 破空斩`, player.pos.x, player.pos.y + 55, '#f59e0b', 1.35, true);
    } else if (isAirborne) {
      this.addFloatingText('踏云斩', player.pos.x, player.pos.y + 55, '#e0e7ff', 1.25);
    } else {
      this.addFloatingText(nearestEnemy ? '疾风斩' : '踏雪破空', player.pos.x, player.pos.y + 45, '#38bdf8', 1.15);
    }
  }

  private handleGroundStep(screenX: number, screenY: number) {
    const target = this.unproject(screenX, screenY);
    this.executeArrivalMovementAndStrike(target.x, target.z);
  }

  public triggerGestureDirect(type: 'TAP' | 'HORIZONTAL' | 'VERTICAL_DOWN' | 'DIAGONAL_UP' | 'CIRCLE' | 'ZIGZAG') {
    if (this.isPaused || this.runEnded) return;

    const dummyPoints: StrokePoint[] = [
      { x: 0, y: 0, t: 0 },
      { x: 50, y: 50, t: 100 },
    ];
    let name = '墨刺连击';
    let hanzi = '刺';
    let desc = '疾速突刺，破招连击';

    if (type === 'HORIZONTAL') {
      name = '横扫千军';
      hanzi = '横';
      desc = '挥墨千钧，破浪剑气横扫前方群敌';
    } else if (type === 'VERTICAL_DOWN') {
      name = '力劈华山';
      hanzi = '劈';
      desc = '凌空重劈，震撼大地激起墨涌地刺';
    } else if (type === 'DIAGONAL_UP') {
      name = '飞燕凌空';
      hanzi = '挑';
      desc = '墨锋挑空，击飞目标实现凌空追击';
    } else if (type === 'CIRCLE') {
      name = '浑元太极';
      hanzi = '圆';
      desc = '墨劲圆转，八卦护体并震退群敌';
    } else if (type === 'ZIGZAG') {
      name = '踏影瞬杀';
      hanzi = '闪';
      desc = '残影穿梭，瞬身斩敌留下水墨裂痕';
    }

    const result: GestureResult = {
      type,
      name,
      hanzi,
      desc,
      confidence: 1.0,
      points: dummyPoints,
    };

    this.callbacks.onGestureRecognized(result);
    sound.playCalligraphyGong(result.name);
    this.executeGestureMove(result);
  }

  private executeGestureMove(res: GestureResult) {
    const player = this.player;

    // Check ink cost（无双墨耗减免：招式放得勤快）
    const inkCost = this.musouInk(res.type === 'TAP' ? 8 : res.type === 'CIRCLE' ? 25 : 18);
    if (player.ink < inkCost) {
      this.addFloatingText('内力不济', player.pos.x, player.pos.y + 60, '#ef4444', 1.2);
      return;
    }
    player.ink = Math.max(0, player.ink - inkCost);
    this.emitInk();

    // 无双连招链登记：窗口内连续出招叠层，变招涨层更快（伤害/范围滚雪球）
    this.registerGestureChain(res.type);

    // Calligraphy banner display above player
    this.addFloatingText(res.name, player.pos.x, player.pos.y + 70, '#f59e0b', 1.4, true, true);

    // Thunder affix check
    const hasThunder = player.affixes.some((a) => a.stats.thunderStrike);
    if (hasThunder && this.enemies.length > 0) {
      const alive = this.enemies.filter((e) => e.hp > 0);
      if (alive.length > 0) {
        const target = alive[Math.floor(Math.random() * alive.length)];
        this.createLightningStrike(target);
      }
    }

    switch (res.type) {
      case 'TAP': {
        player.state = 'ATTACK_THRUST';
        player.stateTimer = 0;
        player.stateDuration = this.poseDur(0.22);
        player.vel.x = player.facing * 4;
        sound.playSlash('light');
        this.spawnInkSlash(player.pos.x, player.pos.y + 24, player.pos.z, 'THRUST', player.facing, 0.8);
        this.performHitCheck({
          rangeX: 85,
          rangeZ: 35,
          damageMultiplier: 1.0,
          knockbackX: player.facing * 5,
          knockbackY: 2,
          isGesture: true,
        });
        break;
      }

      case 'HORIZONTAL': {
        player.state = 'ATTACK_HORIZONTAL';
        player.stateTimer = 0;
        player.stateDuration = this.poseDur(0.35);
        player.vel.x = player.facing * 7;
        sound.playSlash('heavy');
        this.cameraShake = 7;
        this.spawnInkSlash(player.pos.x, player.pos.y + 24, player.pos.z, 'HORIZONTAL', player.facing, 1.2);

        this.performHitCheck({
          rangeX: 135,
          rangeZ: 50,
          damageMultiplier: 1.6,
          knockbackX: player.facing * 12,
          knockbackY: 3,
          isGesture: true,
        });

        // Blade Qi affix check（无双剑气常驻：横扫必发剑气，波及更远）
        const hasSwordBeam = player.affixes.some((a) => a.stats.swordBeamEnabled);
        const beamAlways = this.gameMode === 'MUSOU';
        if (hasSwordBeam || beamAlways || Math.random() < 0.5) {
          this.shootProjectile({
            pos: { x: player.pos.x + player.facing * 35, y: player.pos.y + 20, z: player.pos.z },
            vel: { x: player.facing * 15, y: 0, z: 0 },
            damage: (beamAlways ? 34 : 28) * this.getAffixDamageMultiplier() * this.getGestureDamageMultiplier(),
            isPlayer: true,
            life: beamAlways ? 1.1 : 0.9,
            maxLife: beamAlways ? 1.1 : 0.9,
            type: 'SWORD_BEAM',
            radius: beamAlways ? 55 : 40,
          });
        }
        break;
      }

      case 'VERTICAL_DOWN': {
        player.state = 'ATTACK_VERTICAL';
        player.stateTimer = 0;
        player.stateDuration = this.poseDur(0.42);
        sound.playSlash('heavy');
        this.cameraShake = 12;
        this.spawnInkSlash(player.pos.x, player.pos.y + 30, player.pos.z, 'VERTICAL', player.facing, 1.25);

        // Ground slam shockwave (暂停安全调度)
        this.schedule(0.12, () => {
          sound.playHit(true);
          this.spawnGroundSlamWave(player.pos, player.facing);
          this.addCrackDecal(player.pos, 1.3);
          this.spawnShockRing(player.pos.x, player.pos.z, 6, 100, 0.55, '#3a2f22', 3.5);
          this.triggerZoomPunch(0.038);
          this.performHitCheck({
            rangeX: 110,
            rangeZ: 60,
            damageMultiplier: 2.2,
            knockbackX: player.facing * 8,
            knockbackY: 9,
            isGesture: true,
            rearReach: -80, // 力劈震地：身后余波也受震（无双下配合范围放大成真·周身地刺）
          });
        });
        break;
      }

      case 'DIAGONAL_UP': {
        player.state = 'ATTACK_LAUNCH';
        player.stateTimer = 0;
        player.stateDuration = this.poseDur(0.32);
        player.vel.y = 8;
        player.vel.x = player.facing * 4;
        sound.playSlash('light');
        this.spawnInkSlash(player.pos.x, player.pos.y + 22, player.pos.z, 'LAUNCH', player.facing, 1.05);

        this.performHitCheck({
          rangeX: 95,
          rangeZ: 40,
          damageMultiplier: 1.4,
          knockbackX: player.facing * 4,
          knockbackY: 13, // High aerial launch!
          isGesture: true,
          antiAir: true, // 「挑」是唯一常规对空手段，可击落悬停飞白鹤
        });
        break;
      }

      case 'CIRCLE': {
        player.state = 'ATTACK_TAICHI';
        player.stateTimer = 0;
        player.stateDuration = this.poseDur(0.5);
        player.isInvincible = true;
        player.invincibleTimer = 0.5;
        sound.playSlash('whirlwind');
        this.cameraShake = 9;

        // 太极墨劲环转激波
        this.spawnInkSlash(player.pos.x, player.pos.y + 26, player.pos.z, 'CIRCLE', player.facing, 1.3, '#0e7490');
        this.spawnShockRing(player.pos.x, player.pos.z, 12, 150, 0.6, '#0e7490', 4);
        this.spawnShockRing(player.pos.x, player.pos.z, 8, 105, 0.45, '#1c1712', 2.5);

        // Deflect projectiles & push away all surrounding foes
        this.projectiles = this.projectiles.filter((p) => {
          if (!p.isPlayer && Math.hypot(p.pos.x - player.pos.x, p.pos.z - player.pos.z) < 140) {
            this.addFloatingText('太极借力', p.pos.x, p.pos.y + 30, '#38bdf8', 1.0);
            return false;
          }
          return true;
        });

        // 360-degree knockback（无双太极范围扩大 130→175，伤更重：真·群体清算）
        const taichiRadius = this.gameMode === 'MUSOU' ? 175 : 130;
        const taichiDmg = this.gameMode === 'MUSOU' ? 42 : 35;
        for (const enemy of this.enemies) {
          const dx = enemy.pos.x - player.pos.x;
          const dz = enemy.pos.z - player.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < taichiRadius) {
            const angle = Math.atan2(dz, dx);
            enemy.vel.x = Math.cos(angle) * 14;
            enemy.vel.z = Math.sin(angle) * 8;
            enemy.vel.y = 5;
            this.damageEnemy(enemy, taichiDmg * this.getAffixDamageMultiplier() * this.getGestureDamageMultiplier(), true);
          }
        }
        break;
      }

      case 'ZIGZAG': {
        player.state = 'ATTACK_DASH';
        player.stateTimer = 0;
        player.stateDuration = this.poseDur(0.3);
        player.isInvincible = true;
        player.invincibleTimer = 0.35;
        sound.playDash();

        // Dash forward rapidly piercing enemies（无双闪身距离 220→320：穿越整片怪海）
        const dashDistance = player.facing * (this.gameMode === 'MUSOU' ? 320 : 220);
        const targetX = player.pos.x + dashDistance;

        // Record dash trail afterimages
        for (let i = 0; i < 4; i++) {
          player.dashTrail.push({
            x: player.pos.x + (dashDistance * i) / 4,
            y: player.pos.y,
            z: player.pos.z,
          });
        }

        // 掠影无踪：闪身路径风刃
        const hasDashStrike = player.affixes.some((a) => a.stats.dashStrikeEnabled);
        if (hasDashStrike) {
          for (const enemy of this.enemies) {
            if (enemy.hp <= 0) continue;
            const t = Math.max(0, Math.min(1, (enemy.pos.x - player.pos.x) / (dashDistance || 1)));
            const px = player.pos.x + dashDistance * t;
            if (Math.hypot(enemy.pos.x - px, enemy.pos.z - player.pos.z) < 45) {
              this.damageEnemy(enemy, Math.round(20 * this.getAffixDamageMultiplier()), false, 0.3);
            }
          }
        }

        player.pos.x = targetX;
        this.cameraShake = 8;

        // 疾影残风：速度线 + 瞬身剑弧
        this.spawnSpeedLines(player.pos, 14, '#17130f');
        this.spawnInkSlash(player.pos.x, player.pos.y + 24, player.pos.z, 'DASH', player.facing, 1.15);

        this.performHitCheck({
          rangeX: 200,
          rangeZ: 50,
          damageMultiplier: 2.0,
          knockbackX: player.facing * 6,
          knockbackY: 4,
          isGesture: true,
        });

        // Phantom chain affix check
        const hasPhantomChain = player.affixes.some((a) => a.stats.flashCooldownReset);
        if (hasPhantomChain) {
          player.ink = Math.min(player.maxInk, player.ink + 18);
          this.emitInk();
        }
        break;
      }
    }
  }

  /** 无双手势墨耗减免：招式放得勤快，不能力不济卡壳 */
  private musouInk(base: number): number {
    return this.gameMode === 'MUSOU' ? Math.round(base * MUSOU_TUNING.gestureCostMult) : base;
  }

  /** 无双攻击动画加速：收招更快，招式连绵如疾风（仅玩家攻击姿态） */
  private poseDur(base: number): number {
    return this.gameMode === 'MUSOU' ? base * MUSOU_TUNING.animSpeedMult : base;
  }

  /** 拥挤降特效系数：无双同屏妖墨过半时墨花粒子减量（性能兑底，视觉主体不受影响） */
  private crowdFxScale(): number {
    if (this.gameMode !== 'MUSOU') return 1;
    let alive = 0;
    for (let i = 0; i < this.enemies.length; i++) if (this.enemies[i].hp > 0) alive++;
    return alive > 26 ? 0.5 : 1;
  }

  // --- 无双连招链系统 ---
  /** 出招登记：窗口内连续出招叠链层，变招（交替不同招式）双倍涨层（策略：连招不重手） */
  private registerGestureChain(type: GestureResult['type']) {
    if (this.gameMode !== 'MUSOU') return;
    const sameType = type === this.lastGestureType;
    this.gestureChain = Math.min(20, this.gestureChain + (sameType ? MUSOU_TUNING.chainPerSame : MUSOU_TUNING.chainPerDiff));
    this.lastGestureType = type;
    this.gestureChainTimer = MUSOU_TUNING.chainWindowSec;
    if (this.gestureChain >= 2) {
      this.addFloatingText(`连招链 ×${this.gestureChain}`, this.player.pos.x, this.player.pos.y + 95, '#fbbf24', 1.15, false, true);
    }
  }

  /** 连招链伤害加成（1 + 0.12×(链-1)，上限 +72%） */
  private get chainDmgMult(): number {
    return 1 + Math.min(MUSOU_TUNING.chainDmgCap, Math.max(0, this.gestureChain - 1) * MUSOU_TUNING.chainDmgPerStack);
  }

  /** 连招链范围加成（1 + 0.07×(链-1)，上限 +50%） */
  private get chainRangeMult(): number {
    return 1 + Math.min(MUSOU_TUNING.chainRangeCap, Math.max(0, this.gestureChain - 1) * MUSOU_TUNING.chainRangePerStack);
  }

  // --- 词条数值汇总辅助 ---
  private getAffixDamageMultiplier(): number {
    let mult = 1.0;
    for (const affix of this.player.affixes) {
      if (affix.stats.attackBonus) {
        mult += affix.stats.attackBonus / 100;
      }
    }
    // 怒发冲冠：背水之势——气血低于一半时攻击力提升（绝境爆发，与觉醒反打思路同契）
    const berserk = this.sumStat('berserkDamageBonus');
    if (berserk > 0 && this.player.hp > 0 && this.player.hp < this.player.maxHp * 0.5) {
      mult += berserk / 100;
    }
    // 连战连决：每10连击攻击力+4%（上限=词条值，无双割草下高连击近乎常驻）
    const comboCap = this.sumStat('comboDamagePercent');
    if (comboCap > 0 && this.player.comboCount >= 10) {
      mult += Math.min(comboCap, Math.floor(this.player.comboCount / 10) * 4) / 100;
    }
    // 煞气冲霄：每8击杀攻击力永久+1%（上限=词条值，整局滚雪球）
    const killStackCap = this.sumStat('killStackDamageBonus');
    if (killStackCap > 0 && this.runStats.kills >= 8) {
      mult += Math.min(killStackCap, Math.floor(this.runStats.kills / 8)) / 100;
    }
    return mult;
  }

  /** 手势招式额外伤害（gestureBonus 词条生效） */
  private getGestureDamageMultiplier(): number {
    let mult = 1.0;
    for (const affix of this.player.affixes) {
      if (affix.stats.gestureBonus) {
        mult += affix.stats.gestureBonus / 100;
      }
    }
    // 无双气魄：连击即攻势，每连击 +0.1% 手势伤害（上限 100 连 +10%），怪海中连招永不断
    if (this.gameMode === 'MUSOU') {
      mult *= MUSOU_TUNING.gestureDmgBonus;
      mult += Math.min(this.player.comboCount, MUSOU_TUNING.comboDmgCap) * MUSOU_TUNING.comboDmgPerStack;
    }
    return mult;
  }

  /** 暴击伤害倍率（critDamageBonus 词条生效） */
  private getCritMultiplier(): number {
    let mult = 1.85;
    for (const affix of this.player.affixes) {
      if (affix.stats.critDamageBonus) {
        mult += affix.stats.critDamageBonus / 100;
      }
    }
    return mult;
  }

  private sumStat<K extends keyof NonNullable<Affix['stats']>>(key: K): number {
    let total = 0;
    for (const affix of this.player.affixes) {
      const v = affix.stats[key];
      if (typeof v === 'number') total += v;
    }
    return total;
  }

  private hasStat(key: 'swordBeamEnabled' | 'inkExplosion' | 'frostSlow' | 'flashCooldownReset' | 'thunderStrike' | 'reviveOnce' | 'dashStrikeEnabled'): boolean {
    return this.player.affixes.some((a) => !!(a.stats as Record<string, unknown>)[key]);
  }

  private applyLifesteal(finalDmg: number) {
    let lifesteal = 0;
    for (const a of this.player.affixes) {
      if (a.stats.lifestealPercent) lifesteal += a.stats.lifestealPercent;
    }
    if (lifesteal > 0) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + Math.round(finalDmg * lifesteal));
      this.emitHp();
    }
  }

  private emitHp() {
    this.callbacks.onHpChange(this.player.hp, this.player.maxHp);
  }

  private emitInk() {
    this.lastInkEmitted = Math.floor(this.player.ink);
    this.callbacks.onInkChange(this.player.ink, this.player.maxInk);
  }

  private emitShield(force: boolean = false) {
    const key = Math.round(this.player.shield);
    if (!force && key === this.lastShieldEmitted) return;
    this.lastShieldEmitted = key;
    this.callbacks.onShieldChange(this.player.shield, this.player.shieldMax);
  }

  private performHitCheck(opts: {
    rangeX: number;
    rangeZ: number;
    damageMultiplier: number;
    knockbackX: number;
    knockbackY: number;
    isGesture?: boolean;
    antiAir?: boolean; // 挑招对空：可命中高空悬停的飞白鹤
    rearReach?: number; // 背后余波范围（千斤坠力劈震地时后方也受震）
  }) {
    const player = this.player;
    const inMusou = this.gameMode === 'MUSOU';
    // 无双群体性强化：攻击范围放大（横向 ×1.3 / 纵深 ×1.5），
    // 连招链层叠进一步扩大范围（每层 +7%，上限 +50%）→ 一扫一片的割草手感
    const rangeMult = inMusou ? MUSOU_TUNING.aoeRangeMult * this.chainRangeMult : 1;
    const rangeZMult = inMusou ? MUSOU_TUNING.aoeRangeZMult * this.chainRangeMult : 1;
    const rangeX = opts.rangeX * rangeMult;
    const rangeZ = opts.rangeZ * rangeZMult;
    const rear = opts.rearReach ?? (inMusou ? -46 : -20);
    let hitCount = 0;
    const hitSet = new Set<EnemyEntity>(); // 斩罡余波去重：已直接命中者不再吃余波

    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      const dx = (enemy.pos.x - player.pos.x) * player.facing;
      const dz = Math.abs(enemy.pos.z - player.pos.z);
      const dy = Math.abs(enemy.pos.y - player.pos.y);

      // Hitbox is ahead of player in facing direction, within Z depth and Y height
      // 对空规则：普通招式够不到高空（dy<45），「挑」可击落悬停的飞白鹤（dy<115）
      const dyLimit = opts.antiAir ? 115 : 45;
      if (dx > rear && dx < rangeX && dz < rangeZ && dy < dyLimit) {
        // 醉墨剑客：醉步侧闪——非前摇/硬直/出招中 28% 概率瞬间侧移避开挥击（冷却 2.5s）
        // 闪避限量原则：概率+双冷却门控，保证连段节奏与爽感不被频繁落空破坏
        if (
          enemy.type === 'INK_DRUNKARD' &&
          (enemy.dodgeCooldown ?? 0) <= 0 &&
          enemy.hitStun <= 0 &&
          enemy.state !== 'WINDUP' && !enemy.state.startsWith('ATTACK')
        ) {
          if (Math.random() < 0.28) {
            const side = Math.random() < 0.5 ? 1 : -1;
            enemy.pos.x -= player.facing * 55;
            enemy.pos.z = Math.max(-140, Math.min(140, enemy.pos.z + side * 52));
            enemy.dodgeCooldown = 2.5;
            this.spawnSpeedLines(enemy.pos, 6, '#5b2333');
            this.addFloatingText('醉避', enemy.pos.x, enemy.pos.y + 58, '#5b2333', 1.15);
            continue; // 完全避开这一击（不计 hitCount，不触发命中停帧）
          }
        }

        hitCount++;
        hitSet.add(enemy);
        enemy.vel.x = opts.knockbackX;
        enemy.vel.y = opts.knockbackY;

        // Base damage formula（手势词条加成生效；鹤唳九天对浮空妖敌增伤；
        // 无双连招链：链层叠越高手势伤越重，变招连击滚雪球）
        const gestureMult = opts.isGesture ? this.getGestureDamageMultiplier() : 1.0;
        const chainMult = opts.isGesture && inMusou ? this.chainDmgMult : 1;
        const skyBonus = enemy.pos.y > 30 ? this.sumStat('skySlayerPercent') : 0;
        const airMult = 1 + skyBonus / 100;
        const baseDmg = 24 * opts.damageMultiplier * this.getAffixDamageMultiplier() * gestureMult * airMult * chainMult;

        // Crit check
        let critChance = 0.15;
        for (const a of player.affixes) {
          if (a.stats.critChanceBonus) critChance += a.stats.critChanceBonus;
        }
        const isCrit = Math.random() < critChance;
        const finalDmg = Math.round(isCrit ? baseDmg * this.getCritMultiplier() : baseDmg);

        this.damageEnemy(enemy, finalDmg, isCrit, 0.48, opts.isGesture);

        // Lifesteal affix
        this.applyLifesteal(finalDmg);

        // 觉醒充能：命中积累（暴击额外加成；无双充能更快）
        this.gainAwakening((isCrit ? 4.5 : 2.5) * (inMusou ? MUSOU_TUNING.awakeningPerHitMult : 1));
      }
    }

    if (hitCount > 0) {
      // Hit-stop impact freeze（无双短停帧：保打击感但不粘滞，连招更顺畅）
      this.hitStopTimer = inMusou ? MUSOU_TUNING.hitStopSec : 0.055;
      sound.playHit(false);

      // 斩罡余波（无双专属）：每一击都荡开墨浪，波及近旁未被直接命中的妖墨
      // → 任意招式都是群体技，怪海中一招清一圈；余波伤害精简特效保帧率
      const R = MUSOU_TUNING.wakeRadius;
      const wakeBase = 24 * opts.damageMultiplier * this.getAffixDamageMultiplier()
        * (opts.isGesture ? this.getGestureDamageMultiplier() : 1) * MUSOU_TUNING.wakeDmgMult;
      let wakeHits = 0;
      for (const enemy of this.enemies) {
        if (enemy.hp <= 0 || hitSet.has(enemy)) continue;
        const wd = Math.hypot(enemy.pos.x - player.pos.x, enemy.pos.z - player.pos.z);
        if (wd < R) {
          wakeHits++;
          this.damageEnemy(enemy, Math.max(1, Math.round(wakeBase)), false, 0.25, opts.isGesture, false, 0);
        }
      }
      if (wakeHits > 0) {
        // 余波命中也入连击：连杀数字狂飙（割草爽感核心）
        player.comboCount += wakeHits;
        player.comboTimer = MUSOU_TUNING.comboWindowSec;
        player.maxCombo = Math.max(player.maxCombo, player.comboCount);
        this.spawnShockRing(player.pos.x, player.pos.z, 4, R * 0.9, 0.4, '#2a241c', 2);
      }

      const prevCombo = player.comboCount;
      player.comboCount += hitCount;
      player.comboTimer = inMusou ? MUSOU_TUNING.comboWindowSec : 2.8;
      player.maxCombo = Math.max(player.maxCombo, player.comboCount);
      this.callbacks.onComboChange(player.comboCount);

      // Check combo milestones
      const milestones: [number, string][] = [
        [50, '无双剑神'],
        [35, '人剑合一'],
        [20, '剑气纵横'],
        [10, '势如破竹'],
        [5, '连斩 · 五合'],
      ];
      for (const [threshold, title] of milestones) {
        if (prevCombo < threshold && player.comboCount >= threshold) {
          this.addFloatingText(title, player.pos.x, player.pos.y + 75, '#fbbf24', 1.6, true, true);
          sound.playCalligraphyGong(title);
          break;
        }
      }
    }
  }

  private damageEnemy(enemy: EnemyEntity, damage: number, isCrit: boolean = false, stunOverride?: number, isGesture: boolean = false, bypassShield: boolean = false, fxLevel: 1 | 0 = 1) {
    if (enemy.hp <= 0) return;
    const player = this.player;

    // 破阵摧坚：对首领与精英的伤害提升（全域伤害源生效——挥砍/剑气/奥义/雷击皆算）
    const bossSlayer = this.sumStat('bossSlayerPercent');
    if (bossSlayer > 0 && (enemy.isBoss || enemy.elite)) {
      damage = Math.round(damage * (1 + bossSlayer / 100));
    }

    // 拆除判定：爆墨傀儡引信期间被击杀 → 无爆炸 + 额外功绩
    const wasPriming = enemy.type === 'INK_BOMBER' && (enemy.windupTimer ?? 0) > 0;

    // 墨盾武僧：正面持盾格挡 80% 伤害（收盾出招/受击硬直时可破防，绕背攻击全额有效）
    // 正面硬打仍有 20% 透伤可缓慢磨血——但格挡不触发硬直/打断/词条特效，武僧保持推进压力
    // 觉醒墨浪等全方位冲击可绕盾（bypassShield）
    if (!bypassShield && enemy.type === 'INK_SHIELD_GUARD' && enemy.hp > 0 && this.isShieldRaised(enemy)) {
      const fromFront = (player.pos.x - enemy.pos.x) * enemy.facing >= -12;
      if (fromFront) {
        const chipped = Math.max(1, Math.round(damage * 0.2));
        enemy.hp -= chipped;
        this.spawnInkBurst({ x: enemy.pos.x + enemy.facing * 18, y: 30, z: enemy.pos.z }, 8, '#64748b');
        this.addFloatingText(`格挡 · ${chipped}`, enemy.pos.x, enemy.pos.y + 55, '#64748b', 1.1);
        sound.playHit(false);
        if (enemy.hp <= 0) this.killEnemy(enemy); // 正面磨血致死走正常死亡结算
        return;
      }
    }

    enemy.hp -= damage;

    // 砚台龟：龟甲反震——龟甲竖起（非前摇/硬直）时受击，将 22% 伤害震回进攻方
    // 不带 source：避免与玩家铁画银钩反伤互相递归；觉醒释放后的无敌帧可免疫反震
    if (enemy.type === 'INK_TURTLE' && enemy.hp > 0 && this.isShieldRaised(enemy)) {
      const reflect = Math.max(1, Math.round(damage * 0.22));
      this.spawnInkBurst({ x: player.pos.x, y: player.pos.y + 20, z: player.pos.z }, 5, '#3b3a36');
      this.addFloatingText('反震', player.pos.x, player.pos.y + 48, '#3b3a36', 1.15);
      this.hurtPlayer(reflect, player.pos.x >= enemy.pos.x ? 1 : -1, undefined);
    }

    // 朱砂焚意：命中附加灼烧 DoT
    const burnFactor = this.sumStat('burnOnHit');
    if (burnFactor > 0 && enemy.hp > 0) {
      enemy.burnTimer = 5;
      enemy.burnTickTimer = 0.4;
    }

    // 泼墨成冰：寒缓生效（移动/攻速减缓）
    if (this.hasStat('frostSlow') && enemy.hp > 0) {
      enemy.frostSlowTimer = 3.5;
    }

    // Hit-Stun Mechanism (敌人受击硬直机制) — 打断前摇是「破势」的反制核心
    enemy.windupTimer = 0; // 前摇被打断！
    const baseStun = stunOverride ?? (isCrit ? 0.75 : 0.45);
    const hitStunTime = enemy.isBoss ? (isCrit ? baseStun * 0.8 : baseStun * 0.55) : baseStun;
    enemy.hitStun = Math.max(enemy.hitStun, hitStunTime);
    enemy.maxHitStun = enemy.hitStun;
    enemy.state = 'HURT';
    enemy.stateTimer = 0;
    enemy.stateDuration = enemy.hitStun;

    // Reset enemy attack cooldown with an extra buffer
    enemy.attackCooldown = Math.max(enemy.attackCooldown, (enemy.isBoss ? 0.75 : 1.05) + Math.random() * 0.4);

    // Stagger knockback direction (铁壁精锐大幅抗退)
    const recoilDir = enemy.pos.x >= player.pos.x ? 1 : -1;
    let recoilPower = enemy.isBoss ? (isCrit ? 5.0 : 3.0) : isCrit ? 9.5 : 5.5;
    if (enemy.elite?.modifier === 'IRONCLAD') recoilPower *= 0.35;
    enemy.vel.x = recoilDir * recoilPower;
    enemy.vel.z = (Math.random() - 0.5) * 2;

    // Ink splatter particles（fxLevel 0：余波命中不刷墨花，怪海下保帧率；
    // 拥挤降特效：同屏妖墨过半时粒子减量）
    const fxScale = fxLevel * this.crowdFxScale();
    if (fxScale > 0) {
      this.spawnInkBurst(enemy.pos, Math.max(3, Math.round(12 * fxScale)), '#181412');
    }
    if (isCrit) {
      this.spawnInkBurst(enemy.pos, 8, '#b91c1c'); // Cinnabar crit ink
      this.addFloatingText('『破势』', enemy.pos.x, enemy.pos.y + 60, '#ef4444', 1.35, true);
      // 暴击朱砂溅地留痕
      if (Math.random() < 0.55) this.addSplatDecal(enemy.pos, 0.55, '#8c1d18', 5);

      // 狂草墨暴：暴击墨爆 AoE
      if (this.hasStat('inkExplosion')) {
        this.cameraShake = Math.max(this.cameraShake, 14);
        this.spawnInkBurst(enemy.pos, 18, '#ea580c');
        this.spawnInkBurst(enemy.pos, 10, '#171513');
        this.spawnShockRing(enemy.pos.x, enemy.pos.z, 6, 115, 0.5, '#ea580c', 3.5);
        this.addFloatingText('『墨爆』', enemy.pos.x, enemy.pos.y + 75, '#fb923c', 1.3, true);
        for (const other of this.enemies) {
          if (other === enemy || other.hp <= 0) continue;
          if (Math.hypot(other.pos.x - enemy.pos.x, other.pos.z - enemy.pos.z) < 95) {
            other.hp -= Math.round(damage * 0.45);
            if (other.hp <= 0) this.killEnemy(other);
          }
        }
      }

      // 胸藏万墨：暴击回墨
      const critInk = this.sumStat('critGainInk');
      if (critInk > 0) {
        player.ink = Math.min(player.maxInk, player.ink + critInk);
        this.emitInk();
      }
    } else if (fxLevel && enemy.hitStun > 0.5) {
      this.addFloatingText('『僵直』', enemy.pos.x, enemy.pos.y + 55, '#f59e0b', 1.15);
    }

    // Floating damage numbers in classical Chinese style（余波命中不刷伤害数字：怪海下防浮字刷屏）
    if (fxLevel) {
      const dmgText = isCrit ? `暴击 · ${damage}` : `${damage}`;
      this.addFloatingText(dmgText, enemy.pos.x, enemy.pos.y + 40, isCrit ? '#dc2626' : '#3d3121', isCrit ? 1.4 : 1.0, isCrit);
    }

    // Frost slow visual
    if (enemy.frostSlowTimer && enemy.frostSlowTimer > 0) {
      this.spawnInkBurst(enemy.pos, 4, '#38bdf8');
    }

    // Enemy Death / 判官处决
    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
      if (wasPriming) {
        this.addScore(80);
        this.addFloatingText('『拆除 +80』', enemy.pos.x, enemy.pos.y + 72, '#fbbf24', 1.4, true);
      }
      return;
    }

    // 判官笔锋：斩杀线处决（首领免疫）
    const threshold = this.sumStat('executeThreshold');
    if (threshold > 0 && !enemy.isBoss && enemy.hp / enemy.maxHp < threshold) {
      enemy.hp = 0;
      this.addFloatingText('『判官·勾魂』', enemy.pos.x, enemy.pos.y + 70, '#fbbf24', 1.5, true, true);
      this.spawnInkBurst(enemy.pos, 20, '#b91c1c');
      sound.playCalligraphyGong('判');
      this.killEnemy(enemy);
      if (wasPriming) {
        this.addScore(80);
        this.addFloatingText('『拆除 +80』', enemy.pos.x, enemy.pos.y + 90, '#fbbf24', 1.4, true);
      }
    }
  }

  /** 墨盾武僧：盾牌是否举起（出招前摇/受击硬直/死亡时收盾=破防窗口） */
  private isShieldRaised(enemy: EnemyEntity): boolean {
    if (enemy.hp <= 0 || enemy.hitStun > 0) return false;
    return enemy.state !== 'WINDUP' && !enemy.state.startsWith('ATTACK');
  }

  /** 爆墨傀儡：引信烧尽自爆——对玩家与其他妖墨均判定（可借傀儡炸敌群） */
  private explodeBomber(enemy: EnemyEntity) {
    const player = this.player;
    const R = 110;

    // 爆炸演出：双激波 + 地裂 + 溅墨 + 镜头冲击
    this.cameraShake = Math.max(this.cameraShake, 18);
    this.triggerZoomPunch(0.045);
    this.spawnInkBurst(enemy.pos, 30, '#ea580c');
    this.spawnInkBurst(enemy.pos, 18, '#221a12');
    this.spawnShockRing(enemy.pos.x, enemy.pos.z, 10, R + 30, 0.55, '#f97316', 4);
    this.spawnShockRing(enemy.pos.x, enemy.pos.z, 6, R, 0.4, '#1a1611', 3);
    this.addCrackDecal(enemy.pos, 1.2);
    this.addSplatDecal(enemy.pos, 1.3, '#7c2d12', 8);
    sound.playHit(true);

    // 玩家判定
    if (
      !player.isInvincible && player.hp > 0 &&
      Math.hypot(player.pos.x - enemy.pos.x, player.pos.z - enemy.pos.z) < R
    ) {
      this.hurtPlayer(enemy.damage, player.pos.x >= enemy.pos.x ? 1 : -1, enemy);
      this.addFloatingText('爆墨！', enemy.pos.x, 70, '#f97316', 1.5, true);
    }

    // 敌我无差别（战术窗口：诱爆敌阵）
    for (const other of this.enemies) {
      if (other === enemy || other.hp <= 0) continue;
      if (Math.hypot(other.pos.x - enemy.pos.x, other.pos.z - enemy.pos.z) < R) {
        other.hp -= Math.round(enemy.damage * 1.1);
        if (other.hp <= 0) {
          const otherPriming = other.type === 'INK_BOMBER' && (other.windupTimer ?? 0) > 0;
          this.killEnemy(other);
          if (otherPriming) {
            this.addScore(80);
            this.addFloatingText('『拆除 +80』', other.pos.x, other.pos.y + 72, '#fbbf24', 1.4, true);
          }
        }
      }
    }

    // 自身殒命（引信已烧尽，不算拆除）
    this.killEnemy(enemy);
  }

  private killEnemy(enemy: EnemyEntity) {
    if (enemy.hp > 0) enemy.hp = 0;
    enemy.state = 'DEAD';
    enemy.stateTimer = 0;
    // 尸体 0.9s 后消散（修复永不消失的泄漏）；无双小怪 0.55s 快消散（怪海下减渲染负担，Boss 仍 0.9s）
    enemy.deathTimer = this.gameMode === 'MUSOU' && !enemy.isBoss ? MUSOU_TUNING.corpseLife : 0.9;
    this.enemyWalkCycleCache.delete(enemy.id);
    this.gainAwakening(this.gameMode === 'MUSOU' ? MUSOU_TUNING.awakeningPerKill : 6); // 觉醒充能：击杀奖励（无双略快）

    this.enemiesKilledInWave++;
    this.runStats.kills++;
    if (enemy.elite) this.runStats.eliteKills++;
    if (enemy.isBoss) {
      this.runStats.bossKills++;
      this.addScore(500 + 150 * this.wave);
      this.addFloatingText('宗师陨落！', enemy.pos.x, enemy.pos.y + 90, '#fbbf24', 1.8, true, true);
      // 双 Boss 血条接力：无双模式下若场内还有存活 Boss，血条切至后者而非清空
      const remainingBoss = this.enemies.find((e) => e !== enemy && e.isBoss && e.hp > 0);
      this.activeBoss = remainingBoss ?? null;
      if (remainingBoss) {
        this.lastBossEmitted = remainingBoss.id;
        this.callbacks.onBossUpdate({ name: remainingBoss.name, hp: remainingBoss.hp, maxHp: remainingBoss.maxHp, phase: remainingBoss.bossPhase ?? 1 });
      } else {
        this.callbacks.onBossUpdate(null);
      }
    } else {
      this.addScore(100 + (enemy.elite ? 150 : 0));
    }

    // --- 无双连杀里程碑：全屏大字 + 激波 + 锣声（25杀/50杀/100杀/200杀/400杀） ---
    if (this.gameMode === 'MUSOU') {
      const milestone = MUSOU_KILL_MILESTONES.find((m) => m.at === this.player.comboCount);
      if (milestone) {
        this.addFloatingText(milestone.hanzi, this.player.pos.x, this.player.pos.y + 110, '#dc2626', 2.4, true, true);
        this.spawnShockRing(this.player.pos.x, this.player.pos.z, 10, 170, 0.6, '#b91c1c', 4);
        this.spawnShockRing(this.player.pos.x, this.player.pos.z, 6, 100, 0.45, '#1a1611', 3);
        this.triggerZoomPunch(0.04);
        this.triggerInkEdge(0.45);
        sound.playCalligraphyGong(milestone.hanzi);
      }
    }

    this.spawnInkBurst(enemy.pos, 25, '#0a0a0a');
    // 死亡墨魂消散 + 地面溅墨留痕（水墨尸解）
    this.spawnDeathWisps(enemy.pos, enemy.isBoss ? '#7f1d1d' : enemy.elite ? enemy.elite.color : '#2a231c');
    this.addSplatDecal(enemy.pos, enemy.isBoss ? 1.9 : enemy.elite ? 1.4 : 1.0,
      enemy.isBoss ? '#7f1d1d' : '#1a1611', enemy.isBoss ? 10 : 7);

    if (enemy.isBoss) {
      // Boss 陨落：双重激波 + 慢动作 + 镜头冲击 + 屏缘泼墨
      this.spawnShockRing(enemy.pos.x, enemy.pos.z, 10, 150, 0.7, '#b91c1c', 4);
      this.spawnShockRing(enemy.pos.x, enemy.pos.z, 10, 225, 0.95, '#1a1611', 3);
      this.triggerSlowMo(0.8);
      this.triggerZoomPunch(0.055);
      this.triggerInkEdge(0.6);
    } else if (enemy.elite) {
      this.spawnShockRing(enemy.pos.x, enemy.pos.z, 8, 98, 0.5, enemy.elite.color, 3);
      this.triggerZoomPunch(0.028);
    }

    // 收波最后一杀：短慢镜收尾（波次刷完后最后一个死亡）
    if (!enemy.isBoss && this.enemiesSpawnedInWave >= this.totalEnemiesInWave && !this.isWaveClearing) {
      const remaining = this.enemies.filter((e) => e.hp > 0).length;
      if (remaining === 0) this.triggerSlowMo(0.42);
    }

    this.callbacks.onWaveChange(this.wave, this.waveTitle, Math.max(0, this.totalEnemiesInWave - this.enemiesKilledInWave));

    // Ink recover on kill (精英额外回复；无双杀得多回得快，招式循环爽快)
    const inkGain = enemy.elite
      ? (this.gameMode === 'MUSOU' ? MUSOU_TUNING.killInkElite : 25)
      : (this.gameMode === 'MUSOU' ? MUSOU_TUNING.killInk : 15);
    this.player.ink = Math.min(this.player.maxInk, this.player.ink + inkGain);
    this.emitInk();

    // 雷引连枝：击杀释放连锁闪电
    const chainCount = this.sumStat('chainLightning');
    if (chainCount > 0) {
      const nearest = this.enemies.find(
        (e) => e !== enemy && e.hp > 0 && Math.hypot(e.pos.x - enemy.pos.x, e.pos.z - enemy.pos.z) < 230
      );
      if (nearest) {
        this.shootProjectile({
          pos: { x: enemy.pos.x, y: enemy.pos.y + 30, z: enemy.pos.z },
          vel: { x: (nearest.pos.x - enemy.pos.x) * 4, y: 0, z: (nearest.pos.z - enemy.pos.z) * 4 },
          damage: 30 * this.getAffixDamageMultiplier(),
          isPlayer: true,
          life: 0.5,
          maxLife: 0.5,
          type: 'CHAIN_BOLT',
          radius: 30,
          chainJumps: chainCount - 1,
          hitIds: new Set([enemy.id]),
        });
      }
    }
  }

  private shootProjectile(proj: Omit<Projectile, 'id'>) {
    const fullProj: Projectile = {
      ...proj,
      id: Math.random().toString(),
    };
    this.projectiles.push(fullProj);
  }

  private spawnGroundSlamWave(pos: Vec3, facing: 1 | -1) {
    const hasThousandJin = this.player.affixes.some((a) => a.stats.thunderStrike || a.id === 'thousand_jin');
    const waveCount = hasThousandJin ? 3 : 1;

    for (let i = 0; i < waveCount; i++) {
      this.schedule(i * 0.09, () => {
        this.shootProjectile({
          pos: { x: pos.x + facing * (30 + i * 45), y: 0, z: pos.z },
          vel: { x: facing * 12, y: 0, z: 0 },
          damage: 35 * this.getAffixDamageMultiplier(),
          isPlayer: true,
          life: 0.65,
          maxLife: 0.65,
          type: 'INK_SHOCKWAVE',
          radius: 35 + i * 8,
        });
      });
    }
  }

  private createLightningStrike(target: EnemyEntity) {
    this.shootProjectile({
      pos: { x: target.pos.x, y: 120, z: target.pos.z },
      vel: { x: 0, y: -25, z: 0 },
      damage: 40 * this.getAffixDamageMultiplier(),
      isPlayer: true,
      life: 0.35,
      maxLife: 0.35,
      type: 'LIGHTNING',
      radius: 40,
    });
    this.addFloatingText('天降惊雷', target.pos.x, target.pos.y + 60, '#38bdf8', 1.3);
  }

  // --- 特效增强：生成器 ---
  /** 粒子上限保护（防止低端设备粒子爆炸） */
  private pushParticle(p: InkParticle) {
    this.particles.push(p);
    if (this.particles.length > this.particleCap) {
      this.particles.splice(0, this.particles.length - this.particleCap);
    }
  }

  private triggerSlowMo(sec: number) {
    this.slowMotionTimer = Math.max(this.slowMotionTimer, sec);
  }

  private triggerZoomPunch(amount: number) {
    this.zoomPunch = Math.min(0.075, this.zoomPunch + amount);
  }

  private triggerInkEdge(sec: number = 0.5) {
    this.inkEdgeTimer = Math.max(this.inkEdgeTimer, sec);
  }

  /** 生成一笔水墨剑弧（招式专属挥砍特效） */
  private spawnInkSlash(x: number, y: number, z: number, kind: InkSlash['kind'], facing: 1 | -1, size: number = 1, color: string = '#1c1712') {
    this.inkSlashes.push({
      id: Math.random().toString(),
      x, y, z,
      facing,
      kind,
      life: kind === 'CIRCLE' ? 0.42 : 0.3,
      maxLife: kind === 'CIRCLE' ? 0.42 : 0.3,
      color,
      size,
      seed: Math.floor(Math.random() * 2147483000) + 1,
    });
    if (this.inkSlashes.length > 30) this.inkSlashes.shift();
  }

  /** ActionState → 剑弧形态映射 */
  private slashKindOf(state: ActionState): InkSlash['kind'] {
    switch (state) {
      case 'ATTACK_THRUST': return 'THRUST';
      case 'ATTACK_HORIZONTAL': return 'HORIZONTAL';
      case 'ATTACK_VERTICAL': return 'VERTICAL';
      case 'ATTACK_LAUNCH': return 'LAUNCH';
      case 'ATTACK_TAICHI': return 'CIRCLE';
      case 'ATTACK_DASH': return 'DASH';
      default: return 'HORIZONTAL';
    }
  }

  /** 地面溅墨渍（击杀/重击留痕） */
  private addSplatDecal(pos: Vec3, size: number = 1, color: string = '#1a1611', blobCount: number = 7) {
    const blobs: NonNullable<GroundDecal['blobs']> = [];
    const maxR = 15 * size;
    // 中心主墨团
    blobs.push({ dx: 0, dy: 0, r: maxR * (0.85 + Math.random() * 0.4), rot: Math.random() * Math.PI, squish: 0.42 + Math.random() * 0.14 });
    // 卫星墨点
    for (let i = 0; i < blobCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = maxR * (0.7 + Math.random() * 1.5);
      blobs.push({
        dx: Math.cos(ang) * dist,
        dy: Math.sin(ang) * dist * 0.7,
        r: maxR * (0.16 + Math.random() * 0.4),
        rot: Math.random() * Math.PI,
        squish: 0.38 + Math.random() * 0.2,
      });
    }
    this.groundDecals.push({
      id: Math.random().toString(),
      x: pos.x,
      z: pos.z,
      life: 2.4,
      maxLife: 2.4,
      kind: 'SPLAT',
      color,
      size,
      blobs,
    });
    if (this.groundDecals.length > 26) this.groundDecals.shift();
  }

  /** 地面裂纹（重劈震地） */
  private addCrackDecal(pos: Vec3, size: number = 1) {
    const cracks: NonNullable<GroundDecal['cracks']> = [];
    const count = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const len = 55 * size * (0.7 + Math.random() * 0.7);
      const pts: { x: number; y: number }[] = [{ x: 0, y: 0 }];
      const segs = 3;
      for (let sIdx = 1; sIdx <= segs; sIdx++) {
        const t = sIdx / segs;
        const jitterA = ang + (Math.random() - 0.5) * 0.5 * t;
        pts.push({
          x: Math.cos(jitterA) * len * t,
          y: Math.sin(jitterA) * len * t * 0.55,
        });
      }
      cracks.push({ dx: 0, dy: 0, pts, w: 2.4 * size });
    }
    this.groundDecals.push({
      id: Math.random().toString(),
      x: pos.x,
      z: pos.z,
      life: 1.7,
      maxLife: 1.7,
      kind: 'CRACK',
      color: '#3a2f22',
      size,
      cracks,
    });
    if (this.groundDecals.length > 26) this.groundDecals.shift();
  }

  /** 地面冲击激波环 */
  private spawnShockRing(x: number, z: number, r0: number, r1: number, life: number, color: string, width: number = 3) {
    this.shockRings.push({ id: Math.random().toString(), x, z, r0, r1, life, maxLife: life, color, width });
    if (this.shockRings.length > 24) this.shockRings.shift();
  }

  /** 冲刺速度线（疾影残风） */
  private spawnSpeedLines(pos: Vec3, count: number, color: string = '#17130f') {
    for (let i = 0; i < count; i++) {
      this.pushParticle({
        x: pos.x + (Math.random() - 0.5) * 190,
        y: 14 + Math.random() * 62,
        z: pos.z + (Math.random() - 0.5) * 90,
        vx: -(3.5 + Math.random() * 4.5),
        vy: 0,
        vz: 0,
        size: 1.6 + Math.random() * 1.6,
        alpha: 0.5 + Math.random() * 0.3,
        decay: 0.055,
        color,
        shape: 'streak',
        noGravity: true,
      });
    }
  }

  /** 敌人消散墨魂（尸解升天） */
  private spawnDeathWisps(pos: Vec3, color: string) {
    for (let i = 0; i < 12; i++) {
      this.pushParticle({
        x: pos.x + (Math.random() - 0.5) * 34,
        y: 8 + Math.random() * 42,
        z: pos.z + (Math.random() - 0.5) * 22,
        vx: (Math.random() - 0.5) * 1.1,
        vy: 0.7 + Math.random() * 1.6,
        vz: (Math.random() - 0.5) * 0.5,
        size: 2.5 + Math.random() * 4,
        alpha: 0.55,
        decay: 0.014 + Math.random() * 0.012,
        color,
        shape: 'wisp',
        growth: 7 + Math.random() * 9,
        swayPhase: Math.random() * Math.PI * 2,
        noGravity: true,
      });
    }
  }

  private spawnInkBurst(pos: Vec3, count: number, color: string) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      const isBlob = Math.random() < 0.45; // 部分墨滴带速度拖尾
      this.pushParticle({
        x: pos.x,
        y: pos.y + 20 + (Math.random() - 0.5) * 20,
        z: pos.z + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: (Math.random() * 6 - 2),
        vz: Math.sin(angle) * (speed * 0.4),
        size: 3 + Math.random() * 7,
        alpha: 0.9,
        decay: 0.02 + Math.random() * 0.03,
        color,
        shape: isBlob ? 'blob' : 'circle',
        stretch: isBlob ? 1 + Math.random() * 1.2 : 0,
      });
    }
  }

  private addFloatingText(text: string, x: number, y: number, color: string, scale: number = 1.0, isCrit: boolean = false, isGesture: boolean = false) {
    // 浮字硬上限：无双怪海连杀时防数组无限膨胀（性能兑底，旧字优先淘汰）
    if (this.floatingTexts.length > 48) this.floatingTexts.shift();
    this.floatingTexts.push({
      id: Math.random().toString(),
      text,
      x,
      y,
      color,
      alpha: 1.0,
      scale,
      isCrit,
      isGesture,
      vy: 0.8,
      age: 0,
    });
  }

  // --- GAME LOOP ---
  private loop = (timestamp: number) => {
    if (!this.isRunning) return;

    const rawDtMs = timestamp - this.lastTime;
    const dt = Math.min(0.1, rawDtMs / 1000);
    this.lastTime = timestamp;

    // 自适应画质：帧耗时 EMA（约 2s 判定一次；标签页切回等超大帧间隔不纳入统计）
    if (rawDtMs < 250) {
      this.frameEma = this.frameEma * 0.92 + rawDtMs * 0.08;
    } else {
      this.frameEma = 16.7;
    }
    this.qualityCheckTimer += dt;
    if (this.qualityCheckTimer >= 2) {
      this.qualityCheckTimer = 0;
      if (this.frameEma > 33) this.setQualityLevel(0);
      else if (this.frameEma > 24) this.setQualityLevel(1);
    }

    if (!this.isPaused) {
      if (this.hitStopTimer > 0) {
        this.hitStopTimer -= dt;
      } else if (this.slowMotionTimer > 0) {
        // 电影化慢动作：0.3x 时间流速（Boss陨落/收波一杀/复活）
        this.slowMotionTimer -= dt;
        this.update(dt * 0.3);
      } else {
        this.update(dt);
      }

      // 慢动作视觉权重平滑（墨帘淡入淡出）
      const slowTarget = this.slowMotionTimer > 0 ? 1 : 0;
      this.slowMoVis += (slowTarget - this.slowMoVis) * Math.min(1, dt * (slowTarget ? 16 : 5));

      this.render();
    } else if (this.renderDirty) {
      // 暂停/结算画面静止：仅在脏标记时重绘一帧（移动端防持续满帧渲染发热→降频卡顿）
      this.renderDirty = false;
      this.render();
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    const player = this.player;

    // 暂停安全调度器
    this.processScheduled(dt);

    // Screen shake decay
    if (this.cameraShake > 0) {
      this.cameraShake = Math.max(0, this.cameraShake - dt * 25);
    }

    // 镜头缩放冲击衰减 / 屏缘泼墨衰减
    this.zoomPunch *= Math.pow(0.002, dt);
    if (this.inkEdgeTimer > 0) this.inkEdgeTimer -= dt;

    // 受击红闪衰减
    if (this.hurtFlashTimer > 0) {
      this.hurtFlashTimer -= dt;
    }

    // Passive Ink Energy Regen (节流回调)
    // 无双：回墨速率 14→18/秒（MUSOU_TUNING.inkRegen），招式循环更爽快
    let regenMult = 1.0;
    for (const a of player.affixes) {
      if (a.stats.inkRegenBonus) regenMult += a.stats.inkRegenBonus / 100;
    }
    const baseRegen = this.gameMode === 'MUSOU' ? MUSOU_TUNING.inkRegen : 14;
    player.ink = Math.min(player.maxInk, player.ink + dt * baseRegen * regenMult);
    const inkInt = Math.floor(player.ink);
    if (inkInt !== this.lastInkEmitted) {
      this.lastInkEmitted = inkInt;
      this.callbacks.onInkChange(player.ink, player.maxInk);
    }

    // Combo timer decay
    if (player.comboTimer > 0) {
      player.comboTimer -= dt;
      if (player.comboTimer <= 0) {
        player.comboCount = 0;
        this.callbacks.onComboChange(0);
      }
    }

    // 连招链窗口衰减：超时链层清零（无双连招节奏压力源）
    if (this.gestureChainTimer > 0) {
      this.gestureChainTimer -= dt;
      if (this.gestureChainTimer <= 0) {
        this.gestureChain = 0;
        this.lastGestureType = null;
      }
    }

    // Invincibility decay
    if (player.invincibleTimer > 0) {
      player.invincibleTimer -= dt;
      if (player.invincibleTimer <= 0) {
        player.isInvincible = false;
      }
    }

    // Dash trail decay
    if (player.dashTrail.length > 0 && Math.random() < 0.2) {
      player.dashTrail.shift();
    }

    // Ribbon wave animation
    player.ribbonWave += dt * 8;

    // --- PLAYER MOVEMENT & INPUT HANDLING ---
    let moveX = 0;
    let moveZ = 0;

    // Keyboard movement
    if (this.keys['a'] || this.keys['arrowleft']) moveX -= 1;
    if (this.keys['d'] || this.keys['arrowright']) moveX += 1;
    if (this.keys['w'] || this.keys['arrowup']) moveZ -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) moveZ += 1;

    // Touch stick movement (Left half of screen)
    if (this.touchMoveActive && this.touchMoveOrigin && this.touchMoveCurrent) {
      const tdx = this.touchMoveCurrent.x - this.touchMoveOrigin.x;
      const tdy = this.touchMoveCurrent.y - this.touchMoveOrigin.y;
      const dist = Math.hypot(tdx, tdy);
      if (dist > 12) {
        moveX = tdx / dist;
        // Map Y drag to pseudo-3D Z depth
        moveZ = tdy / dist;
      }
    }

    // Normalize diagonal movement
    const moveLen = Math.hypot(moveX, moveZ);
    if (moveLen > 1) {
      moveX /= moveLen;
      moveZ /= moveLen;
    }

    let moveSpeed = 190;
    for (const a of player.affixes) {
      if (a.stats.moveSpeedBonus) moveSpeed += (190 * a.stats.moveSpeedBonus) / 100;
    }

    // Can only freely walk when not locked in heavy attack animation
    const isAttacking =
      player.state === 'ATTACK_HORIZONTAL' ||
      player.state === 'ATTACK_VERTICAL' ||
      player.state === 'ATTACK_TAICHI' ||
      player.state === 'ATTACK_DASH';

    if (!isAttacking && player.state !== 'HURT' && player.state !== 'DEAD') {
      // 1. Real-time Finger Slide Movement in FULL_GESTURE mode (跟手移动: 滑到哪角色就到哪)
      if (this.controlMode === 'FULL_GESTURE' && this.slideTarget) {
        const sdx = this.slideTarget.x - player.pos.x;
        const sdz = this.slideTarget.z - player.pos.z;
        const sDist = Math.hypot(sdx, sdz);
        if (sDist > 6) {
          const slideSpeed = Math.max(moveSpeed * 2.2, sDist * 9.5);
          const step = Math.min(sDist, slideSpeed * dt);
          player.pos.x += (sdx / sDist) * step;
          player.pos.z += (sdz / sDist) * step;
          if (Math.abs(sdx) > 4) {
            player.facing = sdx >= 0 ? 1 : -1;
          }
          if (player.pos.y === 0) {
            player.state = 'RUN';
            this.walkCycle += dt * 18;
          }
          if (Math.random() < 0.25) {
            this.spawnInkBurst(player.pos, 2, '#44403c');
          }
        }
      }
      // 2. Keyboard & Virtual Joystick Movement
      else if (moveLen > 0.1) {
        player.pos.x += moveX * moveSpeed * dt;
        player.pos.z += moveZ * moveSpeed * 0.7 * dt;

        // Facing direction
        if (moveX > 0.05) player.facing = 1;
        else if (moveX < -0.05) player.facing = -1;

        if (player.pos.y === 0) {
          player.state = 'RUN';
          this.walkCycle += dt * 14;
        }

        // 脚步扬尘（节流）
        if (player.pos.y === 0) {
          this.stepDustTimer -= dt;
          if (this.stepDustTimer <= 0) {
            this.stepDustTimer = 0.17;
            this.pushParticle({
              x: player.pos.x - moveX * 8 + (Math.random() - 0.5) * 8,
              y: 2,
              z: player.pos.z - moveZ * 6 + (Math.random() - 0.5) * 8,
              vx: -moveX * 0.7,
              vy: 0.5 + Math.random() * 0.4,
              vz: -moveZ * 0.4,
              size: 2 + Math.random() * 1.6,
              alpha: 0.3,
              decay: 0.05,
              color: '#8a7f6a',
              shape: 'blob',
              stretch: 0.4,
            });
          }
        }
      } else if (player.pos.y === 0) {
        player.state = 'IDLE';
        this.walkCycle += dt * 3;
      }
    }

    // Jump / Gravity Physics (帧率无关)
    if (player.pos.y > 0 || player.vel.y !== 0) {
      player.pos.y += player.vel.y * dt * 60;
      player.vel.y -= 0.65 * dt * 60;

      if (player.pos.y <= 0) {
        player.pos.y = 0;
        player.vel.y = 0;
        if (player.state === 'FALL' || player.state === 'JUMP_UP') {
          player.state = 'IDLE';
          this.spawnInkBurst(player.pos, 6, '#44403c');
        }
      } else if (player.vel.y < 0 && player.state === 'JUMP_UP') {
        player.state = 'FALL';
      }
    }

    // Boundary constraints for Pseudo-3D Arena
    player.pos.z = Math.max(-130, Math.min(130, player.pos.z));
    player.pos.x = Math.max(-1200, Math.min(1200, player.pos.x));

    // Smooth camera tracking
    const targetCamX = player.pos.x;
    this.cameraX += (targetCamX - this.cameraX) * Math.min(1, dt * 6);

    // State timer countdown
    if (player.stateTimer < player.stateDuration) {
      player.stateTimer += dt;
      if (player.stateTimer >= player.stateDuration) {
        if (player.state !== 'DEAD') {
          player.state = player.pos.y > 0 ? 'FALL' : 'IDLE';
        }
      }
    }

    // --- ENEMY SPAWNER & WAVE LOGIC ---
    if (this.enemiesSpawnedInWave < this.totalEnemiesInWave) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        // 无双怪海 v2：刷怪间隔再缩短（×0.26），妖墨如怒潮拍岸
        const musouSpawnMult = this.gameMode === 'MUSOU' ? MUSOU_TUNING.spawnIntervalMult : 1;
        this.spawnTimer = (1.8 + Math.random() * 1.5) * DIFFICULTY_TUNING[this.difficulty].spawnRate * musouSpawnMult;
        if (!this.spawnNextEnemy()) {
          // 场面拥挤：短暂延迟后再试（波次配额未消耗）；无双重试更快（怪海不缺口）
          this.spawnTimer = this.gameMode === 'MUSOU' ? MUSOU_TUNING.musouRetry : 0.75;
        } else if (
          this.gameMode === 'MUSOU' &&
          this.wave >= MUSOU_TUNING.clusterFromWave &&
          Math.random() < MUSOU_TUNING.clusterSpawnChance
        ) {
          // 无双簇刷：50% 概率同帧再补一只，妖墨成群结队压上（spawnNextEnemy 内部有拥挤保护）
          this.spawnNextEnemy();
        }
      }
    } else if (this.enemies.every((e) => e.hp <= 0) && !this.isWaveClearing) {
      // Wave Cleared!
      this.isWaveClearing = true;
      sound.playWaveClear();
      this.addFloatingText('功成圆满', player.pos.x, player.pos.y + 80, '#f59e0b', 1.8, true, true);
      // 通关墨劲激波 + 屏缘泼墨庆祝
      this.spawnShockRing(player.pos.x, player.pos.z, 10, 145, 0.75, '#b45309', 3.5);
      this.spawnShockRing(player.pos.x, player.pos.z, 6, 90, 0.5, '#fbbf24', 2.5);
      this.triggerInkEdge(0.5);

      // 波次通关奖励 + 小回复
      this.addScore(200 + 100 * this.wave);
      const heal = Math.round(player.maxHp * 0.18);
      if (player.hp < player.maxHp && player.hp > 0) {
        player.hp = Math.min(player.maxHp, player.hp + heal);
        this.emitHp();
        this.addFloatingText(`调息回气 +${heal}`, player.pos.x, player.pos.y + 60, '#4ade80', 1.2);
      }

      // 通关胜利判定：击败终折 Boss（非无尽模式；无双无通关概念，永续征战）
      if (this.wave >= VICTORY_WAVE && !this.endlessMode && this.gameMode === 'CLASSIC') {
        this.runEnded = true;
        sound.stopHeartbeat();
        // [修复·无尽入口死机] 不可先 isPaused=true 再 schedule——暂停会冻结
        // 暂停安全调度器，胜利结算回调永不执行，15 折通关画面永久定格
        // （玩家实测「15 波结束想开启无尽死机」）。与死亡结算同套路：
        // 先让世界放完 0.6s 庆功镜头（runEnded 已挡伤害），回调内再暂停并弹结算。
        this.schedule(0.6, () => {
          this.isPaused = true;
          sound.playVictory();
          this.callbacks.onGameOver(this.getRunStats(), true);
        });
        return;
      }

      // Trigger Roguelike 3-card pick
      this.schedule(1.0, () => {
        // 挂起弹窗锁：封 ESC 暂停/恢复（弹窗底下战斗照跑会隐形掉血）
        this.affixPickPending = true;
        const choices = drawRandomAffixes(player.affixes, 3, this.wave);
        this.callbacks.onWaveCleared(choices);
      });
    }

    // --- ENEMY AI & UPDATE ---
    const knockDamp = Math.pow(0.88, dt * 60); // 每帧一次，避免逐敌重复幂运算
    for (const enemy of this.enemies) {
      // 尸体消散计时
      if (enemy.hp <= 0) {
        enemy.deathTimer = (enemy.deathTimer ?? 0) - dt;
        continue;
      }

      // 出生保护（淡入，防止落地即被打/打人）
      if ((enemy.spawnGrace ?? 0) > 0) {
        enemy.spawnGrace = (enemy.spawnGrace ?? 0) - dt;
        continue;
      }

      // Enemy gravity (帧率无关)
      if (enemy.pos.y > 0 || enemy.vel.y !== 0) {
        enemy.pos.y += enemy.vel.y * dt * 60;
        enemy.vel.y -= 0.65 * dt * 60;
        if (enemy.pos.y <= 0) {
          enemy.pos.y = 0;
          enemy.vel.y = 0;
        }
      }

      // Enemy velocity damping & knockback recoil (帧率无关)
      enemy.pos.x += enemy.vel.x * dt * 60;
      enemy.pos.z += enemy.vel.z * dt * 60;
      enemy.vel.x *= knockDamp;
      enemy.vel.z *= knockDamp;
      enemy.pos.z = Math.max(-140, Math.min(140, enemy.pos.z));

      // 朱砂焚意：灼烧 DoT 结算（不触发硬直）
      if ((enemy.burnTimer ?? 0) > 0) {
        enemy.burnTimer = (enemy.burnTimer ?? 0) - dt;
        enemy.burnTickTimer = (enemy.burnTickTimer ?? 0) - dt;
        if ((enemy.burnTickTimer ?? 0) <= 0) {
          enemy.burnTickTimer = 0.4;
          const burnDmg = Math.max(2, Math.round((8 + this.wave * 1.5) * this.sumStat('burnOnHit') * this.getAffixDamageMultiplier()));
          enemy.hp -= burnDmg;
          this.spawnInkBurst(enemy.pos, 3, '#ea580c');
          this.addFloatingText(`${burnDmg}`, enemy.pos.x, enemy.pos.y + 45, '#fb923c', 0.85);
          if (enemy.hp <= 0) {
            this.killEnemy(enemy);
            continue;
          }
        }
      }

      // 泼墨成冰：寒缓衰减
      if ((enemy.frostSlowTimer ?? 0) > 0) {
        enemy.frostSlowTimer = (enemy.frostSlowTimer ?? 0) - dt;
      }
      const slowFactor = (enemy.frostSlowTimer ?? 0) > 0 ? 0.45 : 1.0;

      // Hit stun check (recoil motion runs, but enemy cannot move or attack while stunned)
      if (enemy.hitStun > 0) {
        enemy.hitStun -= dt;
        enemy.state = 'HURT';
        enemy.stateTimer += dt;
        if (enemy.hitStun <= 0) {
          enemy.state = 'IDLE';
        }
        continue;
      }

      // Attack cooldown (寒缓同步降低攻速回复)
      if (enemy.attackCooldown > 0) {
        enemy.attackCooldown -= dt * slowFactor;
      }

      // Face player（墨盾武僧转身迟缓：0.55s 一转，配合踏影瞬杀留出绕背破防窗口）
      if (enemy.type === 'INK_SHIELD_GUARD') {
        enemy.turnCooldown = (enemy.turnCooldown ?? 0) - dt;
        if ((enemy.turnCooldown ?? 0) <= 0) {
          enemy.facing = enemy.pos.x < player.pos.x ? 1 : -1;
          enemy.turnCooldown = 0.55;
        }
      } else {
        enemy.facing = enemy.pos.x < player.pos.x ? 1 : -1;
      }

      const dx = player.pos.x - enemy.pos.x;
      const dz = player.pos.z - enemy.pos.z;
      const dist = Math.hypot(dx, dz);

      // 攻击前摇结算：蓄力完成后才真正出手（爆墨傀儡引信烧尽则自爆）
      if ((enemy.windupTimer ?? 0) > 0) {
        enemy.windupTimer = (enemy.windupTimer ?? 0) - dt * slowFactor;
        enemy.stateTimer += dt;
        // 飞白鹤前摇期间保持悬停高度（抵消重力急坠，蓄力后俯冲）
        if (enemy.type === 'INK_CRANE') {
          enemy.vel.y = 0;
          enemy.pos.y += (74 - enemy.pos.y) * Math.min(1, dt * 4);
        }
        if ((enemy.windupTimer ?? 0) <= 0) {
          if (enemy.type === 'INK_BOMBER') {
            this.explodeBomber(enemy);
          } else if (enemy.type === 'INK_CRANE') {
            // 飞白鹤：俯冲起飞——锁定玩家当前位置为落点方向
            const dDive = Math.max(1, Math.hypot(dx, dz));
            enemy.cranePhase = 'DIVE';
            enemy.craneVX = (dx / dDive) * 430;
            enemy.craneVZ = (dz / dDive) * 265;
            enemy.state = 'ATTACK_DASH';
            enemy.stateTimer = 0;
            enemy.stateDuration = 1.2;
            sound.playSlash('light');
          } else {
            this.enemyMeleeStrike(enemy);
            if (enemy.type === 'INK_DRUNKARD' && enemy.hp > 0) {
              // 醉墨剑客二连斩：0.28s 后回手一剑，随后醉倒踉跄（破绽窗口）
              this.schedule(0.28, () => {
                if (enemy.hp <= 0 || this.runEnded) return;
                this.enemyMeleeStrike(enemy);
              });
              this.schedule(0.52, () => {
                if (enemy.hp <= 0 || this.runEnded) return;
                enemy.hitStun = Math.max(enemy.hitStun, 0.7);
                enemy.maxHitStun = enemy.hitStun;
                enemy.state = 'HURT';
                enemy.stateTimer = 0;
                this.addFloatingText('醉倒', enemy.pos.x, enemy.pos.y + 60, '#5b2333', 1.15);
              });
            }
          }
        }
        continue;
      }

      // Boss 技能系统
      if (enemy.isBoss && enemy.bossSkills) {
        this.updateBossSkills(enemy, dt, slowFactor);
        // 阶段判定：大帝三阶段（66%狂暴→33%灭），先锋/宗师两阶段（50%狂暴）
        const isTier3 = enemy.bossTier === 3;
        const phase2Threshold = isTier3 ? 0.66 : 0.5;
        if (enemy.bossPhase === 1 && enemy.hp < enemy.maxHp * phase2Threshold) {
          enemy.bossPhase = 2;
          this.cameraShake = 20;
          sound.playBossWarn();
          this.addFloatingText('墨煞 · 狂', enemy.pos.x, enemy.pos.y + 95, '#ef4444', 1.9, true, true);
          this.spawnInkBurst(enemy.pos, 30, '#7f1d1d');
          // 狂暴变身：赤色激波 + 短慢镜 + 屏缘泼墨
          this.spawnShockRing(enemy.pos.x, enemy.pos.z, 12, 175, 0.75, '#ef4444', 4.5);
          this.spawnShockRing(enemy.pos.x, enemy.pos.z, 8, 120, 0.55, '#1a1611', 3);
          this.spawnDeathWisps(enemy.pos, '#7f1d1d');
          this.triggerSlowMo(0.45);
          this.triggerInkEdge(0.55);
          this.callbacks.onBossUpdate({ name: enemy.name, hp: enemy.hp, maxHp: enemy.maxHp, phase: 2 });
        } else if (isTier3 && enemy.bossPhase === 2 && enemy.hp < enemy.maxHp * 0.33) {
          // 大帝第三阶段「灭」：解锁墨雨，全技能加速，移速再增
          enemy.bossPhase = 3;
          this.cameraShake = 26;
          sound.playBossWarn();
          this.addFloatingText('墨煞 · 灭', enemy.pos.x, enemy.pos.y + 105, '#fbbf24', 2.3, true, true);
          this.spawnInkBurst(enemy.pos, 46, '#1c1917');
          this.spawnShockRing(enemy.pos.x, enemy.pos.z, 16, 230, 0.9, '#fbbf24', 5);
          this.spawnShockRing(enemy.pos.x, enemy.pos.z, 12, 165, 0.7, '#7f1d1d', 4);
          this.spawnShockRing(enemy.pos.x, enemy.pos.z, 8, 110, 0.5, '#1a1611', 3);
          this.spawnDeathWisps(enemy.pos, '#fbbf24');
          this.triggerSlowMo(0.6);
          this.triggerInkEdge(0.8);
          this.triggerZoomPunch(0.05);
          this.callbacks.onBossUpdate({ name: enemy.name, hp: enemy.hp, maxHp: enemy.maxHp, phase: 3 });
        }
      }

      // AI Archetypes
      if (enemy.type === 'INK_ARCHER') {
        // Keep distance and shoot arrows
        const idealDist = 260;
        if (dist < idealDist - 30) {
          enemy.pos.x -= (dx / dist) * 70 * dt * slowFactor;
          enemy.pos.z -= (dz / dist) * 50 * dt * slowFactor;
        } else if (dist > idealDist + 40) {
          enemy.pos.x += (dx / dist) * 80 * dt * slowFactor;
          enemy.pos.z += (dz / dist) * 60 * dt * slowFactor;
        }
        enemy.state = 'IDLE';

        if (enemy.attackCooldown <= 0 && Math.abs(dz) < 90 && dist > 60) {
          enemy.attackCooldown = 2.4 + Math.random() * 0.8;
          enemy.state = 'ATTACK_THRUST';
          enemy.stateDuration = 0.3;
          enemy.stateTimer = 0;
          // Z轴瞄准：箭矢射向玩家所在纵深
          const aimDist = Math.max(1, dist);
          this.shootProjectile({
            pos: { x: enemy.pos.x + enemy.facing * 20, y: enemy.pos.y + 15, z: enemy.pos.z },
            vel: { x: (dx / aimDist) * 10, y: 0, z: (dz / aimDist) * 10 },
            damage: enemy.damage,
            isPlayer: false,
            life: 2.2,
            maxLife: 2.2,
            type: 'INK_ARROW',
            radius: 15,
          });
        }
      } else if (enemy.type === 'INK_BOMBER') {
        // 爆墨傀儡：高速冲锋，贴近后点燃引信自爆（引信期被杀=拆除，无爆炸）
        const speed = 148;
        if (dist > 58) {
          enemy.pos.x += (dx / dist) * speed * dt * slowFactor;
          enemy.pos.z += (dz / dist) * speed * 0.62 * dt * slowFactor;
          enemy.state = 'RUN';
          this.enemyWalkCycle(enemy, dt);
        } else if (enemy.attackCooldown <= 0 && (enemy.windupTimer ?? 0) <= 0) {
          enemy.state = 'WINDUP';
          enemy.stateTimer = 0;
          enemy.stateDuration = 0.85;
          enemy.windupTimer = 0.85;
          enemy.windupMax = 0.85;
          enemy.attackCooldown = 2.0; // 若被打断未死，短暂迟滞后再冲
          sound.playWindup();
        }
      } else if (enemy.type === 'INK_SHIELD_GUARD') {
        // 墨盾武僧：缓步推进，正面持盾；出招前摇收盾=唯一正面破防窗口
        const speed = 72;
        if (dist > 52) {
          enemy.pos.x += (dx / dist) * speed * dt * slowFactor;
          enemy.pos.z += (dz / dist) * speed * 0.6 * dt * slowFactor;
          enemy.state = 'RUN';
          this.enemyWalkCycle(enemy, dt);
        } else {
          enemy.state = 'IDLE';
        }
        if (
          dist < 68 && Math.abs(dz) < 32 && enemy.attackCooldown <= 0 && (enemy.windupTimer ?? 0) <= 0
        ) {
          enemy.state = 'WINDUP';
          enemy.stateTimer = 0;
          enemy.stateDuration = 0.7; // 较长收盾窗口，鼓励打断反制
          enemy.windupTimer = 0.7;
          enemy.windupMax = 0.7;
          enemy.attackCooldown = 2.8;
          sound.playWindup();
        }
      } else if (enemy.type === 'INK_SUMMONER') {
        // 符笔妖道：远距游走施法——妖符·唤召墨卒 / 扇形追踪符珠
        const idealDist = 330;
        if (dist < idealDist - 60 || dist > idealDist + 60) {
          const flee = dist < idealDist ? -1 : 1;
          enemy.pos.x += (dx / dist) * 88 * flee * dt * slowFactor;
          enemy.pos.z += (dz / dist) * 64 * flee * dt * slowFactor;
          enemy.state = 'RUN';
          this.enemyWalkCycle(enemy, dt);
        } else {
          enemy.state = 'IDLE';
        }
        if (enemy.attackCooldown <= 0) {
          enemy.attackCooldown = 4.2 + Math.random() * 1.6;
          const aliveCount = this.enemies.reduce((n, e) => n + (e.hp > 0 ? 1 : 0), 0);
          if (aliveCount < 14 && Math.random() < 0.6) {
            // 妖符·唤：召出两只墨卒护法
            enemy.state = 'ATTACK_THRUST';
            enemy.stateTimer = 0;
            enemy.stateDuration = 0.5;
            this.addFloatingText('妖符·唤', enemy.pos.x, enemy.pos.y + 82, '#4d7c0f', 1.3, true);
            this.spawnInkBurst(enemy.pos, 10, '#3d5a40');
            this.schedule(0.35, () => {
              if (enemy.hp <= 0) return;
              for (const side of [-1, 1]) {
                const sx = enemy.pos.x + side * 46;
                const sz = enemy.pos.z + (Math.random() - 0.5) * 40;
                this.spawnEnemyAt('INK_MINION', sx, sz, false, null);
                this.spawnInkBurst({ x: sx, y: 0, z: sz }, 8, '#3d5a40');
              }
            });
          } else {
            // 追踪符珠：扇形三连发，有限转向率可走位甩开
            enemy.state = 'ATTACK_HORIZONTAL';
            enemy.stateTimer = 0;
            enemy.stateDuration = 0.45;
            const baseAng = Math.atan2(dz, dx);
            for (let i = -1; i <= 1; i++) {
              const ang = baseAng + i * 0.22;
              const spd = 5.2;
              this.shootProjectile({
                pos: { x: enemy.pos.x, y: 25, z: enemy.pos.z },
                vel: { x: Math.cos(ang) * spd, y: 0, z: Math.sin(ang) * spd },
                damage: enemy.damage,
                isPlayer: false,
                life: 3.0,
                maxLife: 3.0,
                type: 'INK_TALISMAN',
                radius: 13,
                homing: 0.045,
              });
            }
            this.addFloatingText('符珠', enemy.pos.x, enemy.pos.y + 70, '#4d7c0f', 1.1);
          }
        }
      } else if (enemy.type === 'INK_CRANE') {
        // 飞白鹤：空中盘旋 →「袭」预警 → 俯冲穿刺 → 落地喘息（破绽窗口）→ 再起飞
        // 对空机制：悬停时普通招式够不到（dy<45），「挑」可击落；俯冲后半程与落地喘息可正常命中
        const phase = enemy.cranePhase ?? 'HOVER';
        enemy.isAirborne = enemy.pos.y > 30;
        if (phase === 'HOVER') {
          // 悬停盘旋：保持 190~280 距离，高度 74±6 浮沉
          const idealDist = 235;
          if (dist < idealDist - 45) {
            enemy.pos.x -= (dx / dist) * 92 * dt * slowFactor;
            enemy.pos.z -= (dz / dist) * 58 * dt * slowFactor;
          } else if (dist > idealDist + 45) {
            enemy.pos.x += (dx / dist) * 96 * dt * slowFactor;
            enemy.pos.z += (dz / dist) * 62 * dt * slowFactor;
          }
          const hoverY = 74 + Math.sin(this.nowMs / 380 + (enemy.craneTimer ?? 0) * 2.6) * 6;
          enemy.pos.y += (hoverY - enemy.pos.y) * Math.min(1, dt * 6); // 起飞平滑爬升
          enemy.vel.y = 0;
          enemy.state = 'IDLE';
          enemy.craneTimer = (enemy.craneTimer ?? 0) - dt * slowFactor;
          if ((enemy.craneTimer ?? 0) <= 0 && dist > 120 && dist < 540) {
            // 进入俯冲前摇（「袭」预警圈，可走位躲开落点）
            enemy.state = 'WINDUP';
            enemy.stateTimer = 0;
            enemy.stateDuration = 0.6;
            enemy.windupTimer = 0.6;
            enemy.windupMax = 0.6;
            enemy.attackCooldown = 3.4 + Math.random() * 1.4;
            sound.playWindup();
          }
        } else if (phase === 'DIVE') {
          // 俯冲穿刺：沿锁定方向快速下坠，触地即判定冲击
          enemy.pos.x += (enemy.craneVX ?? 0) * dt * slowFactor;
          enemy.pos.z += (enemy.craneVZ ?? 0) * dt * slowFactor;
          enemy.pos.z = Math.max(-140, Math.min(140, enemy.pos.z));
          enemy.pos.y = Math.max(0, enemy.pos.y - 320 * dt);
          enemy.vel.y = 0;
          enemy.state = 'ATTACK_DASH';
          if (enemy.pos.y <= 12) {
            // 落点冲击
            const hitDist = Math.hypot(player.pos.x - enemy.pos.x, player.pos.z - enemy.pos.z);
            if (hitDist < 85 && Math.abs(player.pos.z - enemy.pos.z) < 48) {
              if (!player.isInvincible && player.hp > 0) {
                this.hurtPlayer(enemy.damage, enemy.pos.x <= player.pos.x ? 1 : -1, enemy);
              }
            }
            this.spawnShockRing(enemy.pos.x, enemy.pos.z, 5, 70, 0.42, '#2f4858', 3);
            this.spawnInkBurst(enemy.pos, 12, '#2f4858');
            this.cameraShake = Math.max(this.cameraShake, 8);
            sound.playSlash('light');
            // 落地喘息：最佳输出窗口
            enemy.cranePhase = 'PERCH';
            enemy.craneTimer = 1.6;
            enemy.pos.y = 0;
            enemy.state = 'IDLE';
          }
        } else {
          // PERCH 落地喘息：缓步拖离，破绽大
          enemy.craneTimer = (enemy.craneTimer ?? 0) - dt;
          enemy.pos.y = 0;
          enemy.vel.y = 0;
          enemy.isAirborne = false;
          if (dist > 85) {
            enemy.pos.x -= (dx / dist) * 55 * dt * slowFactor;
            enemy.pos.z -= (dz / dist) * 36 * dt * slowFactor;
            enemy.state = 'RUN';
            this.enemyWalkCycle(enemy, dt);
          } else {
            enemy.state = 'IDLE';
          }
          if ((enemy.craneTimer ?? 0) <= 0) {
            // 再次起飞
            enemy.cranePhase = 'HOVER';
            enemy.craneTimer = 2.4 + Math.random() * 1.8;
            this.spawnInkBurst(enemy.pos, 10, '#2f4858');
            this.spawnShockRing(enemy.pos.x, enemy.pos.z, 4, 58, 0.4, '#2f4858', 2.5);
          }
        }
      } else if (enemy.type === 'INK_TURTLE') {
        // 砚台龟：龟甲反震坦克——龟甲竖起时受击反震 22%；伸头出招（前摇）=安全输出窗口
        const speed = 42;
        if (dist > 55) {
          enemy.pos.x += (dx / dist) * speed * dt * slowFactor;
          enemy.pos.z += (dz / dist) * speed * 0.6 * dt * slowFactor;
          enemy.state = 'RUN';
          this.enemyWalkCycle(enemy, dt);
        } else {
          enemy.state = 'IDLE';
        }
        if (dist < 72 && Math.abs(dz) < 34 && enemy.attackCooldown <= 0 && (enemy.windupTimer ?? 0) <= 0) {
          enemy.state = 'WINDUP';
          enemy.stateTimer = 0;
          enemy.stateDuration = 0.75;
          enemy.windupTimer = 0.75;
          enemy.windupMax = 0.75;
          enemy.attackCooldown = 3.4;
          sound.playWindup();
        }
      } else if (enemy.type === 'INK_DRUNKARD') {
        // 醉墨剑客：醉步摇摆逼近，28% 概率侧身「醉避」挥击；连斩后醉倒踉跄=破绽
        enemy.dodgeCooldown = Math.max(0, (enemy.dodgeCooldown ?? 0) - dt);
        enemy.swayPhase = (enemy.swayPhase ?? 0) + dt * 2.4;
        const speed = 128;
        if (dist > 55) {
          const swayBias = Math.sin(enemy.swayPhase) * 0.55; // 醉步左右斜晃
          enemy.pos.x += (dx / dist) * speed * dt * slowFactor;
          enemy.pos.z += ((dz / dist) + swayBias / Math.max(2, dist / 60)) * speed * 0.6 * dt * slowFactor;
          enemy.state = 'RUN';
          this.enemyWalkCycle(enemy, dt);
        } else {
          enemy.state = 'IDLE';
        }
        if (dist < 75 && Math.abs(dz) < 40 && enemy.attackCooldown <= 0 && (enemy.windupTimer ?? 0) <= 0) {
          enemy.state = 'WINDUP';
          enemy.stateTimer = 0;
          enemy.stateDuration = 0.45; // 起手极快，预警窗口短
          enemy.windupTimer = 0.45;
          enemy.windupMax = 0.45;
          enemy.attackCooldown = 2.6;
          sound.playWindup();
        }
      } else if (enemy.isBoss && enemy.bossSkills?.some((s) => s.skill === 'CHARGE_RUSH' && (s.active ?? 0) > 0)) {
        // 墨刃突进冲锋中：不叠加常规追击移动/近战起手（冲撞由 Boss 技能系统全权驱动）
        enemy.state = 'ATTACK_DASH';
      } else {
        // Melee pursue (Minion, Brute, Ninja, Boss)
        let speed = enemy.type === 'SHADOW_NINJA' ? 140 : enemy.type === 'INK_BRUTE' ? 85 : 110;
        if (enemy.isBoss) speed = 120;
        if (enemy.bossPhase === 2) speed *= 1.35;
        else if (enemy.bossPhase === 3) speed *= 1.5; // 大帝「灭」阶段移速再增
        if (enemy.elite?.modifier === 'SWIFT') speed *= 1.45;

        // 暗影刺客：瞬移背刺
        if (enemy.type === 'SHADOW_NINJA' && (enemy.teleportCooldown ?? 0) > 0) {
          enemy.teleportCooldown = (enemy.teleportCooldown ?? 0) - dt;
        }
        if (
          enemy.type === 'SHADOW_NINJA' &&
          (enemy.teleportCooldown ?? 0) <= 0 &&
          dist > 210 &&
          dist < 620
        ) {
          // 消失 → 出现在玩家背后
          this.spawnInkBurst(enemy.pos, 14, '#0f0e0d');
          this.spawnSpeedLines(enemy.pos, 8, '#0f0e0d');
          const backX = player.pos.x - player.facing * 48;
          enemy.pos.x = backX;
          enemy.pos.z = player.pos.z + (Math.random() - 0.5) * 30;
          this.spawnInkBurst(enemy.pos, 14, '#0f0e0d');
          this.spawnSpeedLines(enemy.pos, 8, '#0f0e0d');
          this.addFloatingText('瞬影', enemy.pos.x, enemy.pos.y + 55, '#6b5a42', 1.0);
          enemy.teleportCooldown = 5.5 + Math.random() * 2.5;
          enemy.attackCooldown = Math.min(enemy.attackCooldown, 0.35);
          continue;
        }

        // Follow player along X and Z
        if (dist > 50) {
          enemy.pos.x += (dx / dist) * speed * dt * slowFactor;
          enemy.pos.z += (dz / dist) * speed * 0.6 * dt * slowFactor;
          enemy.state = 'RUN';
          this.enemyWalkCycle(enemy, dt);
        } else {
          enemy.state = 'IDLE';
        }

        // Melee attack trigger → 进入前摇预警（Windup Telegraph）；Boss技能蓄力期间不近战
        if (
          dist < 65 && Math.abs(dz) < 30 && enemy.attackCooldown <= 0 && (enemy.windupTimer ?? 0) <= 0 &&
          !(enemy.isBoss && enemy.bossSkills?.some((s) => s.windup > 0))
        ) {
          const windupTime = enemy.isBoss ? 0.6 : enemy.type === 'INK_BRUTE' ? 0.55 : enemy.type === 'SHADOW_NINJA' ? 0.4 : 0.5;
          enemy.state = 'WINDUP';
          enemy.stateTimer = 0;
          enemy.stateDuration = windupTime;
          enemy.windupTimer = windupTime;
          enemy.windupMax = windupTime;
          // 冷却在前摇开始时即重置（无双：怪海围压下敌近战轮炊更慢，保割草节奏不被打断）
          const baseCd = (enemy.type === 'SHADOW_NINJA' ? 1.6 : 2.2)
            * (this.gameMode === 'MUSOU' ? MUSOU_TUNING.enemyAttackCdMult : 1);
          enemy.attackCooldown = enemy.elite?.modifier === 'FRENZIED' ? baseCd * 0.55 : baseCd;
          sound.playWindup();
        }
      }
    }

    // Clean up faded corpses（原地压实，避免每帧 filter 分配新数组；同步清理走路相位缓存）
    {
      let write = 0;
      for (let i = 0; i < this.enemies.length; i++) {
        const e = this.enemies[i];
        const keep = e.hp > 0 || (e.deathTimer ?? 0) > 0;
        if (keep) {
          this.enemies[write++] = e;
        } else {
          this.enemyWalkCycleCache.delete(e.id);
        }
      }
      this.enemies.length = write;
    }

    // --- BOSS 血条同步（节流：仅变化时；Boss 引用缓存替代每帧 find 扫描） ---
    const boss = this.activeBoss && this.activeBoss.hp > 0 ? this.activeBoss : null;
    if (boss) {
      const key = `${boss.id}:${Math.ceil((boss.hp / boss.maxHp) * 100)}:${boss.bossPhase}`;
      if (key !== this.lastBossEmitted) {
        this.lastBossEmitted = key;
        this.callbacks.onBossUpdate({ name: boss.name, hp: boss.hp, maxHp: boss.maxHp, phase: boss.bossPhase ?? 1 });
      }
    }

    // --- PROJECTILES UPDATE ---
    for (const p of this.projectiles) {
      // 追踪符珠：有限转向率朝玩家修正（可走位甩开）
      if (p.homing && !p.isPlayer) {
        const tdx = player.pos.x - p.pos.x;
        const tdz = player.pos.z - p.pos.z;
        const td = Math.max(1, Math.hypot(tdx, tdz));
        const spd = Math.max(0.01, Math.hypot(p.vel.x, p.vel.z));
        const steer = Math.min(1, p.homing * dt * 60);
        const curX = p.vel.x / spd;
        const curZ = p.vel.z / spd;
        const nX = curX + (tdx / td - curX) * steer;
        const nZ = curZ + (tdz / td - curZ) * steer;
        const nL = Math.max(0.01, Math.hypot(nX, nZ));
        p.vel.x = (nX / nL) * spd;
        p.vel.z = (nZ / nL) * spd;
      }
      p.pos.x += p.vel.x * dt * 60;
      p.pos.y += p.vel.y * dt * 60;
      p.pos.z += p.vel.z * dt * 60;
      p.life -= dt;

      // 弹道尾迹（剑气/墨珠/雷链/震波/墨箭；概率随画质档位自适应）
      if (Math.random() < this.trailChance) {
        if (p.type === 'SWORD_BEAM') {
          this.pushParticle({
            x: p.pos.x, y: p.pos.y + (Math.random() - 0.5) * 10, z: p.pos.z,
            vx: -p.vel.x * 0.12, vy: 0.4, vz: 0,
            size: 2 + Math.random() * 2.4, alpha: 0.4, decay: 0.06,
            color: Math.random() < 0.5 ? '#0284c7' : '#17130f',
            shape: 'blob', stretch: 0.8, noGravity: true,
          });
        } else if (p.type === 'BOSS_ORB') {
          this.pushParticle({
            x: p.pos.x, y: p.pos.y, z: p.pos.z,
            vx: (Math.random() - 0.5) * 0.6, vy: 0.3 + Math.random() * 0.4, vz: (Math.random() - 0.5) * 0.6,
            size: 2.5 + Math.random() * 2, alpha: 0.4, decay: 0.05,
            color: '#7e22ce', shape: 'wisp', growth: 4, noGravity: true, swayPhase: Math.random() * 6,
          });
        } else if (p.type === 'CHAIN_BOLT') {
          this.pushParticle({
            x: p.pos.x, y: p.pos.y + (Math.random() - 0.5) * 8, z: p.pos.z,
            vx: (Math.random() - 0.5) * 1.4, vy: (Math.random() - 0.5) * 1.4, vz: 0,
            size: 1.6 + Math.random() * 1.4, alpha: 0.55, decay: 0.09,
            color: '#fde047', shape: 'circle', noGravity: true,
          });
        } else if (p.type === 'INK_SHOCKWAVE') {
          this.pushParticle({
            x: p.pos.x + (Math.random() - 0.5) * 30, y: 2, z: p.pos.z + (Math.random() - 0.5) * 16,
            vx: 0, vy: 0.6 + Math.random() * 0.8, vz: 0,
            size: 2.5 + Math.random() * 2.5, alpha: 0.34, decay: 0.055,
            color: '#5d5248', shape: 'blob', stretch: 0.5, noGravity: true,
          });
        } else if (p.type === 'INK_ARROW') {
          this.pushParticle({
            x: p.pos.x, y: p.pos.y, z: p.pos.z,
            vx: 0, vy: 0.2, vz: 0,
            size: 1.4 + Math.random(), alpha: 0.3, decay: 0.08,
            color: '#3f2b26', shape: 'circle', noGravity: true,
          });
        } else if (p.type === 'INK_TALISMAN') {
          // 追踪符珠：墨绿符晕尾迹
          this.pushParticle({
            x: p.pos.x, y: p.pos.y, z: p.pos.z,
            vx: 0, vy: 0.15, vz: 0,
            size: 1.6, alpha: 0.3, decay: 0.09,
            color: '#4d7c0f', shape: 'circle', noGravity: true,
          });
        }
      }

      // Check collision
      if (p.isPlayer) {
        for (const enemy of this.enemies) {
          if (enemy.hp <= 0) continue;
          if (p.hitIds?.has(enemy.id)) continue;
          const dist = Math.hypot(enemy.pos.x - p.pos.x, enemy.pos.z - p.pos.z);
          if (dist < p.radius && Math.abs(enemy.pos.y - p.pos.y) < 35) {
            this.damageEnemy(enemy, Math.round(p.damage), true);
            p.life = 0; // Destroy projectile on impact
            sound.playHit(true);
            break;
          }
        }
      } else {
        // Enemy projectile hits player
        const dist = Math.hypot(player.pos.x - p.pos.x, player.pos.z - p.pos.z);
        if (dist < p.radius && Math.abs(player.pos.y - p.pos.y) < 35) {
          if (!player.isInvincible) {
            this.hurtPlayer(p.damage, p.vel.x > 0 ? 1 : -1);
            p.life = 0;
          }
        }
      }
    }
    // --- PROJECTILES 原地压实 ---
    {
      let write = 0;
      for (let i = 0; i < this.projectiles.length; i++) {
        const p = this.projectiles[i];
        if (p.life > 0) this.projectiles[write++] = p;
      }
      this.projectiles.length = write;
    }

    // --- PARTICLES UPDATE (帧率无关，含新形态；幂系数逐帧提升一次) ---
    const wispDampVy = Math.pow(0.985, dt * 60);
    const wispDampVx = Math.pow(0.99, dt * 60);
    const swayStep = 0.5 * dt * 60;
    for (const part of this.particles) {
      part.x += part.vx * dt * 60;
      part.y += part.vy * dt * 60;
      part.z += part.vz * dt * 60;
      if (part.noGravity) {
        // 墨魂/速度线：微阻尼飘散
        if (part.shape === 'wisp') {
          part.vy *= wispDampVy;
          part.vx *= wispDampVx;
          part.swayPhase = (part.swayPhase ?? 0) + dt * 2.2;
          part.x += Math.sin(part.swayPhase) * 0.45 * dt * 60;
        }
      } else {
        part.vy -= 0.25 * dt * 60; // gravity on droplets
      }
      if (part.growth) part.size += part.growth * dt;
      if (part.spin) part.spinPhase = (part.spinPhase ?? 0) + part.spin * dt;
      if (part.isAmbient) {
        // 环境飘墨横摆（合并原独立遍历，省一轮全量扫描）
        part.swayPhase = (part.swayPhase ?? 0) + dt * 1.5;
        part.x += Math.sin(part.swayPhase) * swayStep;
      }
      part.alpha -= part.decay * dt * 60;
    }
    // 原地压实（出屏环境粒子与透明粒子一并移除；避免每帧两次 filter 分配）
    {
      let write = 0;
      for (let i = 0; i < this.particles.length; i++) {
        const part = this.particles[i];
        const alive = part.alpha > 0 && !(part.isAmbient && part.y < -10);
        if (alive) this.particles[write++] = part;
      }
      this.particles.length = write;
    }

    // --- 环境飘墨氛围粒子（含墨瓣） ---
    this.ambientTimer -= dt;
    if (this.ambientTimer <= 0) {
      this.ambientTimer = 0.5;
      const ambientCount = this.particles.filter((p) => p.isAmbient).length;
      if (ambientCount < this.ambientCap) {
        const isPetal = Math.random() < 0.28; // 28% 概率飘落墨瓣
        this.pushParticle({
          x: this.cameraX + (Math.random() - 0.5) * this.screenWidth * 1.4,
          y: 240 + Math.random() * 60,
          z: (Math.random() - 0.5) * 300,
          vx: (Math.random() - 0.5) * 0.4,
          vy: isPetal ? -0.22 - Math.random() * 0.22 : -0.35 - Math.random() * 0.4,
          vz: 0,
          size: isPetal ? 3 + Math.random() * 2.5 : 1.5 + Math.random() * 3,
          alpha: isPetal ? 0.22 + Math.random() * 0.14 : 0.12 + Math.random() * 0.12,
          decay: 0,
          color: isPetal ? (Math.random() < 0.6 ? '#9f1d20' : '#57453a') : Math.random() < 0.85 ? '#57534e' : '#b91c1c',
          isAmbient: true,
          swayPhase: Math.random() * Math.PI * 2,
          shape: isPetal ? 'petal' : 'circle',
          spin: isPetal ? 1.2 + Math.random() * 2 : 0,
          spinPhase: Math.random() * Math.PI,
        });
      }
    }

    // --- FLOATING TEXTS UPDATE (帧率无关，含弹跳年龄；原地压实) ---
    for (const ft of this.floatingTexts) {
      ft.age = (ft.age ?? 0) + dt;
      ft.y += (ft.vy ?? 0.8) * dt * 60;
      ft.alpha -= 0.016 * dt * 60;
    }
    {
      let write = 0;
      for (let i = 0; i < this.floatingTexts.length; i++) {
        const ft = this.floatingTexts[i];
        if (ft.alpha > 0) this.floatingTexts[write++] = ft;
      }
      this.floatingTexts.length = write;
    }

    // --- 特效子系统更新（剑弧/墨渍/激波环；原地压实） ---
    for (const s of this.inkSlashes) s.life -= dt;
    {
      let write = 0;
      for (let i = 0; i < this.inkSlashes.length; i++) {
        const s = this.inkSlashes[i];
        if (s.life > 0) this.inkSlashes[write++] = s;
      }
      this.inkSlashes.length = write;
    }
    for (const d of this.groundDecals) d.life -= dt;
    {
      let write = 0;
      for (let i = 0; i < this.groundDecals.length; i++) {
        const d = this.groundDecals[i];
        if (d.life > 0) this.groundDecals[write++] = d;
      }
      this.groundDecals.length = write;
    }
    for (const r of this.shockRings) r.life -= dt;
    {
      let write = 0;
      for (let i = 0; i < this.shockRings.length; i++) {
        const r = this.shockRings[i];
        if (r.life > 0) this.shockRings[write++] = r;
      }
      this.shockRings.length = write;
    }

    // --- SLASH LINKS CONNECTION VFX UPDATE（原地压实） ---
    for (const link of this.slashLinks) {
      link.alpha -= dt * 2.2;
    }
    {
      let write = 0;
      for (let i = 0; i < this.slashLinks.length; i++) {
        const l = this.slashLinks[i];
        if (l.alpha > 0) this.slashLinks[write++] = l;
      }
      this.slashLinks.length = write;
    }

    // --- DASH GHOSTS UPDATE（原地压实） ---
    for (const ghost of this.dashGhosts) {
      ghost.alpha -= dt * 3.2;
    }
    {
      let write = 0;
      for (let i = 0; i < this.dashGhosts.length; i++) {
        const g = this.dashGhosts[i];
        if (g.alpha > 0) this.dashGhosts[write++] = g;
      }
      this.dashGhosts.length = write;
    }

    // --- TELEGRAPH RINGS (地面预警圈；原地压实) ---
    for (const ring of this.telegraphs) {
      ring.windupTimer += dt;
      if (ring.windupTimer >= ring.windup) {
        ring.onTrigger?.();
      }
    }
    {
      let write = 0;
      for (let i = 0; i < this.telegraphs.length; i++) {
        const r = this.telegraphs[i];
        if (r.windupTimer < r.windup) this.telegraphs[write++] = r;
      }
      this.telegraphs.length = write;
    }

    // Trim player dashTrail
    if (this.player.dashTrail.length > 8) {
      this.player.dashTrail.splice(0, this.player.dashTrail.length - 8);
    }

    // --- 低血量警示：心跳音效 ---
    if (player.hp > 0 && player.hp / player.maxHp <= 0.3) {
      sound.startHeartbeat();
    } else {
      sound.stopHeartbeat();
    }
  }

  private enemyWalkCycleCache: Map<string, number> = new Map();
  private enemyWalkCycle(enemy: EnemyEntity, dt: number) {
    const cur = (this.enemyWalkCycleCache.get(enemy.id) ?? 0) + dt * 13;
    this.enemyWalkCycleCache.set(enemy.id, cur);
  }
  private getEnemyWalkCycle(enemy: EnemyEntity): number {
    return this.enemyWalkCycleCache.get(enemy.id) ?? 0;
  }

  /** 前摇结束后的真实近战判定 */
  private enemyMeleeStrike(enemy: EnemyEntity) {
    const player = this.player;
    enemy.state = 'ATTACK_HORIZONTAL';
    enemy.stateTimer = 0;
    enemy.stateDuration = 0.35;
    // 出手前冲
    enemy.vel.x = enemy.facing * 8;

    const curDist = Math.hypot(player.pos.x - enemy.pos.x, player.pos.z - enemy.pos.z);
    if (curDist < 88 && Math.abs(player.pos.z - enemy.pos.z) < 45) {
      if (!player.isInvincible && player.hp > 0) {
        this.hurtPlayer(enemy.damage, enemy.facing, enemy);
      }
    } else {
      // 挥空墨痕
      this.spawnInkBurst({ x: enemy.pos.x + enemy.facing * 30, y: 20, z: enemy.pos.z }, 6, '#292524');
    }
    sound.playSlash('light');
  }

  /** Boss 技能组调度 */
  private updateBossSkills(boss: EnemyEntity, dt: number, slowFactor: number) {
    if (!boss.bossSkills) return;
    const player = this.player;

    for (const skill of boss.bossSkills) {
      // 墨刃突进：冲锋进行中（先锋专属直线冲撞）
      if (skill.skill === 'CHARGE_RUSH' && skill.active > 0) {
        skill.active -= dt;
        boss.pos.x += (boss.bossChargeVX ?? 0) * dt * slowFactor;
        boss.pos.z += (boss.bossChargeVZ ?? 0) * dt * slowFactor;
        // 冲锋拖尾墨迹
        if (Math.random() < 0.7) {
          this.pushParticle({
            x: boss.pos.x - (boss.bossChargeVX ?? 0) * 0.03,
            y: 12 + Math.random() * 26,
            z: boss.pos.z - (boss.bossChargeVZ ?? 0) * 0.03,
            vx: (Math.random() - 0.5) * 1.2,
            vy: (Math.random() - 0.5) * 1.2,
            vz: (Math.random() - 0.5) * 1.2,
            size: 3 + Math.random() * 3,
            alpha: 0.55 + Math.random() * 0.25,
            decay: 0.05,
            color: '#5c1d1d',
            shape: 'streak',
            stretch: 0.8,
            noGravity: true,
          });
        }
        // 冲锋接触判定（每次冲锋至多命中一次）
        if (!boss.bossChargeHit) {
          const cdx = player.pos.x - boss.pos.x;
          const cdz = player.pos.z - boss.pos.z;
          if (Math.hypot(cdx, cdz) < 52) {
            boss.bossChargeHit = true;
            this.hurtPlayer(Math.round(boss.damage * 1.1), player.pos.x >= boss.pos.x ? 1 : -1, boss);
            this.addFloatingText('墨刃突进', boss.pos.x, boss.pos.y + 70, '#ef4444', 1.4, true);
            // 命中顿帧 + 溅墨
            this.spawnInkBurst(player.pos, 12, '#5c1d1d');
            this.triggerZoomPunch(0.03);
          }
        }
        if (skill.active <= 0) {
          // 冲锋收势：急停激波 + 小地裂
          boss.bossChargeVX = 0;
          boss.bossChargeVZ = 0;
          boss.state = 'IDLE';
          boss.stateDuration = 0.4;
          this.spawnShockRing(boss.pos.x, boss.pos.z, 6, 90, 0.4, '#5c1d1d', 3);
          this.cameraShake = Math.max(this.cameraShake, 8);
        }
        continue;
      }

      if (skill.windup > 0) {
        skill.windup -= dt;
        if (skill.windup <= 0) {
          skill.windup = 0;
          this.castBossSkill(boss, skill.skill);
        }
        continue;
      }

      // 召唤解锁：二阶段起（大帝三阶段同样可召）
      if (skill.skill === 'SUMMON' && boss.bossPhase === 1) continue;
      // 墨雨解锁：大帝第三阶段「灭」专属
      if (skill.skill === 'INK_RAIN' && boss.bossPhase !== 3) continue;

      skill.timer -= dt;
      if (skill.timer <= 0 && boss.hitStun <= 0) {
        // 进入预警（阶段越深冷却越短，压力递增）
        const phaseScale = boss.bossPhase === 3 ? 0.72 : boss.bossPhase === 2 ? 0.85 : 1;
        const windup = (skill.skill === 'SEISMIC_SLAM' ? 0.9
          : skill.skill === 'INK_VOLLEY' ? 0.6
          : skill.skill === 'CHARGE_RUSH' ? 0.75
          : skill.skill === 'INK_RAIN' ? 0.7
          : 0.5) * (boss.bossPhase === 3 ? 0.88 : 1);
        skill.windup = windup;
        skill.active = 0;
        skill.timer = (skill.skill === 'SEISMIC_SLAM' ? 7.5
          : skill.skill === 'INK_VOLLEY' ? 5.5
          : skill.skill === 'CHARGE_RUSH' ? 6.0
          : skill.skill === 'INK_RAIN' ? 13
          : 11) * phaseScale;
        boss.state = 'WINDUP';
        boss.stateTimer = 0;
        boss.stateDuration = windup;
        boss.windupTimer = 0; // Boss近战前摇独立于技能
        sound.playWindup();

        if (skill.skill === 'SEISMIC_SLAM') {
          // 记录震地圆心与半径（预警圈展开瞬间锁定位置，走位可躲；半径随 Boss 强度递增）
          const slamRadius = boss.bossTier === 1 ? 78 : boss.bossTier === 2 ? 95 : 112;
          this.pendingSlam = { x: player.pos.x, z: player.pos.z, r: slamRadius };
          // 地面预警圈在玩家当前位置展开
          this.telegraphs.push({
            id: Math.random().toString(),
            x: player.pos.x,
            z: player.pos.z,
            radius: slamRadius,
            windup: 0.9,
            windupTimer: 0,
            color: '#ef4444',
          });
        } else if (skill.skill === 'CHARGE_RUSH') {
          // 突进预警：锁定玩家当前位置（冲锋方向出手瞬间确定，横向走位可躲）
          this.pendingCharge = { x: player.pos.x, z: player.pos.z };
          this.telegraphs.push({
            id: Math.random().toString(),
            x: player.pos.x,
            z: player.pos.z,
            radius: 52,
            windup: 0.75,
            windupTimer: 0,
            color: '#f97316',
          });
        }
      }
    }
  }

  // 震地/突进判定圆心（预警圈展开时锁定；先锋同持两技能，分字段防互覆）
  private pendingSlam: { x: number; z: number; r: number } | null = null;
  private pendingCharge: { x: number; z: number } | null = null;

  private castBossSkill(boss: EnemyEntity, skill: BossSkillState['skill']) {
    const player = this.player;

    if (skill === 'SEISMIC_SLAM') {
      // 以预警圈锁定的圆心判定（离开圈范围即可躲）
      const cx = this.pendingSlam?.x ?? player.pos.x;
      const cz = this.pendingSlam?.z ?? player.pos.z;
      const cr = this.pendingSlam?.r ?? 95;
      this.pendingSlam = null;
      this.cameraShake = 22;
      sound.playHit(true);
      this.spawnInkBurst({ x: cx, y: 0, z: cz }, 22, '#7f1d1d');
      // 震岳落地：地裂 + 双重激波 + 镜头冲击
      this.addCrackDecal({ x: cx, y: 0, z: cz }, 1.6);
      this.spawnShockRing(cx, cz, 8, 140, 0.6, '#7f1d1d', 4);
      this.spawnShockRing(cx, cz, 6, 95, 0.45, '#1a1611', 3);
      this.triggerZoomPunch(0.042);
      if (Math.hypot(player.pos.x - cx, player.pos.z - cz) < cr) {
        this.hurtPlayer(Math.round(boss.damage * 1.2), player.pos.x >= cx ? 1 : -1, boss);
        this.addFloatingText('震岳一击', cx, 60, '#ef4444', 1.5, true);
      }
    } else if (skill === 'INK_VOLLEY') {
      // 墨珠扇形散射（大帝七连珠，其余五连珠）
      const orbCount = boss.bossTier === 3 ? 3 : 2;
      const spread = boss.bossTier === 3 ? 0.19 : 0.22;
      const baseAngle = Math.atan2(player.pos.z - boss.pos.z, player.pos.x - boss.pos.x);
      for (let i = -orbCount; i <= orbCount; i++) {
        const angle = baseAngle + i * spread;
        this.shootProjectile({
          pos: { x: boss.pos.x + boss.facing * 25, y: 22, z: boss.pos.z },
          vel: { x: Math.cos(angle) * 8.5, y: 0, z: Math.sin(angle) * 8.5 },
          damage: Math.round(boss.damage * 0.7),
          isPlayer: false,
          life: 2.2,
          maxLife: 2.2,
          type: 'BOSS_ORB',
          radius: 16,
        });
      }
      sound.playSlash('heavy');
    } else if (skill === 'SUMMON') {
      // 召唤墨卒护法（先锋1只/宗师2只/大帝2-3只）
      const count = boss.bossTier === 1 ? 1 : boss.bossPhase === 3 ? 3 : 2;
      for (let i = 0; i < count; i++) {
        this.spawnEnemyAt('INK_MINION', boss.pos.x + (i - (count - 1) / 2) * 70, boss.pos.z + (Math.random() - 0.5) * 40, false, null);
      }
      this.addFloatingText('墨卒 · 护法', boss.pos.x, boss.pos.y + 90, '#6b5a42', 1.3, true);
    } else if (skill === 'CHARGE_RUSH') {
      // 墨刃突进：锁定预警圈位置方向，直线高速冲撞
      const tx = this.pendingCharge?.x ?? player.pos.x;
      const tz = this.pendingCharge?.z ?? player.pos.z;
      this.pendingCharge = null;
      const dx = tx - boss.pos.x;
      const dz = tz - boss.pos.z;
      const d = Math.max(1, Math.hypot(dx, dz));
      const chargeSpeed = 620;
      boss.bossChargeVX = (dx / d) * chargeSpeed;
      boss.bossChargeVZ = (dz / d) * chargeSpeed;
      boss.bossChargeHit = false;
      boss.facing = dx >= 0 ? 1 : -1;
      const chargeSkill = boss.bossSkills?.find((s) => s.skill === 'CHARGE_RUSH');
      if (chargeSkill) chargeSkill.active = 0.5;
      boss.state = 'ATTACK_DASH';
      boss.stateTimer = 0;
      boss.stateDuration = 0.55;
      sound.playSlash('heavy');
      this.spawnSpeedLines(boss.pos, 8, '#5c1d1d');
    } else if (skill === 'INK_RAIN') {
      // 落墨成渊：大帝三阶段全场墨雨，五连环 bombing（先玩家位置一圈，其余随机散布）
      this.addFloatingText('落墨成渊', boss.pos.x, boss.pos.y + 100, '#fbbf24', 1.7, true, true);
      const dropRadius = 58;
      const positions: { x: number; z: number }[] = [{ x: player.pos.x, z: player.pos.z }];
      for (let i = 0; i < 4; i++) {
        positions.push({
          x: player.pos.x + (Math.random() - 0.5) * 380,
          z: player.pos.z + (Math.random() - 0.5) * 240,
        });
      }
      positions.forEach((p, i) => {
        this.telegraphs.push({
          id: Math.random().toString(),
          x: p.x,
          z: p.z,
          radius: dropRadius,
          windup: 1.0 + i * 0.28,
          windupTimer: 0,
          color: '#b45309',
          onTrigger: () => {
            this.cameraShake = Math.max(this.cameraShake, 12);
            sound.playHit(false);
            this.spawnInkBurst({ x: p.x, y: 0, z: p.z }, 16, '#1c1917');
            this.addSplatDecal({ x: p.x, y: 0, z: p.z }, 1.1, '#292524');
            this.spawnShockRing(p.x, p.z, 5, 78, 0.4, '#b45309', 2.5);
            if (Math.hypot(player.pos.x - p.x, player.pos.z - p.z) < dropRadius) {
              this.hurtPlayer(Math.round(boss.damage * 0.9), player.pos.x >= p.x ? 1 : -1, boss);
              this.addFloatingText('墨雨', p.x, 55, '#b45309', 1.3, true);
            }
          },
        });
      });
      sound.playBossWarn();
    }
  }

  private hurtPlayer(amount: number, fromFacing: 1 | -1, source?: EnemyEntity) {
    const player = this.player;
    if (player.isInvincible || player.hp <= 0 || this.runEnded) return;

    // 醉墨行：身形如醉步飘忽——概率完全闪避（无伤且不打断动作）
    const dodgeChance = this.sumStat('dodgeChancePercent');
    if (dodgeChance > 0 && Math.random() * 100 < dodgeChance) {
      this.addFloatingText('醉避', player.pos.x, player.pos.y + 60, '#5b2333', 1.2);
      this.spawnSpeedLines(player.pos, 5, '#5b2333');
      sound.playSlash('light');
      return;
    }

    let dmgRed = 0;
    for (const a of player.affixes) {
      if (a.stats.damageReduction) dmgRed += a.stats.damageReduction;
    }
    const finalDmg = Math.max(1, Math.round(amount * (1 - dmgRed / 100)));

    // 墨盾优先承伤
    let finalDmgLeft: number | undefined;
    if (player.shield > 0) {
      const absorbed = Math.min(player.shield, finalDmg);
      player.shield -= absorbed;
      const remain = finalDmg - absorbed;
      this.emitShield();
      this.spawnInkBurst(player.pos, 8, '#38bdf8');
      this.addFloatingText(`墨盾抵消 ${absorbed}`, player.pos.x, player.pos.y + 55, '#38bdf8', 1.0);
      if (player.shield <= 0) {
        sound.playShieldBreak();
        this.addFloatingText('『盾碎』', player.pos.x, player.pos.y + 70, '#38bdf8', 1.3, true);
      }
      if (remain <= 0) {
        // 全额吸收：仍有短暂无敌帧但不打断动作
        player.invincibleTimer = Math.max(player.invincibleTimer, 0.35);
        return;
      }
      finalDmgLeft = remain;
    }

    const appliedDmg = typeof finalDmgLeft === 'number' ? finalDmgLeft : finalDmg;
    player.hp = Math.max(0, player.hp - appliedDmg);
    this.emitHp();
    this.addFloatingText(`-${appliedDmg}`, player.pos.x, player.pos.y + 40, '#ef4444', 1.2);

    // 铁画银钩：反伤
    const thorns = this.sumStat('thornsPercent');
    if (thorns > 0 && source && source.hp > 0) {
      const reflect = Math.max(1, Math.round((appliedDmg * thorns) / 100));
      this.damageEnemy(source, reflect, false, 0.2);
      this.spawnInkBurst(source.pos, 5, '#fbbf24');
    }

    // 汲影精锐：吸血
    if (source?.elite?.modifier === 'SOULSIP' && source.hp > 0) {
      source.hp = Math.min(source.maxHp, source.hp + Math.round(appliedDmg * 0.4));
      this.spawnInkBurst(source.pos, 4, '#a855f7');
    }

    player.state = 'HURT';
    player.stateTimer = 0;
    player.stateDuration = 0.25;
    player.vel.x = fromFacing * 8;
    player.isInvincible = true;
    player.invincibleTimer = 0.65;
    this.cameraShake = 10;
    this.hurtFlashTimer = 0.4;
    // 受击墨劲反馈：红环 + 轻微镜头冲击
    this.spawnShockRing(player.pos.x, player.pos.z, 4, 50, 0.38, '#b91c1c', 2.5);
    this.triggerZoomPunch(0.016);
    sound.playHit(false);
    sound.playPlayerHurt();

    if (player.hp <= 0) {
      // 残页·续墨：原地复活一次
      if (this.hasStat('reviveOnce') && !player.reviveUsed) {
        player.reviveUsed = true;
        player.hp = Math.round(player.maxHp * 0.6);
        player.isInvincible = true;
        player.invincibleTimer = 2.0;
        player.state = 'IDLE';
        this.emitHp();
        this.addFloatingText('『残页 · 续墨』', player.pos.x, player.pos.y + 85, '#fbbf24', 1.8, true, true);
        sound.playVictory();
        // 震退群敌
        for (const enemy of this.enemies) {
          if (enemy.hp <= 0) continue;
          const ddx = enemy.pos.x - player.pos.x;
          const ddz = enemy.pos.z - player.pos.z;
          const d = Math.hypot(ddx, ddz) || 1;
          enemy.vel.x = (ddx / d) * 18;
          enemy.vel.z = (ddz / d) * 10;
          enemy.hitStun = Math.max(enemy.hitStun, 0.8);
          enemy.state = 'HURT';
        }
        this.spawnInkBurst(player.pos, 30, '#b91c1c');
        // 残页复活：金色激波 + 慢动作 + 屏缘泼墨
        this.spawnShockRing(player.pos.x, player.pos.z, 8, 170, 0.8, '#fbbf24', 4);
        this.spawnShockRing(player.pos.x, player.pos.z, 6, 120, 0.6, '#b91c1c', 3);
        this.triggerSlowMo(0.55);
        this.triggerZoomPunch(0.05);
        this.triggerInkEdge(0.6);
        this.cameraShake = 24;
        return;
      }

      player.state = 'DEAD';
      this.runEnded = true;
      this.isPaused = true;
      sound.stopHeartbeat();
      this.callbacks.onGameOver(this.getRunStats(), false);
    }
  }

  // --- RENDERING & PSEUDO-3D PROJECTION ---
  private render() {
    const ctx = this.ctx;
    const w = this.screenWidth;
    const h = this.screenHeight;
    const w2 = w * 0.5;
    const horizonY = h * 0.48;
    const camX = this.cameraX;
    this.nowMs = performance.now();
    this.ensureLayerCaches(w, h);

    ctx.clearRect(0, 0, w, h);

    // Camera shake offset + 微旋转 + 镜头缩放冲击（屏幕中心为轴）
    const shakeX = (Math.random() - 0.5) * this.cameraShake;
    const shakeY = (Math.random() - 0.5) * this.cameraShake;
    const shakeRot = (Math.random() - 0.5) * this.cameraShake * 0.0022;
    const zoom = 1 + this.zoomPunch;

    ctx.save();
    ctx.translate(w2, h * 0.62);
    ctx.rotate(shakeRot);
    ctx.scale(zoom, zoom);
    ctx.translate(-w2, -h * 0.62);
    ctx.translate(shakeX, shakeY);

    // 1. Draw Traditional Chinese Ink Wash Backdrop（离屏缓存图层）
    this.renderBackground(ctx, w, h);

    // 2. Horizon & Ground Plane with Ink Wash Stepping Grid
    this.renderGround(ctx, w, h, horizonY);

    // 3. Project & Sort Entities along Pseudo-3D Z depth（热路径用共享 scratch，零分配）
    const project = (pos: Vec3) => this.projectXYZ(pos.x, pos.y, pos.z);

    // 2.5 地面水墨留痕层（实体之下）：溅墨渍 / 地裂 / 冲击激波环
    this.renderGroundDecals(ctx);
    this.renderShockRings(ctx);

    // Gather all renderable elements for Z-sorting（队列复用，仅清空长度）
    const renderQueue = this.renderQueue;
    renderQueue.length = 0;

    // Sliding arrival indicator on ground (指引光晕)
    if (this.controlMode === 'FULL_GESTURE' && this.slideTarget && this.isSlidingMove) {
      const targetPos = { ...this.slideTarget };
      renderQueue.push({
        z: targetPos.z,
        draw: () => {
          const { sx, groundY, scale } = this.projectXYZ(targetPos.x, 0, targetPos.z);
          const pulse = (Math.sin(this.nowMs * 0.012) + 1) * 0.5;
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(sx, groundY, 22 * scale + pulse * 5, 8 * scale + pulse * 2, 0, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(3, 105, 161, 0.55)';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(sx, groundY, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#0369a1';
          ctx.fill();
          ctx.restore();
        },
      });
    }

    // 地面预警圈（Boss 震地 AoE；屏外剔除）
    for (const ring of this.telegraphs) {
      const df = (ring.z + 180) / 360;
      const sx = (ring.x - camX) * (0.85 + df * 0.45) + w2;
      if (sx < -(ring.radius * 2) || sx > w + ring.radius * 2) continue;
      renderQueue.push({
        z: ring.z,
        draw: () => {
          const { sx, groundY, scale } = this.projectXYZ(ring.x, 0, ring.z);
          const progress = ring.windupTimer / ring.windup;
          ctx.save();
          // 外框
          ctx.beginPath();
          ctx.ellipse(sx, groundY, ring.radius * scale, ring.radius * scale * 0.42, 0, 0, Math.PI * 2);
          ctx.strokeStyle = ring.color;
          ctx.globalAlpha = 0.55 + Math.sin(this.nowMs * 0.02) * 0.2;
          ctx.lineWidth = 2.5;
          ctx.stroke();
          // 收缩填充（进度）
          ctx.beginPath();
          ctx.ellipse(sx, groundY, ring.radius * scale * progress, ring.radius * scale * 0.42 * progress, 0, 0, Math.PI * 2);
          ctx.fillStyle = ring.color;
          ctx.globalAlpha = 0.18 + progress * 0.22;
          ctx.fill();
          ctx.restore();
        },
      });
    }

    // Player Shadow & Skeleton
    renderQueue.push({
      z: this.player.pos.z,
      draw: () => {
        const { sx, sy, scale, groundY } = this.projectXYZ(this.player.pos.x, this.player.pos.y, this.player.pos.z);

        // Ground shadow (ink puddle ellipse)
        this.renderShadow(ctx, sx, groundY, scale, this.player.pos.y);

        // Dash trail afterimages
        for (let i = 0; i < this.player.dashTrail.length; i++) {
          const tPos = this.player.dashTrail[i];
          const tProj = project(tPos);
          const tPose = StickmanSkeleton.getPose('ATTACK_DASH', 0.2, 0.3, 0);
          StickmanSkeleton.render(ctx, tProj.sx, tProj.sy, tProj.scale, this.player.facing, tPose, {
            isPlayer: true,
            inkAlpha: 0.15 + (i / this.player.dashTrail.length) * 0.25,
          });
        }

        // Main Player Stickman
        const pose = StickmanSkeleton.getPose(
          this.player.state,
          this.player.stateTimer,
          this.player.stateDuration,
          this.walkCycle
        );

        // Invincibility flashing
        const alpha = this.player.isInvincible && Math.floor(this.nowMs / 80) % 2 === 0 ? 0.35 : 1.0;
        const isAttackingNow = this.player.state.startsWith('ATTACK_');

        StickmanSkeleton.render(ctx, sx, sy, scale, this.player.facing, pose, {
          isPlayer: true,
          inkAlpha: alpha,
          ribbonPhase: this.player.ribbonWave,
          isAttacking: isAttackingNow,
        });

        // 墨盾光环
        if (this.player.shield > 0) {
          ctx.save();
          const pulse = (Math.sin(this.nowMs * 0.005) + 1) * 0.5;
          ctx.beginPath();
          ctx.ellipse(sx, groundY, 30 * scale + pulse * 4, 12 * scale + pulse * 2, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 + pulse * 0.3})`;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        }
      },
    });

    // High-speed Martial Arts Dash Ghosts (水墨残影；屏外剔除)
    for (const ghost of this.dashGhosts) {
      const df = (ghost.z + 180) / 360;
      const gsx = (ghost.x - camX) * (0.85 + df * 0.45) + w2;
      if (gsx < -80 || gsx > w + 80) continue;
      renderQueue.push({
        z: ghost.z,
        draw: () => {
          const { sx, sy, scale, groundY } = this.projectXYZ(ghost.x, ghost.y, ghost.z);
          this.renderShadow(ctx, sx, groundY, scale, ghost.y);
          const pose = StickmanSkeleton.getPose(ghost.state, ghost.stateTimer, ghost.stateDuration, 0);
          StickmanSkeleton.render(ctx, sx, sy, scale, ghost.facing, pose, {
            isPlayer: true,
            inkAlpha: ghost.alpha * 0.45,
          });
        },
      });
    }

    // Enemies（屏外剔除：远处敌人完全不进入渲染队列，骨架绘制是最大头开销）
    for (const enemy of this.enemies) {
      const df = (enemy.pos.z + 180) / 360;
      const esx = (enemy.pos.x - camX) * (0.85 + df * 0.45) + w2;
      if (esx < -150 || esx > w + 150) continue;
      renderQueue.push({
        z: enemy.pos.z,
        draw: () => {
          const { sx, sy, scale, groundY } = this.projectXYZ(enemy.pos.x, enemy.pos.y, enemy.pos.z);
          const finalScale = scale * enemy.scale;

          let renderSx = sx;
          let renderSy = sy;

          // Hit-Stun Tremble & Stagger Indicator (受击硬直震颤特效)
          if (enemy.hitStun > 0 && enemy.hp > 0) {
            const tremor = Math.sin(this.nowMs * 0.08) * 3.5;
            renderSx += tremor;
          }

          // 尸体淡出（无双小怪 0.55s 快消散，与 killEnemy 的 deathTimer 设定同步）
          const corpseLife = enemy.isBoss || this.gameMode !== 'MUSOU' ? 0.9 : MUSOU_TUNING.corpseLife;
          const deathFade = enemy.hp <= 0 ? Math.max(0, (enemy.deathTimer ?? 0) / corpseLife) : 1;
          const spawnGraceMax = this.gameMode === 'MUSOU' ? MUSOU_TUNING.spawnGraceSec : 0.6;
          const spawnFade = enemy.hp > 0 ? Math.min(1, 1 - (enemy.spawnGrace ?? 0) / spawnGraceMax) : 1;
          const fade = deathFade * spawnFade;

          this.renderShadow(ctx, sx, groundY, finalScale, enemy.pos.y);

          // 精英光环
          if (enemy.elite && enemy.hp > 0) {
            const pulse = (Math.sin(this.nowMs * 0.006) + 1) * 0.5;
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(sx, groundY, 34 * finalScale + pulse * 4, 13 * finalScale + pulse * 2, 0, 0, Math.PI * 2);
            ctx.strokeStyle = enemy.elite.color;
            ctx.globalAlpha = 0.5 + pulse * 0.3;
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.restore();
          }

          // Boss 阶段光环（独立于精英判定：Boss 波不出精英，原嵌套导致狂暴红雾从未渲染）
          if (enemy.isBoss && enemy.hp > 0 && (enemy.bossPhase ?? 1) >= 2) {
            ctx.save();
            // 二阶段狂暴红雾 / 三阶段「灭」金红双环
            if (enemy.bossPhase === 2) {
              const pulse2 = (Math.sin(this.nowMs * 0.008) + 1) * 0.5;
              ctx.beginPath();
              ctx.ellipse(sx, groundY, (44 + pulse2 * 5) * finalScale, (17 + pulse2 * 2) * finalScale, 0, 0, Math.PI * 2);
              ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 + pulse2 * 0.25})`;
              ctx.lineWidth = 2.5;
              ctx.stroke();
            } else if (enemy.bossPhase === 3) {
              const pulse3 = (Math.sin(this.nowMs * 0.009) + 1) * 0.5;
              ctx.beginPath();
              ctx.ellipse(sx, groundY, (50 + pulse3 * 6) * finalScale, (19 + pulse3 * 2) * finalScale, 0, 0, Math.PI * 2);
              ctx.strokeStyle = `rgba(251, 191, 36, ${0.5 + pulse3 * 0.3})`;
              ctx.lineWidth = 2.5;
              ctx.stroke();
              ctx.beginPath();
              ctx.ellipse(sx, groundY, 38 * finalScale, 15 * finalScale, 0, 0, Math.PI * 2);
              ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
              ctx.stroke();
            }
            ctx.restore();
          }

          const pose = StickmanSkeleton.getPose(
            enemy.state,
            enemy.stateTimer,
            enemy.stateDuration,
            enemy.state === 'WINDUP' ? this.nowMs * 0.02 : this.getEnemyWalkCycle(enemy)
          );

          // 爆墨傀儡：引信脉冲红圈（引信越短闪烁越急）
          if (enemy.type === 'INK_BOMBER' && (enemy.windupTimer ?? 0) > 0 && enemy.hp > 0) {
            const ratio = 1 - (enemy.windupTimer ?? 0) / Math.max(0.01, enemy.windupMax ?? 1);
            const pulse = (Math.sin(this.nowMs * (0.018 + ratio * 0.05)) + 1) * 0.5;
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(sx, groundY, (30 + pulse * 10) * finalScale, (12 + pulse * 4) * finalScale, 0, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(234, 88, 12, ${0.35 + pulse * 0.4})`;
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.restore();
          }

          StickmanSkeleton.render(ctx, renderSx, renderSy, finalScale, enemy.facing, pose, {
            isPlayer: false,
            enemyType: enemy.type,
            bossTier: enemy.bossTier,
            bossPhase: enemy.bossPhase,
            inkAlpha: (enemy.state === 'DEAD' ? 0.3 : 1.0) * fade,
            shieldDown: enemy.type === 'INK_SHIELD_GUARD' && (enemy.state === 'WINDUP' || enemy.state.startsWith('ATTACK') || enemy.hitStun > 0),
            ribbonPhase: enemy.type === 'INK_SUMMONER' ? this.nowMs * 0.004 : 0,
          });

          // 寒缓冰霜标记
          if ((enemy.frostSlowTimer ?? 0) > 0 && enemy.hp > 0) {
            ctx.save();
            ctx.globalAlpha = 0.55;
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(sx, groundY, 26 * finalScale, 10 * finalScale, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          // 前摇预警标记：头顶红色「!」（爆墨傀儡为「爆」）+ 渐亮光圈（描边替代 shadowBlur，性能友好）
          if ((enemy.windupTimer ?? 0) > 0 && enemy.hp > 0) {
            const ratio = 1 - (enemy.windupTimer ?? 0) / Math.max(0.01, enemy.windupMax ?? 1);
            const windupMark = enemy.type === 'INK_BOMBER' ? '爆'
              : enemy.type === 'INK_CRANE' ? '袭'
              : enemy.type === 'INK_TURTLE' ? '震'
              : enemy.type === 'INK_DRUNKARD' ? '斩'
              : '！';
            ctx.save();
            ctx.font = `bold ${Math.round(22 * finalScale)}px 'Ma Shan Zheng', cursive`;
            ctx.textAlign = 'center';
            ctx.lineJoin = 'round';
            ctx.miterLimit = 2;
            ctx.lineWidth = 4;
            ctx.strokeStyle = 'rgba(243, 236, 219, 0.9)';
            ctx.globalAlpha = 0.85;
            ctx.strokeText(windupMark, renderSx, renderSy - 88 * finalScale);
            ctx.globalAlpha = 1;
            ctx.fillStyle = `rgba(239, 68, 68, ${0.5 + ratio * 0.5})`;
            ctx.fillText(windupMark, renderSx, renderSy - 88 * finalScale);
            ctx.restore();
          }

          // Draw Stun Crack Mark above head when staggered
          if (enemy.hitStun > 0 && enemy.hp > 0) {
            ctx.save();
            ctx.font = `bold ${Math.round(13 * finalScale)}px 'Ma Shan Zheng', cursive`;
            ctx.textAlign = 'center';
            ctx.lineJoin = 'round';
            ctx.miterLimit = 2;
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'rgba(243, 236, 219, 0.9)';
            ctx.strokeText('⚡破势', renderSx, renderSy - 80 * finalScale);
            ctx.fillStyle = '#ef4444';
            ctx.fillText('⚡破势', renderSx, renderSy - 80 * finalScale);
            ctx.restore();
          }

          // 精英词缀顶标
          if (enemy.elite && enemy.hp > 0) {
            ctx.save();
            ctx.font = `bold ${Math.round(13 * finalScale)}px 'Ma Shan Zheng', cursive`;
            ctx.fillStyle = enemy.elite.color;
            ctx.textAlign = 'center';
            ctx.fillText(`『${enemy.elite.hanzi}』`, renderSx, renderSy - 96 * finalScale);
            ctx.restore();
          }

          // Floating Health Bar for Enemies
          if (enemy.hp < enemy.maxHp && enemy.hp > 0) {
            const barW = 34 * finalScale;
            const barH = 3.5;
            const barX = sx - barW / 2;
            const barY = sy - 72 * finalScale;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(barX, barY, barW, barH);
            const ratio = Math.max(0, enemy.hp / enemy.maxHp);
            ctx.fillStyle = enemy.isBoss ? '#dc2626' : enemy.elite ? enemy.elite.color : '#ea580c';
            ctx.fillRect(barX, barY, barW * ratio, barH);
          }
        },
      });
    }

    // Projectiles（屏外剔除）
    for (const p of this.projectiles) {
      const df = (p.pos.z + 180) / 360;
      const psx = (p.pos.x - camX) * (0.85 + df * 0.45) + w2;
      if (psx < -90 || psx > w + 90) continue;
      renderQueue.push({
        z: p.pos.z,
        draw: () => {
          const { sx, sy, scale } = this.projectXYZ(p.pos.x, p.pos.y, p.pos.z);
          this.renderProjectile(ctx, p, sx, sy, scale);
        },
      });
    }

    // Sort by depth (far away objects drawn first, near objects drawn on top)
    renderQueue.sort((a, b) => a.z - b.z);
    for (const item of renderQueue) {
      item.draw();
    }

    // 3.5 连击锁链与剑弧之后：墨瓣/墨魂等粒子在实体之上绘制（见下方粒子层）

    // 4. Dynamic Calligraphy Ink Connection Links (水墨剑意连击特效 / 锁链切线)
    this.renderSlashLinks(ctx);

    // 4.5 笔刷剑弧：招式专属挥砍特效
    this.renderInkSlashes(ctx);

    // 5. Ink Splatter Particles（多形态渲染：墨滴/拖尾/墨魂/墨瓣/速度线；内联投影 + 屏外剔除，零分配）
    for (const part of this.particles) {
      const a0 = part.alpha;
      if (a0 <= 0) continue;
      const df = (part.z + 180) / 360;
      const sc = 0.85 + df * 0.45;
      const sx = (part.x - camX) * sc + w2;
      if (sx < -70 || sx > w + 70) continue;
      const sy = horizonY + 80 + df * (h * 0.42) - part.y * sc;
      if (sy < -70 || sy > h + 70) continue;
      const a = a0 > 1 ? 1 : a0;
      ctx.globalAlpha = a;

      if (part.shape === 'streak') {
        // 速度线：沿速度方向拉出的墨痕
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - part.vx * 3.4, sy);
        ctx.strokeStyle = part.color;
        ctx.lineWidth = Math.max(1, part.size);
        ctx.lineCap = 'round';
        ctx.stroke();
      } else if (part.shape === 'wisp') {
        // 墨魂：双层软墨晕
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(1, part.size), 0, Math.PI * 2);
        ctx.fillStyle = part.color;
        ctx.globalAlpha = a * 0.32;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(1, part.size * 0.5), 0, Math.PI * 2);
        ctx.globalAlpha = a * 0.5;
        ctx.fill();
      } else if (part.shape === 'petal') {
        // 墨瓣：旋转的小墨叶
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(part.spinPhase ?? 0);
        ctx.beginPath();
        ctx.ellipse(0, 0, Math.max(1, part.size), Math.max(0.6, part.size * 0.52), 0, 0, Math.PI * 2);
        ctx.fillStyle = part.color;
        ctx.fill();
        ctx.restore();
      } else if (part.shape === 'blob' && (part.stretch ?? 0) > 0) {
        // 墨滴速度拖尾：沿速度方向拉长的椭圆（运动模糊）
        const dirX = part.vx;
        const dirY = -part.vy; // 屏幕 y 向下
        const speedMag = Math.hypot(dirX, dirY) || 1;
        const stretchAmt = part.stretch ?? 0;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(Math.atan2(dirY, dirX));
        ctx.beginPath();
        ctx.ellipse(
          0, 0,
          Math.max(1, part.size * (1 + stretchAmt * speedMag * 0.16)),
          Math.max(1, part.size * (1 - Math.min(0.45, stretchAmt * speedMag * 0.045))),
          0, 0, Math.PI * 2
        );
        ctx.fillStyle = part.color;
        ctx.fill();
        ctx.restore();
      } else {
        // 默认墨点
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(1, part.size * a), 0, Math.PI * 2);
        ctx.fillStyle = part.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
    }

    // 6. Floating Text (Combat numbers & Calligraphy moves，带弹跳入场；宣纸色描边替代 shadowBlur)
    for (const ft of this.floatingTexts) {
      const pr = this.projectXYZ(ft.x, ft.y, 0);
      const sx = pr.sx;
      const sy = pr.sy;
      if (sx < -80 || sx > w + 80 || sy < -40 || sy > h + 40) continue;
      const age = ft.age ?? 1;
      // 弹跳入场：快速放大超射后回落
      const pop = age < 0.09 ? 0.55 + (age / 0.09) * 0.45 : 1 + 0.26 * Math.exp(-(age - 0.09) * 6.5);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(pop, pop);
      ctx.font = ft.isGesture ? `bold 22px 'Ma Shan Zheng', cursive` : ft.isCrit ? `bold 18px 'Noto Serif SC', serif` : `15px 'Noto Serif SC', serif`;
      ctx.textAlign = 'center';
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.globalAlpha = ft.alpha;
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(243, 236, 219, 0.9)';
      ctx.strokeText(ft.text, 0, 0);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, 0, 0);
      ctx.restore();
    }

    // 7. Draw User Calligraphy Brush Stroke
    if (this.activeStroke.length > 0) {
      GestureRecognizer.renderBrushStroke(ctx, this.activeStroke);
      // 移动端笔锋指引：指尖遮挡触点，在触点上方用朱砂小圈标记实际笔锋位置
      if (this.coarsePointer) {
        const tip = this.activeStroke[this.activeStroke.length - 1];
        ctx.save();
        ctx.strokeStyle = 'rgba(185, 28, 28, 0.8)';
        ctx.fillStyle = 'rgba(185, 28, 28, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y - 8);
        ctx.lineTo(tip.x, tip.y - 17);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(tip.x, tip.y - 23, 4.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(tip.x, tip.y - 23, 1.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 8. Draw Touch Joystick on Left Screen (Only if in SPLIT_SCREEN mode and active)
    if (this.controlMode === 'SPLIT_SCREEN' && this.touchMoveActive && this.touchMoveOrigin && this.touchMoveCurrent) {
      this.renderTouchJoystick(ctx, this.touchMoveOrigin, this.touchMoveCurrent);
    }

    // 9. Subtle Ink Border Vignette & Screen Partition Line Guide
    this.renderScreenGuides(ctx, w, h);

    ctx.restore();

    // 10. 屏幕空间特效（不受镜头抖动/缩放影响）：慢动作墨帘 + 屏缘泼墨闪烁
    this.renderSlowMoBars(ctx, w, h);
    this.renderInkEdge(ctx, w, h);
  }

  /** 地面墨渍渲染（溅墨 + 地裂，缓慢淡出的水墨留痕；共享投影零分配） */
  private renderGroundDecals(ctx: CanvasRenderingContext2D) {
    if (this.groundDecals.length === 0) return;
    ctx.save();
    for (const d of this.groundDecals) {
      const pr = this.projectXYZ(d.x, 0, d.z);
      const sx = pr.sx;
      const groundY = pr.groundY;
      const scale = pr.scale;
      if (sx < -180 || sx > this.screenWidth + 180) continue;
      const a = Math.max(0, Math.min(1, d.life / d.maxLife));
      if (a <= 0) continue;

      if (d.kind === 'SPLAT' && d.blobs) {
        for (let i = 0; i < d.blobs.length; i++) {
          const b = d.blobs[i];
          // 首帧主墨团带外晕（洇墨感），卫星点直接实心
          const isMain = i === 0;
          ctx.beginPath();
          ctx.ellipse(
            sx + b.dx * scale,
            groundY + b.dy * scale * 0.42,
            Math.max(0.5, b.r * scale * (isMain ? 1.35 : 1)),
            Math.max(0.3, b.r * scale * b.squish * (isMain ? 1.35 : 1)),
            b.rot, 0, Math.PI * 2
          );
          ctx.globalAlpha = a * (isMain ? 0.16 : 0.4);
          ctx.fillStyle = d.color;
          ctx.fill();
        }
      } else if (d.kind === 'CRACK' && d.cracks) {
        ctx.strokeStyle = d.color;
        ctx.lineCap = 'round';
        for (const crack of d.cracks) {
          ctx.globalAlpha = a * 0.62;
          ctx.lineWidth = Math.max(0.6, crack.w * a * scale);
          ctx.beginPath();
          ctx.moveTo(sx, groundY);
          for (const pt of crack.pts) {
            ctx.lineTo(sx + pt.x * scale, groundY + pt.y * scale * 0.42);
          }
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1.0;
    ctx.restore();
  }

  /** 冲击激波环渲染（地面扩散墨劲；共享投影零分配） */
  private renderShockRings(ctx: CanvasRenderingContext2D) {
    if (this.shockRings.length === 0) return;
    ctx.save();
    for (const r of this.shockRings) {
      const p = 1 - Math.max(0, r.life / r.maxLife); // 0→1
      const ease = 1 - Math.pow(1 - p, 2.2);
      const rad = r.r0 + (r.r1 - r.r0) * ease;
      const pr = this.projectXYZ(r.x, 0, r.z);
      const sx = pr.sx;
      const groundY = pr.groundY;
      const scale = pr.scale;
      if (sx < -(rad * scale + 40) || sx > this.screenWidth + rad * scale + 40) continue;
      ctx.globalAlpha = (1 - p) * 0.75;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = Math.max(0.5, r.width * (1 - p * 0.55));
      ctx.beginPath();
      ctx.ellipse(sx, groundY, rad * scale, rad * scale * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 前半段带内层跟随环（层次感）
      if (p < 0.55) {
        ctx.globalAlpha = (1 - p) * 0.38;
        ctx.lineWidth = Math.max(0.5, r.width * 0.5);
        ctx.beginPath();
        ctx.ellipse(sx, groundY, rad * 0.7 * scale, rad * 0.7 * scale * 0.42, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1.0;
    ctx.restore();
  }

  /** 笔刷剑弧渲染：每个招式专属的水墨挥砍轨迹（枯笔飞白 + 焦墨锋刃 + 金芒挑锋；共享投影零分配） */
  private renderInkSlashes(ctx: CanvasRenderingContext2D) {
    if (this.inkSlashes.length === 0) return;

    for (const s of this.inkSlashes) {
      const pr = this.projectXYZ(s.x, s.y, s.z);
      const sx = pr.sx;
      const sy = pr.sy;
      const scale = pr.scale;
      if (sx < -220 || sx > this.screenWidth + 220) continue;
      const t = 1 - Math.max(0, s.life / s.maxLife); // 0→1 展开进度
      // 水墨笔触：快进慢出的透明度包络
      const alpha = Math.sin(Math.min(1, t) * Math.PI) * 0.95;
      if (alpha <= 0.02) continue;
      const ease = 1 - Math.pow(1 - t, 3);
      const R = s.size * (40 + 62 * ease); // 弧半径随时间展开

      // 确定性伪随机（每笔剑弧的飞白点位固定，不闪烁）
      let sd = s.seed % 2147483647;
      const rnd = () => {
        sd = (sd * 16807) % 2147483647;
        return sd / 2147483647;
      };

      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(s.facing * scale, scale);

      const drawArcPass = (a0: number, a1: number, radius: number, w0: number, w1: number, color: string, passAlpha: number) => {
        // 分段变宽笔触：模拟毛笔起笔重、收笔轻
        const segs = 9;
        ctx.strokeStyle = color;
        ctx.lineCap = 'round';
        for (let i = 0; i < segs; i++) {
          const f0 = i / segs;
          const f1 = (i + 1) / segs;
          const ang0 = a0 + (a1 - a0) * f0;
          const ang1 = a0 + (a1 - a0) * f1;
          ctx.globalAlpha = alpha * passAlpha * (1 - f0 * 0.55);
          ctx.lineWidth = Math.max(0.5, w0 + (w1 - w0) * f0);
          ctx.beginPath();
          ctx.arc(0, 0, radius, ang0, ang1);
          ctx.stroke();
        }
      };

      switch (s.kind) {
        case 'THRUST': {
          // 刺：锐利直线突刺（三层：墨晕/焦墨/金芒）
          const L = R * 1.5;
          const w = 7 * s.size;
          ctx.lineCap = 'round';
          ctx.globalAlpha = alpha * 0.3;
          ctx.strokeStyle = s.color;
          ctx.lineWidth = w * 2.1;
          ctx.beginPath(); ctx.moveTo(-L * 0.15, 0); ctx.lineTo(L, 0); ctx.stroke();
          ctx.globalAlpha = alpha * 0.95;
          ctx.lineWidth = w;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0); ctx.stroke();
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = '#fde68a';
          ctx.lineWidth = Math.max(1, w * 0.3);
          ctx.beginPath(); ctx.moveTo(L * 0.55, 0); ctx.lineTo(L * 1.02, 0); ctx.stroke();
          break;
        }
        case 'HORIZONTAL': {
          // 横扫：前下方宽弧（起笔重收笔轻 + 飞白）
          drawArcPass(-1.15, 0.55, R, 11 * s.size, 1.5, s.color, 0.32);
          drawArcPass(-1.1, 0.5, R, 6 * s.size, 0.8, s.color, 0.95);
          drawArcPass(0.1, 0.55, R * 1.02, 2, 0.5, '#fde68a', 0.9);
          break;
        }
        case 'VERTICAL': {
          // 力劈：自上而下重劈弧
          ctx.rotate(-0.35);
          drawArcPass(0.35, 1.75, R, 13 * s.size, 2, s.color, 0.32);
          drawArcPass(0.4, 1.7, R, 7 * s.size, 1, s.color, 0.95);
          drawArcPass(1.45, 1.75, R * 1.03, 2.4, 0.6, '#fde68a', 0.9);
          break;
        }
        case 'LAUNCH': {
          // 挑：自下而上挑弧
          ctx.rotate(0.3);
          drawArcPass(2.2, 3.55, R, 2, 11 * s.size, s.color, 0.32);
          drawArcPass(2.25, 3.5, R, 1, 7 * s.size, s.color, 0.95);
          drawArcPass(3.3, 3.55, R * 1.03, 0.6, 2.4, '#fde68a', 0.9);
          break;
        }
        case 'CIRCLE': {
          // 太极：旋转的双层环转墨劲
          ctx.globalAlpha = alpha * 0.3;
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 10 * s.size;
          ctx.beginPath();
          ctx.ellipse(0, 0, R, R * 0.42, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = alpha * 0.9;
          ctx.lineWidth = 3.5 * s.size;
          ctx.setLineDash([R * 0.55, R * 0.28]);
          ctx.lineDashOffset = ease * R * 2.2;
          ctx.beginPath();
          ctx.ellipse(0, 0, R * 0.86, R * 0.36, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          break;
        }
        case 'DASH': {
          // 闪：横向高速残风波
          const L = R * 1.6;
          ctx.globalAlpha = alpha * 0.28;
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.moveTo(-L, -3 * s.size);
          ctx.quadraticCurveTo(-L * 0.4, -9 * s.size, 0, 0);
          ctx.quadraticCurveTo(-L * 0.4, 9 * s.size, -L, 3 * s.size);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = alpha * 0.85;
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 2.2 * s.size;
          for (let i = 0; i < 3; i++) {
            const oy = (rnd() - 0.5) * 26 * s.size;
            ctx.beginPath();
            ctx.moveTo(-L * (0.5 + rnd() * 0.5), oy);
            ctx.lineTo(-L * 0.1, oy * 0.4);
            ctx.stroke();
          }
          break;
        }
      }

      // 飞白飞溅：沿弧线的干笔碎墨
      if (s.kind === 'HORIZONTAL' || s.kind === 'VERTICAL' || s.kind === 'LAUNCH') {
        ctx.fillStyle = s.color;
        for (let i = 0; i < 5; i++) {
          const fa = rnd();
          const ang = -1.1 + fa * 1.6;
          const fr = R * (0.85 + rnd() * 0.3);
          ctx.globalAlpha = alpha * 0.7 * (1 - fa * 0.5);
          ctx.beginPath();
          ctx.arc(Math.cos(ang) * fr, Math.sin(ang) * fr, Math.max(0.6, 2.2 * rnd() * s.size), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1.0;
      ctx.restore();
    }
  }

  /** 慢动作电影墨帘（上下渐变黑墨压边；离屏预烘焙，运行时仅两次缩放 drawImage） */
  private renderSlowMoBars(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (this.slowMoVis <= 0.015) return;
    const vis = this.slowMoVis;
    const barH = h * 0.085 * vis;

    ctx.globalAlpha = vis;
    if (this.slowMoTopCanvas) ctx.drawImage(this.slowMoTopCanvas, 0, 0, w, barH * 1.6);
    if (this.slowMoBottomCanvas) ctx.drawImage(this.slowMoBottomCanvas, 0, h - barH * 1.6, w, barH * 1.6);
    ctx.globalAlpha = 1.0;

    // 内缘金线（戏票感）
    ctx.fillStyle = `rgba(190, 158, 96, ${0.4 * vis})`;
    ctx.fillRect(0, barH * 0.92, w, 1.2);
    ctx.fillRect(0, h - barH * 0.92 - 1.2, w, 1.2);
  }

  /** 屏缘泼墨闪烁（连击/Boss/通关的高光时刻；离屏预烘焙，运行时仅一次 drawImage） */
  private renderInkEdge(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (this.inkEdgeTimer <= 0) return;
    const a = Math.min(1, this.inkEdgeTimer / 0.45);
    if (!this.inkEdgeCanvas) return;
    ctx.globalAlpha = a;
    ctx.drawImage(this.inkEdgeCanvas, 0, 0, w, h);
    ctx.globalAlpha = 1.0;
  }

  private renderSlashLinks(ctx: CanvasRenderingContext2D) {
    if (this.slashLinks.length === 0) return;

    ctx.save();
    for (const link of this.slashLinks) {
      const alpha = Math.max(0, link.alpha);
      if (alpha <= 0) continue;

      const dx = link.to.x - link.from.x;
      const dy = link.to.y - link.from.y;
      const midX = (link.from.x + link.to.x) / 2;
      const midY = (link.from.y + link.to.y) / 2;
      const dist = Math.hypot(dx, dy);

      // 0. End-point and start-point ink ripple rings (剑气墨晕光环)
      ctx.beginPath();
      ctx.arc(link.to.x, link.to.y, Math.max(4, 20 * (1 - alpha * 0.5)), 0, Math.PI * 2);
      ctx.strokeStyle = link.color === '#b91c1c' ? `rgba(239, 68, 68, ${alpha * 0.6})` : `rgba(56, 189, 248, ${alpha * 0.6})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(link.from.x, link.from.y, Math.max(3, 14 * (1 - alpha * 0.5)), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(254, 240, 138, ${alpha * 0.5})`;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // 1. Broad ethereal ink aura (水墨挥洒虚影)
      ctx.beginPath();
      ctx.moveTo(link.from.x, link.from.y);
      ctx.lineTo(link.to.x, link.to.y);
      ctx.strokeStyle =
        link.color === '#b91c1c'
          ? `rgba(185, 28, 28, ${alpha * 0.5})`
          : `rgba(56, 189, 248, ${alpha * 0.5})`;
      ctx.lineWidth = link.width * 2.8;
      ctx.lineCap = 'round';
      ctx.stroke();

      // 2. Core dark ink blade slit (焦墨锋刃)
      ctx.beginPath();
      ctx.moveTo(link.from.x, link.from.y);
      ctx.lineTo(link.to.x, link.to.y);
      ctx.strokeStyle = `rgba(20, 18, 16, ${alpha * 0.95})`;
      ctx.lineWidth = link.width;
      ctx.stroke();

      // 3. Lightning / Cinnabar spark inner core (金芒雷意)
      ctx.beginPath();
      ctx.moveTo(link.from.x, link.from.y);
      ctx.lineTo(link.to.x, link.to.y);
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = Math.max(2, link.width * 0.35);
      ctx.stroke();

      // 4. Bristle dry splatters (飞白碎墨) along connection line
      if (dist > 30) {
        const nx = -dy / dist;
        const ny = dx / dist;
        for (let i = 1; i <= 4; i++) {
          const t = i / 5;
          const jitter = Math.sin(i * 3.7) * 12;
          const px = link.from.x + dx * t + nx * jitter;
          const py = link.from.y + dy * t + ny * jitter;
          ctx.beginPath();
          ctx.arc(px, py, Math.max(1, 3 * alpha), 0, Math.PI * 2);
          ctx.fillStyle = i % 2 === 0 ? '#1c1917' : link.color;
          ctx.globalAlpha = alpha * 0.85;
          ctx.fill();
        }
        ctx.globalAlpha = 1.0;
      }

      // 5. Cinnabar Seal Hanzi impression at midpoint (朱砂古印)
      if (link.hanzi) {
        const sealSize = 26;
        ctx.save();
        ctx.globalAlpha = alpha;

        // Red Seal Box
        ctx.fillStyle = '#b91c1c';
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 8;
        ctx.fillRect(midX - sealSize / 2, midY - sealSize / 2, sealSize, sealSize);
        ctx.strokeRect(midX - sealSize / 2, midY - sealSize / 2, sealSize, sealSize);

        // Gold Calligraphy Character
        ctx.font = `bold 16px 'Ma Shan Zheng', cursive`;
        ctx.fillStyle = '#fef08a';
        ctx.shadowColor = '#b91c1c';
        ctx.shadowBlur = 4;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(link.hanzi, midX, midY);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  private renderBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // 宣纸底色：离屏预烘焙渐变，每帧仅一次 drawImage（免每帧重建渐变）
    if (this.paperCanvas) {
      ctx.drawImage(this.paperCanvas, 0, 0, w, h);
    } else {
      const paper = ctx.createLinearGradient(0, 0, 0, h);
      paper.addColorStop(0, '#efe8d6');
      paper.addColorStop(0.55, '#e6dcc4');
      paper.addColorStop(1, '#ddd2b6');
      ctx.fillStyle = paper;
      ctx.fillRect(0, 0, w, h);
    }

    if (this.bgLoaded && this.bgImage) {
      // Parallax scroll with camera
      const parallaxFactor = 0.15;
      const bgW = w * 1.3;
      const bgH = h * 0.7;
      const bgX = -((this.cameraX * parallaxFactor) % w) * 0.5 - w * 0.15;
      ctx.globalAlpha = 0.72;
      ctx.drawImage(this.bgImage, bgX, 0, bgW, bgH);
      ctx.globalAlpha = 1.0;
    }
  }

  private renderGround(ctx: CanvasRenderingContext2D, w: number, h: number, horizonY: number) {
    // 宣纸地面渐变：浅色纸底让纯黑火柴人一眼可辨（渐变缓存，免每帧重建）
    if (!this.groundGrad) {
      const g = ctx.createLinearGradient(0, horizonY, 0, h);
      g.addColorStop(0, '#e2d7bd');
      g.addColorStop(0.3, '#dcd0b2');
      g.addColorStop(1, '#ccbfa0');
      this.groundGrad = g;
    }

    ctx.fillStyle = this.groundGrad;
    ctx.fillRect(0, horizonY + 20, w, h - horizonY);

    // Misty horizon divider line（淡墨地平线）
    ctx.beginPath();
    ctx.moveTo(0, horizonY + 20);
    ctx.lineTo(w, horizonY + 20);
    ctx.strokeStyle = 'rgba(96, 82, 58, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pseudo-3D ground grid ink wash lines (curving with perspective)
    ctx.save();
    ctx.strokeStyle = 'rgba(112, 94, 66, 0.16)';
    ctx.lineWidth = 1.5;

    for (let i = 0; i < 6; i++) {
      const gy = horizonY + 30 + Math.pow(i / 5, 1.8) * (h - horizonY - 40);
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    // Perspective depth lines receding towards camera vanishing point
    const vpX = w / 2 - (this.cameraX * 0.25) % 120;
    const vpY = horizonY + 15;
    for (let x = -w * 0.5; x < w * 1.5; x += 140) {
      const offsetX = x - (this.cameraX * 0.8) % 140;
      ctx.beginPath();
      ctx.moveTo(vpX, vpY);
      ctx.lineTo(offsetX, h);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderShadow(ctx: CanvasRenderingContext2D, sx: number, groundY: number, scale: number, height: number) {
    const shadowW = Math.max(10, (32 * scale) / (1 + height * 0.02));
    const shadowH = shadowW * 0.35;
    const shadowAlpha = Math.max(0.1, 0.45 - height * 0.005);

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(sx, groundY, shadowW, shadowH, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(72, 58, 40, ${shadowAlpha})`;
    ctx.fill();
    ctx.restore();
  }

  private renderProjectile(ctx: CanvasRenderingContext2D, p: Projectile, sx: number, sy: number, scale: number) {
    ctx.save();
    ctx.translate(sx, sy);

    if (p.type === 'SWORD_BEAM') {
      // Sweeping blue-black ink crescent blade
      const facing = p.vel.x > 0 ? 1 : -1;
      ctx.scale(facing * scale, scale);

      ctx.beginPath();
      ctx.arc(0, 0, 24, -Math.PI * 0.35, Math.PI * 0.35);
      ctx.strokeStyle = '#0284c7'; // cyan-blue ink aura
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(4, 0, 22, -Math.PI * 0.3, Math.PI * 0.3);
      ctx.strokeStyle = '#0f172a'; // dark sumi core
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (p.type === 'INK_SHOCKWAVE') {
      // 地面涌动墨龙冲击波：锯齿浪峰 + 三层叠墨
      const r = p.radius * scale;
      const time = this.nowMs * 0.02;
      ctx.beginPath();
      const segs = 10;
      for (let i = 0; i <= segs; i++) {
        const ang = Math.PI + (i / segs) * Math.PI;
        const jag = 1 + 0.09 * Math.sin(i * 2.7 + time * 2.1) + 0.05 * Math.sin(i * 5.3 - time * 3.3);
        const px = Math.cos(ang) * r * jag;
        const py = Math.sin(ang) * r * 0.5 * jag;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.beginPath();
      for (let i = 0; i <= segs; i++) {
        const ang = Math.PI + (i / segs) * Math.PI;
        const jag = 1 + 0.07 * Math.sin(i * 2.1 - time * 2.6);
        const px = Math.cos(ang) * (r - 8) * jag;
        const py = Math.sin(ang) * (r - 8) * 0.5 * jag;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(20, 15, 10, 0.6)';
      ctx.fill();
    } else if (p.type === 'INK_ARROW') {
      const angle = Math.atan2(p.vel.z * 0.6, p.vel.x);
      ctx.rotate(angle);
      ctx.scale(scale, scale);
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(12, 0);
      ctx.strokeStyle = '#3f2b26';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(6, -4);
      ctx.lineTo(6, 4);
      ctx.closePath();
      ctx.fillStyle = '#b91c1c';
      ctx.fill();
    } else if (p.type === 'INK_TALISMAN') {
      // 追踪符珠：旋转符纸 + 墨绿晕环
      ctx.scale(scale, scale);
      ctx.rotate(this.nowMs * 0.008);
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(77, 124, 15, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#efe6cf';
      ctx.fillRect(-5, -5, 10, 10);
      ctx.fillStyle = '#3d5a40';
      ctx.fillRect(-2.5, -2.5, 5, 5);
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'BOSS_ORB') {
      // Boss 墨珠：暗紫墨球 + 墨晕尾迹
      ctx.scale(scale, scale);
      const pulse = 1 + Math.sin(this.nowMs * 0.02) * 0.15;
      ctx.beginPath();
      ctx.arc(0, 0, 10 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(88, 28, 135, 0.9)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, 15 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.55)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fef08a';
      ctx.fill();
    } else if (p.type === 'CHAIN_BOLT') {
      // 雷引连枝：迷你分支闪电
      this.drawBoltBranches(ctx, 0.55);
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#fef08a';
      ctx.fill();
    } else if (p.type === 'LIGHTNING') {
      // 天降惊雷：全尺寸分支闪电（每 45ms 重掷形状，闪烁感）
      this.drawBoltBranches(ctx, 1.0);
      // 落雷冲击光晕
      const glow = 0.5 + Math.sin(this.nowMs * 0.04) * 0.2;
      ctx.beginPath();
      ctx.arc(0, 6, 16, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(125, 211, 252, ${glow * 0.4})`;
      ctx.fill();
    }

    ctx.restore();
  }

  /** 分支闪电绘制（主干 + 侧枝 + 辉光，sizeMul 控制尺寸） */
  private drawBoltBranches(ctx: CanvasRenderingContext2D, sizeMul: number) {
    // 以 45ms 为窗重掷形状：肉眼可见的电弧抖动但不闪烁成噪声
    const frameSeed = Math.floor(this.nowMs / 45) + 13;
    let sd = frameSeed % 2147483647;
    const rnd = () => {
      sd = (sd * 16807) % 2147483647;
      return sd / 2147483647;
    };

    const buildBolt = (x0: number, y0: number, x1: number, y1: number, jitter: number) => {
      const steps = 6;
      const pts: [number, number][] = [[x0, y0]];
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        pts.push([
          x0 + (x1 - x0) * t + (rnd() - 0.5) * jitter,
          y0 + (y1 - y0) * t + (rnd() - 0.5) * jitter * 0.4,
        ]);
      }
      pts.push([x1, y1]);
      return pts;
    };

    const strokeBolt = (pts: [number, number][], width: number, color: string, alpha: number) => {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    };

    const H = 90 * sizeMul;
    const main = buildBolt(0, -H, (rnd() - 0.5) * 8, 8, 16 * sizeMul);
    // 辉光层
    strokeBolt(main, 9 * sizeMul, '#7dd3fc', 0.22);
    // 主干
    strokeBolt(main, 3.2 * sizeMul, '#e0f2fe', 0.95);
    strokeBolt(main, 1.6 * sizeMul, '#38bdf8', 0.9);
    // 侧枝 ×2
    for (let b = 0; b < 2; b++) {
      const anchor = main[2 + b * 2];
      const branch = buildBolt(anchor[0], anchor[1], anchor[0] + (rnd() - 0.5) * 46 * sizeMul, anchor[1] + 24 * sizeMul, 10 * sizeMul);
      strokeBolt(branch, 2 * sizeMul, '#bae6fd', 0.55);
    }
    ctx.globalAlpha = 1.0;
  }

  private renderTouchJoystick(
    ctx: CanvasRenderingContext2D,
    origin: { x: number; y: number },
    curr: { x: number; y: number }
  ) {
    const dx = curr.x - origin.x;
    const dy = curr.y - origin.y;
    const dist = Math.hypot(dx, dy);
    const maxRadius = 45;
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const stickX = origin.x + Math.cos(angle) * clampedDist;
    const stickY = origin.y + Math.sin(angle) * clampedDist;

    ctx.save();
    // Base circle
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, maxRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(96, 80, 55, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Stick thumb
    ctx.beginPath();
    ctx.arc(stickX, stickY, 20, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(96, 80, 55, 0.28)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(58, 46, 30, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  private renderScreenGuides(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.save();

    // Subtle central hairline indicating Left / Right split for touch control (Only in SPLIT_SCREEN mode)
    if (this.controlMode === 'SPLIT_SCREEN') {
      const midX = w * 0.48;
      ctx.beginPath();
      ctx.setLineDash([4, 8]);
      ctx.moveTo(midX, 60);
      ctx.lineTo(midX, h - 30);
      ctx.strokeStyle = 'rgba(96, 80, 55, 0.22)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Vignette border（暖墨色轻暗角；离屏预烘焙，免每帧径向渐变全屏填充）
    if (this.vignetteCanvas) {
      ctx.drawImage(this.vignetteCanvas, 0, 0, w, h);
    }

    // 受击红色边缘闪烁（预烘焙全强度红晕，globalAlpha 调制强度）
    if (this.hurtFlashTimer > 0 && this.hurtVignetteCanvas) {
      const intensity = this.hurtFlashTimer / 0.4;
      ctx.globalAlpha = 0.5 * intensity;
      ctx.drawImage(this.hurtVignetteCanvas, 0, 0, w, h);
      ctx.globalAlpha = 1.0;
    }

    // 低血量红色脉动警示（预烘焙全强度红晕，globalAlpha 调制脉动）
    if (this.player.hp > 0 && this.player.hp / this.player.maxHp <= 0.3 && !this.runEnded && this.lowHpVignetteCanvas) {
      const pulse = (Math.sin(this.nowMs * 0.006) + 1) * 0.5;
      ctx.globalAlpha = 0.25 + pulse * 0.3;
      ctx.drawImage(this.lowHpVignetteCanvas, 0, 0, w, h);
      ctx.globalAlpha = 1.0;
    }

    ctx.restore();
  }
}


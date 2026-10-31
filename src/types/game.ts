/**
 * Game Types and Interfaces for Ink Martial: Stickman Roguelike
 */

export type GestureType =
  | 'TAP'           // 刺: 基础墨刺 / 连击
  | 'HORIZONTAL'    // 横: 横扫千军
  | 'VERTICAL_DOWN' // 劈: 力劈华山
  | 'DIAGONAL_UP'   // 挑: 飞燕凌空
  | 'CIRCLE'        // 圆: 浑元太极
  | 'ZIGZAG';       // 闪: 踏影瞬杀

export interface GestureResult {
  type: GestureType;
  name: string;
  hanzi: string;
  desc: string;
  confidence: number;
  points: { x: number; y: number; t: number }[];
}

export type AffixRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface Affix {
  id: string;
  name: string;
  hanziSeal: string;
  rarity: AffixRarity;
  desc: string;
  iconType: 'sword' | 'shield' | 'flame' | 'brush' | 'lightning' | 'feather';
  stats: {
    attackBonus?: number;       // percentage
    critChanceBonus?: number;   // 0 to 1
    critDamageBonus?: number;   // percentage extra crit damage
    maxHpBonus?: number;        // flat
    moveSpeedBonus?: number;    // percentage
    inkRegenBonus?: number;     // percentage
    damageReduction?: number;   // percentage
    gestureBonus?: number;      // percentage extra damage on gestures
    lifestealPercent?: number;  // 0 to 1
    swordBeamEnabled?: boolean; // shoots ink crescent on attack
    inkExplosion?: boolean;     // explosive ink on crit
    frostSlow?: boolean;        // slow enemies
    flashCooldownReset?: boolean;// reset dash on hit
    thunderStrike?: boolean;    // lightning on gesture
    // --- 新增词条属性 ---
    shieldOnWaveStart?: number;   // 每波开始获得墨盾护盾值
    chainLightning?: number;      // 击杀时释放连锁闪电跳跃次数
    burnOnHit?: number;           // 命中附加灼烧 DoT (每秒伤害系数)
    executeThreshold?: number;    // 斩杀线：敌人血量低于此比例直接处决
    reviveOnce?: boolean;         // 残页·续墨：死亡时原地复活一次
    thornsPercent?: number;       // 反伤：受击时反弹伤害比例
    critGainInk?: number;         // 暴击回复墨意
    dashStrikeEnabled?: boolean;  // 冲刺时对路径敌人造成伤害
    // --- 觉醒/新敌词条 ---
    skySlayerPercent?: number;        // 对浮空妖敌伤害提升
    dodgeChancePercent?: number;      // 完全闪避敌人攻击的概率
    awakeningGainBonus?: number;      // 觉醒充能速度提升
    awakeningDamageBonus?: number;    // 觉醒技伤害提升
    awakeningRadiusBonus?: number;    // 觉醒技范围扩大
    awakeningOnWaveStart?: number;    // 每波开战直接获得觉醒充能
    // --- 画龙点睛（精准打击） ---
    eyeStrikeEnabled?: boolean;       // 挥砍笔迹划过妖敌头部要穴时触发点睛会心
    eyeStrikeBonus?: number;          // 点睛一击的伤害加成（百分比）
    // --- 增伤百分比词条扩展 ---
    berserkDamageBonus?: number;      // 气血低于50%时攻击力提升（百分比）
    bossSlayerPercent?: number;       // 对 Boss 与精英伤害提升（百分比）
    comboDamagePercent?: number;      // 每10连击攻击力+4%（上限=该值）
    killStackDamageBonus?: number;    // 每8击杀攻击力永久+1%（上限=该值）
  };
}

export interface Vec3 {
  x: number;
  y: number; // height (jump)
  z: number; // depth
}

export interface SkeletonPose {
  torsoAngle: number;
  headAngle: number;
  leftUpperArmAngle: number;
  leftForearmAngle: number;
  rightUpperArmAngle: number;
  rightForearmAngle: number;
  leftThighAngle: number;
  leftShinAngle: number;
  rightThighAngle: number;
  rightShinAngle: number;
  weaponAngle: number;
  weaponOffset: { x: number; y: number };
  /** 髋部下沉量（px，正=下蹲/倒地时臀部降低），默认 0 */
  hipDrop?: number;
}

export type ActionState =
  | 'IDLE'
  | 'RUN'
  | 'JUMP_UP'
  | 'FALL'
  | 'LAND'
  | 'ATTACK_THRUST'     // 刺
  | 'ATTACK_HORIZONTAL' // 横
  | 'ATTACK_VERTICAL'   // 劈
  | 'ATTACK_LAUNCH'     // 挑
  | 'ATTACK_TAICHI'     // 圆
  | 'ATTACK_DASH'       // 闪
  | 'WINDUP'            // 攻击前摇蓄力（预警）
  | 'HURT'
  | 'DEAD';

// 精英词缀（Elite Modifier）
export type EliteModifier = 'SWIFT' | 'IRONCLAD' | 'FRENZIED' | 'SOULSIP';

export interface EliteInfo {
  modifier: EliteModifier;
  name: string;      // 词缀中文名
  hanzi: string;     // 顶标汉字
  color: string;     // 光环颜色
}

// Boss 技能类型
// CHARGE_RUSH 墨刃突进（先锋）：预警后直线冲锋撞人
// INK_RAIN 落墨成渊（大帝三阶段）：全场墨雨连环轰炸
export type BossSkillType = 'SEISMIC_SLAM' | 'INK_VOLLEY' | 'SUMMON' | 'ENRAGE' | 'CHARGE_RUSH' | 'INK_RAIN';

// Boss 三强线：1=墨煞先锋（第5折） 2=墨煞宗师（第10折） 3=墨煞大帝（第15折·终折）
export type BossTier = 1 | 2 | 3;

export interface BossSkillState {
  skill: BossSkillType;
  timer: number;      // 冷却倒计时
  windup: number;     // 蓄力剩余时间（>0 表示正在预警）
  active: number;     // 技能持续剩余时间
}

export interface PlayerEntity {
  pos: Vec3;
  vel: Vec3;
  facing: 1 | -1; // 1 = right, -1 = left
  hp: number;
  maxHp: number;
  ink: number;
  maxInk: number;
  shield: number;         // 墨盾护盾值（优先承伤）
  shieldMax: number;
  state: ActionState;
  stateTimer: number;
  stateDuration: number;
  comboCount: number;
  comboTimer: number;
  maxCombo: number;       // 本局最大连击
  isInvincible: boolean;
  invincibleTimer: number;
  dashTrail: Vec3[];
  ribbonWave: number;
  affixes: Affix[];
  reviveUsed: boolean;    // 残页复活是否已用
}

export type EnemyType =
  | 'INK_MINION'      // 普通墨卒：基础近战
  | 'INK_ARCHER'      // 墨羽弓手：远程箭矢
  | 'INK_BRUTE'       // 巨力狂墨：重击坦克
  | 'SHADOW_NINJA'    // 暗影刺客：瞬移背刺
  | 'INK_BOMBER'      // 爆墨傀儡：自爆冲锋，爆炸伤及敌群
  | 'INK_SHIELD_GUARD' // 墨盾武僧：正面持盾格挡
  | 'INK_SUMMONER'    // 符笔妖道：远程召唤+追踪符珠
  | 'INK_CRANE'       // 飞白鹤：空中盘旋俯冲，挑招可击落
  | 'INK_TURTLE'      // 砚台龟：反震龟壳坦克，攻壳窗口反击
  | 'INK_DRUNKARD'    // 醉墨剑客：摇摆闪避连斩，醉倒时破绽
  | 'INK_BOSS';       // 墨煞宗师

export interface EnemyEntity {
  id: string;
  type: EnemyType;
  name: string;
  pos: Vec3;
  vel: Vec3;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  damage: number;
  state: ActionState;
  stateTimer: number;
  stateDuration: number;
  attackCooldown: number;
  hitStun: number;
  maxHitStun?: number;
  isAirborne: boolean;
  scale: number;
  isBoss?: boolean;
  // --- 战斗增强 ---
  elite?: EliteInfo | null;         // 精英词缀
  frostSlowTimer?: number;          // 冰缓剩余时间
  burnTimer?: number;               // 灼烧剩余时间
  burnTickTimer?: number;           // 灼烧跳伤计时
  windupTimer?: number;             // 攻击前摇预警剩余
  windupMax?: number;               // 前摇总时长
  bossSkills?: BossSkillState[];    // Boss 技能组
  bossPhase?: 1 | 2 | 3;            // Boss 阶段（大帝有三阶段：狂暴→灭）
  bossTier?: BossTier;              // Boss 三强线（先锋/宗师/大帝）
  bossChargeVX?: number;            // 墨刃突进：冲锋速度 X（先锋专属）
  bossChargeVZ?: number;            // 墨刃突进：冲锋速度 Z
  bossChargeHit?: boolean;          // 墨刃突进：本次冲锋是否已命中
  teleportCooldown?: number;        // 刺客瞬移冷却
  turnCooldown?: number;            // 墨盾武僧转身迟缓计时（留绕背窗口）
  deathTimer?: number;              // 尸体消散计时
  spawnGrace?: number;              // 出生保护（淡入）
  // --- 飞白鹤 ---
  cranePhase?: 'HOVER' | 'DIVE' | 'PERCH'; // 飞行阶段（盘旋/俯冲/落地喘息）
  craneTimer?: number;              // 阶段剩余时间
  craneVX?: number;                 // 俯冲速度分量
  craneVZ?: number;
  // --- 醉墨剑客 ---
  dodgeCooldown?: number;           // 侧身闪避冷却
  swayPhase?: number;               // 醉步摇摆相位
}

export interface Projectile {
  id: string;
  pos: Vec3;
  vel: Vec3;
  damage: number;
  isPlayer: boolean;
  life: number;
  maxLife: number;
  type: 'SWORD_BEAM' | 'INK_ARROW' | 'LIGHTNING' | 'INK_SHOCKWAVE' | 'BOSS_ORB' | 'CHAIN_BOLT' | 'INK_TALISMAN';
  radius: number;
  /** 追踪转向率（0~1，每帧朝目标修正速度方向的比例；仅敌方弹道生效） */
  homing?: number;
  chainJumps?: number;   // 连锁闪电剩余跳跃
  hitIds?: Set<string>;  // 已命中目标（防重复）
}

export interface InkParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  alpha: number;
  decay: number;
  color: string;
  isSplat?: boolean;
  isAmbient?: boolean;   // 环境氛围粒子（飘墨）
  swayPhase?: number;    // 摇摆相位
  // --- 特效增强 ---
  shape?: 'circle' | 'blob' | 'streak' | 'wisp' | 'petal'; // 粒子形态
  stretch?: number;      // 速度拖尾（运动模糊）强度
  growth?: number;       // 半径每秒增长（墨魂用）
  spin?: number;         // 旋转角速度（墨瓣）
  spinPhase?: number;    // 初始旋转角
  noGravity?: boolean;   // 无重力（墨魂/速度线/尾迹）
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  scale: number;
  isCrit?: boolean;
  isGesture?: boolean;
  vy?: number;
  age?: number;          // 存活时长（弹跳动画用）
}

/** 笔刷剑弧：每个招式的专属水墨挥砍特效 */
export interface InkSlash {
  id: string;
  x: number;
  y: number;
  z: number;
  facing: 1 | -1;
  kind: 'THRUST' | 'HORIZONTAL' | 'VERTICAL' | 'LAUNCH' | 'CIRCLE' | 'DASH';
  life: number;
  maxLife: number;
  color: string;
  size: number;          // 基准半径倍率
  seed: number;          // 确定性随机（飞白飞溅点位）
}

/** 地面墨渍：击杀溅墨与重劈地裂（水墨留痕） */
export interface GroundDecal {
  id: string;
  x: number;
  z: number;
  life: number;
  maxLife: number;
  kind: 'SPLAT' | 'CRACK';
  color: string;
  size: number;
  blobs?: { dx: number; dy: number; r: number; rot: number; squish: number }[];
  cracks?: { dx: number; dy: number; pts: { x: number; y: number }[]; w: number }[];
}

/** 冲击激波环：地面扩散的墨劲圆环 */
export interface ShockRing {
  id: string;
  x: number;
  z: number;
  r0: number;
  r1: number;
  life: number;
  maxLife: number;
  color: string;
  width: number;
}

export interface SlashLink {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  alpha: number;
  maxAlpha: number;
  color: string;
  width: number;
  hanzi?: string;
  points?: { x: number; y: number }[];
}

export interface DashGhost {
  id: string;
  x: number;
  y: number;
  z: number;
  facing: 1 | -1;
  state: ActionState;
  stateTimer: number;
  stateDuration: number;
  alpha: number;
  maxAlpha: number;
  color?: string;
}

// 地面预警圈（Boss 震地 AoE / 前摇指示）
export interface TelegraphRing {
  id: string;
  x: number;
  z: number;
  radius: number;
  windup: number;      // 预警总时长
  windupTimer: number; // 已经过时间
  color: string;
  onTrigger?: () => void; // 预警结束触发（由引擎计时器调度）
}

export type ControlMode = 'FULL_GESTURE' | 'SPLIT_SCREEN';

export interface WaveConfig {
  waveNumber: number;
  totalEnemies: number;
  minions: number;
  archers: number;
  brutes: number;
  ninjas: number;
  isBossWave: boolean;
  title: string;
}

// 结算统计
export interface RunStats {
  kills: number;
  maxCombo: number;
  eliteKills: number;
  bossKills: number;
  timeSurvived: number;   // 秒
  score: number;
  wave: number;
  affixes: Affix[];
  voluntaryEnd?: boolean; // 玩家主动收笔（暂停菜单「结束本局」）：结算展示收笔小结局
  mode?: GameMode;        // 玩法模式（缺省视为 CLASSIC，兼容旧档）
}

// 难度等级（引擎与存档共用；engine.ts 保留 re-export）
export type Difficulty = 'EASY' | 'NORMAL' | 'HARD' | 'EXTREME';

// 玩法模式：CLASSIC 经典征战（15折通关线）/ MUSOU 无双演武（怪海割草，无通关概念）
export type GameMode = 'CLASSIC' | 'MUSOU';

// localStorage 持久记录
export interface PersistentRecords {
  highScore: number;
  bestWave: number;
  totalKills: number;
  totalRuns: number;
  victories: number;
  lastPlayedAt: number;
  musouHighScore: number;  // 无双最高功绩
  musouBestWave: number;   // 无双最远阵数
}

/** 单局进度快照：暂停/波次开始/切后台时自动落盘，杀后台后可恢复（波内敌人重刷） */
export interface RunSnapshot {
  version: number;            // 快照格式版本（不匹配即弃用）
  savedAt: number;            // 存档时间戳
  elapsedSec: number;         // 本局已生存时长（恢复时补回 runStartTime）
  wave: number;               // 恢复后从该折重新开打
  score: number;
  difficulty: Difficulty;
  endlessMode: boolean;
  mode?: GameMode;            // 玩法模式（缺省视为 CLASSIC，兼容旧快照）
  awakening: number;          // 觉醒槽进度（上限恒 100）
  stats: {                    // 结算累计（防恢复后击杀数归零）
    kills: number;
    maxCombo: number;
    eliteKills: number;
    bossKills: number;
  };
  player: {
    hp: number;
    maxHp: number;
    ink: number;
    maxInk: number;
    shield: number;
    shieldMax: number;
    reviveUsed: boolean;
    pos: Vec3;
    affixes: Affix[];
  };
}

// Boss 顶部血条信息
export interface BossHudInfo {
  name: string;
  hp: number;
  maxHp: number;
  phase: 1 | 2 | 3;
}

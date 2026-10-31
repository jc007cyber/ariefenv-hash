/**
 * Stickman Skeletal Rig & Kinematics Renderer
 * Smooth procedural bones with Chinese ink brush calligraphy aesthetics
 */

import { ActionState, BossTier, EnemyType, SkeletonPose } from '../types/game';

/**
 * 预计算骨骼调色板：按种族查表（原 render 每实体每帧新建对象字面量 + 六层三元链，全量省去）
 * 玩家纯黑墨骨 / 傀儡焦褐 / 武僧铁灰 / 妖道墨绿 / 飞白鹤青 / 砚台龟墨石 / 醉剑客酒褐 / 其余妖墨暗赤
 */
const BONE_PALETTES: Record<string, { main: string; dim: string; limb: string }> = {
  PLAYER: { main: '#16130f', dim: '#2d2b28', limb: '#33312e' },
  INK_BOMBER: { main: '#6b3410', dim: '#7c4520', limb: '#8a5a30' },
  INK_SHIELD_GUARD: { main: '#3f4756', dim: '#4b5563', limb: '#5b6572' },
  INK_SUMMONER: { main: '#3d5a40', dim: '#486b4c', limb: '#557d5a' },
  INK_CRANE: { main: '#2f4858', dim: '#3c5a6e', limb: '#4a6b80' },
  INK_TURTLE: { main: '#3b3a36', dim: '#4a4843', limb: '#585650' },
  INK_DRUNKARD: { main: '#5b2333', dim: '#6d3243', limb: '#7d4052' },
  // Boss 三强线：先锋焦赭（轻装快攻）/ 宗师暗赤（默认）/ 大帝玄墨金纹（终折重压）
  BOSS_VANGUARD: { main: '#6b3a1f', dim: '#7c4a2c', limb: '#8a5a38' },
  BOSS_OVERLORD: { main: '#241f19', dim: '#3a332a', limb: '#4a4136' },
  DEFAULT: { main: '#54241a', dim: '#6b3226', limb: '#7a4132' },
};

export class StickmanSkeleton {
  /**
   * 共享位姿暂存对象：getPose 每帧每实体调用（30+ 实体 × 60fps ≈ 1900 对象/秒）。
   * 全部消费点均为「getPose → render 同步用完即弃」，无跨帧持有 —— 故用共享 scratch 消除 GC 压力。
   * 约定：每个状态分支必须全量覆盖全部 12 个基础字段（原实现即如此），唯一可选字段 hipDrop 在入口复位。
   */
  private static readonly SCRATCH: SkeletonPose = {
    torsoAngle: 0,
    headAngle: 0,
    leftUpperArmAngle: 0,
    leftForearmAngle: 0,
    rightUpperArmAngle: 0,
    rightForearmAngle: 0,
    leftThighAngle: 0,
    leftShinAngle: 0,
    rightThighAngle: 0,
    rightShinAngle: 0,
    weaponAngle: 0,
    weaponOffset: { x: 0, y: 0 },
  };

  /**
   * Calculate bone angles based on action state, timer, and movement phase
   *
   * 关节约定（与 render 中的三角函数一致）：
   * - 角度 0 = 肢体竖直向下（腿/臂）或竖直向上（躯干），正值朝面朝方向（+x）偏
   * - 膝盖是单向铰链：小腿只能向后折（shinAngle ≤ 0），正值会画成反向关节
   * - 肘部相反：前臂向前折（forearmAngle ≥ 0）
   */
  public static getPose(state: ActionState, timer: number, duration: number, walkCycle: number): SkeletonPose {
    const p = StickmanSkeleton.SCRATCH;
    p.hipDrop = 0; // 可选字段复位防跨状态串味（其余字段各分支全量覆盖）
    const progress = Math.min(1, Math.max(0, timer / Math.max(0.01, duration)));

    switch (state) {
      case 'RUN': {
        // 跑步循环：大腿前后摆 ±0.55，膝只向后折——后摆时脚跟后踢，前摆时小腿收拢前探
        const legSwing = Math.sin(walkCycle) * 0.55;
        const armSwing = Math.cos(walkCycle) * 0.45;
        // 小腿角：基础 -0.3，前摆渐伸直，后摆时脚跟大幅后踢（更负）
        const shinOf = (ls: number) => -0.3 + 0.15 * ls + Math.min(0, ls) * 0.45;
        p.torsoAngle = 0.22;
        p.headAngle = 0.08;
        p.leftUpperArmAngle = -0.1 - armSwing * 1.1;
        p.leftForearmAngle = 0.75;
        p.rightUpperArmAngle = -0.45 + armSwing * 0.2;
        p.rightForearmAngle = 0.95;
        p.leftThighAngle = legSwing + 0.12;
        p.leftShinAngle = shinOf(legSwing);
        p.rightThighAngle = -legSwing + 0.12;
        p.rightShinAngle = shinOf(-legSwing);
        p.weaponAngle = 0.55 + Math.sin(walkCycle * 2) * 0.06;
        p.weaponOffset.x = 3;
        p.weaponOffset.y = 1;
        return p;
      }

      case 'JUMP_UP': {
        // 腾空收腿：膝盖前提、小腿后折（正确弯曲方向的团身）
        p.torsoAngle = -0.1;
        p.headAngle = -0.15;
        p.leftUpperArmAngle = -1.45;
        p.leftForearmAngle = 0.45;
        p.rightUpperArmAngle = -1.2;
        p.rightForearmAngle = 0.55;
        p.leftThighAngle = 0.85;
        p.leftShinAngle = -1.2;
        p.rightThighAngle = 0.3;
        p.rightShinAngle = -0.7;
        p.weaponAngle = -0.7;
        p.weaponOffset.x = 2;
        p.weaponOffset.y = -2;
        return p;
      }

      case 'FALL': {
        // 下落预备落地：膝微屈后折，手臂上扬平衡
        p.torsoAngle = 0.12;
        p.headAngle = 0.18;
        p.leftUpperArmAngle = -1.0;
        p.leftForearmAngle = 0.5;
        p.rightUpperArmAngle = -0.75;
        p.rightForearmAngle = 0.6;
        p.leftThighAngle = 0.35;
        p.leftShinAngle = -0.35;
        p.rightThighAngle = 0.12;
        p.rightShinAngle = -0.2;
        p.weaponAngle = 0.35;
        p.weaponOffset.x = 0;
        p.weaponOffset.y = 4;
        return p;
      }

      case 'ATTACK_THRUST': {
        // 直刺：弓步——前膝前顶小腿后折撑地，后腿蹬直成力线
        const lunge = Math.sin(progress * Math.PI);
        p.torsoAngle = 0.3 * lunge;
        p.headAngle = 0.08;
        p.leftUpperArmAngle = -0.7;
        p.leftForearmAngle = 0.6;
        p.rightUpperArmAngle = 1.5 * lunge;
        p.rightForearmAngle = 0.05;
        p.leftThighAngle = -0.55 * lunge;
        p.leftShinAngle = -0.15 * lunge;
        p.rightThighAngle = 0.7 * lunge;
        p.rightShinAngle = -0.3 * lunge;
        p.weaponAngle = -0.02;
        p.weaponOffset.x = 14 * lunge;
        p.weaponOffset.y = -2;
        p.hipDrop = 3 * lunge;
        return p;
      }

      case 'ATTACK_HORIZONTAL': {
        // 横扫：重心左右微移，双脚钉地旋转
        const angle = -1.2 + progress * 2.8;
        p.torsoAngle = Math.sin(progress * Math.PI) * 0.32;
        p.headAngle = 0.05;
        p.leftUpperArmAngle = -0.5;
        p.leftForearmAngle = 0.7;
        p.rightUpperArmAngle = angle;
        p.rightForearmAngle = 0.45;
        p.leftThighAngle = 0.25;
        p.leftShinAngle = -0.35;
        p.rightThighAngle = -0.2;
        p.rightShinAngle = -0.1;
        p.weaponAngle = angle + 0.3;
        p.weaponOffset.x = 6;
        p.weaponOffset.y = -2;
        return p;
      }

      case 'ATTACK_VERTICAL': {
        // 劈砍：高举过顶后向前下劈，前腿撑住重心
        const t = progress < 0.3 ? progress / 0.3 : (progress - 0.3) / 0.7;
        const armAng = progress < 0.3 ? -1.8 * t : -1.8 + 3.2 * t;
        p.torsoAngle = progress < 0.3 ? -0.2 : 0.38 * t;
        p.headAngle = progress < 0.3 ? -0.3 : 0.18;
        p.leftUpperArmAngle = -0.8;
        p.leftForearmAngle = 0.6;
        p.rightUpperArmAngle = armAng;
        p.rightForearmAngle = 0.25;
        p.leftThighAngle = -0.28;
        p.leftShinAngle = -0.45;
        p.rightThighAngle = 0.35;
        p.rightShinAngle = -0.25;
        p.weaponAngle = armAng + 0.2;
        p.weaponOffset.x = 4;
        p.weaponOffset.y = 0;
        p.hipDrop = 3 * t;
        return p;
      }

      case 'ATTACK_LAUNCH': {
        // 上挑：剑自下而上撩起，身体后仰展腹，后腿蹬地拖直
        const arm = 1.6 - progress * 2.8;
        p.torsoAngle = -0.28 * progress;
        p.headAngle = -0.35 * progress;
        p.leftUpperArmAngle = 0.8;
        p.leftForearmAngle = 0.45;
        p.rightUpperArmAngle = arm;
        p.rightForearmAngle = 0.2;
        p.leftThighAngle = 0.3;
        p.leftShinAngle = -0.2;
        p.rightThighAngle = -0.35;
        p.rightShinAngle = -0.5;
        p.weaponAngle = arm - 0.4;
        p.weaponOffset.x = 2;
        p.weaponOffset.y = -6;
        return p;
      }

      case 'ATTACK_TAICHI': {
        // 360 旋转：双脚为轴钉地，剑随身体旋转
        const spin = progress * Math.PI * 2;
        p.torsoAngle = Math.sin(spin) * 0.16;
        p.headAngle = 0;
        p.leftUpperArmAngle = -1.2;
        p.leftForearmAngle = 0.8;
        p.rightUpperArmAngle = Math.cos(spin) * 1.5;
        p.rightForearmAngle = 0.4;
        p.leftThighAngle = 0.28;
        p.leftShinAngle = -0.3;
        p.rightThighAngle = -0.28;
        p.rightShinAngle = -0.2;
        p.weaponAngle = spin;
        p.weaponOffset.x = 0;
        p.weaponOffset.y = 0;
        p.hipDrop = 2;
        return p;
      }

      case 'ATTACK_DASH': {
        // 滑步闪：压低重心的猎步——前膝深折、后腿蹬直拖行，剑前引低探
        p.torsoAngle = 0.5;
        p.headAngle = 0.1;
        p.leftUpperArmAngle = -1.0;
        p.leftForearmAngle = 0.3;
        p.rightUpperArmAngle = 0.9;
        p.rightForearmAngle = 0.15;
        p.leftThighAngle = -0.75;
        p.leftShinAngle = -0.35;
        p.rightThighAngle = 0.85;
        p.rightShinAngle = -0.75;
        p.weaponAngle = -0.1;
        p.weaponOffset.x = 10;
        p.weaponOffset.y = -2;
        p.hipDrop = 8;
        return p;
      }

      case 'WINDUP': {
        // 攻击前摇蓄力：重心后坐、武器高举过顶并高频颤动，给玩家明确闪避预警
        const tremble = Math.sin(walkCycle * 22) * 0.09;
        const charge = Math.min(1, progress * 1.4);
        p.torsoAngle = -0.35 * charge;
        p.headAngle = -0.3 * charge;
        p.leftUpperArmAngle = -0.9 * charge;
        p.leftForearmAngle = 1.1;
        p.rightUpperArmAngle = -2.2 * charge + tremble;
        p.rightForearmAngle = 0.5;
        p.leftThighAngle = 0.55 * charge;
        p.leftShinAngle = -0.55 * charge;
        p.rightThighAngle = -0.45 * charge;
        p.rightShinAngle = -0.6 * charge;
        p.weaponAngle = -1.9 + tremble * 2;
        p.weaponOffset.x = -4;
        p.weaponOffset.y = -8 * charge;
        p.hipDrop = 5 * charge;
        return p;
      }

      case 'HURT': {
        // 受击踉跄：上身后仰，双腿后撑屈膝缓冲，髋部下沉
        const r = Math.max(0.35, Math.sin(progress * Math.PI));
        p.torsoAngle = -0.48 * r;
        p.headAngle = -0.58 * r;
        p.leftUpperArmAngle = -1.2 * r;
        p.leftForearmAngle = 0.8;
        p.rightUpperArmAngle = -1.1 * r;
        p.rightForearmAngle = 0.9;
        p.leftThighAngle = 0.45 * r;
        p.leftShinAngle = -0.35 * r;
        p.rightThighAngle = -0.35 * r;
        p.rightShinAngle = -0.55 * r;
        p.weaponAngle = 0.95;
        p.weaponOffset.x = -6 * r;
        p.weaponOffset.y = 4 * r;
        p.hipDrop = 6 * r;
        return p;
      }

      case 'DEAD': {
        // 倒地：髋部沉降贴近地面，躯干放平，四肢摊开
        p.torsoAngle = 1.45;
        p.headAngle = 1.05;
        p.leftUpperArmAngle = 1.15;
        p.leftForearmAngle = 0.2;
        p.rightUpperArmAngle = 0.85;
        p.rightForearmAngle = 0.35;
        p.leftThighAngle = 0.85;
        p.leftShinAngle = -0.35;
        p.rightThighAngle = 0.3;
        p.rightShinAngle = -0.75;
        p.weaponAngle = 1.6;
        p.weaponOffset.x = 8;
        p.weaponOffset.y = 10;
        p.hipDrop = 26;
        return p;
      }

      case 'IDLE':
      default: {
        const breath = Math.sin(walkCycle * 0.8) * 0.05;
        p.torsoAngle = breath;
        p.headAngle = -breath * 0.5;
        p.leftUpperArmAngle = 0.35 + breath;
        p.leftForearmAngle = 0.7;
        p.rightUpperArmAngle = -0.2 - breath;
        p.rightForearmAngle = 0.9;
        p.leftThighAngle = 0.1;
        p.leftShinAngle = -0.05;
        p.rightThighAngle = -0.14;
        p.rightShinAngle = -0.1;
        p.weaponAngle = 0.45 + breath;
        p.weaponOffset.x = 2;
        p.weaponOffset.y = 0;
        return p;
      }
    }
  }

  /**
   * Render stickman skeleton with Chinese calligraphy brush ink aesthetics
   */
  public static render(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    scale: number,
    facing: 1 | -1,
    pose: SkeletonPose,
    options: {
      isPlayer: boolean;
      enemyType?: EnemyType;
      inkAlpha?: number;
      ribbonPhase?: number;
      isAttacking?: boolean;
      shieldDown?: boolean; // 墨盾武僧：出招/受击时收盾（破防窗口）
      bossTier?: BossTier;  // Boss 三强线外观分层（先锋/宗师/大帝）
      bossPhase?: 1 | 2 | 3; // Boss 阶段（大帝「灭」阶段金瞳）
    }
  ) {
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.scale(facing * scale, scale);

    const alpha = options.inkAlpha ?? 1;
    ctx.globalAlpha = alpha;

    // Bone stroke style：玩家纯黑墨骨，敌军按种族区分妖墨色相（浅色宣纸上双方都清晰且可辨）
    // 预计算调色板查表，替代原每帧对象字面量分配；Boss 三强线在 INK_BOSS 基础上再分层
    const isBoss = options.enemyType === 'INK_BOSS';
    const palette = options.isPlayer
      ? BONE_PALETTES.PLAYER
      : isBoss && options.bossTier === 1 ? BONE_PALETTES.BOSS_VANGUARD
      : isBoss && options.bossTier === 3 ? BONE_PALETTES.BOSS_OVERLORD
      : BONE_PALETTES[options.enemyType ?? ''] ?? BONE_PALETTES.DEFAULT;
    const mainColor = palette.main;
    ctx.strokeStyle = mainColor;
    ctx.fillStyle = mainColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const boneWidth = options.isPlayer ? 3.5 : options.enemyType === 'INK_BRUTE' ? 5.5 : options.enemyType === 'INK_SHIELD_GUARD' ? 4.2 : options.enemyType === 'INK_TURTLE' ? 4.6 : isBoss ? (options.bossTier === 3 ? 4.6 : options.bossTier === 1 ? 3.8 : 4.2) : 3.0;
    ctx.lineWidth = boneWidth;

    // Rig geometry constants (scaled to ~65px standing stickman)
    const hipX = 0;
    const hipY = -34;
    const torsoLen = 22;
    const headRadius = options.enemyType === 'INK_BRUTE' ? 10 : options.enemyType === 'INK_SHIELD_GUARD' ? 9 : options.enemyType === 'INK_TURTLE' ? 8.5 : options.enemyType === 'INK_CRANE' ? 6 : 7.5;
    const armLen1 = 11;
    const armLen2 = 11;
    const legLen1 = 15;
    const legLen2 = 14;

    // 1. Torso
    const hipY0 = hipY + (pose.hipDrop ?? 0);
    const shoulderX = hipX + Math.sin(pose.torsoAngle) * torsoLen;
    const shoulderY = hipY0 - Math.cos(pose.torsoAngle) * torsoLen;

    ctx.beginPath();
    ctx.moveTo(hipX, hipY0);
    ctx.lineTo(shoulderX, shoulderY);
    ctx.stroke();

    // 1.5 种族体型特征：爆墨傀儡圆滚墨肚 + 胸前符纸；符笔妖道道袍下摆
    if (options.enemyType === 'INK_BOMBER') {
      const bx = (hipX + shoulderX) / 2;
      const by = (hipY0 + shoulderY) / 2;
      ctx.beginPath();
      ctx.arc(bx, by, 10.5, 0, Math.PI * 2);
      ctx.fillStyle = mainColor;
      ctx.fill();
      // 胸前镇身符纸（宣纸底 + 朱砂印）
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(pose.torsoAngle * 0.5);
      ctx.fillStyle = '#efe6cf';
      ctx.fillRect(-3.5, -6, 7, 12);
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(-2, -2.5, 4, 4);
      ctx.restore();
    } else if (options.enemyType === 'INK_SUMMONER') {
      ctx.beginPath();
      ctx.moveTo(shoulderX - 8, shoulderY);
      ctx.lineTo(shoulderX + 8, shoulderY);
      ctx.lineTo(hipX + 2, hipY0 + 18);
      ctx.closePath();
      ctx.fillStyle = 'rgba(61, 90, 64, 0.4)';
      ctx.fill();
    } else if (options.enemyType === 'INK_CRANE') {
      // 飞白鹤：双翅（肩后双层弧翼 + 羽端三笔飞白）——随 ribbonPhase 拓动
      const flap = Math.sin((options.ribbonPhase ?? 0) * 1.6) * 0.35;
      ctx.save();
      ctx.translate(shoulderX, shoulderY - 2);
      ctx.rotate(-0.5 + flap);
      for (const [wingLen, wingDrop, wAlpha] of [[30, 14, 0.9], [22, 8, 0.55]] as const) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-wingLen * 0.5, -10 - flap * 8, -wingLen, wingDrop);
        ctx.strokeStyle = mainColor;
        ctx.globalAlpha = alpha * wAlpha;
        ctx.lineWidth = 2.6;
        ctx.stroke();
        // 羽端三笔（飞白羽尖）
        for (let f = -1; f <= 1; f++) {
          ctx.beginPath();
          ctx.moveTo(-wingLen, wingDrop);
          ctx.lineTo(-wingLen - 7, wingDrop + 5 + f * 4);
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = alpha;
      ctx.restore();
      // 长颈前探曲線（从头到肩的 S 形墨线）
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.quadraticCurveTo(shoulderX + 6, shoulderY - 10, shoulderX + 4, shoulderY - 16);
      ctx.strokeStyle = palette.dim;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    } else if (options.enemyType === 'INK_TURTLE') {
      // 砚台龟：背负砚台墨甲（背弧甲壳 + 双圈砚池纹）
      ctx.beginPath();
      ctx.moveTo(shoulderX - 4, shoulderY + 2);
      ctx.quadraticCurveTo(shoulderX - 17, shoulderY - 4, hipX - 10, hipY0 + 2);
      ctx.quadraticCurveTo(hipX - 4, hipY0 + 8, hipX + 2, hipY0 + 6);
      ctx.closePath();
      ctx.fillStyle = mainColor;
      ctx.globalAlpha = alpha * 0.92;
      ctx.fill();
      ctx.globalAlpha = alpha;
      // 砚池双圈纹
      ctx.beginPath();
      ctx.arc(shoulderX - 9, shoulderY - 1, 3.2, 0, Math.PI * 2);
      ctx.strokeStyle = '#efe6cf';
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(hipX - 7, hipY0 - 1, 2.2, 0, Math.PI * 2);
      ctx.stroke();
    } else if (options.enemyType === 'INK_DRUNKARD') {
      // 醉墨剑客：腰后酒葫芦（双葫芦形 + 束口）
      const gx = hipX - 9;
      const gy = hipY0 - 2;
      ctx.beginPath();
      ctx.arc(gx, gy + 3, 4.2, 0, Math.PI * 2);
      ctx.fillStyle = mainColor;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(gx + 1, gy - 4, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#efe6cf';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(gx - 1, gy - 6.5);
      ctx.lineTo(gx + 3, gy - 6.5);
      ctx.stroke();
    }

    // 2. Head & Martial Arts Bamboo Hat (斗笠)
    const headX = shoulderX + Math.sin(pose.headAngle) * 9;
    const headY = shoulderY - Math.cos(pose.headAngle) * 9 - headRadius;

    ctx.beginPath();
    ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
    ctx.fill();

    // 爆墨傀儡：头顶引信（火花闪烁由引擎渲染层叠加）
    if (options.enemyType === 'INK_BOMBER') {
      ctx.beginPath();
      ctx.moveTo(headX + 2, headY - headRadius);
      ctx.quadraticCurveTo(headX + 9, headY - headRadius - 8, headX + 5, headY - headRadius - 13);
      ctx.strokeStyle = '#4a2f1a';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(headX + 5, headY - headRadius - 13, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = '#f97316';
      ctx.fill();
    }

    // 飞白鹤：尖喙（头前三角长喙）
    if (options.enemyType === 'INK_CRANE') {
      ctx.beginPath();
      ctx.moveTo(headX + headRadius - 1, headY - 1.5);
      ctx.lineTo(headX + headRadius + 9, headY + 1);
      ctx.lineTo(headX + headRadius - 1, headY + 2.5);
      ctx.closePath();
      ctx.fillStyle = '#1f2f3b';
      ctx.fill();
      // 顶羽（丹顶一点朱砂）
      ctx.beginPath();
      ctx.arc(headX - 1, headY - headRadius + 0.5, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = '#b91c1c';
      ctx.fill();
    }

    // Bamboo Hat for player or bosses（Boss 三强线：先锋窄笠焦褐 / 宗师暗赤 / 大帝宽笠金边双穗）
    if (options.isPlayer || options.enemyType === 'INK_BOSS') {
      const isBossHat = !options.isPlayer;
      const tier = isBossHat ? (options.bossTier ?? 2) : 0;
      const hatW = options.isPlayer ? 24 : tier === 3 ? 40 : tier === 1 ? 28 : 32;
      const hatH = options.isPlayer ? 7 : tier === 3 ? 13 : tier === 1 ? 9 : 10;
      ctx.save();
      ctx.translate(headX, headY - headRadius * 0.4);
      ctx.rotate(pose.headAngle);

      // Hat triangle cone
      ctx.beginPath();
      ctx.moveTo(-hatW / 2, 0);
      ctx.lineTo(0, -hatH);
      ctx.lineTo(hatW / 2, 0);
      ctx.closePath();
      ctx.fillStyle = options.isPlayer ? '#322c26' : tier === 1 ? '#4a2c14' : tier === 3 ? '#2b2419' : '#5c1d1d';
      ctx.fill();
      ctx.strokeStyle = '#1a1918';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      // 大帝金边斗笠
      if (isBossHat && tier === 3) {
        ctx.beginPath();
        ctx.moveTo(-hatW / 2 + 1.5, -0.5);
        ctx.lineTo(0, -hatH + 2.5);
        ctx.lineTo(hatW / 2 - 1.5, -0.5);
        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }

      // 斗笠剑穗（大帝双穗：金穗+赤穗；先锋/宗师赤穗）
      const ribbonPhase = options.ribbonPhase ?? 0;
      const r1 = Math.sin(ribbonPhase) * 4;
      const r2 = Math.cos(ribbonPhase * 1.3) * 6;
      ctx.beginPath();
      ctx.moveTo(-hatW * 0.25, 0);
      ctx.bezierCurveTo(-hatW * 0.5 - 6, 6 + r1, -hatW * 0.8 - 10, 14 + r2, -hatW - 14, 20 + r1);
      ctx.strokeStyle = '#c22020'; // Vermilion red
      ctx.lineWidth = 2.2;
      ctx.stroke();
      if (isBossHat && tier === 3) {
        ctx.beginPath();
        ctx.moveTo(-hatW * 0.15, -1);
        ctx.bezierCurveTo(-hatW * 0.45 - 4, 4 + r2, -hatW * 0.7 - 8, 10 + r1, -hatW - 8, 16 + r2);
        ctx.strokeStyle = '#b8860b'; // Gold ribbon
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }

      ctx.restore();

      // 先锋双肩墨刺（轻装突进者的兽肩甲）
      if (isBossHat && tier === 1) {
        const spikeH = 7;
        for (const side of [-1, 1] as const) {
          const sx0 = side * 9;
          const sy0 = -52;
          ctx.beginPath();
          ctx.moveTo(sx0 - 4, sy0);
          ctx.lineTo(sx0 + side * 2, sy0 - spikeH);
          ctx.lineTo(sx0 + 4, sy0 + 1);
          ctx.closePath();
          ctx.fillStyle = '#4a2c14';
          ctx.fill();
          ctx.strokeStyle = '#1a1918';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }
    }

    // 3. Legs
    // Left Leg (Back leg)
    const lKneeX = hipX + Math.sin(pose.leftThighAngle) * legLen1;
    const lKneeY = hipY0 + Math.cos(pose.leftThighAngle) * legLen1;
    const lFootX = lKneeX + Math.sin(pose.leftThighAngle + pose.leftShinAngle) * legLen2;
    const lFootY = lKneeY + Math.cos(pose.leftThighAngle + pose.leftShinAngle) * legLen2;

    ctx.save();
    ctx.strokeStyle = palette.dim;
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(lKneeX, lKneeY);
    ctx.lineTo(lFootX, lFootY);
    ctx.stroke();
    ctx.restore();

    // Right Leg (Front leg)
    const rKneeX = hipX + Math.sin(pose.rightThighAngle) * legLen1;
    const rKneeY = hipY0 + Math.cos(pose.rightThighAngle) * legLen1;
    const rFootX = rKneeX + Math.sin(pose.rightThighAngle + pose.rightShinAngle) * legLen2;
    const rFootY = rKneeY + Math.cos(pose.rightThighAngle + pose.rightShinAngle) * legLen2;

    ctx.beginPath();
    ctx.moveTo(hipX, hipY0);
    ctx.lineTo(rKneeX, rKneeY);
    ctx.lineTo(rFootX, rFootY);
    ctx.stroke();

    // 4. Arms & Weapons
    // Left Arm (Back arm)
    const lElbowX = shoulderX + Math.sin(pose.leftUpperArmAngle) * armLen1;
    const lElbowY = shoulderY + Math.cos(pose.leftUpperArmAngle) * armLen1;
    const lHandX = lElbowX + Math.sin(pose.leftUpperArmAngle + pose.leftForearmAngle) * armLen2;
    const lHandY = lElbowY + Math.cos(pose.leftUpperArmAngle + pose.leftForearmAngle) * armLen2;

    ctx.save();
    ctx.strokeStyle = palette.limb;
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(lElbowX, lElbowY);
    ctx.lineTo(lHandX, lHandY);
    ctx.stroke();
    ctx.restore();

    // Right Arm (Front arm, holds weapon)
    const rElbowX = shoulderX + Math.sin(pose.rightUpperArmAngle) * armLen1;
    const rElbowY = shoulderY + Math.cos(pose.rightUpperArmAngle) * armLen1;
    const rHandX = rElbowX + Math.sin(pose.rightUpperArmAngle + pose.rightForearmAngle) * armLen2;
    const rHandY = rElbowY + Math.cos(pose.rightUpperArmAngle + pose.rightForearmAngle) * armLen2;

    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(rElbowX, rElbowY);
    ctx.lineTo(rHandX, rHandY);
    ctx.stroke();

    // 4.5 墨盾武僧：门板大盾（举盾竖立身前，收盾背于身后）——画在武器层之前以覆盖躯干
    if (options.enemyType === 'INK_SHIELD_GUARD') {
      const syp = (hipY0 + shoulderY) / 2;
      if (!options.shieldDown) {
        ctx.save();
        ctx.translate(13, syp + 4);
        ctx.fillStyle = '#2f3640';
        ctx.fillRect(-5, -20, 10, 40);
        ctx.strokeStyle = '#1a1f27';
        ctx.lineWidth = 2;
        ctx.strokeRect(-5, -20, 10, 40);
        ctx.fillStyle = '#6b7280';
        ctx.beginPath();
        ctx.arc(0, -12, 1.8, 0, Math.PI * 2);
        ctx.arc(0, 12, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#9aa3ad';
        ctx.font = "bold 9px 'Ma Shan Zheng', cursive";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('盾', 0, 0.5);
        ctx.restore();
      } else {
        // 收盾：破防窗口，盾斜背身后
        ctx.save();
        ctx.translate(-15, syp + 2);
        ctx.rotate(-0.55);
        ctx.fillStyle = '#3a424e';
        ctx.fillRect(-4, -16, 8, 32);
        ctx.strokeStyle = '#1a1f27';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-4, -16, 8, 32);
        ctx.restore();
      }
    }

    // 5. Weapon rendering
    ctx.save();
    ctx.translate(rHandX + pose.weaponOffset.x, rHandY + pose.weaponOffset.y);
    ctx.rotate(pose.weaponAngle);

    if (options.isPlayer) {
      // Ink Brush Sword (墨韵青锋剑)
      // Hilt
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(4, 0);
      ctx.strokeStyle = '#854d0e'; // Bronze wood hilt
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Guard
      ctx.beginPath();
      ctx.moveTo(4, -5);
      ctx.lineTo(4, 5);
      ctx.strokeStyle = '#c2410c';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Blade (with ink edge)
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.lineTo(34, 0);
      ctx.strokeStyle = '#1e1d1b';
      ctx.lineWidth = 2.8;
      ctx.stroke();

      // Tip ink aura glow
      ctx.beginPath();
      ctx.moveTo(28, 0);
      ctx.lineTo(36, 0);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Dynamic Blade Arc Trail (挥剑墨光破空)
      if (options.isAttacking) {
        ctx.save();
        // 1. Broad ink wash crescent trail
        ctx.beginPath();
        ctx.arc(0, 0, 42, -0.9, 0.9);
        ctx.strokeStyle = 'rgba(20, 18, 16, 0.75)';
        ctx.lineWidth = 6;
        ctx.stroke();

        // 2. Cyan / Cinnabar sharp energy edge
        ctx.beginPath();
        ctx.arc(0, 0, 40, -0.75, 0.75);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // 3. Blazing white cutting filament
        ctx.beginPath();
        ctx.arc(0, 0, 38, -0.45, 0.45);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.restore();
      }
    } else if (options.enemyType === 'INK_ARCHER') {
      // Longbow
      ctx.beginPath();
      ctx.arc(0, 0, 16, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // Bowstring
      ctx.beginPath();
      ctx.moveTo(11, -12);
      ctx.lineTo(11, 12);
      ctx.strokeStyle = 'rgba(200, 200, 200, 0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (options.enemyType === 'INK_BRUTE') {
      // Giant spiked ink club (狼牙棒)
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(38, 0);
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 7;
      ctx.stroke();
    } else if (options.enemyType === 'INK_SUMMONER') {
      // 妖笔长杖：斜握长杆 + 笔锋墨滴
      ctx.beginPath();
      ctx.moveTo(-8, 6);
      ctx.lineTo(26, -10);
      ctx.strokeStyle = '#27402c';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(26, -10, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#1f3d2a';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(26, -10, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = '#7fb069';
      ctx.fill();
    } else {
      // Dao blade
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(24, 0);
      ctx.strokeStyle = '#44403c';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    ctx.restore();

    // 6. 符笔妖道：两片环绕符纸（时间驱动，ribbonPhase 由引擎传入 nowMs）
    if (options.enemyType === 'INK_SUMMONER') {
      const ph = options.ribbonPhase ?? 0;
      for (let i = 0; i < 2; i++) {
        const a = ph + i * Math.PI;
        const ox = Math.cos(a) * 16;
        const oy = -26 + Math.sin(a) * 7;
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(Math.sin(a) * 0.4);
        ctx.fillStyle = '#efe6cf';
        ctx.fillRect(-2.5, -5, 5, 10);
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(-1.5, -1.5, 3, 3);
        ctx.restore();
      }
    }

    ctx.restore();
  }
}

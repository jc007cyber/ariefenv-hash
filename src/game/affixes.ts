/**
 * Roguelike Skill Affix System (词条系统)
 * Classical Chinese Martial Arts & Ink Daoism Synergies
 */

import { Affix, AffixRarity } from '../types/game';

export const ALL_AFFIXES: Affix[] = [
  {
    id: 'blade_qi',
    name: '剑气纵横',
    hanziSeal: '气',
    rarity: 'EPIC',
    desc: '挥砍斩击与招式附带穿透性水墨剑气，远距离撕裂群敌。',
    iconType: 'sword',
    stats: {
      swordBeamEnabled: true,
      attackBonus: 15,
    },
  },
  {
    id: 'mad_cursive',
    name: '狂草墨暴',
    hanziSeal: '狂',
    rarity: 'LEGENDARY',
    desc: '书法手势招式暴击率提高35%，暴击时引爆大范围水墨风暴，暴击伤害提升60%。',
    iconType: 'brush',
    stats: {
      gestureBonus: 40,
      critChanceBonus: 0.35,
      critDamageBonus: 60,
      inkExplosion: true,
    },
  },
  {
    id: 'taichi_void',
    name: '太极还虚',
    hanziSeal: '道',
    rarity: 'EPIC',
    desc: '「圆」招式生成更庞大的八卦气场，吸纳伤害转化为自身生命。',
    iconType: 'shield',
    stats: {
      damageReduction: 20,
      lifestealPercent: 0.1,
    },
  },
  {
    id: 'thousand_jin',
    name: '笔意千钧',
    hanziSeal: '钧',
    rarity: 'RARE',
    desc: '「劈」招式震地裂痕化为向前奔涌的三道墨龙地刺，击飞敌人。',
    iconType: 'lightning',
    stats: {
      attackBonus: 25,
      gestureBonus: 20,
    },
  },
  {
    id: 'phantom_chain',
    name: '瞬影连环',
    hanziSeal: '影',
    rarity: 'LEGENDARY',
    desc: '「闪」招式命中敌人立即重置内力消耗，可连续发动穿梭截杀。',
    iconType: 'feather',
    stats: {
      flashCooldownReset: true,
      moveSpeedBonus: 25,
    },
  },
  {
    id: 'glacial_ink',
    name: '泼墨成冰',
    hanziSeal: '寒',
    rarity: 'RARE',
    desc: '墨迹凝寒成冰，所有攻击使敌人移动与攻击速度减缓55%，持续3.5秒。',
    iconType: 'shield',
    stats: {
      frostSlow: true,
    },
  },
  {
    id: 'ink_thunder',
    name: '惊雷笔意',
    hanziSeal: '雷',
    rarity: 'EPIC',
    desc: '每成功书写释放一次书法手势，天降一道水墨惊雷轰击随机强敌。',
    iconType: 'lightning',
    stats: {
      thunderStrike: true,
      gestureBonus: 25,
    },
  },
  {
    id: 'flowing_water',
    name: '行云流水',
    hanziSeal: '韵',
    rarity: 'COMMON',
    desc: '身法空灵，墨意恢复速度提高80%，移动速度提升15%。',
    iconType: 'feather',
    stats: {
      inkRegenBonus: 80,
      moveSpeedBonus: 15,
    },
  },
  {
    id: 'iron_bone',
    name: '金刚铁骨',
    hanziSeal: '刚',
    rarity: 'RARE',
    desc: '内力护体，受到伤害减少30%，气血上限提升40点。',
    iconType: 'shield',
    stats: {
      damageReduction: 30,
      maxHpBonus: 40,
    },
  },
  {
    id: 'blood_siphon',
    name: '饮墨生华',
    hanziSeal: '饮',
    rarity: 'EPIC',
    desc: '每次消灭敌人或打出高额连招，吸收天地墨韵恢复6%气血。',
    iconType: 'flame',
    stats: {
      lifestealPercent: 0.08,
      critDamageBonus: 40,
    },
  },
  {
    id: 'dense_ink',
    name: '浓墨破岳',
    hanziSeal: '破',
    rarity: 'COMMON',
    desc: '墨劲雄浑，基础攻击力提高30%，击退距离大幅提升。',
    iconType: 'sword',
    stats: {
      attackBonus: 30,
    },
  },
  {
    id: 'step_snow',
    name: '踏雪无痕',
    hanziSeal: '空',
    rarity: 'RARE',
    desc: '身轻如燕，移动速度提升20%，浮空招式伤害提高50%。',
    iconType: 'feather',
    stats: {
      gestureBonus: 25,
      moveSpeedBonus: 20,
    },
  },
  // ==================== 新增词条 ====================
  {
    id: 'ink_shield',
    name: '凝墨为甲',
    hanziSeal: '甲',
    rarity: 'RARE',
    desc: '每波开战时凝聚50点墨盾护体，护盾存在期间减免全部伤害，随时间缓慢消散。',
    iconType: 'shield',
    stats: {
      shieldOnWaveStart: 50,
      damageReduction: 10,
    },
  },
  {
    id: 'chain_thunder',
    name: '雷引连枝',
    hanziSeal: '链',
    rarity: 'EPIC',
    desc: '消灭敌人时天雷顺墨迹跃迁，链弹轰击至多3名邻近妖敌。',
    iconType: 'lightning',
    stats: {
      chainLightning: 3,
      attackBonus: 10,
    },
  },
  {
    id: 'cinnabar_flame',
    name: '朱砂焚意',
    hanziSeal: '焚',
    rarity: 'EPIC',
    desc: '剑锋淬以朱砂真火，命中附加灼烧，妖敌持续流失气血5秒。',
    iconType: 'flame',
    stats: {
      burnOnHit: 0.35,
      attackBonus: 12,
    },
  },
  {
    id: 'decree_slayer',
    name: '判官笔锋',
    hanziSeal: '决',
    rarity: 'LEGENDARY',
    desc: '笔落判生死：气血低于22%的妖敌直接被朱笔勾魂处决（首领除外）。',
    iconType: 'brush',
    stats: {
      executeThreshold: 0.22,
      critChanceBonus: 0.1,
    },
  },
  {
    id: 'torn_page',
    name: '残页·续墨',
    hanziSeal: '续',
    rarity: 'LEGENDARY',
    desc: '身陨时残页燃尽化作墨韵，原地续墨重生一次，恢复60%气血并震退群敌。',
    iconType: 'brush',
    stats: {
      reviveOnce: true,
      maxHpBonus: 20,
    },
  },
  {
    id: 'thorn_reflect',
    name: '铁画银钩',
    hanziSeal: '钩',
    rarity: 'RARE',
    desc: '身周墨锋外张，受击时将35%伤害反震给来犯之敌。',
    iconType: 'sword',
    stats: {
      thornsPercent: 35,
      damageReduction: 8,
    },
  },
  {
    id: 'ink_well',
    name: '胸藏万墨',
    hanziSeal: '藏',
    rarity: 'COMMON',
    desc: '墨海充盈：内力上限提升40点，暴击时额外回复5点墨意。',
    iconType: 'brush',
    stats: {
      critGainInk: 5,
      inkRegenBonus: 30,
    },
  },
  {
    id: 'shadow_step',
    name: '掠影无踪',
    hanziSeal: '掠',
    rarity: 'RARE',
    desc: '滑步与「闪」穿梭时化作风刃，对路径上所有妖敌造成伤害。',
    iconType: 'feather',
    stats: {
      dashStrikeEnabled: true,
      moveSpeedBonus: 12,
    },
  },
  // ==================== 觉醒与新敌对策词条（20 → 26） ====================
  {
    id: 'crane_sky',
    name: '鹤唳九天',
    hanziSeal: '鹤',
    rarity: 'RARE',
    desc: '墨锋上挑如鹤唳九霄：对浮空妖敌伤害提升35%，专克盘旋的飞白鹤。',
    iconType: 'feather',
    stats: {
      skySlayerPercent: 35,
      gestureBonus: 10,
    },
  },
  {
    id: 'drunk_dodge',
    name: '醉墨行',
    hanziSeal: '醉',
    rarity: 'EPIC',
    desc: '身形如醉步飘忽：受击时12%概率完全闪避，不受任何伤害与硬直。',
    iconType: 'feather',
    stats: {
      dodgeChancePercent: 12,
      moveSpeedBonus: 8,
    },
  },
  {
    id: 'soul_surge',
    name: '墨魂涌动',
    hanziSeal: '涌',
    rarity: 'COMMON',
    desc: '墨魂在经脉中奔涌：觉醒充能速度提升30%，墨意回复提高15%。',
    iconType: 'brush',
    stats: {
      awakeningGainBonus: 30,
      inkRegenBonus: 15,
    },
  },
  {
    id: 'myriad_ink',
    name: '万墨归一',
    hanziSeal: '归',
    rarity: 'LEGENDARY',
    desc: '万道墨流归于一笔：觉醒技「万墨归宗」伤害提升60%，攻击力+10%。',
    iconType: 'brush',
    stats: {
      awakeningDamageBonus: 60,
      attackBonus: 10,
    },
  },
  {
    id: 'swallow_mountains',
    name: '气吞山河',
    hanziSeal: '吞',
    rarity: 'EPIC',
    desc: '觉醒爆发时墨浪翻卷更广阔：觉醒技范围扩大50%，气血上限+30。',
    iconType: 'flame',
    stats: {
      awakeningRadiusBonus: 50,
      maxHpBonus: 30,
    },
  },
  {
    id: 'xuanwu_bulwark',
    name: '玄武镇岳',
    hanziSeal: '武',
    rarity: 'RARE',
    desc: '玄武镇岳气定神闲：每波开战时觉醒充能直接+50，气血上限提升40点。',
    iconType: 'shield',
    stats: {
      awakeningOnWaveStart: 50,
      maxHpBonus: 40,
    },
  },
  // ==================== 画龙点睛（26 → 27） ====================
  {
    id: 'eye_dotting',
    name: '画龙点睛',
    hanziSeal: '睛',
    rarity: 'EPIC',
    desc: '笔锋点睛：挥毫划过妖敌头顶要穴（头部小圆域）必定会心，该击伤害提升60%，并落下朱砂点睛之印。',
    iconType: 'brush',
    stats: {
      eyeStrikeEnabled: true,
      eyeStrikeBonus: 60,
      gestureBonus: 12,
    },
  },
  // ==================== 增伤百分比扩充（27 → 35） ====================
  {
    id: 'ink_fury',
    name: '醉笔狂澜',
    hanziSeal: '澜',
    rarity: 'COMMON',
    desc: '墨劲奔涌不加拘束：攻击力提高18%。',
    iconType: 'sword',
    stats: {
      attackBonus: 18,
    },
  },
  {
    id: 'grind_ink',
    name: '磨墨添锋',
    hanziSeal: '锋',
    rarity: 'COMMON',
    desc: '磨墨千遍，笔锋日利：攻击力提高12%，暴击率提升5%。',
    iconType: 'brush',
    stats: {
      attackBonus: 12,
      critChanceBonus: 0.05,
    },
  },
  {
    id: 'crown_rage',
    name: '怒发冲冠',
    hanziSeal: '怒',
    rarity: 'RARE',
    desc: '背水一战血愈勇：气血低于50%时攻击力提升35%，越险越强。',
    iconType: 'flame',
    stats: {
      berserkDamageBonus: 35,
    },
  },
  {
    id: 'chain_victory',
    name: '连战连决',
    hanziSeal: '势',
    rarity: 'RARE',
    desc: '连招不绝攻势如潮：每10连击攻击力+4%，最高提升32%。',
    iconType: 'sword',
    stats: {
      comboDamagePercent: 32,
    },
  },
  {
    id: 'dragon_run',
    name: '笔走龙蛇',
    hanziSeal: '蛇',
    rarity: 'RARE',
    desc: '笔势游走若龙蛇飞动：手势招式伤害提升25%，暴击率提升8%。',
    iconType: 'brush',
    stats: {
      gestureBonus: 25,
      critChanceBonus: 0.08,
    },
  },
  {
    id: 'paper_pierce',
    name: '力透纸背',
    hanziSeal: '透',
    rarity: 'EPIC',
    desc: '笔力千钧入木三分：攻击力提高22%，暴击伤害提升50%。',
    iconType: 'sword',
    stats: {
      attackBonus: 22,
      critDamageBonus: 50,
    },
  },
  {
    id: 'army_breaker',
    name: '破阵摧坚',
    hanziSeal: '摧',
    rarity: 'EPIC',
    desc: '千军之中直取上将首级：对首领与精英妖敌伤害提升30%，攻击力+8%。',
    iconType: 'lightning',
    stats: {
      bossSlayerPercent: 30,
      attackBonus: 8,
    },
  },
  {
    id: 'shaqi_sky',
    name: '煞气冲霄',
    hanziSeal: '煞',
    rarity: 'LEGENDARY',
    desc: '笔下妖墨愈多，煞气愈盛：每击杀8名妖敌攻击力永久+1%（上限+30%），怪海中的滚雪球绝品。',
    iconType: 'flame',
    stats: {
      killStackDamageBonus: 30,
    },
  },
];

/** 稀有度基础权重（越高越稀有） */
const RARITY_WEIGHT: Record<AffixRarity, number> = {
  COMMON: 44,
  RARE: 30,
  EPIC: 18,
  LEGENDARY: 8,
};

/** 波次越高，稀有度权重略微向稀有倾斜 */
function rarityWeight(rarity: AffixRarity, wave: number): number {
  const base = RARITY_WEIGHT[rarity];
  if (rarity === 'LEGENDARY') return base + Math.min(10, wave * 0.6);
  if (rarity === 'EPIC') return base + Math.min(6, wave * 0.4);
  return base;
}

/**
 * Draw 3 random distinct affixes weighted by rarity.
 * Prioritizes unowned ones; owned duplicates are heavily down-weighted
 * so stacks stay possible but fresh builds are preferred.
 */
export function drawRandomAffixes(owned: Affix[], count: number = 3, wave: number = 1): Affix[] {
  const ownedIds = new Set(owned.map((a) => a.id));
  const pool = ALL_AFFIXES.filter((a) => !ownedIds.has(a.id));

  // Prefer unowned pool; if exhausted, allow duplicates for stacking
  const source = pool.length >= count ? pool : ALL_AFFIXES;

  const weighted: { affix: Affix; weight: number }[] = source.map((a) => {
    const ownedPenalty = ownedIds.has(a.id) ? 0.15 : 1.0;
    return { affix: a, weight: rarityWeight(a.rarity, wave) * ownedPenalty };
  });

  const picked: Affix[] = [];
  const available = [...weighted];

  while (picked.length < count && available.length > 0) {
    const total = available.reduce((s, w) => s + w.weight, 0);
    let roll = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < available.length; i++) {
      roll -= available[i].weight;
      if (roll <= 0) {
        idx = i;
        break;
      }
    }
    picked.push(available[idx].affix);
    available.splice(idx, 1);
  }

  return picked;
}

/** 稀有度对应 UI 色彩 */
export const RARITY_COLOR: Record<AffixRarity, { text: string; border: string; bg: string; label: string }> = {
  COMMON: { text: 'text-[#d6d3d1]', border: 'border-[#57534e]', bg: 'bg-[#292524]/40', label: '凡品' },
  RARE: { text: 'text-[#38bdf8]', border: 'border-[#0284c7]', bg: 'bg-[#0c4a6e]/30', label: '上品' },
  EPIC: { text: 'text-[#c084fc]', border: 'border-[#7e22ce]', bg: 'bg-[#3b0764]/40', label: '珍品' },
  LEGENDARY: { text: 'text-[#fbbf24]', border: 'border-[#b45309]', bg: 'bg-[#713f12]/40', label: '绝品' },
};

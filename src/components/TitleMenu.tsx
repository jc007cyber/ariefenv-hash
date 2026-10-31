import inkSeal from '@/src/assets/images/title_seal.png';
/**
 * Game Title Screen / Main Menu
 * v2: 历史战绩展示（最高分/最远折数/累计击杀/问鼎次数）
 * v3: 双玩法模式——经典征战（15折通关线）/ 无双演武（怪海割草），战绩分榜展示
 */

import React, { useState } from 'react';
import { Play, BookOpen, Trophy, Swords, Landmark, Crown, Save, Feather, Skull } from 'lucide-react';
import { Difficulty, GameMode, PersistentRecords } from '../types/game';

interface TitleMenuProps {
  onStart: (difficulty: Difficulty, mode: GameMode) => void;
  onOpenManual: () => void;
  onOpenSaveManager: () => void;
  /** 有未完成征战认领时展示「续战」入口 */
  onResumeRun?: () => void;
  resumeWave?: number;
  resumeMode?: GameMode;
  records: PersistentRecords;
}

export const TitleMenu: React.FC<TitleMenuProps> = ({ onStart, onOpenManual, onOpenSaveManager, onResumeRun, resumeWave, resumeMode = 'CLASSIC', records }) => {
  const [difficulty, setDifficulty] = useState<Difficulty>('NORMAL');
  const [mode, setMode] = useState<GameMode>('CLASSIC');
  const isMusou = mode === 'MUSOU';

  const hasRecords = records.totalRuns > 0;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none overflow-y-auto">
      <div className="max-w-xl w-full bg-[#f4eedd] border border-[#b3a181] rounded-2xl p-7 sm:p-9 shadow-2xl relative flex flex-col items-center text-center my-auto">
        {/* Decorative Seal Icon（字体渲染的朱砂印章） */}
        <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-[#b3a181] shadow-xl mb-4 shadow-[#8a6a3a]/20">
          <img
            src={inkSeal}
            alt="墨痕武道"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Title */}
        <div className="text-xs font-ink-serif text-[#85745a] tracking-widest mb-1.5">
          中国古典水墨 · 仿3D火柴人动作肉鸽
        </div>
        <h1 className="text-3xl sm:text-4xl font-calligraphy text-[#2b2118] tracking-widest mb-3">
          墨痕武道
        </h1>
        <p className="text-xs sm:text-sm text-[#5a4a34] font-ink-serif max-w-md mb-5 leading-relaxed">
          以笔化剑，踏墨而行。在仿3D水墨画卷中施展流畅骨骼身法与书法手势招式，参悟随机武道词条，迎战高难度的妖墨浪潮！
        </p>

        {/* 历史战绩（按所选模式分榜） */}
        {hasRecords && (
          <div className="w-full mb-5 p-3.5 bg-[#ece4d0] rounded-xl border border-[#c4b494]">
            <div className="text-[10px] font-ink-serif text-[#85745a] tracking-[0.4em] mb-2.5">
              {isMusou ? '无 双 血 录' : '江 湖 行 录'}
            </div>
            {isMusou ? (
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center">
                  <Trophy className="w-3.5 h-3.5 text-[#b45309] mb-1" />
                  <div className="text-sm font-calligraphy text-[#b45309] tabular-nums leading-none">{records.musouHighScore}</div>
                  <div className="text-[9px] font-ink-serif text-[#937f60] mt-1">无双最高功绩</div>
                </div>
                <div className="flex flex-col items-center">
                  <Landmark className="w-3.5 h-3.5 text-[#dc2626] mb-1" />
                  <div className="text-sm font-calligraphy text-[#b91c1c] tabular-nums leading-none">第{records.musouBestWave}阵</div>
                  <div className="text-[9px] font-ink-serif text-[#937f60] mt-1">最深血战</div>
                </div>
                <div className="flex flex-col items-center">
                  <Swords className="w-3.5 h-3.5 text-[#7c3aed] mb-1" />
                  <div className="text-sm font-calligraphy text-[#8b5cf6] tabular-nums leading-none">{records.totalKills}</div>
                  <div className="text-[9px] font-ink-serif text-[#937f60] mt-1">累计斩敌</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                <div className="flex flex-col items-center">
                  <Trophy className="w-3.5 h-3.5 text-[#b45309] mb-1" />
                  <div className="text-sm font-calligraphy text-[#b45309] tabular-nums leading-none">{records.highScore}</div>
                  <div className="text-[9px] font-ink-serif text-[#937f60] mt-1">最高功绩</div>
                </div>
                <div className="flex flex-col items-center">
                  <Landmark className="w-3.5 h-3.5 text-[#0369a1] mb-1" />
                  <div className="text-sm font-calligraphy text-[#0284c7] tabular-nums leading-none">第{records.bestWave}折</div>
                  <div className="text-[9px] font-ink-serif text-[#937f60] mt-1">最远征程</div>
                </div>
                <div className="flex flex-col items-center">
                  <Swords className="w-3.5 h-3.5 text-[#dc2626] mb-1" />
                  <div className="text-sm font-calligraphy text-[#b91c1c] tabular-nums leading-none">{records.totalKills}</div>
                  <div className="text-[9px] font-ink-serif text-[#937f60] mt-1">累计斩敌</div>
                </div>
                <div className="flex flex-col items-center">
                  <Crown className="w-3.5 h-3.5 text-[#7c3aed] mb-1" />
                  <div className="text-sm font-calligraphy text-[#8b5cf6] tabular-nums leading-none">{records.victories}</div>
                  <div className="text-[9px] font-ink-serif text-[#937f60] mt-1">问鼎次数</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 玩法模式选择 */}
        <div className="w-full mb-4 text-left">
          <div className="text-xs font-ink-serif text-[#85745a] mb-2 text-center">
            选择玩法模式
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode('CLASSIC')}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                mode === 'CLASSIC'
                  ? 'bg-[#e6dcc4] border-[#b45309] text-[#b45309] shadow-md'
                  : 'bg-[#ece4d0] border-[#c4b494] text-[#85745a] hover:border-[#b3a181]'
              }`}
            >
              <div className="font-calligraphy text-sm sm:text-base">经典征战</div>
              <div className="text-[10px] font-ink-serif mt-0.5 opacity-80">十五折问鼎墨武之巅</div>
            </button>

            <button
              onClick={() => setMode('MUSOU')}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                mode === 'MUSOU'
                  ? 'bg-[#f3e0da] border-[#b91c1c] text-[#b91c1c] shadow-md'
                  : 'bg-[#ece4d0] border-[#c4b494] text-[#85745a] hover:border-[#b3a181]'
              }`}
            >
              <div className="font-calligraphy text-sm sm:text-base flex items-center justify-center gap-1">
                无双演武
                {records.musouHighScore > 0 && <span className="text-[9px] font-ink-serif opacity-70">· 已开阵</span>}
              </div>
              <div className="text-[10px] font-ink-serif mt-0.5 opacity-80">怪海狂潮 · 杀个痛快</div>
            </button>
          </div>
          <div className="text-[10px] font-ink-serif text-[#937f60] text-center mt-2">
            {isMusou
              ? '妖墨如潮涌来，宗师三阵一拦、双煞齐临——无通关概念，唯以杀止杀，力战而竭方为终章'
              : '通关目标：历经十五折，击败「墨煞大帝」即问鼎墨武之巅 · 胜后可入无尽模式'}
          </div>
        </div>

        {/* Difficulty Selection */}
        <div className="w-full mb-6 text-left">
          <div className="text-xs font-ink-serif text-[#85745a] mb-2 text-center">
            选择江湖试炼难度
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => setDifficulty('EASY')}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                difficulty === 'EASY'
                  ? 'bg-[#e6dcc4] border-[#0369a1] text-[#0369a1] shadow-md'
                  : 'bg-[#ece4d0] border-[#c4b494] text-[#85745a] hover:border-[#b3a181]'
              }`}
            >
              <div className="font-calligraphy text-sm sm:text-base">初入江湖</div>
              <div className="text-[10px] font-ink-serif mt-0.5 opacity-80">敌弱血厚</div>
            </button>

            <button
              onClick={() => setDifficulty('NORMAL')}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                difficulty === 'NORMAL'
                  ? 'bg-[#e6dcc4] border-[#b45309] text-[#b45309] shadow-md'
                  : 'bg-[#ece4d0] border-[#c4b494] text-[#85745a] hover:border-[#b3a181]'
              }`}
            >
              <div className="font-calligraphy text-sm sm:text-base">炉火纯青</div>
              <div className="text-[10px] font-ink-serif mt-0.5 opacity-80">标准挑战</div>
            </button>

            <button
              onClick={() => setDifficulty('HARD')}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                difficulty === 'HARD'
                  ? 'bg-[#e6dcc4] border-[#dc2626] text-[#dc2626] shadow-md'
                  : 'bg-[#ece4d0] border-[#c4b494] text-[#85745a] hover:border-[#b3a181]'
              }`}
            >
              <div className="font-calligraphy text-sm sm:text-base">宗师绝顶</div>
              <div className="text-[10px] font-ink-serif mt-0.5 opacity-80">强敌环伺</div>
            </button>

            <button
              onClick={() => setDifficulty('EXTREME')}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                difficulty === 'EXTREME'
                  ? 'bg-[#e6dcc4] border-[#7c3aed] text-[#6d28d9] shadow-md shadow-[#7c3aed]/30'
                  : 'bg-[#ece4d0] border-[#c4b494] text-[#85745a] hover:border-[#b3a181]'
              }`}
            >
              <div className="font-calligraphy text-sm sm:text-base">天劫墨难</div>
              <div className="text-[10px] font-ink-serif mt-0.5 opacity-80">九死一生</div>
            </button>
          </div>
          <div className="text-[10px] font-ink-serif text-[#937f60] text-center mt-2">
            {difficulty === 'EXTREME'
              ? '天劫墨难：妖墨血厚四成五、伤重六成、狂潮加倍——功绩 ×1.5，以身试劫方登墨道之巅'
              : difficulty === 'HARD'
                ? '宗师绝顶：妖墨血厚伤重、倾巢而出——功绩 ×1.25'
                : '难度影响妖墨强度、刷怪密度与初始气血（初入江湖 180 / 炉火纯青 120 / 宗师绝顶 90 / 天劫墨难 70）'}
          </div>
        </div>

        {/* Feature summary */}
        <div className="flex items-center justify-center gap-4 text-xs font-ink-serif text-[#85745a] mb-6">
          <span>左屏摇杆身法</span>
          <span aria-hidden="true">·</span>
          <span>右屏书法手势</span>
          <span aria-hidden="true">·</span>
          <span>键鼠/触屏双全</span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col w-full gap-2.5">
          {onResumeRun && (
            <button
              onClick={onResumeRun}
              className="flex items-center justify-center gap-2 py-3 px-6 bg-[#1a1611] hover:bg-[#2b2118] text-[#f0e6c8] font-calligraphy text-lg rounded-xl transition-all shadow-lg shadow-black/40 cursor-pointer w-full border border-[#8a6a3a]/60"
            >
              <Feather className="w-5 h-5 text-[#d9b96c]" />
              <span>
                {resumeMode === 'MUSOU' ? `续战 · 无双第${resumeWave ?? 1}阵` : `续战 · 第${resumeWave ?? 1}折`}
              </span>
              <span className="text-[10px] font-ink-serif opacity-70 tracking-widest">— 未竟之局 —</span>
            </button>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            <button
              onClick={() => onStart(difficulty, mode)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 font-calligraphy text-lg rounded-xl transition-all shadow-lg cursor-pointer w-full text-[#f8f0dc] ${
                isMusou
                  ? 'bg-[#b91c1c] hover:bg-[#7f1d1d] shadow-[#b91c1c]/40'
                  : 'bg-[#b91c1c] hover:bg-[#991b1b] shadow-[#b91c1c]/25'
              }`}
            >
              {isMusou ? <Skull className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
              <span>{isMusou ? '无双入阵 · 杀个痛快' : '执笔入局 · 开战'}</span>
            </button>

            <button
              onClick={onOpenManual}
              className="flex items-center justify-center gap-1.5 py-3 px-5 bg-[#ded3b8] hover:bg-[#c9b995] text-[#4a3c2a] font-ink-serif text-sm rounded-xl border border-[#b3a181] transition-colors cursor-pointer w-full sm:w-auto"
            >
              <BookOpen className="w-4 h-4 text-[#0369a1]" />
              <span>秘籍心法</span>
            </button>

            <button
              onClick={onOpenSaveManager}
              className="flex items-center justify-center gap-1.5 py-3 px-5 bg-[#ded3b8] hover:bg-[#c9b995] text-[#4a3c2a] font-ink-serif text-sm rounded-xl border border-[#b3a181] transition-colors cursor-pointer w-full sm:w-auto"
            >
              <Save className="w-4 h-4 text-[#b45309]" />
              <span>存档管理</span>
            </button>
          </div>
        </div>

        <div className="mt-4 text-[10px] font-ink-serif text-[#937f60]">
          暂停即存档 · 切后台自动存档 · 意外退出可从标题「续战」恢复
        </div>
      </div>
    </div>
  );
};

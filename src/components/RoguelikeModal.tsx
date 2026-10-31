/**
 * Roguelike Skill Affix Selection Modal
 */

import React from 'react';
import { Affix, GameMode } from '../types/game';
import { Sparkles, RefreshCw, Check } from 'lucide-react';

interface RoguelikeModalProps {
  affixes: Affix[];
  onSelect: (affix: Affix) => void;
  onReroll: () => void;
  rerollsLeft?: number;
  wave?: number;
  gameMode?: GameMode;
}

export const RoguelikeModal: React.FC<RoguelikeModalProps> = ({ affixes, onSelect, onReroll, rerollsLeft = 1, wave = 1, gameMode = 'CLASSIC' }) => {
  const getRarityBadge = (rarity: Affix['rarity']) => {
    switch (rarity) {
      case 'LEGENDARY':
        return { label: '传世神品', color: 'text-[#b45309] border-[#b45309]/50 bg-[#b45309]/10' };
      case 'EPIC':
        return { label: '稀世绝品', color: 'text-[#7c3aed] border-[#7c3aed]/50 bg-[#7c3aed]/10' };
      case 'RARE':
        return { label: '上乘灵品', color: 'text-[#0369a1] border-[#0369a1]/50 bg-[#0369a1]/10' };
      case 'COMMON':
      default:
        return { label: '精妙凡品', color: 'text-[#5a4a34] border-[#937f60]/50 bg-[#e6dcc4]' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="max-w-3xl w-full bg-[#f1ead7] border border-[#b3a181] rounded-2xl p-6 sm:p-8 shadow-2xl relative flex flex-col items-center">
        {/* Title Header */}
        <div className="text-center mb-6">
          <div className="text-xs font-ink-serif text-[#85745a] tracking-widest mb-1">
            武道精进 · 顿悟天机
          </div>
          <h2 className="text-2xl sm:text-3xl font-calligraphy text-[#2b2118] tracking-wider">
            参悟武学真意
          </h2>
          <p className="text-xs text-[#85745a] mt-1 font-ink-serif">
            {gameMode === 'MUSOU'
              ? `无双第${wave}阵血战功成 · 从天地墨韵中择取一道心法词条，杀阵再启`
              : `历经第${wave}折洗礼 · 从天地墨韵中择取一道心法词条，强化招式威能`}
          </p>
        </div>

        {/* 3 Scroll Choice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mb-6">
          {affixes.map((affix) => {
            const badge = getRarityBadge(affix.rarity);
            return (
              <div
                key={affix.id}
                onClick={() => onSelect(affix)}
                className="group relative bg-[#ece3cd] hover:bg-[#e0d5ba] border border-[#b3a181] hover:border-[#b91c1c] rounded-xl p-5 cursor-pointer transition-all duration-200 flex flex-col justify-between hover:-translate-y-1 hover:shadow-xl shadow-black/40"
              >
                {/* Stamp Seal Impression */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] font-ink-serif px-2 py-0.5 rounded border ${badge.color}`}>
                    {badge.label}
                  </span>
                  <div className="w-8 h-8 rounded bg-[#b91c1c]/20 border border-[#b91c1c]/50 text-[#b91c1c] font-calligraphy text-base flex items-center justify-center">
                    {affix.hanziSeal}
                  </div>
                </div>

                {/* Name */}
                <h3 className="text-lg font-calligraphy text-[#2b2118] group-hover:text-[#92400e] transition-colors mb-2">
                  【{affix.name}】
                </h3>

                {/* Description */}
                <p className="text-xs text-[#5a4a34] font-ink-serif leading-relaxed flex-1 mb-4">
                  {affix.desc}
                </p>

                {/* Action CTA */}
                <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-[#e0d5ba] group-hover:bg-[#b91c1c] group-hover:text-[#f8f0dc] text-[#4a3c2a] text-xs font-ink-serif rounded-lg transition-colors">
                  <Check className="w-3.5 h-3.5" />
                  <span>参悟此道</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reroll & Confirmation Footer */}
        <div className="flex items-center justify-between w-full pt-3 border-t border-[#c4b494]">
          <span className="text-xs text-[#937f60] font-ink-serif">
            词条效果全局永久生效并可相互叠加强化
          </span>
          <button
            onClick={onReroll}
            disabled={rerollsLeft <= 0}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-ink-serif rounded-lg border transition-colors ${
              rerollsLeft > 0
                ? 'bg-[#ded3b8] hover:bg-[#d8c9aa] text-[#4a3c2a] border-[#b3a181] cursor-pointer'
                : 'bg-[#ece4d0] text-[#85745a] border-[#c4b494] cursor-not-allowed opacity-60'
            }`}
            title={rerollsLeft > 0 ? '重新推演候选词条' : '本波洗炼次数已用尽'}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#0369a1] ${rerollsLeft <= 0 ? 'opacity-40' : ''}`} />
            <span>重新推演</span>
            <span className="text-[10px] text-[#85745a]">({rerollsLeft})</span>
          </button>
        </div>
      </div>
    </div>
  );
};

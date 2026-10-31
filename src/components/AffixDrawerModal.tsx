/**
 * Active Affixes Inventory Modal
 */

import React from 'react';
import { X, Layers, Shield, Sword, Feather, Zap } from 'lucide-react';
import { Affix } from '../types/game';

interface AffixDrawerModalProps {
  affixes: Affix[];
  onClose: () => void;
}

export const AffixDrawerModal: React.FC<AffixDrawerModalProps> = ({ affixes, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="max-w-xl w-full bg-[#f4eedd] border border-[#b3a181] rounded-2xl p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#85745a] hover:text-[#2b2118] rounded-lg hover:bg-[#e0d5ba] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="text-xs font-ink-serif text-[#85745a] tracking-widest mb-1">
            平生所学 · 心法集成
          </div>
          <h2 className="text-2xl font-calligraphy text-[#2b2118] tracking-wider">
            已参悟武道词条 ({affixes.length})
          </h2>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
          {affixes.length === 0 ? (
            <div className="text-center py-12 text-[#937f60] font-ink-serif text-sm">
              尚无心法词条。通关每波妖墨挑战后即可参悟神功！
            </div>
          ) : (
            affixes.map((affix, idx) => (
              <div
                key={`${affix.id}-${idx}`}
                className="flex items-center gap-3.5 p-3.5 bg-[#ece3cd] border border-[#c9b995] rounded-xl"
              >
                <div className="w-9 h-9 rounded-lg bg-[#b91c1c]/20 border border-[#b91c1c]/50 text-[#b91c1c] font-calligraphy text-lg flex items-center justify-center shrink-0">
                  {affix.hanziSeal}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-calligraphy text-base text-[#2b2118]">
                      【{affix.name}】
                    </h4>
                    <span className="text-[10px] font-ink-serif text-[#b45309] border border-[#b45309]/40 px-1.5 py-0.5 rounded">
                      {affix.rarity === 'LEGENDARY' ? '神品' : affix.rarity === 'EPIC' ? '绝品' : affix.rarity === 'RARE' ? '灵品' : '凡品'}
                    </span>
                  </div>
                  <p className="text-xs text-[#85745a] font-ink-serif mt-1">
                    {affix.desc}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t border-[#c4b494] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#e0d5ba] hover:bg-[#d8c9aa] text-[#2b2118] text-xs font-ink-serif rounded-lg border border-[#b3a181] transition-colors cursor-pointer"
          >
            返回战斗
          </button>
        </div>
      </div>
    </div>
  );
};

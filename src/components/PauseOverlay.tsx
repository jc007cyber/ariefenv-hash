/**
 * 暂停菜单覆盖层
 */

import React from 'react';
import { Play, RotateCcw, Home, ScrollText, Feather } from 'lucide-react';

interface PauseOverlayProps {
  onResume: () => void;
  onRestart: () => void;
  onEndRun: () => void;
  onBackToTitle: () => void;
  waveTitle: string;
  score: number;
}

export const PauseOverlay: React.FC<PauseOverlayProps> = ({
  onResume,
  onRestart,
  onEndRun,
  onBackToTitle,
  waveTitle,
  score,
}) => {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm mx-4 bg-[#f4eedd] border border-[#b3a181] rounded-2xl p-7 shadow-2xl flex flex-col items-center text-center">
        <div className="text-xs font-ink-serif text-[#85745a] tracking-[0.4em] mb-1">闭目凝神</div>
        <h2 className="text-3xl font-calligraphy text-[#2b2118] tracking-widest mb-5">暂 且 收 势</h2>

        {/* 当前战况 */}
        <div className="w-full grid grid-cols-2 gap-3 mb-6 p-3.5 bg-[#ece3cd] rounded-xl border border-[#c4b494]">
          <div>
            <div className="text-[11px] font-ink-serif text-[#85745a]">当前关卡</div>
            <div className="text-sm font-calligraphy text-[#2b2118] mt-0.5">{waveTitle}</div>
          </div>
          <div className="border-l border-[#c4b494]">
            <div className="text-[11px] font-ink-serif text-[#85745a]">功绩值</div>
            <div className="text-sm font-calligraphy text-[#b45309] mt-0.5 tabular-nums">{score}</div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={onResume}
            className="flex items-center justify-center gap-2 w-full py-3 bg-[#b91c1c] hover:bg-[#991b1b] text-[#f8f0dc] font-calligraphy text-base rounded-xl transition-colors shadow-lg shadow-[#b91c1c]/25 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>继续征战</span>
            <span className="text-xs opacity-70 font-ink-serif">[ESC]</span>
          </button>

          <button
            onClick={onRestart}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#ded3b8] hover:bg-[#d8c9aa] text-[#4a3c2a] font-ink-serif text-sm rounded-xl border border-[#b3a181] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-[#0369a1]" />
            <span>重整旗鼓 · 重开一局</span>
          </button>

          <button
            onClick={onEndRun}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#e7ddc4] hover:bg-[#e0d3b2] text-[#4a3c2a] font-ink-serif text-sm rounded-xl border border-[#b3a181] transition-colors cursor-pointer"
          >
            <Feather className="w-4 h-4 text-[#7c5f3e]" />
            <span>就此收笔 · 看结局</span>
          </button>

          <button
            onClick={onBackToTitle}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#ded3b8] hover:bg-[#d8c9aa] text-[#4a3c2a] font-ink-serif text-sm rounded-xl border border-[#b3a181] transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4 text-[#b45309]" />
            <span>返回主菜单</span>
          </button>
        </div>

        <div className="mt-5 flex items-center gap-1.5 text-[10px] font-ink-serif text-[#937f60]">
          <ScrollText className="w-3 h-3" />
          <span>收笔可留下战绩与一段江湖尾声 · 进度不会白费</span>
        </div>
      </div>
    </div>
  );
};

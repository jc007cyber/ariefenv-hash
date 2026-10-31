/**
 * Martial Arts Manual & Calligraphy Gesture Guide
 */

import React from 'react';
import { X, Sparkles, Move, MousePointer, Touchpad, ShieldAlert, Crown, Pause, Skull, Swords } from 'lucide-react';

interface ManualModalProps {
  onClose: () => void;
}

export const ManualModal: React.FC<ManualModalProps> = ({ onClose }) => {
  const moves = [
    {
      hanzi: '刺',
      name: '墨刺突刺',
      strokeType: '轻点 / 短促点击',
      key: 'J 键',
      desc: '向前迅猛刺出墨锋，出招极快，适合近战快速连击与破招断招。',
      color: 'text-[#92400e] border-[#92400e]/40 bg-[#92400e]/10',
    },
    {
      hanzi: '横',
      name: '横扫千军',
      strokeType: '水平划线「一」',
      key: 'U 键',
      desc: '向左或向右迅速挥出宽阔剑气，贯穿前方多名敌人，造成范围撕裂。',
      color: 'text-[#0369a1] border-[#0369a1]/40 bg-[#0369a1]/10',
    },
    {
      hanzi: '劈',
      name: '力劈华山',
      strokeType: '垂直向下拉线「丨」',
      key: 'I 键',
      desc: '凌空跃起重砸地面，激起奔涌的水墨地刺与冲击波，造成重度击飞。',
      color: 'text-[#b45309] border-[#b45309]/40 bg-[#b45309]/10',
    },
    {
      hanzi: '挑',
      name: '飞燕凌空',
      strokeType: '自下而上斜划「丿」',
      key: '右下至左上/右上',
      desc: '墨锋自下向上一挑，将正前方的敌人击飞至高空，可配合跳跃进行空战追斩。',
      color: 'text-[#16a34a] border-[#16a34a]/40 bg-[#16a34a]/10',
    },
    {
      hanzi: '圆',
      name: '浑元太极',
      strokeType: '画圆闭环「〇」',
      key: 'O 键',
      desc: '原地回旋旋舞水墨八卦阵，短暂无敌，反弹弹道箭矢并将贴身敌人震退。',
      color: 'text-[#7c3aed] border-[#7c3aed]/40 bg-[#7c3aed]/10',
    },
    {
      hanzi: '闪',
      name: '踏影瞬杀',
      strokeType: '折线闪电「Z」或「乛」',
      key: 'L 键',
      desc: '身形化为一道水墨残影穿透敌阵，处于无敌状态，并在敌人身后造成连续裂斩。',
      color: 'text-[#b91c1c] border-[#b91c1c]/40 bg-[#b91c1c]/10',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="max-w-2xl w-full bg-[#f4eedd] border border-[#b3a181] rounded-2xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#85745a] hover:text-[#2b2118] rounded-lg hover:bg-[#e0d5ba] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="text-xs font-ink-serif text-[#85745a] tracking-widest mb-1">
            墨家秘传 · 出招心法
          </div>
          <h2 className="text-2xl font-calligraphy text-[#2b2118] tracking-wider">
            武学招式与手势图录
          </h2>
        </div>

        {/* Partition / Full Gesture Control Explanation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 p-3.5 bg-[#ece3cd] rounded-xl border border-[#c4b494] text-xs font-ink-serif">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-[#b45309] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#92400e]">全屏跟手滑动 · 到达拔剑斩击</span>
              <p className="text-[#85745a] mt-0.5 leading-relaxed">
                手指在屏幕滑动即可极速紧密跟手位移（滑到哪角色就到哪），到达滑动终点后<strong className="text-[#0369a1]">自动拔剑释放斩击</strong>！攻击命中将使敌人陷入<strong className="text-[#dc2626]">【受击硬直（破势）】</strong>，打断敌人攻击并震颤击退；若直接划过敌人更可触发多目标<strong className="text-[#b91c1c]">【瞬杀连斩】</strong>！持有<strong className="text-[#7e22ce]">【画龙点睛】</strong>词条时，笔锋若精确划过妖敌头顶要穴，该击必定会心且伤害大增！
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Touchpad className="w-4 h-4 text-[#0369a1] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#2b2118]">自由切换 · 模式与键位双全</span>
              <p className="text-[#85745a] mt-0.5 leading-relaxed">
                可点击顶部【全屏瞬杀 / 分屏双控】按钮随时切换。支持键盘 WASD 纵深走位、空格轻功起跃，以及 J/U/I/O/L 快捷出招、ESC 暂停。
              </p>
            </div>
          </div>
        </div>

        {/* 实战要诀 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
          <div className="p-2.5 bg-[#f3e3da] rounded-lg border border-[#d9a29a] flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-[#dc2626] shrink-0 mt-0.5" />
            <div className="text-[10px] font-ink-serif text-[#85745a] leading-relaxed">
              <span className="text-[#b91c1c] font-semibold">前摇预警</span>：敌人出手前头顶亮起红色「！」并后坐蓄力——此刻挥剑打断即可反制其攻势！
            </div>
          </div>
          <div className="p-2.5 bg-[#dfe7ea] rounded-lg border border-[#a9c3d4] flex items-start gap-2">
            <Crown className="w-4 h-4 text-[#b45309] shrink-0 mt-0.5" />
            <div className="text-[10px] font-ink-serif text-[#85745a] leading-relaxed">
              <span className="text-[#b45309] font-semibold">Boss 三强线</span>：五折「墨煞先锋」突进快攻（橙圈预警可横向走位躲）；十折「墨煞宗师」震地（红圈预警）+墨珠散射+召唤；十五折「墨煞大帝」三阶段狂化——66% 狂暴、33% 入「灭」境解锁全场墨雨（连环橙圈），走位躲圈为上策！
            </div>
          </div>
          <div className="p-2.5 bg-[#e9e2f0] rounded-lg border border-[#c3aed6] flex items-start gap-2">
            <Skull className="w-4 h-4 text-[#7c3aed] shrink-0 mt-0.5" />
            <div className="text-[10px] font-ink-serif text-[#85745a] leading-relaxed">
              <span className="text-[#8b5cf6] font-semibold">精英精锐</span>：带光环词缀的精锐（迅捷/铁壁/狂暴/汲影）更强也更凶，斩杀可获高额功绩与墨意。
            </div>
          </div>
        </div>

        {/* 觉醒技提示条 */}
        <div className="p-2.5 mb-4 bg-[#fdf6e3] rounded-lg border border-[#d9a844] flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-[#b45309] shrink-0 mt-0.5" />
          <div className="text-[10px] font-ink-serif text-[#85745a] leading-relaxed">
            <span className="text-[#b45309] font-semibold">觉醒技·万墨归宗</span>：命中与击杀积累觉醒槽，满槽后按 <strong className="text-[#b45309]">[G]</strong> 或点「觉」按钮释放超大范围墨浪重创周身所有妖敌（可击穿墨盾武僧的正面格挡，对 Boss 与精英附加压制伤害，无双下连招链越高威力越猛），释放后短暂无敌——绝境反打与清场收割的底牌！
          </div>
        </div>

        {/* 无双演武模式说明 */}
        <div className="p-2.5 mb-4 bg-[#f6e2df] rounded-lg border border-[#b91c1c]/40 flex items-start gap-2">
          <Swords className="w-4 h-4 text-[#b91c1c] shrink-0 mt-0.5" />
          <div className="text-[10px] font-ink-serif text-[#85745a] leading-relaxed">
            <span className="text-[#b91c1c] font-semibold">无双演武模式</span>：标题界面可选。妖墨如怒潮般成群涌来（刷怪极密且成群压上），每隔一阵一尊墨煞拦路、五阵起双煞同临、十三阵起三煞齐临；敌单体更脆、连斩窗口更长——连击越高攻击越强（每连 +0.2%，上限 +30%）！<span className="text-[#b45309] font-semibold">连招链</span>：1.8 秒内连续出招叠链，交替不同招式（刺→横→劈→圆→闪）涨层更快，链层提高伤害与攻击范围，超时清零；<span className="text-[#b45309] font-semibold">斩罡余波</span>：每一击都荡开墨浪波及周身妖墨，任意招式皆是群体技。杀敌回墨大增、招式墨耗减半，尽情倾泻！二十五连「杀」、五十连「破」、百连「灭」触发全屏杀阵演出。无通关概念，以杀止杀，功绩与最深阵数独立计入「无双血录」。
          </div>
        </div>

        {/* 妖墨图鉴 */}
        <div className="mb-4">
          <div className="text-xs font-ink-serif text-[#85745a] tracking-widest mb-2 text-center">
            —— 妖墨图鉴 · 知彼方能破敌 ——
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-2.5 bg-[#f3e7d3] rounded-lg border border-[#d9b98a] flex items-start gap-2">
              <div className="text-[10px] font-ink-serif text-[#85745a] leading-relaxed">
                <span className="text-[#c2410c] font-semibold">爆墨傀儡</span>：焦褐圆肚高速冲锋，头顶亮「爆」即引信点燃——此刻速斩可<strong className="text-[#b45309]">「拆除」获额外功绩</strong>，或诱其自爆炸入敌阵！
              </div>
            </div>
            <div className="p-2.5 bg-[#e8ebee] rounded-lg border border-[#9aa8b8] flex items-start gap-2">
              <div className="text-[10px] font-ink-serif text-[#85745a] leading-relaxed">
                <span className="text-[#475569] font-semibold">墨盾武僧</span>：铁灰武僧正面持盾，<strong className="text-[#475569]">正面格挡八成伤害</strong>（硬打仅两成透伤，多磨几盾也能击破）——绕至身后全额伤害，或趁其头顶亮「！」收盾出招时反击破防！
              </div>
            </div>
            <div className="p-2.5 bg-[#e6ede4] rounded-lg border border-[#a3bfa0] flex items-start gap-2">
              <div className="text-[10px] font-ink-serif text-[#85745a] leading-relaxed">
                <span className="text-[#3d5a40] font-semibold">符笔妖道</span>：墨绿道袍远端施法，召唤墨卒护法并放出<strong className="text-[#3d5a40]">扇形追踪符珠</strong>（可走位甩开）——威胁最大，宜优先狙杀！
              </div>
            </div>
            <div className="p-2.5 bg-[#dfe8ee] rounded-lg border border-[#8fb0c4] flex items-start gap-2">
              <div className="text-[10px] font-ink-serif text-[#85745a] leading-relaxed">
                <span className="text-[#2f4858] font-semibold">飞白鹤</span>：靛青白鹤高空盘旋，普通招式够不到！趁它头顶亮「袭」俯冲时走位躲开，落地喘息或用<strong className="text-[#2f4858]">「挑」招将它击落</strong>再打！
              </div>
            </div>
            <div className="p-2.5 bg-[#e9e8e4] rounded-lg border border-[#a8a49b] flex items-start gap-2">
              <div className="text-[10px] font-ink-serif text-[#85745a] leading-relaxed">
                <span className="text-[#3b3a36] font-semibold">砚台龟</span>：背负砚台墨甲，龟甲竖起时受击会被<strong className="text-[#3b3a36]">反震 22% 伤害</strong>——趁它头顶亮「震」伸头出招时猛攻，或用反伤/觉醒技对付它！
              </div>
            </div>
            <div className="p-2.5 bg-[#f0e4e8] rounded-lg border border-[#c4a3b0] flex items-start gap-2">
              <div className="text-[10px] font-ink-serif text-[#85745a] leading-relaxed">
                <span className="text-[#5b2333] font-semibold">醉墨剑客</span>：酒褐剑客醉步摇摆逼近，挥击有 28% 概率被<strong className="text-[#5b2333]">「醉避」</strong>闪开（闪避后有冷却，不会连续触发）——趁它头顶亮「斩」出招后或「醉倒」踉跄时全力输出！
              </div>
            </div>
          </div>
        </div>

        {/* 6 Gesture Cards Scrollable */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mb-4">
          {moves.map((move) => (
            <div
              key={move.hanzi}
              className="flex items-start gap-3 p-3 bg-[#ece4d0] border border-[#c9b995] rounded-xl"
            >
              {/* Hanzi Seal */}
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center font-calligraphy text-2xl shrink-0 border ${move.color}`}
              >
                {move.hanzi}
              </div>

              {/* Move Info */}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-calligraphy text-base text-[#2b2118]">{move.name}</h4>
                  <div className="flex items-center gap-2 text-[11px] font-ink-serif text-[#85745a]">
                    <span>手势: {move.strokeType}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#4a3c2a] font-medium">{move.key}</span>
                  </div>
                </div>
                <p className="text-xs text-[#85745a] font-ink-serif mt-1 leading-relaxed">
                  {move.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#c4b494]">
          <span className="text-xs text-[#937f60] font-ink-serif flex items-center gap-1.5">
            <Pause className="w-3 h-3" />
            提示：利用W/S纵深走位躲箭与红圈，ESC随时暂停闭目回气
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#b91c1c] hover:bg-[#991b1b] text-[#f8f0dc] text-xs font-ink-serif rounded-lg transition-colors cursor-pointer"
          >
            领悟闭卷
          </button>
        </div>
      </div>
    </div>
  );
};

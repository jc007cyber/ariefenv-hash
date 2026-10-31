/**
 * Main Application Component: 墨痕武道 (Ink Martial Stickman)
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/engine';
import { HUD } from './components/HUD';
import { RoguelikeModal } from './components/RoguelikeModal';
import { ManualModal } from './components/ManualModal';
import { AffixDrawerModal } from './components/AffixDrawerModal';
import { GameOverModal } from './components/GameOverModal';
import { PauseOverlay } from './components/PauseOverlay';
import { TitleMenu } from './components/TitleMenu';
import { SaveManagerModal } from './components/SaveManagerModal';
import { Affix, BossHudInfo, ControlMode, Difficulty, GameMode, GestureResult, RunSnapshot, RunStats } from './types/game';
import { drawRandomAffixes } from './game/affixes';
import { sound } from './utils/audio';
import {
  PersistentRecords,
  clearRunSnapshot,
  loadRecords,
  loadRunSnapshot,
  saveRunStats,
  saveRunSnapshot,
} from './utils/storage';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // UI state
  const [gameState, setGameState] = useState<'TITLE' | 'PLAYING' | 'ROGUELIKE' | 'GAME_OVER'>('TITLE');
  const [controlMode, setControlMode] = useState<ControlMode>('FULL_GESTURE');
  const [hp, setHp] = useState<number>(120);
  const [maxHp, setMaxHp] = useState<number>(120);
  const [ink, setInk] = useState<number>(100);
  const [maxInk, setMaxInk] = useState<number>(100);
  const [shield, setShield] = useState<number>(0);
  const [shieldMax, setShieldMax] = useState<number>(0);
  const [wave, setWave] = useState<number>(1);
  const [waveTitle, setWaveTitle] = useState<string>('第一折 · 墨卒现世');
  const [enemiesLeft, setEnemiesLeft] = useState<number>(6);
  const [combo, setCombo] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(80);
  const [recentGesture, setRecentGesture] = useState<GestureResult | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [awakening, setAwakening] = useState<number>(0);
  const [awakeningMax, setAwakeningMax] = useState<number>(100);

  // 波次大字横幅
  const [banner, setBanner] = useState<{ title: string; isBossWave: boolean; key: number } | null>(null);
  // Boss 顶部血条
  const [bossInfo, setBossInfo] = useState<BossHudInfo | null>(null);

  // Modals
  const [showManual, setShowManual] = useState<boolean>(false);
  const [showAffixDrawer, setShowAffixDrawer] = useState<boolean>(false);
  const [roguelikeChoices, setRoguelikeChoices] = useState<Affix[]>([]);
  const [rerollsLeft, setRerollsLeft] = useState<number>(1);
  const [activeAffixes, setActiveAffixes] = useState<Affix[]>([]);
  const [finalStats, setFinalStats] = useState<RunStats | null>(null);
  const [isVictory, setIsVictory] = useState<boolean>(false);
  const [records, setRecords] = useState<PersistentRecords>(() => loadRecords());
  const [newRecord, setNewRecord] = useState<boolean>(false);
  // 本局难度：重开一局时按同难度重置初始血量（此前重开丢失难度加成，EASY/HARD 回退 120）
  const [difficulty, setDifficulty] = useState<Difficulty>('NORMAL');
  // 本局玩法模式：经典征战 / 无双演武（决定引擎刷怪/BOSS 节奏与结算记录分流）
  const [gameMode, setGameMode] = useState<GameMode>('CLASSIC');
  // 未完成征战认领（单局进度快照）：标题界面显示「续战」入口
  const [resumeSnapshot, setResumeSnapshot] = useState<RunSnapshot | null>(() => loadRunSnapshot());
  const [showSaveManager, setShowSaveManager] = useState<boolean>(false);

  // Initialize Canvas and Game Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const applySize = () => {
      engineRef.current?.setSize(window.innerWidth, window.innerHeight);
    };

    const engine = new GameEngine(canvas, {
      onHpChange: (newHp, newMaxHp) => {
        setHp(newHp);
        setMaxHp(newMaxHp);
      },
      onInkChange: (newInk, newMaxInk) => {
        setInk(newInk);
        setMaxInk(newMaxInk);
      },
      onShieldChange: (newShield, newShieldMax) => {
        setShield(newShield);
        setShieldMax(newShieldMax);
      },
      onWaveChange: (newWave, title, left) => {
        setWave(newWave);
        setWaveTitle(title);
        setEnemiesLeft(left);
      },
      onWaveBanner: (title, isBossWave) => {
        setBanner({ title, isBossWave, key: Date.now() });
      },
      onBossUpdate: (boss) => {
        setBossInfo(boss);
      },
      onComboChange: (newCombo) => {
        setCombo(newCombo);
      },
      onScoreChange: (newScore) => {
        setScore(newScore);
      },
      onGestureRecognized: (gesture) => {
        setRecentGesture(gesture);
        // Clear recent gesture popup after 1.8s
        setTimeout(() => {
          setRecentGesture((cur) => (cur?.hanzi === gesture.hanzi ? null : cur));
        }, 1800);
      },
      onWaveCleared: (choices) => {
        setRoguelikeChoices(choices);
        setRerollsLeft(1);
        setGameState('ROGUELIKE');
        engine.isPaused = true;
      },
      onGameOver: (stats, victory) => {
        setFinalStats(stats);
        setIsVictory(victory);
        setWave(stats.wave);
        const prev = loadRecords();
        setNewRecord(stats.score > prev.highScore);
        const updated = saveRunStats(stats, victory);
        setRecords(updated);
        clearRunSnapshot(); // 本局已终（阵亡/胜利/收笔），续战快照作废
        setResumeSnapshot(null);
        setGameState('GAME_OVER');
      },
      /** 自动存档：暂停时 / 每折开战时（App 层落盘 localStorage） */
      onAutoSave: (snap) => {
        saveRunSnapshot(snap);
        setResumeSnapshot(snap);
      },
      onPauseChange: (paused) => {
        setIsPaused(paused);
      },
      onAwakeningChange: (value, maxValue) => {
        setAwakening(value);
        setAwakeningMax(maxValue);
      },
      onControlModeChange: (mode) => {
        setControlMode(mode);
      },
    });

    engineRef.current = engine;
    applySize(); // 首帧立即定尺寸，后续 resize 防抖（移动端旋转/地址栏伸缩高频触发，
    // 每次都重建离屏图层缓存会掉帧）
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const handleResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = setTimeout(applySize, 120);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.clearTimeout(resizeTimer);
      // destroy = stop + 移除全部引擎事件监听：防组件卸载后僵尸监听器持有整个引擎（内存泄漏）
      engine.destroy();
    };
  }, []);

  // 波次横幅自动消退
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 2400);
    return () => clearTimeout(t);
  }, [banner]);

  // 杀后台兑底存档：玩家可能不是退到后台而是直接杀掉进程/网页，
  // visibilitychange(hidden) + pagehide 是最后的写入时机（iOS/Android 均可靠）
  useEffect(() => {
    const saveNow = () => {
      const eng = engineRef.current;
      // 引擎侧判断而非 gameState 闭包，避开陈旧 state：
      // 局内且未结束才落盘（结算/标题态不覆盖快照）
      if (eng && eng.hasStartedRun && !eng.runEnded) {
        saveRunSnapshot(eng.exportSnapshot());
      }
    };
    const onVisChange = () => {
      if (document.visibilityState === 'hidden') saveNow();
    };
    document.addEventListener('visibilitychange', onVisChange);
    window.addEventListener('pagehide', saveNow);
    return () => {
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('pagehide', saveNow);
    };
  }, []);

  // 按难度应用初始血量（开局与重开共用；此前重开不重设，EASY/HARD 难度加成丢失）
  const applyDifficultyHp = (d: Difficulty) => {
    const engine = engineRef.current;
    if (!engine) return;
    if (d === 'EASY') {
      engine.player.hp = 180;
      engine.player.maxHp = 180;
      setHp(180);
      setMaxHp(180);
    } else if (d === 'HARD') {
      engine.player.hp = 90;
      engine.player.maxHp = 90;
      setHp(90);
      setMaxHp(90);
    } else if (d === 'EXTREME') {
      // 天劫墨难：九死一生，初始气血仅 70——一笔之差便是身陨道消
      engine.player.hp = 70;
      engine.player.maxHp = 70;
      setHp(70);
      setMaxHp(70);
    } else {
      setHp(engine.player.hp);
      setMaxHp(engine.player.maxHp);
    }
  };

  const handleStartGame = (d: Difficulty, mode: GameMode = 'CLASSIC') => {
    if (!engineRef.current) return;
    const engine = engineRef.current;
    sound.unlock();
    // 单槽存档语义：主动开新局即放弃旧未竟之局（标题「续战」按钮是认领旧局的正路，
    // 防止旧档被新局首个存档点静默顶掉）
    clearRunSnapshot();
    setResumeSnapshot(null);
    engine.setGameMode(mode); // 先设模式再 resetGame：resetGame 内 startWave(1) 依赖 gameMode 生成阵次
    engine.resetGame();
    engine.setDifficulty(d);
    engine.markRunStarted();
    setDifficulty(d);
    setGameMode(mode);
    applyDifficultyHp(d);

    setShield(0);
    setShieldMax(0);
    setActiveAffixes([]);
    setBossInfo(null);
    setIsPaused(false);
    setGameState('PLAYING');
    engine.start();
  };

  const handleRestart = () => {
    if (!engineRef.current) return;
    const engine = engineRef.current;
    engine.resetGame();
    engine.setDifficulty(difficulty); // resetGame 会重建 player，难度同步重设（gameMode 保留原局模式）
    engine.markRunStarted();
    applyDifficultyHp(difficulty);
    setActiveAffixes([]);
    setBossInfo(null);
    setIsPaused(false);
    setGameState('PLAYING');
    engine.start();
  };

  const handleContinueEndless = () => {
    if (!engineRef.current) return;
    const engine = engineRef.current;
    engine.continueEndless();
    setIsPaused(false);
    setGameState('PLAYING');
  };

  /** 续战：从单局快照恢复（该折开头重打，词条/计分/难度全量还原） */
  const handleResumeRun = () => {
    const eng = engineRef.current;
    if (!eng || !resumeSnapshot) return;
    sound.unlock();
    eng.restoreFromSnapshot(resumeSnapshot);
    setDifficulty(resumeSnapshot.difficulty);
    setGameMode(resumeSnapshot.mode ?? 'CLASSIC'); // 旧快照无 mode 字段视为经典
    setActiveAffixes([...resumeSnapshot.player.affixes]);
    setBossInfo(null);
    setIsPaused(false);
    setGameState('PLAYING');
    eng.start(); // 已在跑则幂等
  };

  const handleBackToTitle = () => {
    if (!engineRef.current) return;
    engineRef.current.isPaused = true;
    engineRef.current.resetGame();
    setIsPaused(false);
    setBossInfo(null);
    // 重新读取快照（不主动清——玩家暂停存下的「续战第N折」应能在标题认领）
    setResumeSnapshot(loadRunSnapshot());
    setGameState('TITLE');
  };

  const handleSelectAffix = (affix: Affix) => {
    if (!engineRef.current) return;
    const engine = engineRef.current;
    const player = engine.player;
    player.affixes.push(affix);
    sound.playAffixPick();

    // Apply immediate stat upgrades if any
    if (affix.stats.maxHpBonus) {
      player.maxHp += affix.stats.maxHpBonus;
      player.hp = Math.min(player.maxHp, player.hp + affix.stats.maxHpBonus);
      setHp(player.hp);
      setMaxHp(player.maxHp);
    }

    setActiveAffixes([...player.affixes]);
    engine.confirmAffixPick(); // 清弹窗锁 + 恢复战斗（同步 onPauseChange）
    setGameState('PLAYING');

    // Advance to next wave（用引擎权威波号，防 React state 闭包过期导致跳波/重波）
    engine.startWave(engine.wave + 1);
  };

  const handleRerollAffixes = () => {
    if (!engineRef.current || rerollsLeft <= 0) return;
    const engine = engineRef.current;
    const newChoices = drawRandomAffixes(engine.player.affixes, 3, engine.wave);
    setRoguelikeChoices(newChoices);
    setRerollsLeft((n) => n - 1);
  };

  /** 就此收笔：暂停菜单「结束本局」→ 保留战绩并展示收笔小结局 */
  const handleEndRun = () => {
    engineRef.current?.endRunVoluntarily();
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    sound.setMuted(nextMuted);
    setIsMuted(nextMuted);
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    sound.setVolume(v);
    if (v > 0 && isMuted) {
      sound.setMuted(false);
      setIsMuted(false);
    }
  };

  const handleToggleControlMode = () => {
    if (!engineRef.current) return;
    const nextMode = controlMode === 'FULL_GESTURE' ? 'SPLIT_SCREEN' : 'FULL_GESTURE';
    engineRef.current.setControlMode(nextMode);
    setControlMode(nextMode);
  };

  const handleTogglePause = () => {
    engineRef.current?.togglePause();
  };

  const handleTriggerMove = (type: 'TAP' | 'HORIZONTAL' | 'VERTICAL_DOWN' | 'DIAGONAL_UP' | 'CIRCLE' | 'ZIGZAG') => {
    if (engineRef.current && gameState === 'PLAYING' && !isPaused) {
      engineRef.current.triggerGestureDirect(type);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#e9e1cf] select-none touch-none">
      {/* Primary Pseudo-3D HTML5 Canvas */}
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-crosshair"
      />

      {/* Title Menu */}
      {gameState === 'TITLE' && (
        <TitleMenu
          onStart={handleStartGame}
          onOpenManual={() => setShowManual(true)}
          onOpenSaveManager={() => setShowSaveManager(true)}
          onResumeRun={resumeSnapshot ? handleResumeRun : undefined}
          resumeWave={resumeSnapshot?.wave}
          resumeMode={resumeSnapshot?.mode ?? 'CLASSIC'}
          records={records}
        />
      )}

      {/* Main HUD */}
      {gameState === 'PLAYING' && (
        <HUD
          hp={hp}
          maxHp={maxHp}
          ink={ink}
          maxInk={maxInk}
          shield={shield}
          shieldMax={shieldMax}
          wave={wave}
          waveTitle={waveTitle}
          enemiesLeft={enemiesLeft}
          combo={combo}
          score={score}
          gameMode={gameMode}
          isMuted={isMuted}
          volume={volume}
          onVolumeChange={handleVolumeChange}
          onToggleMute={handleToggleMute}
          onOpenManual={() => setShowManual(true)}
          onOpenAffixes={() => setShowAffixDrawer(true)}
          activeAffixes={activeAffixes}
          recentGesture={recentGesture}
          onTriggerMove={handleTriggerMove}
          onTriggerJump={() => engineRef.current?.triggerJump()}
          onTriggerAwakening={() => engineRef.current?.triggerAwakening()}
          awakening={awakening}
          awakeningMax={awakeningMax}
          controlMode={controlMode}
          onToggleControlMode={handleToggleControlMode}
          onTogglePause={handleTogglePause}
          isPaused={isPaused}
          bossInfo={bossInfo}
          banner={banner}
        />
      )}

      {/* 波次开场大字横幅 */}
      {gameState === 'PLAYING' && banner && (
        <div
          key={banner.key}
          className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
        >
          <div className="text-center animate-in fade-in zoom-in-95 duration-500" style={{ animationDirection: 'normal' }}>
            <div
              className={`font-calligraphy tracking-[0.2em] drop-shadow-[0_4px_18px_rgba(88,68,40,0.35)] ${
                banner.isBossWave ? 'text-5xl sm:text-6xl text-[#dc2626]' : 'text-4xl sm:text-5xl text-[#2b2118]'
              }`}
            >
              {banner.title}
            </div>
            <div className={`mt-3 h-px w-40 mx-auto ${banner.isBossWave ? 'bg-[#dc2626]/60' : 'bg-[#2b2118]/40'}`} />
            <div className={`mt-2 text-xs font-ink-serif tracking-[0.5em] ${banner.isBossWave ? 'text-[#b91c1c]' : 'text-[#85745a]'}`}>
              {banner.isBossWave ? '宗 师 临 世 · 险 中 求 胜' : '挥 毫 落 剑 · 墨 起 风 云'}
            </div>
          </div>
        </div>
      )}

      {/* Roguelike 3-Choice Upgrade Modal */}
      {gameState === 'ROGUELIKE' && (
        <RoguelikeModal
          affixes={roguelikeChoices}
          onSelect={handleSelectAffix}
          onReroll={handleRerollAffixes}
          rerollsLeft={rerollsLeft}
          wave={wave}
          gameMode={gameMode}
        />
      )}

      {/* Game Over / Victory Modal */}
      {gameState === 'GAME_OVER' && finalStats && (
        <GameOverModal
          stats={finalStats}
          isVictory={isVictory}
          isNewRecord={newRecord}
          onRestart={handleRestart}
          onContinueEndless={isVictory ? handleContinueEndless : undefined}
        />
      )}

      {/* Pause Overlay */}
      {gameState === 'PLAYING' && isPaused && (
        <PauseOverlay
          onResume={handleTogglePause}
          onRestart={handleRestart}
          onEndRun={handleEndRun}
          onBackToTitle={handleBackToTitle}
          waveTitle={waveTitle}
          score={score}
        />
      )}

      {/* Martial Arts Manual Modal */}
      {showManual && (
        <ManualModal onClose={() => setShowManual(false)} />
      )}

      {/* 存档管理：记录导入导出 / 快照认领 / 清档 */}
      {showSaveManager && (
        <SaveManagerModal
          records={records}
          snapshot={resumeSnapshot}
          onClose={() => setShowSaveManager(false)}
          onRecordsChanged={(rec, snap) => {
            setRecords(rec);
            setResumeSnapshot(snap);
          }}
          onResumeRun={() => {
            setShowSaveManager(false);
            handleResumeRun();
          }}
        />
      )}

      {/* Active Affixes Inventory Modal */}
      {showAffixDrawer && (
        <AffixDrawerModal
          affixes={activeAffixes}
          onClose={() => setShowAffixDrawer(false)}
        />
      )}
    </div>
  );
}

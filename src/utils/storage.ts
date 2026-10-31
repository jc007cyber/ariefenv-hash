/**
 * Persistent Storage via localStorage
 * v2: 战绩记录 + 单局进度快照（暂停/波次/切后台自动存档）+ 导入导出
 */

import { PersistentRecords, RunSnapshot, RunStats } from '../types/game';

export type { PersistentRecords, RunSnapshot };

const STORAGE_KEY = 'ink_martial_records_v1';
const SNAPSHOT_KEY = 'ink_martial_run_snapshot_v1';

/** 快照格式版本：字段结构变更时递增，旧档自动弃用 */
export const SNAPSHOT_VERSION = 1;

/** 导出文件标识：导入时校验，防误导入无关 JSON */
const EXPORT_APP_ID = 'ink-martial-roguelike';

const DEFAULT_RECORDS: PersistentRecords = {
  highScore: 0,
  bestWave: 0,
  totalKills: 0,
  totalRuns: 0,
  victories: 0,
  lastPlayedAt: 0,
  musouHighScore: 0,
  musouBestWave: 0,
};

export function loadRecords(): PersistentRecords {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_RECORDS };
    const parsed = JSON.parse(raw) as Partial<PersistentRecords>;
    return {
      ...DEFAULT_RECORDS,
      ...parsed,
      highScore: Math.max(0, Number(parsed.highScore) || 0),
      bestWave: Math.max(0, Number(parsed.bestWave) || 0),
      totalKills: Math.max(0, Number(parsed.totalKills) || 0),
      totalRuns: Math.max(0, Number(parsed.totalRuns) || 0),
      victories: Math.max(0, Number(parsed.victories) || 0),
      musouHighScore: Math.max(0, Number(parsed.musouHighScore) || 0),
      musouBestWave: Math.max(0, Number(parsed.musouBestWave) || 0),
    };
  } catch {
    return { ...DEFAULT_RECORDS };
  }
}

export function saveRunStats(stats: RunStats, isVictory: boolean): PersistentRecords {
  const records = loadRecords();
  // 无双模式独立计入无双榜（无通关概念，isVictory 恒 false）；经典榜不受影响
  const isMusou = stats.mode === 'MUSOU';
  const updated: PersistentRecords = {
    highScore: Math.max(records.highScore, isMusou ? 0 : stats.score),
    bestWave: Math.max(records.bestWave, isMusou ? 0 : stats.wave),
    totalKills: records.totalKills + stats.kills,
    totalRuns: records.totalRuns + 1,
    victories: records.victories + (isVictory ? 1 : 0),
    lastPlayedAt: Date.now(),
    musouHighScore: Math.max(records.musouHighScore, isMusou ? stats.score : 0),
    musouBestWave: Math.max(records.musouBestWave, isMusou ? stats.wave : 0),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // storage unavailable (private mode etc.) — silently ignore
  }
  return updated;
}

export function resetRecords(): PersistentRecords {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SNAPSHOT_KEY); // 全清时未完成征战认领一并作废
  } catch {
    // ignore
  }
  return { ...DEFAULT_RECORDS };
}

/** 格式化生存时长 mm:ss */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// --- 单局进度快照 ---

/** 落盘单局快照（覆盖旧快照；失败静默，如隐私模式配额不可用） */
export function saveRunSnapshot(snap: RunSnapshot): void {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snap));
  } catch {
    // storage unavailable / quota exceeded — silently ignore
  }
}

/** 结构校验：版本不符或关键字段缺失即视为损坏，返回 null */
export function loadRunSnapshot(): RunSnapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<RunSnapshot>;
    if (
      p.version !== SNAPSHOT_VERSION ||
      typeof p.wave !== 'number' || p.wave < 1 || p.wave > 999 ||
      typeof p.score !== 'number' ||
      typeof p.savedAt !== 'number' ||
      !p.player || typeof p.player.hp !== 'number' ||
      !Array.isArray(p.player.affixes) ||
      !p.stats || typeof p.stats.kills !== 'number'
    ) {
      return null;
    }
    return p as RunSnapshot;
  } catch {
    return null;
  }
}

export function clearRunSnapshot(): void {
  try {
    localStorage.removeItem(SNAPSHOT_KEY);
  } catch {
    // ignore
  }
}

// --- 导入导出 ---

/** 导出 payload 结构（带 app 标识与版本，向前兼容） */
export interface SaveExportPayload {
  app: string;
  version: number;
  exportedAt: number;
  records: PersistentRecords;
  snapshot: RunSnapshot | null;
}

/** 构建导出 JSON 字符串：战绩记录 + 未完成单局快照一并带出 */
export function buildExportPayload(): string {
  const payload: SaveExportPayload = {
    app: EXPORT_APP_ID,
    version: 1,
    exportedAt: Date.now(),
    records: loadRecords(),
    snapshot: loadRunSnapshot(),
  };
  return JSON.stringify(payload, null, 2);
}

/** 生成导出文件名：ink-martial-save-20261005-1000.json */
export function buildExportFilename(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `ink-martial-save-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
}

export interface ImportResult {
  records?: PersistentRecords;
  snapshot?: RunSnapshot | null;
  error?: string;
}

/** 解析并应用导入档：记录智能合并（各指标取大，防重复累计），快照仅在本地没有或更新时替换 */
export function applyImportedPayload(raw: string): ImportResult {
  let p: Partial<SaveExportPayload>;
  try {
    p = JSON.parse(raw) as Partial<SaveExportPayload>;
  } catch {
    return { error: '文件不是有效的 JSON 存档' };
  }
  if (p.app !== EXPORT_APP_ID) {
    return { error: '不是「墨痕武道」的存档文件' };
  }
  if (!p.records || typeof p.records !== 'object') {
    return { error: '存档缺少战绩记录数据' };
  }
  const incoming = p.records;
  const local = loadRecords();
  // 智能合并：峰值类取大；累计类（场次/击杀/问鼎）也取大而非相加——
  // 同一段游玩历史可能被两台设备各自累计过，相加会重复计数
  const merged: PersistentRecords = {
    highScore: Math.max(local.highScore, Number(incoming.highScore) || 0),
    bestWave: Math.max(local.bestWave, Number(incoming.bestWave) || 0),
    totalKills: Math.max(local.totalKills, Number(incoming.totalKills) || 0),
    totalRuns: Math.max(local.totalRuns, Number(incoming.totalRuns) || 0),
    victories: Math.max(local.victories, Number(incoming.victories) || 0),
    lastPlayedAt: Math.max(local.lastPlayedAt, Number(incoming.lastPlayedAt) || 0),
    musouHighScore: Math.max(local.musouHighScore, Number(incoming.musouHighScore) || 0),
    musouBestWave: Math.max(local.musouBestWave, Number(incoming.musouBestWave) || 0),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    return { error: '本地存储不可用，无法写入' };
  }

  // 快照：本地没有未完成征战认领时，导入的快照可以直接认领续战
  let snapshot: RunSnapshot | null | undefined;
  if (p.snapshot && loadRunSnapshot() === null) {
    try {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(p.snapshot));
      snapshot = loadRunSnapshot();
      if (snapshot === null) {
        // 校验不过（版本不符等）→ 回滚，不影响其余导入成果
        localStorage.removeItem(SNAPSHOT_KEY);
      }
    } catch {
      // 快照写失败不阻断导入
    }
  }
  return { records: merged, snapshot };
}

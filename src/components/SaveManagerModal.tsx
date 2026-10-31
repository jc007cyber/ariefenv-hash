/**
 * 存档管理弹窗
 * v1: 战绩记录总览 / 未完成征战认领（续战快照）/ 存档导入导出 / 清空记录
 */

import React, { useRef, useState } from 'react';
import { X, Download, Upload, Trash2, Feather, AlertTriangle, CheckCircle2, Database } from 'lucide-react';
import { PersistentRecords, RunSnapshot } from '../types/game';
import {
  applyImportedPayload,
  buildExportFilename,
  buildExportPayload,
  clearRunSnapshot,
  formatDuration,
  resetRecords,
} from '../utils/storage';

interface SaveManagerModalProps {
  records: PersistentRecords;
  snapshot: RunSnapshot | null;
  onClose: () => void;
  /** 导入/删除/清空后同步 App 状态（records 永远有值；snapshot 可为 null） */
  onRecordsChanged: (records: PersistentRecords, snapshot: RunSnapshot | null) => void;
  /** 从快照认领续战 */
  onResumeRun: () => void;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  EASY: '初入江湖',
  NORMAL: '炉火纯青',
  HARD: '宗师绝顶',
  EXTREME: '天劫墨难',
};

export const SaveManagerModal: React.FC<SaveManagerModalProps> = ({
  records,
  snapshot,
  onClose,
  onRecordsChanged,
  onResumeRun,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [confirmWipe, setConfirmWipe] = useState<boolean>(false);

  const handleExport = () => {
    try {
      const blob = new Blob([buildExportPayload()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = buildExportFilename();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // 留一帧再回收，避免个别移动端浏览器取消下载
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage({ kind: 'ok', text: '存档已导出，请妥善保管该 JSON 文件' });
    } catch {
      setMessage({ kind: 'err', text: '导出失败：浏览器拒绝了下载请求' });
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 允许重复选择同一文件
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = applyImportedPayload(String(reader.result ?? ''));
      if (result.error) {
        setMessage({ kind: 'err', text: `导入失败：${result.error}` });
        return;
      }
      onRecordsChanged(
        result.records ?? records,
        result.snapshot !== undefined ? result.snapshot ?? null : snapshot,
      );
      setMessage({ kind: 'ok', text: '导入成功：战绩已合并入库' + (result.snapshot ? '，并认领了未竟之局' : '') });
    };
    reader.onerror = () => setMessage({ kind: 'err', text: '读取文件失败，请重试' });
    reader.readAsText(file);
  };

  const handleDeleteSnapshot = () => {
    clearRunSnapshot();
    onRecordsChanged(records, null);
    setMessage({ kind: 'ok', text: '未竟之局已作废' });
  };

  const handleWipe = () => {
    if (!confirmWipe) {
      setConfirmWipe(true);
      return;
    }
    const fresh = resetRecords();
    onRecordsChanged(fresh, null);
    setConfirmWipe(false);
    setMessage({ kind: 'ok', text: '全部记录与快照已清空' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="max-w-md w-full bg-[#f4eedd] border border-[#b3a181] rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-[#ece4d0] hover:bg-[#ddd2b6] text-[#5a4a34] transition-colors cursor-pointer"
          aria-label="关闭"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="text-xs font-ink-serif text-[#85745a] tracking-[0.4em] mb-1">墨 迹 归 档</div>
        <h2 className="text-2xl font-calligraphy text-[#2b2118] tracking-widest mb-5">存档管理</h2>

        {/* 提示条 */}
        {message && (
          <div
            className={`mb-4 px-3 py-2 rounded-lg border text-xs font-ink-serif flex items-center gap-1.5 ${
              message.kind === 'ok'
                ? 'bg-[#e7f0e4] border-[#7ba05b]/50 text-[#4a6741]'
                : 'bg-[#f6e2df] border-[#b91c1c]/40 text-[#991b1b]'
            }`}
          >
            {message.kind === 'ok' ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* 未竟之局（单局进度快照） */}
        <div className="mb-4 p-3.5 bg-[#ece3cd] rounded-xl border border-[#c4b494]">
          <div className="flex items-center gap-1.5 text-[10px] font-ink-serif text-[#85745a] tracking-[0.3em] mb-2">
            <Feather className="w-3 h-3" />
            <span>未竟之局 · 单局进度</span>
          </div>
          {snapshot ? (
            <div className="flex items-center justify-between gap-3">
              <div className="text-left">
                <div className="text-sm font-calligraphy text-[#2b2118]">
                  {snapshot.mode === 'MUSOU' ? `无双第${snapshot.wave}阵` : `第${snapshot.wave}折`} · {DIFFICULTY_LABEL[snapshot.difficulty] ?? '炉火纯青'}
                  {snapshot.endlessMode && <span className="ml-1 text-[#7c3aed] text-xs">无尽</span>}
                </div>
                <div className="text-[10px] font-ink-serif text-[#937f60] mt-0.5">
                  功绩 {snapshot.score} · 斩敌 {snapshot.stats.kills} · {formatDuration(snapshot.elapsedSec)}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={onResumeRun}
                  className="px-3 py-1.5 bg-[#1a1611] hover:bg-[#2b2118] text-[#f0e6c8] font-ink-serif text-xs rounded-lg transition-colors cursor-pointer"
                >
                  续战
                </button>
                <button
                  onClick={handleDeleteSnapshot}
                  className="px-2.5 py-1.5 bg-[#f6e2df] hover:bg-[#efd0cc] text-[#991b1b] font-ink-serif text-xs rounded-lg border border-[#b91c1c]/30 transition-colors cursor-pointer"
                  aria-label="作废此快照"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-[11px] font-ink-serif text-[#937f60] py-1">
              暂无进行中的征途——局内暂停、每折开战、切后台时都会自动落盘
            </div>
          )}
        </div>

        {/* 战绩记录总览 */}
        <div className="mb-4 p-3.5 bg-[#ece4d0] rounded-xl border border-[#c4b494]">
          <div className="flex items-center gap-1.5 text-[10px] font-ink-serif text-[#85745a] tracking-[0.3em] mb-2.5">
            <Database className="w-3 h-3" />
            <span>江湖行录 · 战绩记录</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-sm font-calligraphy text-[#b45309] tabular-nums leading-none">{records.highScore}</div>
              <div className="text-[9px] font-ink-serif text-[#937f60] mt-1">最高功绩</div>
            </div>
            <div>
              <div className="text-sm font-calligraphy text-[#0284c7] tabular-nums leading-none">第{records.bestWave}折</div>
              <div className="text-[9px] font-ink-serif text-[#937f60] mt-1">最远征程</div>
            </div>
            <div>
              <div className="text-sm font-calligraphy text-[#b91c1c] tabular-nums leading-none">{records.totalKills}</div>
              <div className="text-[9px] font-ink-serif text-[#937f60] mt-1">累计斩敌</div>
            </div>
            <div>
              <div className="text-sm font-calligraphy text-[#dc2626] tabular-nums leading-none">{records.musouHighScore}</div>
              <div className="text-[9px] font-ink-serif text-[#937f60] mt-1">无双最高功绩</div>
            </div>
            <div>
              <div className="text-sm font-calligraphy text-[#dc2626] tabular-nums leading-none">第{records.musouBestWave}阵</div>
              <div className="text-[9px] font-ink-serif text-[#937f60] mt-1">无双最深血战</div>
            </div>
            <div>
              <div className="text-sm font-calligraphy text-[#2b2118] tabular-nums leading-none">{records.totalRuns}</div>
              <div className="text-[9px] font-ink-serif text-[#937f60] mt-1">入局次数</div>
            </div>
            <div>
              <div className="text-sm font-calligraphy text-[#8b5cf6] tabular-nums leading-none">{records.victories}</div>
              <div className="text-[9px] font-ink-serif text-[#937f60] mt-1">问鼎次数</div>
            </div>
            <div>
              <div className="text-sm font-calligraphy text-[#5a4a34] tabular-nums leading-none">
                {records.lastPlayedAt > 0 ? new Date(records.lastPlayedAt).toLocaleDateString('zh-CN') : '—'}
              </div>
              <div className="text-[9px] font-ink-serif text-[#937f60] mt-1">最近落笔</div>
            </div>
          </div>
        </div>

        {/* 导入导出 */}
        <div className="flex gap-2.5 mb-4">
          <button
            onClick={handleExport}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#ded3b8] hover:bg-[#d8c9aa] text-[#4a3c2a] font-ink-serif text-sm rounded-xl border border-[#b3a181] transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#0369a1]" />
            <span>导出存档</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#ded3b8] hover:bg-[#d8c9aa] text-[#4a3c2a] font-ink-serif text-sm rounded-xl border border-[#b3a181] transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 text-[#b45309]" />
            <span>导入存档</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>
        <div className="text-[10px] font-ink-serif text-[#937f60] leading-relaxed mb-4">
          导出为 JSON 文件（含战绩记录与未竟之局），可跨设备备份或转移；导入时战绩取两边更优者合并，快照仅在本地没有进行中的征途时认领。
        </div>

        {/* 清空记录 */}
        <button
          onClick={handleWipe}
          className={`w-full flex items-center justify-center gap-1.5 py-2 font-ink-serif text-xs rounded-xl border transition-colors cursor-pointer ${
            confirmWipe
              ? 'bg-[#b91c1c] hover:bg-[#991b1b] text-[#f8f0dc] border-[#b91c1c]'
              : 'bg-[#f6e2df] hover:bg-[#efd0cc] text-[#991b1b] border-[#b91c1c]/30'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{confirmWipe ? '再点一次确认：清空全部记录与快照' : '清空全部记录'}</span>
        </button>
      </div>
    </div>
  );
};

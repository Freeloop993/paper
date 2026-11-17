import React from 'react';
import { Download, Plane, RefreshCw, Undo2, WifiOff } from 'lucide-react';
import { useDroneStore } from '../../store/droneStore';
import { APP_VERSION, exportAll } from '../../design/exporters';

const Header: React.FC = () => {
  const { undo, history, resetToDefaults, parameters, touched, intent, pinned, lastChange, exportNote, setNotice } = useDroneStore();
  const exportNow = () => {
    const c = exportAll({ parameters, touched, intent }, { note: exportNote, pinned, lastChange: lastChange && { path: lastChange.path, label: lastChange.label, from: lastChange.from, to: lastChange.to } });
    setNotice(`已导出同一时间戳的三个文件：${c.files.guide}、${c.files.prompt}、${c.files.config}`);
  };
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
        <Plane className="h-6 w-6 shrink-0 text-primary-600" />
        <h1 className="text-base font-bold text-slate-900 sm:text-lg">无人机造型配置器</h1>
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs text-slate-600" title="模型生图与向量检索均停用；本页只做选择、预览、比较和导出">
          <WifiOff className="h-3 w-3" />模型服务停用 · 离线
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <button type="button" onClick={exportNow} data-testid="export-all-header" title="点线图、提示词、配置 JSON，同一时间戳"
            className="inline-flex items-center gap-1 rounded-md border border-primary-600 bg-primary-600 px-2 py-1 text-sm font-medium text-white hover:bg-primary-700">
            <Download className="h-4 w-4" />导出三件
          </button>
          <button type="button" onClick={undo} disabled={!history.length} data-testid="undo"
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:border-primary-500 disabled:opacity-40">
            <Undo2 className="h-4 w-4" />撤销上一步
          </button>
          <button type="button" onClick={resetToDefaults} data-testid="reset"
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:border-primary-500">
            <RefreshCw className="h-4 w-4" />全部重置
          </button>
          <span className="hidden text-xs text-slate-400 sm:inline">v{APP_VERSION}</span>
        </span>
      </div>
    </header>
  );
};

export default Header;

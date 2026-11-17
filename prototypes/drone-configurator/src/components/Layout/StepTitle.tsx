import React from 'react';

/** 带序号的区块标题：① 设计意图 → ② 部件参数 → ③ 确认与导出。 */
export const StepTitle: React.FC<{ n: number; title: string; en?: string; children?: React.ReactNode }> = ({ n, title, en, children }) => (
  <div>
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white">{n}</span>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {en && <span className="text-sm text-slate-400">{en}</span>}
    </div>
    {children && <p className="mt-1 text-sm text-slate-500">{children}</p>}
  </div>
);

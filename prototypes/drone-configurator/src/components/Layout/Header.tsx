import React from 'react';
import { Plane } from 'lucide-react';
import { APP_VERSION } from '../../design/exporters';

const Header: React.FC = () => (
  <header className="border-b border-slate-200 bg-white shadow-sm">
    <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-3 sm:px-4">
      <Plane className="h-8 w-8 shrink-0 text-primary-600" />
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold leading-tight text-slate-900">无人机造型配置器</h1>
        <p className="truncate text-xs text-slate-500">日常随行航拍四旋翼 · 参数化造型规格</p>
      </div>
      <span className="ml-auto hidden rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 sm:inline" title="模型生图与评论检索都没有接入；本页用于选择、预览和导出">模型服务未接入</span>
      <span className="text-sm text-slate-400">v{APP_VERSION}</span>
    </div>
  </header>
);

export default Header;

import React from 'react';
import { Plane } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <Plane className="h-8 w-8 text-primary-600" />
            <h1 className="text-xl font-bold text-slate-900">
              交互式无人机造型参数化AI生图
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-500">
              v1.0.0
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-800 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <p className="text-sm">
            © 2024 无人机参数化AI生图工具. All rights reserved.
          </p>
          <p className="text-sm">
            Powered by ComfyUI & ControlNet
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 
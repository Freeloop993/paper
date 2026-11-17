import React from 'react';

const Footer: React.FC = () => (
  <footer className="mt-4 bg-slate-800 text-slate-300">
    <div className="mx-auto max-w-7xl px-4 py-5 text-sm">
      <p>毫米数都是设计值；出图后的轴心与比例需要在回图上另行量测。</p>
      <p className="mt-1 text-slate-400">评论依据取自仓库公开的 36 张短引文卡，不含原评论。</p>
    </div>
  </footer>
);

export default Footer;

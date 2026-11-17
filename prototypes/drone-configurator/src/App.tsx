import React, { useState } from 'react';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import FrameParameters from './components/Parameters/FrameParameters';
import PropulsionParameters from './components/Parameters/PropulsionParameters';
import FuselageParameters from './components/Parameters/FuselageParameters';
import LandingGearParameters from './components/Parameters/LandingGearParameters';
import AccessoriesParameters from './components/Parameters/AccessoriesParameters';
import ImagePreview from './components/ImagePreview/ImagePreview';
import ParameterOverview from './components/Overview/ParameterOverview';
import InterfacePreview from './components/DevPreview/InterfacePreview';
import PromptGenerator from './components/DevPreview/PromptGenerator';
import { useDroneStore } from './store/droneStore';
import { Settings, RefreshCw, Zap, Box, Anchor, Camera, Sparkles } from 'lucide-react';

type TabType = 'frame' | 'propulsion' | 'fuselage' | 'landing' | 'accessories';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('frame');
  const { resetToDefaults } = useDroneStore();

  const tabs = [
    { id: 'frame', label: '机架', icon: Settings },
    { id: 'propulsion', label: '动力', icon: Zap },
    { id: 'fuselage', label: '机身', icon: Box },
    { id: 'landing', label: '起落架', icon: Anchor },
    { id: 'accessories', label: '配件', icon: Camera },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div id="drone-configurator-app" className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* 左侧：参数控制面板 */}
          <div className="xl:col-span-2 space-y-6">
            {/* 选项卡导航 */}
            <div className="card">
              <div className="flex flex-wrap gap-2 mb-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-6">
                {activeTab === 'frame' && <FrameParameters />}
                {activeTab === 'propulsion' && <PropulsionParameters />}
                {activeTab === 'fuselage' && <FuselageParameters />}
                {activeTab === 'landing' && <LandingGearParameters />}
                {activeTab === 'accessories' && <AccessoriesParameters />}
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-slate-900">AI智能优化</h3>
              </div>
              <p className="text-sm text-slate-600">模型服务未接入。可在「Prompt生成器」查看、复制和下载当前参数生成的文字。</p>
            </div>

            {/* 操作按钮 */}
            <div className="card">
              <div className="flex flex-wrap gap-4">
                <button
                  disabled title="模型服务未接入"
                  className="btn-primary flex items-center space-x-2"
                >
                  <Zap className="h-4 w-4" />
                  <span>生成图像</span>
                </button>
                
                <button
                  onClick={resetToDefaults}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>重置参数</span>
                </button>
              </div>
              
            </div>
          </div>

          {/* 右侧：预览和概览 - 等高布局 */}
          <div className="space-y-6">
            {/* 图像预览 */}
            <div className="h-80">
              <ImagePreview />
            </div>
            
            {/* 界面预览 */}
            <div className="h-96">
              <InterfacePreview />
            </div>
            
            {/* Prompt生成器 */}
            <div className="h-80">
              <PromptGenerator />
            </div>
            
            {/* 参数概览 */}
            <div className="h-64">
              <ParameterOverview />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App;

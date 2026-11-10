import React, { useState } from 'react';
import { useDroneStore } from '../../store/droneStore';
import { Play, ArrowRight, Settings, Zap, Image, CheckCircle, AlertCircle } from 'lucide-react';

const WorkflowDemo: React.FC = () => {
  const { parameters, isGenerating } = useDroneStore();
  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    {
      id: 1,
      title: '参数配置',
      description: '调整无人机的各项参数',
      icon: Settings,
      status: 'completed',
      details: '机架、动力、机身、起落架、配件'
    },
    {
      id: 2,
      title: '参数验证',
      description: '检查参数的有效性和兼容性',
      icon: CheckCircle,
      status: 'current',
      details: '确保所有参数在合理范围内'
    },
    {
      id: 3,
      title: 'ControlNet生成',
      description: '根据参数生成控制图',
      icon: Zap,
      status: 'pending',
      details: '将参数转换为2D线条图'
    },
    {
      id: 4,
      title: 'AI图像生成',
      description: 'ComfyUI生成最终图像',
      icon: Image,
      status: 'pending',
      details: '基于ControlNet生成真实感图像'
    }
  ];

  const getStepStatus = (stepId: number) => {
    if (stepId === 1) return 'completed';
    if (stepId === 2) return 'current';
    if (isGenerating && stepId <= 4) return 'processing';
    return 'pending';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'current': return 'text-blue-600 bg-blue-100';
      case 'processing': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-slate-400 bg-slate-100';
    }
  };

  const simulateWorkflow = () => {
    setCurrentStep(1);
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= 4) {
          clearInterval(interval);
          return 4;
        }
        return prev + 1;
      });
    }, 1500);
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Play className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-slate-900">工作流程演示</h3>
        </div>
        
        <button
          onClick={simulateWorkflow}
          className="btn-secondary flex items-center space-x-2"
        >
          <Play className="h-4 w-4" />
          <span>演示流程</span>
        </button>
      </div>

      {/* 流程步骤 */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const isActive = currentStep === step.id;
          
          return (
            <div key={step.id} className="relative">
              {/* 连接线 */}
              {index < steps.length - 1 && (
                <div className="absolute left-6 top-12 w-0.5 h-8 bg-slate-200" />
              )}
              
              <div className={`flex items-start space-x-4 p-4 rounded-lg transition-all ${
                isActive ? 'bg-primary-50 border border-primary-200' : 'bg-slate-50'
              }`}>
                {/* 步骤图标 */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${getStatusColor(status)}`}>
                  {status === 'processing' ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                
                {/* 步骤内容 */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-slate-900">{step.title}</h4>
                    {status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                    {status === 'processing' && <div className="w-4 h-4 border border-yellow-600 border-t-transparent rounded-full animate-spin" />}
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{step.description}</p>
                  <p className="text-xs text-slate-500 mt-1">{step.details}</p>
                  
                  {/* 当前参数预览 */}
                  {step.id === 1 && isActive && (
                    <div className="mt-3 p-3 bg-white rounded border text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>机架: {parameters.frame.frame_type}</div>
                        <div>轴距: {parameters.frame.wheelbase_mm}mm</div>
                        <div>螺旋桨: {parameters.propulsion.prop_diameter_inch}"</div>
                        <div>颜色: {parameters.accessories.drone_primary_color}</div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* 箭头 */}
                {index < steps.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-slate-400 mt-4" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 技术说明 */}
      <div className="mt-6 p-4 bg-slate-50 rounded-lg">
        <h4 className="text-sm font-medium text-slate-700 mb-2">技术架构说明</h4>
        <div className="text-xs text-slate-600 space-y-1">
          <div>• <strong>前端React:</strong> 参数配置界面和实时预览</div>
          <div>• <strong>参数验证:</strong> 确保输入值的合理性和兼容性</div>
          <div>• <strong>ControlNet:</strong> 将参数转换为2D控制图像</div>
          <div>• <strong>ComfyUI:</strong> 基于控制图生成最终的无人机图像</div>
          <div>• <strong>API集成:</strong> 前后端数据交互和状态同步</div>
        </div>
      </div>

      {/* 当前状态 */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          🔄 <strong>当前状态:</strong> 前端界面已完成，后端API和AI生成功能待集成。您可以调整参数查看界面响应效果。
        </p>
      </div>
    </div>
  );
};

export default WorkflowDemo; 
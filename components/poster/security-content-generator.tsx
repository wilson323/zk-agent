// @ts-nocheck
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { Shield, Lightbulb, Target, Award, CheckCircle, Zap, Copy, RefreshCw } from 'lucide-react';
import type { SecurityMarketingContent, SecurityFeature } from '@/types/poster';

const SECURITY_FEATURES: SecurityFeature[] = [
  {
    id: 'hd_recording',
    name: '高清录像',
    icon: '📹',
    description: '4K超高清画质，细节清晰可见',
    category: 'detection',
    isCore: true,
  },
  {
    id: 'night_vision',
    name: '夜视功能',
    icon: '🌙',
    description: '红外夜视，24小时全天候监控',
    category: 'detection',
    isCore: true,
  },
  {
    id: 'motion_detection',
    name: '智能检测',
    icon: '🎯',
    description: 'AI智能识别，精准检测异常行为',
    category: 'detection',
    isCore: true,
  },
  {
    id: 'remote_access',
    name: '远程监控',
    icon: '📱',
    description: '手机APP远程查看，随时掌控',
    category: 'monitoring',
    isCore: true,
  },
  {
    id: 'cloud_storage',
    name: '云端存储',
    icon: '☁️',
    description: '安全云存储，数据永不丢失',
    category: 'monitoring',
    isCore: false,
  },
  {
    id: 'instant_alert',
    name: '即时报警',
    icon: '🚨',
    description: '异常情况立即推送，快速响应',
    category: 'response',
    isCore: true,
  },
];

const MARKETING_HEADLINES = [
  '守护您的安全，我们更专业',
  '智能安防，让安全触手可及',
  '24小时守护，360度无死角',
  '科技护航，安全无忧',
  '专业安防，值得信赖',
  '智慧安防，守护美好生活',
  '安全第一，防患未然',
  '高清监控，细节尽收眼底',
];

const CALL_TO_ACTIONS = [
  '立即咨询',
  '免费试用',
  '获取方案',
  '预约安装',
  '了解更多',
  '在线客服',
  '申请报价',
  '产品演示',
];

const TRUST_INDICATORS = [
  '国家3C认证',
  '公安部检测认证',
  'ISO9001质量认证',
  'CE欧盟认证',
  'FCC美国认证',
  '5年质保承诺',
  '全国联保',
  '专业安装团队',
];

interface SecurityContentGeneratorProps {
  onContentGenerated: (content: SecurityMarketingContent) => void;
}

export default function SecurityContentGenerator({
  onContentGenerated,
}: SecurityContentGeneratorProps) {
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState<SecurityMarketingContent | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleFeatureToggle = (featureId: string) => {
    setSelectedFeatures(prev =>
      prev.includes(featureId) ? prev.filter(id => id !== featureId) : [...prev, featureId]
    );
  };

  const generateContent = async () => {
    setIsGenerating(true);

    // 模拟AI内容生成
    await new Promise(resolve => setTimeout(resolve, 2000));

    const selectedFeatureObjects = SECURITY_FEATURES.filter(f => selectedFeatures.includes(f.id));

    const content: SecurityMarketingContent = {
      headlines: MARKETING_HEADLINES.slice(0, 3),
      features: selectedFeatureObjects,
      benefits: ['提升安全防护等级', '降低安全风险', '节省人力成本', '提高管理效率'],
      callToActions: CALL_TO_ACTIONS.slice(0, 2),
      trustIndicators: TRUST_INDICATORS.slice(0, 4),
      complianceLogos: ['/compliance/3c.png', '/compliance/iso9001.png', '/compliance/ce.png'],
    };

    setGeneratedContent(content);
    onContentGenerated(content);
    setIsGenerating(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className='space-y-6'>
      <Card className='border-blue-200 dark:border-blue-800'>
        <CardHeader>
          <CardTitle className='flex items-center text-blue-700 dark:text-blue-300'>
            <Shield className='mr-2 h-5 w-5' />
            安防营销内容生成器
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue='features' className='w-full'>
            <TabsList className='grid w-full grid-cols-3'>
              <TabsTrigger value='features'>产品特性</TabsTrigger>
              <TabsTrigger value='custom'>自定义</TabsTrigger>
              <TabsTrigger value='generated'>生成内容</TabsTrigger>
            </TabsList>

            <TabsContent value='features' className='space-y-4'>
              <div>
                <h4 className='font-medium mb-3 flex items-center'>
                  <CheckCircle className='mr-2 h-4 w-4 text-green-500' />
                  选择产品特性
                </h4>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                  {SECURITY_FEATURES.map(feature => (
                    <motion.div
                      key={feature.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedFeatures.includes(feature.id)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                      }`}
                      onClick={() => handleFeatureToggle(feature.id)}
                    >
                      <div className='flex items-start gap-3'>
                        <span className='text-2xl'>{feature.icon}</span>
                        <div className='flex-1'>
                          <div className='flex items-center gap-2'>
                            <h5 className='font-medium'>{feature.name}</h5>
                            {feature.isCore && (
                              <Badge variant='secondary' className='text-xs'>
                                核心
                              </Badge>
                            )}
                          </div>
                          <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <Button
                onClick={generateContent}
                disabled={selectedFeatures.length === 0 || isGenerating}
                className='w-full bg-blue-600 hover:bg-blue-700'
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                    生成营销内容...
                  </>
                ) : (
                  <>
                    <Zap className='mr-2 h-4 w-4' />
                    生成营销内容
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value='custom' className='space-y-4'>
              <div>
                <h4 className='font-medium mb-3 flex items-center'>
                  <Lightbulb className='mr-2 h-4 w-4 text-yellow-500' />
                  自定义营销重点
                </h4>
                <Textarea
                  placeholder='描述您的产品特色、目标客户、营销重点等...'
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  className='min-h-[120px]'
                />
              </div>

              <Button
                onClick={generateContent}
                disabled={!customPrompt.trim() || isGenerating}
                className='w-full bg-blue-600 hover:bg-blue-700'
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                    生成营销内容...
                  </>
                ) : (
                  <>
                    <Zap className='mr-2 h-4 w-4' />
                    生成营销内容
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value='generated' className='space-y-4'>
              {generatedContent ? (
                <div className='space-y-6'>
                  {/* 营销标题 */}
                  <div>
                    <h4 className='font-medium mb-3 flex items-center'>
                      <Target className='mr-2 h-4 w-4 text-red-500' />
                      营销标题
                    </h4>
                    <div className='space-y-2'>
                      {generatedContent.headlines.map((headline, index) => (
                        <div
                          key={index}
                          className='flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg'
                        >
                          <span className='font-medium'>{headline}</span>
                          <Button
                            size='sm'
                            variant='ghost'
                            onClick={() => copyToClipboard(headline)}
                          >
                            <Copy className='h-4 w-4' />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 产品特性 */}
                  <div>
                    <h4 className='font-medium mb-3 flex items-center'>
                      <CheckCircle className='mr-2 h-4 w-4 text-green-500' />
                      产品特性
                    </h4>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                      {generatedContent.features.map(feature => (
                        <div
                          key={feature.id}
                          className='flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg'
                        >
                          <span className='text-xl'>{feature.icon}</span>
                          <div>
                            <h5 className='font-medium'>{feature.name}</h5>
                            <p className='text-sm text-gray-600 dark:text-gray-400'>
                              {feature.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 行动号召 */}
                  <div>
                    <h4 className='font-medium mb-3 flex items-center'>
                      <Zap className='mr-2 h-4 w-4 text-blue-500' />
                      行动号召
                    </h4>
                    <div className='flex flex-wrap gap-2'>
                      {generatedContent.callToActions.map((cta, index) => (
                        <Badge
                          key={index}
                          variant='outline'
                          className='cursor-pointer hover:bg-blue-50'
                        >
                          {cta}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* 信任指标 */}
                  <div>
                    <h4 className='font-medium mb-3 flex items-center'>
                      <Award className='mr-2 h-4 w-4 text-yellow-500' />
                      信任指标
                    </h4>
                    <div className='grid grid-cols-2 md:grid-cols-4 gap-2'>
                      {generatedContent.trustIndicators.map((indicator, index) => (
                        <div
                          key={index}
                          className='text-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg'
                        >
                          <div className='text-xs text-gray-600 dark:text-gray-400'>
                            {indicator}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className='text-center py-8 text-gray-500'>
                  <Lightbulb className='h-12 w-12 mx-auto mb-4 opacity-50' />
                  <p>请先选择产品特性或输入自定义内容</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

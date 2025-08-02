import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeTypes,
  EdgeTypes,
  Panel,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Play,
  Save,
  Download,
  Upload,
  Plus,
  Settings,
  Eye,
  Code,
  FileText,
  TestTube,
  Search,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

// 节点类型定义
interface WorkflowNodeData {
  label: string;
  description?: string;
  nodeType: 'start' | 'task' | 'decision' | 'end' | 'agent' | 'tool';
  agentType?: 'analyst' | 'developer' | 'tester' | 'reviewer' | 'coordinator';
  toolName?: string;
  parameters?: Record<string, any>;
  config?: Record<string, any>;
}

interface WorkflowEdgeData {
  label?: string;
  condition?: string;
}

// 自定义节点组件
const StartNode: React.FC<{ data: WorkflowNodeData }> = ({ data }) => (
  <div className="px-4 py-2 shadow-md rounded-md bg-green-100 border-2 border-green-500">
    <div className="flex items-center">
      <Play className="w-4 h-4 mr-2 text-green-600" />
      <div className="font-bold text-green-800">{data.label}</div>
    </div>
    {data.description && (
      <div className="text-xs text-green-600 mt-1">{data.description}</div>
    )}
  </div>
);

const TaskNode: React.FC<{ data: WorkflowNodeData }> = ({ data }) => (
  <div className="px-4 py-2 shadow-md rounded-md bg-blue-100 border-2 border-blue-500">
    <div className="flex items-center">
      <Settings className="w-4 h-4 mr-2 text-blue-600" />
      <div className="font-bold text-blue-800">{data.label}</div>
    </div>
    {data.description && (
      <div className="text-xs text-blue-600 mt-1">{data.description}</div>
    )}
    {data.toolName && (
      <Badge variant="secondary" className="mt-1 text-xs">
        {data.toolName}
      </Badge>
    )}
  </div>
);

const AgentNode: React.FC<{ data: WorkflowNodeData }> = ({ data }) => {
  const getAgentIcon = (type?: string) => {
    switch (type) {
      case 'analyst': return <Search className="w-4 h-4" />;
      case 'developer': return <Code className="w-4 h-4" />;
      case 'tester': return <TestTube className="w-4 h-4" />;
      case 'reviewer': return <Eye className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-purple-100 border-2 border-purple-500">
      <div className="flex items-center">
        <div className="text-purple-600 mr-2">{getAgentIcon(data.agentType)}</div>
        <div className="font-bold text-purple-800">{data.label}</div>
      </div>
      {data.description && (
        <div className="text-xs text-purple-600 mt-1">{data.description}</div>
      )}
      {data.agentType && (
        <Badge variant="outline" className="mt-1 text-xs border-purple-300">
          {data.agentType}
        </Badge>
      )}
    </div>
  );
};

const DecisionNode: React.FC<{ data: WorkflowNodeData }> = ({ data }) => (
  <div className="px-4 py-2 shadow-md rounded-md bg-yellow-100 border-2 border-yellow-500 transform rotate-45">
    <div className="transform -rotate-45">
      <div className="font-bold text-yellow-800 text-center">{data.label}</div>
      {data.description && (
        <div className="text-xs text-yellow-600 mt-1 text-center">{data.description}</div>
      )}
    </div>
  </div>
);

const EndNode: React.FC<{ data: WorkflowNodeData }> = ({ data }) => (
  <div className="px-4 py-2 shadow-md rounded-md bg-red-100 border-2 border-red-500">
    <div className="flex items-center">
      <div className="w-4 h-4 mr-2 bg-red-600 rounded-full" />
      <div className="font-bold text-red-800">{data.label}</div>
    </div>
    {data.description && (
      <div className="text-xs text-red-600 mt-1">{data.description}</div>
    )}
  </div>
);

// 节点类型映射
const nodeTypes: NodeTypes = {
  start: StartNode,
  task: TaskNode,
  agent: AgentNode,
  decision: DecisionNode,
  end: EndNode,
};

// 节点配置对话框
interface NodeConfigDialogProps {
  node: Node<WorkflowNodeData> | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (nodeData: WorkflowNodeData) => void;
}

const NodeConfigDialog: React.FC<NodeConfigDialogProps> = ({
  node,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<WorkflowNodeData>({
    label: '',
    description: '',
    nodeType: 'task',
  });

  useEffect(() => {
    if (node) {
      setFormData(node.data);
    }
  }, [node]);

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const availableTools = [
    'code_generator',
    'test_writer',
    'documentation_writer',
    'code_reviewer',
    'task_analyzer',
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>节点配置</DialogTitle>
          <DialogDescription>
            配置工作流节点的属性和参数
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">基本信息</TabsTrigger>
            <TabsTrigger value="config">配置</TabsTrigger>
            <TabsTrigger value="parameters">参数</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="label">节点名称</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="输入节点名称"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nodeType">节点类型</Label>
                <Select
                  value={formData.nodeType}
                  onValueChange={(value) => setFormData({ ...formData, nodeType: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="start">开始节点</SelectItem>
                    <SelectItem value="task">任务节点</SelectItem>
                    <SelectItem value="agent">智能体节点</SelectItem>
                    <SelectItem value="decision">决策节点</SelectItem>
                    <SelectItem value="end">结束节点</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="输入节点描述"
                rows={3}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="config" className="space-y-4">
            {formData.nodeType === 'agent' && (
              <div className="space-y-2">
                <Label htmlFor="agentType">智能体类型</Label>
                <Select
                  value={formData.agentType || ''}
                  onValueChange={(value) => setFormData({ ...formData, agentType: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择智能体类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="analyst">分析师</SelectItem>
                    <SelectItem value="developer">开发者</SelectItem>
                    <SelectItem value="tester">测试员</SelectItem>
                    <SelectItem value="reviewer">审查员</SelectItem>
                    <SelectItem value="coordinator">协调员</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {(formData.nodeType === 'task' || formData.nodeType === 'agent') && (
              <div className="space-y-2">
                <Label htmlFor="toolName">工具</Label>
                <Select
                  value={formData.toolName || ''}
                  onValueChange={(value) => setFormData({ ...formData, toolName: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择工具" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTools.map((tool) => (
                      <SelectItem key={tool} value={tool}>
                        {tool}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="parameters" className="space-y-4">
            <div className="space-y-2">
              <Label>参数配置 (JSON格式)</Label>
              <Textarea
                value={JSON.stringify(formData.parameters || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const params = JSON.parse(e.target.value);
                    setFormData({ ...formData, parameters: params });
                  } catch {
                    // 忽略JSON解析错误
                  }
                }}
                placeholder='{\n  "key": "value"\n}'
                rows={8}
                className="font-mono text-sm"
              />
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// 工作流编辑器主组件
interface ReactFlowWorkflowEditorProps {
  initialNodes?: Node<WorkflowNodeData>[];
  initialEdges?: Edge<WorkflowEdgeData>[];
  onSave?: (nodes: Node<WorkflowNodeData>[], edges: Edge<WorkflowEdgeData>[]) => void;
  onExecute?: (nodes: Node<WorkflowNodeData>[], edges: Edge<WorkflowEdgeData>[]) => void;
  readonly?: boolean;
}

const ReactFlowWorkflowEditor: React.FC<ReactFlowWorkflowEditorProps> = ({
  initialNodes = [],
  initialEdges = [],
  onSave,
  onExecute,
  readonly = false,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<WorkflowNodeData> | null>(null);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const { getViewport, setViewport } = useReactFlow();

  // 连接节点
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // 节点双击事件
  const onNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: Node<WorkflowNodeData>) => {
      if (!readonly) {
        setSelectedNode(node);
        setIsConfigDialogOpen(true);
      }
    },
    [readonly]
  );

  // 添加新节点
  const addNode = useCallback(
    (nodeType: WorkflowNodeData['nodeType']) => {
      const newNode: Node<WorkflowNodeData> = {
        id: `node-${Date.now()}`,
        type: nodeType,
        position: { x: Math.random() * 400, y: Math.random() * 400 },
        data: {
          label: `新${nodeType}节点`,
          nodeType,
        },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  // 保存节点配置
  const saveNodeConfig = useCallback(
    (nodeData: WorkflowNodeData) => {
      if (selectedNode) {
        setNodes((nds) =>
          nds.map((node) =>
            node.id === selectedNode.id
              ? { ...node, data: nodeData, type: nodeData.nodeType }
              : node
          )
        );
      }
    },
    [selectedNode, setNodes]
  );

  // 保存工作流
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(nodes, edges);
      toast.success('工作流已保存');
    }
  }, [nodes, edges, onSave]);

  // 执行工作流
  const handleExecute = useCallback(async () => {
    if (onExecute) {
      setIsExecuting(true);
      try {
        await onExecute(nodes, edges);
        toast.success('工作流执行完成');
      } catch (error) {
        toast.error('工作流执行失败');
      } finally {
        setIsExecuting(false);
      }
    }
  }, [nodes, edges, onExecute]);

  // 导出工作流
  const exportWorkflow = useCallback(() => {
    const workflow = {
      nodes,
      edges,
      viewport: getViewport(),
    };
    const dataStr = JSON.stringify(workflow, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'workflow.json';
    link.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, getViewport]);

  // 导入工作流
  const importWorkflow = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workflow = JSON.parse(e.target?.result as string);
          setNodes(workflow.nodes || []);
          setEdges(workflow.edges || []);
          if (workflow.viewport) {
            setViewport(workflow.viewport);
          }
          toast.success('工作流导入成功');
        } catch (error) {
          toast.error('工作流导入失败');
        }
      };
      reader.readAsText(file);
    }
  }, [setNodes, setEdges, setViewport]);

  return (
    <div className="w-full h-full flex flex-col">
      {/* 工具栏 */}
      {!readonly && (
        <div className="flex items-center gap-2 p-4 border-b bg-background">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => addNode('start')}
            >
              <Plus className="w-4 h-4 mr-1" />
              开始
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addNode('task')}
            >
              <Plus className="w-4 h-4 mr-1" />
              任务
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addNode('agent')}
            >
              <Plus className="w-4 h-4 mr-1" />
              智能体
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addNode('decision')}
            >
              <Plus className="w-4 h-4 mr-1" />
              决策
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addNode('end')}
            >
              <Plus className="w-4 h-4 mr-1" />
              结束
            </Button>
          </div>
          
          <div className="flex-1" />
          
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".json"
              onChange={importWorkflow}
              className="hidden"
              id="import-workflow"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('import-workflow')?.click()}
            >
              <Upload className="w-4 h-4 mr-1" />
              导入
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportWorkflow}
            >
              <Download className="w-4 h-4 mr-1" />
              导出
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
            >
              <Save className="w-4 h-4 mr-1" />
              保存
            </Button>
            <Button
              size="sm"
              onClick={handleExecute}
              disabled={isExecuting}
            >
              <Play className="w-4 h-4 mr-1" />
              {isExecuting ? '执行中...' : '执行'}
            </Button>
          </div>
        </div>
      )}
      
      {/* React Flow 画布 */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={onNodeDoubleClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <MiniMap />
          <Background variant="dots" gap={12} size={1} />
          
          {/* 状态面板 */}
          <Panel position="top-right">
            <Card className="w-64">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">工作流状态</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1">
                <div>节点数量: {nodes.length}</div>
                <div>连接数量: {edges.length}</div>
                {isExecuting && (
                  <Badge variant="secondary">执行中...</Badge>
                )}
              </CardContent>
            </Card>
          </Panel>
        </ReactFlow>
      </div>
      
      {/* 节点配置对话框 */}
      <NodeConfigDialog
        node={selectedNode}
        isOpen={isConfigDialogOpen}
        onClose={() => {
          setIsConfigDialogOpen(false);
          setSelectedNode(null);
        }}
        onSave={saveNodeConfig}
      />
    </div>
  );
};

// 带Provider的包装组件
const ReactFlowWorkflowEditorWrapper: React.FC<ReactFlowWorkflowEditorProps> = (props) => {
  return (
    <ReactFlowProvider>
      <ReactFlowWorkflowEditor {...props} />
    </ReactFlowProvider>
  );
};

export default ReactFlowWorkflowEditorWrapper;
export { ReactFlowWorkflowEditor };
export type { WorkflowNodeData, WorkflowEdgeData };
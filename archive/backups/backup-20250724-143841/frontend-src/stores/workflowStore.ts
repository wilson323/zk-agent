import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Node, Edge } from '@xyflow/react';
import { WorkflowNodeData, WorkflowEdgeData } from '@/components/workflow/ReactFlowWorkflowEditor';

// 工作流状态接口
interface WorkflowState {
  // 当前工作流
  currentWorkflow: {
    id: string | null;
    name: string;
    description: string;
    nodes: Node<WorkflowNodeData>[];
    edges: Edge<WorkflowEdgeData>[];
    isModified: boolean;
    lastSaved: Date | null;
  };

  // 工作流列表
  workflows: Array<{
    id: string;
    name: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
    nodeCount: number;
    edgeCount: number;
  }>;

  // 执行状态
  execution: {
    isExecuting: boolean;
    executionId: string | null;
    status: 'idle' | 'running' | 'completed' | 'failed';
    currentStep: string | null;
    results: Record<string, any>;
    errors: string[];
    logs: string[];
    progress: number;
  };

  // UI状态
  ui: {
    selectedNodeId: string | null;
    selectedEdgeId: string | null;
    isConfigDialogOpen: boolean;
    isSidebarOpen: boolean;
    viewMode: 'edit' | 'view' | 'debug';
    zoom: number;
    viewport: { x: number; y: number; zoom: number };
  };

  // 历史记录
  history: {
    past: Array<{ nodes: Node<WorkflowNodeData>[]; edges: Edge<WorkflowEdgeData>[] }>;
    future: Array<{ nodes: Node<WorkflowNodeData>[]; edges: Edge<WorkflowEdgeData>[] }>;
    canUndo: boolean;
    canRedo: boolean;
  };
}

// Actions接口
interface WorkflowActions {
  // 工作流操作
  createWorkflow: (name: string, description?: string) => void;
  loadWorkflow: (id: string) => Promise<void>;
  saveWorkflow: () => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  duplicateWorkflow: (id: string) => Promise<void>;

  // 节点操作
  addNode: (node: Omit<Node<WorkflowNodeData>, 'id'>) => void;
  updateNode: (id: string, data: Partial<WorkflowNodeData>) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string | null) => void;

  // 边操作
  addEdge: (edge: Omit<Edge<WorkflowEdgeData>, 'id'>) => void;
  updateEdge: (id: string, data: Partial<WorkflowEdgeData>) => void;
  deleteEdge: (id: string) => void;
  selectEdge: (id: string | null) => void;

  // 执行操作
  executeWorkflow: (inputs?: Record<string, any>) => Promise<void>;
  stopExecution: () => Promise<void>;
  clearExecutionResults: () => void;

  // UI操作
  setConfigDialogOpen: (open: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setViewMode: (mode: 'edit' | 'view' | 'debug') => void;
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;

  // 历史操作
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  clearHistory: () => void;

  // 导入导出
  exportWorkflow: () => string;
  importWorkflow: (data: string) => void;

  // 重置
  reset: () => void;
}

// 初始状态
const initialState: WorkflowState = {
  currentWorkflow: {
    id: null,
    name: '新工作流',
    description: '',
    nodes: [],
    edges: [],
    isModified: false,
    lastSaved: null,
  },
  workflows: [],
  execution: {
    isExecuting: false,
    executionId: null,
    status: 'idle',
    currentStep: null,
    results: {},
    errors: [],
    logs: [],
    progress: 0,
  },
  ui: {
    selectedNodeId: null,
    selectedEdgeId: null,
    isConfigDialogOpen: false,
    isSidebarOpen: true,
    viewMode: 'edit',
    zoom: 1,
    viewport: { x: 0, y: 0, zoom: 1 },
  },
  history: {
    past: [],
    future: [],
    canUndo: false,
    canRedo: false,
  },
};

// API调用函数
const api = {
  async saveWorkflow(workflow: any) {
    const response = await fetch('/api/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflow),
    });
    return response.json();
  },

  async loadWorkflow(id: string) {
    const response = await fetch(`/api/workflows/${id}`);
    return response.json();
  },

  async deleteWorkflow(id: string) {
    const response = await fetch(`/api/workflows/${id}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  async executeWorkflow(workflow: any, inputs: any) {
    const response = await fetch('/api/workflows/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow, inputs }),
    });
    return response.json();
  },

  async getExecutionStatus(executionId: string) {
    const response = await fetch(`/api/workflows/executions/${executionId}`);
    return response.json();
  },
};

// 创建store
export const useWorkflowStore = create<WorkflowState & WorkflowActions>()()
  (devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // 工作流操作
        createWorkflow: (name: string, description = '') => {
          set((state) => {
            state.currentWorkflow = {
              id: null,
              name,
              description,
              nodes: [],
              edges: [],
              isModified: false,
              lastSaved: null,
            };
            state.history.past = [];
            state.history.future = [];
            state.history.canUndo = false;
            state.history.canRedo = false;
          });
        },

        loadWorkflow: async (id: string) => {
          try {
            const workflow = await api.loadWorkflow(id);
            set((state) => {
              state.currentWorkflow = {
                id: workflow.id,
                name: workflow.name,
                description: workflow.description,
                nodes: workflow.nodes || [],
                edges: workflow.edges || [],
                isModified: false,
                lastSaved: new Date(workflow.updatedAt),
              };
              state.history.past = [];
              state.history.future = [];
              state.history.canUndo = false;
              state.history.canRedo = false;
            });
          } catch (error) {
            console.error('加载工作流失败:', error);
          }
        },

        saveWorkflow: async () => {
          try {
            const { currentWorkflow } = get();
            const result = await api.saveWorkflow({
              id: currentWorkflow.id,
              name: currentWorkflow.name,
              description: currentWorkflow.description,
              nodes: currentWorkflow.nodes,
              edges: currentWorkflow.edges,
            });

            set((state) => {
              state.currentWorkflow.id = result.id;
              state.currentWorkflow.isModified = false;
              state.currentWorkflow.lastSaved = new Date();

              // 更新工作流列表
              const existingIndex = state.workflows.findIndex(w => w.id === result.id);
              const workflowItem = {
                id: result.id,
                name: result.name,
                description: result.description,
                createdAt: new Date(result.createdAt),
                updatedAt: new Date(),
                nodeCount: state.currentWorkflow.nodes.length,
                edgeCount: state.currentWorkflow.edges.length,
              };

              if (existingIndex >= 0) {
                state.workflows[existingIndex] = workflowItem;
              } else {
                state.workflows.push(workflowItem);
              }
            });
          } catch (error) {
            console.error('保存工作流失败:', error);
          }
        },

        deleteWorkflow: async (id: string) => {
          try {
            await api.deleteWorkflow(id);
            set((state) => {
              state.workflows = state.workflows.filter(w => w.id !== id);
              if (state.currentWorkflow.id === id) {
                state.currentWorkflow = initialState.currentWorkflow;
              }
            });
          } catch (error) {
            console.error('删除工作流失败:', error);
          }
        },

        duplicateWorkflow: async (id: string) => {
          try {
            const workflow = await api.loadWorkflow(id);
            const duplicated = {
              ...workflow,
              id: null,
              name: `${workflow.name} (副本)`,
            };
            const result = await api.saveWorkflow(duplicated);

            set((state) => {
              state.workflows.push({
                id: result.id,
                name: result.name,
                description: result.description,
                createdAt: new Date(),
                updatedAt: new Date(),
                nodeCount: workflow.nodes?.length || 0,
                edgeCount: workflow.edges?.length || 0,
              });
            });
          } catch (error) {
            console.error('复制工作流失败:', error);
          }
        },

        // 节点操作
        addNode: (node) => {
          set((state) => {
            const newNode = {
              ...node,
              id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            };
            state.currentWorkflow.nodes.push(newNode);
            state.currentWorkflow.isModified = true;
          });
          get().pushHistory();
        },

        updateNode: (id: string, data) => {
          set((state) => {
            const nodeIndex = state.currentWorkflow.nodes.findIndex(n => n.id === id);
            if (nodeIndex >= 0) {
              state.currentWorkflow.nodes[nodeIndex].data = {
                ...state.currentWorkflow.nodes[nodeIndex].data,
                ...data,
              };
              state.currentWorkflow.isModified = true;
            }
          });
          get().pushHistory();
        },

        deleteNode: (id: string) => {
          set((state) => {
            state.currentWorkflow.nodes = state.currentWorkflow.nodes.filter(n => n.id !== id);
            state.currentWorkflow.edges = state.currentWorkflow.edges.filter(
              e => e.source !== id && e.target !== id
            );
            state.currentWorkflow.isModified = true;
            if (state.ui.selectedNodeId === id) {
              state.ui.selectedNodeId = null;
            }
          });
          get().pushHistory();
        },

        selectNode: (id: string | null) => {
          set((state) => {
            state.ui.selectedNodeId = id;
            state.ui.selectedEdgeId = null;
          });
        },

        // 边操作
        addEdge: (edge) => {
          set((state) => {
            const newEdge = {
              ...edge,
              id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            };
            state.currentWorkflow.edges.push(newEdge);
            state.currentWorkflow.isModified = true;
          });
          get().pushHistory();
        },

        updateEdge: (id: string, data) => {
          set((state) => {
            const edgeIndex = state.currentWorkflow.edges.findIndex(e => e.id === id);
            if (edgeIndex >= 0) {
              state.currentWorkflow.edges[edgeIndex].data = {
                ...state.currentWorkflow.edges[edgeIndex].data,
                ...data,
              };
              state.currentWorkflow.isModified = true;
            }
          });
          get().pushHistory();
        },

        deleteEdge: (id: string) => {
          set((state) => {
            state.currentWorkflow.edges = state.currentWorkflow.edges.filter(e => e.id !== id);
            state.currentWorkflow.isModified = true;
            if (state.ui.selectedEdgeId === id) {
              state.ui.selectedEdgeId = null;
            }
          });
          get().pushHistory();
        },

        selectEdge: (id: string | null) => {
          set((state) => {
            state.ui.selectedEdgeId = id;
            state.ui.selectedNodeId = null;
          });
        },

        // 执行操作
        executeWorkflow: async (inputs = {}) => {
          try {
            const { currentWorkflow } = get();

            set((state) => {
              state.execution.isExecuting = true;
              state.execution.status = 'running';
              state.execution.errors = [];
              state.execution.logs = [];
              state.execution.progress = 0;
            });

            const result = await api.executeWorkflow({
              nodes: currentWorkflow.nodes,
              edges: currentWorkflow.edges,
            }, inputs);

            set((state) => {
              state.execution.executionId = result.executionId;
            });

            // 轮询执行状态
            const pollStatus = async () => {
              try {
                const status = await api.getExecutionStatus(result.executionId);

                set((state) => {
                  state.execution.status = status.status;
                  state.execution.currentStep = status.currentStep;
                  state.execution.results = status.results || {};
                  state.execution.errors = status.errors || [];
                  state.execution.logs = status.logs || [];
                  state.execution.progress = status.progress || 0;
                });

                if (status.status === 'running') {
                  setTimeout(pollStatus, 1000);
                } else {
                  set((state) => {
                    state.execution.isExecuting = false;
                  });
                }
              } catch (error) {
                console.error('获取执行状态失败:', error);
                set((state) => {
                  state.execution.isExecuting = false;
                  state.execution.status = 'failed';
                  state.execution.errors.push('获取执行状态失败');
                });
              }
            };

            setTimeout(pollStatus, 1000);

          } catch (error) {
            console.error('执行工作流失败:', error);
            set((state) => {
              state.execution.isExecuting = false;
              state.execution.status = 'failed';
              state.execution.errors.push('执行工作流失败');
            });
          }
        },

        stopExecution: async () => {
          // TODO: 实现停止执行的API调用
          set((state) => {
            state.execution.isExecuting = false;
            state.execution.status = 'idle';
          });
        },

        clearExecutionResults: () => {
          set((state) => {
            state.execution = initialState.execution;
          });
        },

        // UI操作
        setConfigDialogOpen: (open: boolean) => {
          set((state) => {
            state.ui.isConfigDialogOpen = open;
          });
        },

        setSidebarOpen: (open: boolean) => {
          set((state) => {
            state.ui.isSidebarOpen = open;
          });
        },

        setViewMode: (mode) => {
          set((state) => {
            state.ui.viewMode = mode;
          });
        },

        setViewport: (viewport) => {
          set((state) => {
            state.ui.viewport = viewport;
          });
        },

        // 历史操作
        pushHistory: () => {
          set((state) => {
            const { nodes, edges } = state.currentWorkflow;
            state.history.past.push({ nodes: [...nodes], edges: [...edges] });
            state.history.future = [];

            // 限制历史记录数量
            if (state.history.past.length > 50) {
              state.history.past.shift();
            }

            state.history.canUndo = state.history.past.length > 0;
            state.history.canRedo = false;
          });
        },

        undo: () => {
          set((state) => {
            if (state.history.past.length > 0) {
              const current = {
                nodes: [...state.currentWorkflow.nodes],
                edges: [...state.currentWorkflow.edges],
              };

              const previous = state.history.past.pop()!;
              state.history.future.unshift(current);

              state.currentWorkflow.nodes = previous.nodes;
              state.currentWorkflow.edges = previous.edges;
              state.currentWorkflow.isModified = true;

              state.history.canUndo = state.history.past.length > 0;
              state.history.canRedo = true;
            }
          });
        },

        redo: () => {
          set((state) => {
            if (state.history.future.length > 0) {
              const current = {
                nodes: [...state.currentWorkflow.nodes],
                edges: [...state.currentWorkflow.edges],
              };

              const next = state.history.future.shift()!;
              state.history.past.push(current);

              state.currentWorkflow.nodes = next.nodes;
              state.currentWorkflow.edges = next.edges;
              state.currentWorkflow.isModified = true;

              state.history.canUndo = true;
              state.history.canRedo = state.history.future.length > 0;
            }
          });
        },

        clearHistory: () => {
          set((state) => {
            state.history.past = [];
            state.history.future = [];
            state.history.canUndo = false;
            state.history.canRedo = false;
          });
        },

        // 导入导出
        exportWorkflow: () => {
          const { currentWorkflow } = get();
          return JSON.stringify({
            name: currentWorkflow.name,
            description: currentWorkflow.description,
            nodes: currentWorkflow.nodes,
            edges: currentWorkflow.edges,
            exportedAt: new Date().toISOString(),
          }, null, 2);
        },

        importWorkflow: (data: string) => {
          try {
            const workflow = JSON.parse(data);
            set((state) => {
              state.currentWorkflow = {
                id: null,
                name: workflow.name || '导入的工作流',
                description: workflow.description || '',
                nodes: workflow.nodes || [],
                edges: workflow.edges || [],
                isModified: true,
                lastSaved: null,
              };
              state.history.past = [];
              state.history.future = [];
              state.history.canUndo = false;
              state.history.canRedo = false;
            });
          } catch (error) {
            console.error('导入工作流失败:', error);
          }
        },

        // 重置
        reset: () => {
          set(() => ({ ...initialState }));
        },
      })),
      {
        name: 'workflow-store',
        partialize: (state) => ({
          workflows: state.workflows,
          ui: {
            isSidebarOpen: state.ui.isSidebarOpen,
            viewMode: state.ui.viewMode,
          },
        }),
      }
    ),
    {
      name: 'workflow-store',
    }
  ));

// 选择器hooks
export const useCurrentWorkflow = () => useWorkflowStore(state => state.currentWorkflow);
export const useWorkflowList = () => useWorkflowStore(state => state.workflows);
export const useExecutionState = () => useWorkflowStore(state => state.execution);
export const useUIState = () => useWorkflowStore(state => state.ui);
export const useHistoryState = () => useWorkflowStore(state => state.history);

// 操作hooks
export const useWorkflowActions = () => useWorkflowStore(state => ({
  createWorkflow: state.createWorkflow,
  loadWorkflow: state.loadWorkflow,
  saveWorkflow: state.saveWorkflow,
  deleteWorkflow: state.deleteWorkflow,
  duplicateWorkflow: state.duplicateWorkflow,
}));

export const useNodeActions = () => useWorkflowStore(state => ({
  addNode: state.addNode,
  updateNode: state.updateNode,
  deleteNode: state.deleteNode,
  selectNode: state.selectNode,
}));

export const useEdgeActions = () => useWorkflowStore(state => ({
  addEdge: state.addEdge,
  updateEdge: state.updateEdge,
  deleteEdge: state.deleteEdge,
  selectEdge: state.selectEdge,
}));

export const useExecutionActions = () => useWorkflowStore(state => ({
  executeWorkflow: state.executeWorkflow,
  stopExecution: state.stopExecution,
  clearExecutionResults: state.clearExecutionResults,
}));

export const useUIActions = () => useWorkflowStore(state => ({
  setConfigDialogOpen: state.setConfigDialogOpen,
  setSidebarOpen: state.setSidebarOpen,
  setViewMode: state.setViewMode,
  setViewport: state.setViewport,
}));

export const useHistoryActions = () => useWorkflowStore(state => ({
  undo: state.undo,
  redo: state.redo,
  pushHistory: state.pushHistory,
  clearHistory: state.clearHistory,
}));
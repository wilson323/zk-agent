#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent工作流API端点

本模块提供工作流相关的RESTful API端点，支持工作流的创建、
编排、执行、监控等功能。

核心功能：
- 工作流CRUD操作
- 工作流编排管理
- 工作流执行控制
- 工作流节点管理
- 工作流状态监控
- 工作流性能分析

API设计：
- RESTful风格
- 统一响应格式
- 分页和过滤
- 错误处理
- 权限控制

作者: ZK-Agent Team
创建时间: 2024-01-20
最后更新: 2024-01-20
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Path, Body
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.redis import get_redis, RedisManager
from app.core.security import get_current_user, require_permission
from app.models.user import User
from app.models.task import WorkflowStatus, WorkflowType
from app.services.workflow_service import (
    WorkflowService, WorkflowRequest, WorkflowResponse, WorkflowOperation,
    WorkflowType as ServiceWorkflowType, ExecutionStrategy, NodeStatus, EdgeType
)
from app.services.langchain_workflow_service import (
    LangChainWorkflowService, CreateWorkflowRequest, ExecuteWorkflowRequest,
    WorkflowExecutionResult
)
from app.api.v1.schemas.workflow import (
    WorkflowCreate, WorkflowUpdate, WorkflowInDB, WorkflowList,
    WorkflowExecuteRequest, WorkflowNodeRequest,
    WorkflowValidationResponse, WorkflowAnalysisResponse
)
from app.api.v1.schemas.common import (
    StandardResponse, PaginatedResponse, ErrorResponse
)

# 创建路由器
router = APIRouter()


@router.post(
    "/",
    response_model=StandardResponse[WorkflowInDB],
    summary="创建工作流",
    description="创建一个新的工作流"
)
async def create_workflow(
    workflow_data: WorkflowCreate,
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[WorkflowInDB]:
    """
    创建新工作流
    
    - **name**: 工作流名称
    - **description**: 工作流描述
    - **type**: 工作流类型
    - **definition**: 工作流定义
    - **config**: 工作流配置
    """
    try:
        # 创建工作流服务实例
        workflow_service = WorkflowService(db, redis)
        
        # 构建请求
        request = WorkflowRequest(
            operation=WorkflowOperation.CREATE,
            workflow_data={
                "name": workflow_data.name,
                "description": workflow_data.description,
                "type": workflow_data.type,
                "definition": workflow_data.definition,
                "config": workflow_data.config,
                "user_id": current_user.id
            }
        )
        
        # 执行创建操作
        result = await workflow_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=WorkflowInDB(**result.data.workflow_data),
                message="工作流创建成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "工作流创建失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"创建工作流时发生错误: {str(e)}"
        )


@router.get(
    "/",
    response_model=PaginatedResponse[WorkflowList],
    summary="获取工作流列表",
    description="获取当前用户的工作流列表，支持分页和过滤"
)
async def list_workflows(
    skip: int = Query(0, ge=0, description="跳过的记录数"),
    limit: int = Query(20, ge=1, le=100, description="返回的记录数"),
    workflow_type: Optional[ServiceWorkflowType] = Query(None, description="工作流类型过滤"),
    status: Optional[WorkflowStatus] = Query(None, description="状态过滤"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> PaginatedResponse[WorkflowList]:
    """
    获取工作流列表
    
    支持以下过滤条件：
    - **workflow_type**: 按工作流类型过滤
    - **status**: 按状态过滤
    - **search**: 按名称或描述搜索
    """
    try:
        workflow_service = WorkflowService(db, redis)
        
        request = WorkflowRequest(
            operation=WorkflowOperation.LIST,
            filters={
                "user_id": current_user.id,
                "workflow_type": workflow_type,
                "status": status,
                "search": search,
                "skip": skip,
                "limit": limit
            }
        )
        
        result = await workflow_service.execute(request)
        
        if result.success:
            workflows_data = result.data.workflows or []
            total = result.data.total or 0
            
            return PaginatedResponse(
                success=True,
                data=[WorkflowList(**workflow) for workflow in workflows_data],
                total=total,
                skip=skip,
                limit=limit,
                message="工作流列表获取成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "获取工作流列表失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取工作流列表时发生错误: {str(e)}"
        )


@router.get(
    "/{workflow_id}",
    response_model=StandardResponse[WorkflowInDB],
    summary="获取工作流详情",
    description="根据ID获取工作流的详细信息"
)
async def get_workflow(
    workflow_id: str = Path(..., description="工作流ID"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[WorkflowInDB]:
    """
    获取工作流详情
    """
    try:
        workflow_service = WorkflowService(db, redis)
        
        request = WorkflowRequest(
            operation=WorkflowOperation.GET,
            workflow_id=workflow_id,
            user_id=current_user.id
        )
        
        result = await workflow_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=WorkflowInDB(**result.data.workflow_data),
                message="工作流详情获取成功"
            )
        else:
            raise HTTPException(
                status_code=404,
                detail=result.error or "工作流不存在"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取工作流详情时发生错误: {str(e)}"
        )


@router.put(
    "/{workflow_id}",
    response_model=StandardResponse[WorkflowInDB],
    summary="更新工作流",
    description="更新工作流的配置和信息"
)
async def update_workflow(
    workflow_id: str = Path(..., description="工作流ID"),
    workflow_data: WorkflowUpdate = Body(...),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[WorkflowInDB]:
    """
    更新工作流
    """
    try:
        workflow_service = WorkflowService(db, redis)
        
        request = WorkflowRequest(
            operation=WorkflowOperation.UPDATE,
            workflow_id=workflow_id,
            user_id=current_user.id,
            workflow_data=workflow_data.dict(exclude_unset=True)
        )
        
        result = await workflow_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=WorkflowInDB(**result.data.workflow_data),
                message="工作流更新成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "工作流更新失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"更新工作流时发生错误: {str(e)}"
        )


@router.delete(
    "/{workflow_id}",
    response_model=StandardResponse[Dict[str, str]],
    summary="删除工作流",
    description="删除指定的工作流"
)
async def delete_workflow(
    workflow_id: str = Path(..., description="工作流ID"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, str]]:
    """
    删除工作流
    """
    try:
        workflow_service = WorkflowService(db, redis)
        
        request = WorkflowRequest(
            operation=WorkflowOperation.DELETE,
            workflow_id=workflow_id,
            user_id=current_user.id
        )
        
        result = await workflow_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data={"workflow_id": workflow_id, "status": "deleted"},
                message="工作流删除成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "工作流删除失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"删除工作流时发生错误: {str(e)}"
        )


@router.post(
    "/{workflow_id}/execute",
    response_model=StandardResponse[Dict[str, Any]],
    summary="执行工作流",
    description="执行指定的工作流"
)
async def execute_workflow(
    workflow_id: str = Path(..., description="工作流ID"),
    execute_request: WorkflowExecuteRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, Any]]:
    """
    执行工作流
    """
    try:
        workflow_service = WorkflowService(db, redis)
        
        request = WorkflowRequest(
            operation=WorkflowOperation.EXECUTE,
            workflow_id=workflow_id,
            user_id=current_user.id,
            execution_data={
                "strategy": execute_request.strategy,
                "inputs": execute_request.inputs,
                "parameters": execute_request.parameters
            }
        )
        
        result = await workflow_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=result.data.execution_result,
                message="工作流执行成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "工作流执行失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"执行工作流时发生错误: {str(e)}"
        )


@router.post(
    "/{workflow_id}/validate",
    response_model=StandardResponse[WorkflowValidationResponse],
    summary="验证工作流",
    description="验证工作流定义的正确性"
)
async def validate_workflow(
    workflow_id: str = Path(..., description="工作流ID"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[WorkflowValidationResponse]:
    """
    验证工作流
    """
    try:
        workflow_service = WorkflowService(db, redis)
        
        request = WorkflowRequest(
            operation=WorkflowOperation.VALIDATE,
            workflow_id=workflow_id,
            user_id=current_user.id
        )
        
        result = await workflow_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=WorkflowValidationResponse(**result.data.validation_result),
                message="工作流验证完成"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "工作流验证失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"验证工作流时发生错误: {str(e)}"
        )


@router.get(
    "/{workflow_id}/status",
    response_model=StandardResponse[Dict[str, Any]],
    summary="获取工作流状态",
    description="获取工作流的当前状态信息"
)
async def get_workflow_status(
    workflow_id: str = Path(..., description="工作流ID"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, Any]]:
    """
    获取工作流状态
    """
    try:
        workflow_service = WorkflowService(db, redis)
        
        request = WorkflowRequest(
            operation=WorkflowOperation.STATUS,
            workflow_id=workflow_id,
            user_id=current_user.id
        )
        
        result = await workflow_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=result.data.status_result,
                message="工作流状态获取成功"
            )
        else:
            raise HTTPException(
                status_code=404,
                detail=result.error or "工作流不存在"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取工作流状态时发生错误: {str(e)}"
        )


@router.get(
    "/{workflow_id}/analysis",
    response_model=StandardResponse[WorkflowAnalysisResponse],
    summary="获取工作流分析",
    description="获取工作流的性能分析和统计信息"
)
async def get_workflow_analysis(
    workflow_id: str = Path(..., description="工作流ID"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[WorkflowAnalysisResponse]:
    """
    获取工作流分析
    """
    try:
        workflow_service = WorkflowService(db, redis)
        
        request = WorkflowRequest(
            operation=WorkflowOperation.ANALYZE,
            workflow_id=workflow_id,
            user_id=current_user.id
        )
        
        result = await workflow_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=WorkflowAnalysisResponse(**result.data.analysis_result),
                message="工作流分析获取成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "获取工作流分析失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取工作流分析时发生错误: {str(e)}"
        )


@router.post(
    "/{workflow_id}/pause",
    response_model=StandardResponse[Dict[str, str]],
    summary="暂停工作流",
    description="暂停正在执行的工作流"
)
async def pause_workflow(
    workflow_id: str = Path(..., description="工作流ID"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, str]]:
    """
    暂停工作流
    """
    try:
        workflow_service = WorkflowService(db, redis)
        
        request = WorkflowRequest(
            operation=WorkflowOperation.PAUSE,
            workflow_id=workflow_id,
            user_id=current_user.id
        )
        
        result = await workflow_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data={"workflow_id": workflow_id, "status": "paused"},
                message="工作流暂停成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "工作流暂停失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"暂停工作流时发生错误: {str(e)}"
        )


@router.post(
    "/{workflow_id}/resume",
    response_model=StandardResponse[Dict[str, str]],
    summary="恢复工作流",
    description="恢复暂停的工作流"
)
async def resume_workflow(
    workflow_id: str = Path(..., description="工作流ID"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, str]]:
    """
    恢复工作流
    """
    try:
        workflow_service = WorkflowService(db, redis)
        
        request = WorkflowRequest(
            operation=WorkflowOperation.RESUME,
            workflow_id=workflow_id,
            user_id=current_user.id
        )
        
        result = await workflow_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data={"workflow_id": workflow_id, "status": "resumed"},
                message="工作流恢复成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "工作流恢复失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"恢复工作流时发生错误: {str(e)}"
        )


@router.post(
    "/{workflow_id}/cancel",
    response_model=StandardResponse[Dict[str, str]],
    summary="取消工作流",
    description="取消正在执行或等待的工作流"
)
async def cancel_workflow(
    workflow_id: str = Path(..., description="工作流ID"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, str]]:
    """
    取消工作流
    """
    try:
        workflow_service = WorkflowService(db, redis)
        
        request = WorkflowRequest(
            operation=WorkflowOperation.CANCEL,
            workflow_id=workflow_id,
            user_id=current_user.id
        )
        
        result = await workflow_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data={"workflow_id": workflow_id, "status": "cancelled"},
                message="工作流取消成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "工作流取消失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"取消工作流时发生错误: {str(e)}"
        )


@router.get(
    "/{workflow_id}/executions",
    response_model=PaginatedResponse[Dict[str, Any]],
    summary="获取工作流执行历史",
    description="获取工作流的执行历史记录"
)
async def get_workflow_executions(
    workflow_id: str = Path(..., description="工作流ID"),
    skip: int = Query(0, ge=0, description="跳过的记录数"),
    limit: int = Query(20, ge=1, le=100, description="返回的记录数"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> PaginatedResponse[Dict[str, Any]]:
    """
    获取工作流执行历史
    """
    try:
        workflow_service = WorkflowService(db, redis)
        
        request = WorkflowRequest(
            operation=WorkflowOperation.HISTORY,
            workflow_id=workflow_id,
            user_id=current_user.id,
            filters={
                "skip": skip,
                "limit": limit
            }
        )
        
        result = await workflow_service.execute(request)
        
        if result.success:
            executions = result.data.executions or []
            total = result.data.total or 0
            
            return PaginatedResponse(
                success=True,
                data=executions,
                total=total,
                skip=skip,
                limit=limit,
                message="工作流执行历史获取成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "获取执行历史失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取工作流执行历史时发生错误: {str(e)}"
        )


@router.post(
    "/{workflow_id}/nodes",
    response_model=StandardResponse[Dict[str, Any]],
    summary="添加工作流节点",
    description="向工作流添加新的节点"
)
async def add_workflow_node(
    workflow_id: str = Path(..., description="工作流ID"),
    node_request: WorkflowNodeRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, Any]]:
    """
    添加工作流节点
    """
    try:
        workflow_service = WorkflowService(db, redis)
        
        request = WorkflowRequest(
            operation=WorkflowOperation.ADD_NODE,
            workflow_id=workflow_id,
            user_id=current_user.id,
            node_data={
                "node_type": node_request.node_type,
                "config": node_request.config,
                "position": node_request.position
            }
        )
        
        result = await workflow_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=result.data.node_result,
                message="工作流节点添加成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "工作流节点添加失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"添加工作流节点时发生错误: {str(e)}"
        )


@router.delete(
    "/{workflow_id}/nodes/{node_id}",
    response_model=StandardResponse[Dict[str, str]],
    summary="删除工作流节点",
    description="从工作流中删除指定节点"
)
async def remove_workflow_node(
    workflow_id: str = Path(..., description="工作流ID"),
    node_id: str = Path(..., description="节点ID"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, str]]:
    """
    删除工作流节点
    """
    try:
        workflow_service = WorkflowService(db, redis)
        
        request = WorkflowRequest(
            operation=WorkflowOperation.REMOVE_NODE,
            workflow_id=workflow_id,
            user_id=current_user.id,
            node_id=node_id
        )
        
        result = await workflow_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data={"workflow_id": workflow_id, "node_id": node_id, "status": "removed"},
                message="工作流节点删除成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "工作流节点删除失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"删除工作流节点时发生错误: {str(e)}"
        )


@router.get(
    "/statistics",
    response_model=StandardResponse[Dict[str, Any]],
    summary="获取工作流统计",
    description="获取用户的工作流统计信息"
)
async def get_workflow_statistics(
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, Any]]:
    """
    获取工作流统计
    """
    try:
        workflow_service = WorkflowService(db, redis)
        
        request = WorkflowRequest(
            operation=WorkflowOperation.STATISTICS,
            user_id=current_user.id
        )
        
        result = await workflow_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=result.data.statistics,
                message="工作流统计获取成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "获取工作流统计失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取工作流统计时发生错误: {str(e)}"
        )


# ==================== LangChain工作流API端点 ====================

@router.post(
    "/langchain/create",
    response_model=StandardResponse[Dict[str, str]],
    summary="创建LangChain工作流",
    description="从自然语言描述创建LangChain工作流"
)
async def create_langchain_workflow(
    request: CreateWorkflowRequest,
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, str]]:
    """
    创建LangChain工作流
    
    - **description**: 工作流的自然语言描述
    - **name**: 可选的工作流名称
    - **config**: 可选的额外配置
    """
    try:
        langchain_service = LangChainWorkflowService(redis)
        
        # 从自然语言描述创建工作流
        workflow_id = await langchain_service.create_workflow_from_description(
            description=request.description,
            name=request.name,
            config=request.config or {}
        )
        
        return StandardResponse(
            success=True,
            data={"workflow_id": workflow_id},
            message="LangChain工作流创建成功"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"创建LangChain工作流时发生错误: {str(e)}"
        )


@router.post(
    "/langchain/{workflow_id}/execute",
    response_model=StandardResponse[Dict[str, str]],
    summary="执行LangChain工作流",
    description="执行指定的LangChain工作流"
)
async def execute_langchain_workflow(
    workflow_id: str = Path(..., description="工作流ID"),
    request: ExecuteWorkflowRequest = Body(...),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, str]]:
    """
    执行LangChain工作流
    
    - **inputs**: 工作流输入参数
    """
    try:
        langchain_service = LangChainWorkflowService(redis)
        
        # 执行工作流
        execution_result = await langchain_service.execute_workflow(
            workflow_id=workflow_id,
            inputs=request.inputs
        )
        
        return StandardResponse(
            success=True,
            data={
                "execution_id": execution_result.execution_id,
                "status": execution_result.status,
                "message": execution_result.message or "工作流执行已启动"
            },
            message="LangChain工作流执行成功"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"执行LangChain工作流时发生错误: {str(e)}"
        )


@router.get(
    "/langchain/{execution_id}/status",
    response_model=StandardResponse[Dict[str, Any]],
    summary="获取LangChain工作流执行状态",
    description="获取LangChain工作流的执行状态"
)
async def get_langchain_workflow_status(
    execution_id: str = Path(..., description="执行ID"),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, Any]]:
    """
    获取LangChain工作流执行状态
    """
    try:
        langchain_service = LangChainWorkflowService(redis)
        
        # 获取执行状态
        status = await langchain_service.get_workflow_status(execution_id)
        
        if status is None:
            raise HTTPException(
                status_code=404,
                detail=f"执行ID {execution_id} 不存在"
            )
        
        return StandardResponse(
            success=True,
            data={
                "execution_id": status.execution_id,
                "workflow_id": status.workflow_id,
                "status": status.status,
                "result": status.result,
                "error": status.error,
                "start_time": status.start_time.isoformat() if status.start_time else None,
                "end_time": status.end_time.isoformat() if status.end_time else None,
                "duration": status.duration
            },
            message="获取LangChain工作流状态成功"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取LangChain工作流状态时发生错误: {str(e)}"
        )


@router.get(
    "/langchain",
    response_model=StandardResponse[List[Dict[str, Any]]],
    summary="列出LangChain工作流",
    description="获取所有LangChain工作流列表"
)
async def list_langchain_workflows(
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[List[Dict[str, Any]]]:
    """
    列出所有LangChain工作流
    """
    try:
        langchain_service = LangChainWorkflowService(redis)
        
        # 获取工作流列表
        workflows = await langchain_service.list_workflows()
        
        return StandardResponse(
            success=True,
            data=workflows,
            message="获取LangChain工作流列表成功"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取LangChain工作流列表时发生错误: {str(e)}"
        )


@router.delete(
    "/langchain/{workflow_id}",
    response_model=StandardResponse[Dict[str, str]],
    summary="删除LangChain工作流",
    description="删除指定的LangChain工作流"
)
async def delete_langchain_workflow(
    workflow_id: str = Path(..., description="工作流ID"),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, str]]:
    """
    删除LangChain工作流
    """
    try:
        langchain_service = LangChainWorkflowService(redis)
        
        # 删除工作流
        success = await langchain_service.delete_workflow(workflow_id)
        
        if not success:
            raise HTTPException(
                status_code=404,
                detail=f"工作流 {workflow_id} 不存在"
            )
        
        return StandardResponse(
            success=True,
            data={"workflow_id": workflow_id},
            message="LangChain工作流删除成功"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"删除LangChain工作流时发生错误: {str(e)}"
        )


@router.post(
    "/langchain/parse",
    response_model=StandardResponse[Dict[str, Any]],
    summary="解析自然语言工作流描述",
    description="将自然语言描述解析为工作流配置"
)
async def parse_langchain_workflow_description(
    description: str = Body(..., embed=True, description="自然语言工作流描述"),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, Any]]:
    """
    解析自然语言工作流描述
    
    - **description**: 自然语言工作流描述
    """
    try:
        langchain_service = LangChainWorkflowService(redis)
        
        # 解析工作流描述
        config = await langchain_service.parse_workflow_description(description)
        
        return StandardResponse(
            success=True,
            data={
                "name": config.name,
                "description": config.description,
                "type": config.type.value,
                "agents": config.agents,
                "tools": config.tools
            },
            message="自然语言工作流描述解析成功"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"解析自然语言工作流描述时发生错误: {str(e)}"
        )
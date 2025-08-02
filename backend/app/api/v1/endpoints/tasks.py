#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent任务API端点

本模块提供任务相关的RESTful API端点，支持任务的创建、
调度、执行、监控等功能。

核心功能：
- 任务CRUD操作
- 任务调度管理
- 任务执行控制
- 任务依赖管理
- 任务状态监控
- 任务性能分析

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
from app.models.task import Task, TaskStatus, TaskPriority, TaskType
from app.services.task_service import (
    TaskService, TaskRequest, TaskResponse, TaskOperation,
    ThinkingLevel, ThinkingMode, SchedulingStrategy, ExecutionMode
)
from app.api.v1.schemas.task import (
    TaskCreate, TaskUpdate, TaskInDB, TaskList,
    TaskExecuteRequest, TaskScheduleRequest,
    TaskDependencyRequest, TaskAnalysisResponse
)
from app.api.v1.schemas.common import (
    StandardResponse, PaginatedResponse, ErrorResponse
)

# 创建路由器
router = APIRouter()


@router.post(
    "/",
    response_model=StandardResponse[TaskInDB],
    summary="创建任务",
    description="创建一个新的任务"
)
async def create_task(
    task_data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[TaskInDB]:
    """
    创建新任务
    
    - **name**: 任务名称
    - **description**: 任务描述
    - **type**: 任务类型
    - **priority**: 任务优先级
    - **config**: 任务配置
    - **dependencies**: 任务依赖
    """
    try:
        # 创建任务服务实例
        task_service = TaskService(db, redis)
        
        # 构建请求
        request = TaskRequest(
            operation=TaskOperation.CREATE,
            task_data={
                "name": task_data.name,
                "description": task_data.description,
                "type": task_data.type,
                "priority": task_data.priority,
                "config": task_data.config,
                "dependencies": task_data.dependencies,
                "user_id": current_user.id
            }
        )
        
        # 执行创建操作
        result = await task_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=TaskInDB(**result.data.task_data),
                message="任务创建成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "任务创建失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"创建任务时发生错误: {str(e)}"
        )


@router.get(
    "/",
    response_model=PaginatedResponse[TaskList],
    summary="获取任务列表",
    description="获取当前用户的任务列表，支持分页和过滤"
)
async def list_tasks(
    skip: int = Query(0, ge=0, description="跳过的记录数"),
    limit: int = Query(20, ge=1, le=100, description="返回的记录数"),
    task_type: Optional[TaskType] = Query(None, description="任务类型过滤"),
    status: Optional[TaskStatus] = Query(None, description="状态过滤"),
    priority: Optional[TaskPriority] = Query(None, description="优先级过滤"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> PaginatedResponse[TaskList]:
    """
    获取任务列表
    
    支持以下过滤条件：
    - **task_type**: 按任务类型过滤
    - **status**: 按状态过滤
    - **priority**: 按优先级过滤
    - **search**: 按名称或描述搜索
    """
    try:
        task_service = TaskService(db, redis)
        
        request = TaskRequest(
            operation=TaskOperation.LIST,
            filters={
                "user_id": current_user.id,
                "task_type": task_type,
                "status": status,
                "priority": priority,
                "search": search,
                "skip": skip,
                "limit": limit
            }
        )
        
        result = await task_service.execute(request)
        
        if result.success:
            tasks_data = result.data.tasks or []
            total = result.data.total or 0
            
            return PaginatedResponse(
                success=True,
                data=[TaskList(**task) for task in tasks_data],
                total=total,
                skip=skip,
                limit=limit,
                message="任务列表获取成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "获取任务列表失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取任务列表时发生错误: {str(e)}"
        )


@router.get(
    "/{task_id}",
    response_model=StandardResponse[TaskInDB],
    summary="获取任务详情",
    description="根据ID获取任务的详细信息"
)
async def get_task(
    task_id: str = Path(..., description="任务ID"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[TaskInDB]:
    """
    获取任务详情
    """
    try:
        task_service = TaskService(db, redis)
        
        request = TaskRequest(
            operation=TaskOperation.GET,
            task_id=task_id,
            user_id=current_user.id
        )
        
        result = await task_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=TaskInDB(**result.data.task_data),
                message="任务详情获取成功"
            )
        else:
            raise HTTPException(
                status_code=404,
                detail=result.error or "任务不存在"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取任务详情时发生错误: {str(e)}"
        )


@router.put(
    "/{task_id}",
    response_model=StandardResponse[TaskInDB],
    summary="更新任务",
    description="更新任务的配置和信息"
)
async def update_task(
    task_id: str = Path(..., description="任务ID"),
    task_data: TaskUpdate = Body(...),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[TaskInDB]:
    """
    更新任务
    """
    try:
        task_service = TaskService(db, redis)
        
        request = TaskRequest(
            operation=TaskOperation.UPDATE,
            task_id=task_id,
            user_id=current_user.id,
            task_data=task_data.dict(exclude_unset=True)
        )
        
        result = await task_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=TaskInDB(**result.data.task_data),
                message="任务更新成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "任务更新失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"更新任务时发生错误: {str(e)}"
        )


@router.delete(
    "/{task_id}",
    response_model=StandardResponse[Dict[str, str]],
    summary="删除任务",
    description="删除指定的任务"
)
async def delete_task(
    task_id: str = Path(..., description="任务ID"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, str]]:
    """
    删除任务
    """
    try:
        task_service = TaskService(db, redis)
        
        request = TaskRequest(
            operation=TaskOperation.DELETE,
            task_id=task_id,
            user_id=current_user.id
        )
        
        result = await task_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data={"task_id": task_id, "status": "deleted"},
                message="任务删除成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "任务删除失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"删除任务时发生错误: {str(e)}"
        )


@router.post(
    "/{task_id}/execute",
    response_model=StandardResponse[Dict[str, Any]],
    summary="执行任务",
    description="执行指定的任务"
)
async def execute_task(
    task_id: str = Path(..., description="任务ID"),
    execute_request: TaskExecuteRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, Any]]:
    """
    执行任务
    """
    try:
        task_service = TaskService(db, redis)
        
        request = TaskRequest(
            operation=TaskOperation.EXECUTE,
            task_id=task_id,
            user_id=current_user.id,
            execution_data={
                "thinking_level": execute_request.thinking_level,
                "thinking_mode": execute_request.thinking_mode,
                "execution_mode": execute_request.execution_mode,
                "parameters": execute_request.parameters
            }
        )
        
        result = await task_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=result.data.execution_result,
                message="任务执行成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "任务执行失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"执行任务时发生错误: {str(e)}"
        )


@router.post(
    "/{task_id}/schedule",
    response_model=StandardResponse[Dict[str, Any]],
    summary="调度任务",
    description="设置任务的调度配置"
)
async def schedule_task(
    task_id: str = Path(..., description="任务ID"),
    schedule_request: TaskScheduleRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, Any]]:
    """
    调度任务
    """
    try:
        task_service = TaskService(db, redis)
        
        request = TaskRequest(
            operation=TaskOperation.SCHEDULE,
            task_id=task_id,
            user_id=current_user.id,
            schedule_data={
                "strategy": schedule_request.strategy,
                "schedule_time": schedule_request.schedule_time,
                "cron_expression": schedule_request.cron_expression,
                "parameters": schedule_request.parameters
            }
        )
        
        result = await task_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=result.data.schedule_result,
                message="任务调度设置成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "任务调度设置失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"调度任务时发生错误: {str(e)}"
        )


@router.post(
    "/{task_id}/dependencies",
    response_model=StandardResponse[Dict[str, Any]],
    summary="设置任务依赖",
    description="设置任务的依赖关系"
)
async def set_task_dependencies(
    task_id: str = Path(..., description="任务ID"),
    dependency_request: TaskDependencyRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, Any]]:
    """
    设置任务依赖
    """
    try:
        task_service = TaskService(db, redis)
        
        request = TaskRequest(
            operation=TaskOperation.DEPENDENCY,
            task_id=task_id,
            user_id=current_user.id,
            dependency_data={
                "dependency_ids": dependency_request.dependency_ids,
                "dependency_type": dependency_request.dependency_type,
                "parameters": dependency_request.parameters
            }
        )
        
        result = await task_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=result.data.dependency_result,
                message="任务依赖设置成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "任务依赖设置失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"设置任务依赖时发生错误: {str(e)}"
        )


@router.get(
    "/{task_id}/status",
    response_model=StandardResponse[Dict[str, Any]],
    summary="获取任务状态",
    description="获取任务的当前状态信息"
)
async def get_task_status(
    task_id: str = Path(..., description="任务ID"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, Any]]:
    """
    获取任务状态
    """
    try:
        task_service = TaskService(db, redis)
        
        request = TaskRequest(
            operation=TaskOperation.STATUS,
            task_id=task_id,
            user_id=current_user.id
        )
        
        result = await task_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=result.data.status_result,
                message="任务状态获取成功"
            )
        else:
            raise HTTPException(
                status_code=404,
                detail=result.error or "任务不存在"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取任务状态时发生错误: {str(e)}"
        )


@router.get(
    "/{task_id}/analysis",
    response_model=StandardResponse[TaskAnalysisResponse],
    summary="获取任务分析",
    description="获取任务的性能分析和统计信息"
)
async def get_task_analysis(
    task_id: str = Path(..., description="任务ID"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[TaskAnalysisResponse]:
    """
    获取任务分析
    """
    try:
        task_service = TaskService(db, redis)
        
        request = TaskRequest(
            operation=TaskOperation.ANALYZE,
            task_id=task_id,
            user_id=current_user.id
        )
        
        result = await task_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=TaskAnalysisResponse(**result.data.analysis_result),
                message="任务分析获取成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "获取任务分析失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取任务分析时发生错误: {str(e)}"
        )


@router.post(
    "/{task_id}/pause",
    response_model=StandardResponse[Dict[str, str]],
    summary="暂停任务",
    description="暂停正在执行的任务"
)
async def pause_task(
    task_id: str = Path(..., description="任务ID"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, str]]:
    """
    暂停任务
    """
    try:
        task_service = TaskService(db, redis)
        
        request = TaskRequest(
            operation=TaskOperation.PAUSE,
            task_id=task_id,
            user_id=current_user.id
        )
        
        result = await task_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data={"task_id": task_id, "status": "paused"},
                message="任务暂停成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "任务暂停失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"暂停任务时发生错误: {str(e)}"
        )


@router.post(
    "/{task_id}/resume",
    response_model=StandardResponse[Dict[str, str]],
    summary="恢复任务",
    description="恢复暂停的任务"
)
async def resume_task(
    task_id: str = Path(..., description="任务ID"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, str]]:
    """
    恢复任务
    """
    try:
        task_service = TaskService(db, redis)
        
        request = TaskRequest(
            operation=TaskOperation.RESUME,
            task_id=task_id,
            user_id=current_user.id
        )
        
        result = await task_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data={"task_id": task_id, "status": "resumed"},
                message="任务恢复成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "任务恢复失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"恢复任务时发生错误: {str(e)}"
        )


@router.post(
    "/{task_id}/cancel",
    response_model=StandardResponse[Dict[str, str]],
    summary="取消任务",
    description="取消正在执行或等待的任务"
)
async def cancel_task(
    task_id: str = Path(..., description="任务ID"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, str]]:
    """
    取消任务
    """
    try:
        task_service = TaskService(db, redis)
        
        request = TaskRequest(
            operation=TaskOperation.CANCEL,
            task_id=task_id,
            user_id=current_user.id
        )
        
        result = await task_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data={"task_id": task_id, "status": "cancelled"},
                message="任务取消成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "任务取消失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"取消任务时发生错误: {str(e)}"
        )


@router.get(
    "/{task_id}/executions",
    response_model=PaginatedResponse[Dict[str, Any]],
    summary="获取任务执行历史",
    description="获取任务的执行历史记录"
)
async def get_task_executions(
    task_id: str = Path(..., description="任务ID"),
    skip: int = Query(0, ge=0, description="跳过的记录数"),
    limit: int = Query(20, ge=1, le=100, description="返回的记录数"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> PaginatedResponse[Dict[str, Any]]:
    """
    获取任务执行历史
    """
    try:
        task_service = TaskService(db, redis)
        
        request = TaskRequest(
            operation=TaskOperation.HISTORY,
            task_id=task_id,
            user_id=current_user.id,
            filters={
                "skip": skip,
                "limit": limit
            }
        )
        
        result = await task_service.execute(request)
        
        if result.success:
            executions = result.data.executions or []
            total = result.data.total or 0
            
            return PaginatedResponse(
                success=True,
                data=executions,
                total=total,
                skip=skip,
                limit=limit,
                message="任务执行历史获取成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "获取执行历史失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取任务执行历史时发生错误: {str(e)}"
        )


@router.post(
    "/batch",
    response_model=StandardResponse[List[Dict[str, Any]]],
    summary="批量操作任务",
    description="对多个任务执行批量操作"
)
async def batch_tasks(
    task_ids: List[str] = Body(..., description="任务ID列表"),
    operation: str = Body(..., description="操作类型"),
    parameters: Optional[Dict[str, Any]] = Body(None, description="操作参数"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[List[Dict[str, Any]]]:
    """
    批量操作任务
    """
    try:
        task_service = TaskService(db, redis)
        
        request = TaskRequest(
            operation=TaskOperation.BATCH,
            user_id=current_user.id,
            batch_data={
                "task_ids": task_ids,
                "operation": operation,
                "parameters": parameters
            }
        )
        
        result = await task_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=result.data.batch_results,
                message="批量操作执行成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "批量操作执行失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"批量操作任务时发生错误: {str(e)}"
        )


@router.get(
    "/statistics",
    response_model=StandardResponse[Dict[str, Any]],
    summary="获取任务统计",
    description="获取用户的任务统计信息"
)
async def get_task_statistics(
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, Any]]:
    """
    获取任务统计
    """
    try:
        task_service = TaskService(db, redis)
        
        request = TaskRequest(
            operation=TaskOperation.STATISTICS,
            user_id=current_user.id
        )
        
        result = await task_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=result.data.statistics,
                message="任务统计获取成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "获取任务统计失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取任务统计时发生错误: {str(e)}"
        )
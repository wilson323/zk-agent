#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent工具API端点

本模块提供工具相关的RESTful API端点，支持工具的管理、
执行、组合、演化等功能。

核心功能：
- 工具CRUD操作
- 工具执行管理
- 工具组合编排
- 工具演化优化
- 工具银行管理
- 工具性能分析

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
from app.services.tool_service import (
    ToolService, ToolRequest, ToolResponse, ToolOperation,
    ToolType, ToolCategory, ToolStatus
)
from app.api.v1.schemas.tool import (
    ToolCreate, ToolUpdate, ToolInDB, ToolList,
    ToolExecuteRequest, ToolCompositionRequest,
    ToolEvolutionRequest, ToolAnalysisResponse
)
from app.api.v1.schemas.common import (
    StandardResponse, PaginatedResponse, ErrorResponse
)

# 创建路由器
router = APIRouter()


@router.post(
    "/",
    response_model=StandardResponse[ToolInDB],
    summary="创建工具",
    description="创建一个新的工具"
)
async def create_tool(
    tool_data: ToolCreate,
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[ToolInDB]:
    """
    创建新工具
    
    - **name**: 工具名称
    - **description**: 工具描述
    - **type**: 工具类型
    - **category**: 工具分类
    - **schema**: 工具模式定义
    - **implementation**: 工具实现代码
    """
    try:
        # 创建工具服务实例
        tool_service = ToolService(db, redis)
        
        # 构建请求
        request = ToolRequest(
            operation=ToolOperation.CREATE,
            tool_data={
                "name": tool_data.name,
                "description": tool_data.description,
                "type": tool_data.type,
                "category": tool_data.category,
                "schema": tool_data.schema,
                "implementation": tool_data.implementation,
                "user_id": current_user.id
            }
        )
        
        # 执行创建操作
        result = await tool_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=ToolInDB(**result.data.tool_data),
                message="工具创建成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "工具创建失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"创建工具时发生错误: {str(e)}"
        )


@router.get(
    "/",
    response_model=PaginatedResponse[ToolList],
    summary="获取工具列表",
    description="获取工具列表，支持分页和过滤"
)
async def list_tools(
    skip: int = Query(0, ge=0, description="跳过的记录数"),
    limit: int = Query(20, ge=1, le=100, description="返回的记录数"),
    tool_type: Optional[ToolType] = Query(None, description="工具类型过滤"),
    category: Optional[ToolCategory] = Query(None, description="工具分类过滤"),
    status: Optional[ToolStatus] = Query(None, description="状态过滤"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> PaginatedResponse[ToolList]:
    """
    获取工具列表
    
    支持以下过滤条件：
    - **tool_type**: 按工具类型过滤
    - **category**: 按工具分类过滤
    - **status**: 按状态过滤
    - **search**: 按名称或描述搜索
    """
    try:
        tool_service = ToolService(db, redis)
        
        request = ToolRequest(
            operation=ToolOperation.LIST,
            filters={
                "user_id": current_user.id,
                "tool_type": tool_type,
                "category": category,
                "status": status,
                "search": search,
                "skip": skip,
                "limit": limit
            }
        )
        
        result = await tool_service.execute(request)
        
        if result.success:
            tools_data = result.data.tools or []
            total = result.data.total or 0
            
            return PaginatedResponse(
                success=True,
                data=[ToolList(**tool) for tool in tools_data],
                total=total,
                skip=skip,
                limit=limit,
                message="工具列表获取成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "获取工具列表失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取工具列表时发生错误: {str(e)}"
        )


@router.get(
    "/{tool_id}",
    response_model=StandardResponse[ToolInDB],
    summary="获取工具详情",
    description="根据ID获取工具的详细信息"
)
async def get_tool(
    tool_id: str = Path(..., description="工具ID"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[ToolInDB]:
    """
    获取工具详情
    """
    try:
        tool_service = ToolService(db, redis)
        
        request = ToolRequest(
            operation=ToolOperation.GET,
            tool_id=tool_id,
            user_id=current_user.id
        )
        
        result = await tool_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=ToolInDB(**result.data.tool_data),
                message="工具详情获取成功"
            )
        else:
            raise HTTPException(
                status_code=404,
                detail=result.error or "工具不存在"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取工具详情时发生错误: {str(e)}"
        )


@router.put(
    "/{tool_id}",
    response_model=StandardResponse[ToolInDB],
    summary="更新工具",
    description="更新工具的配置和信息"
)
async def update_tool(
    tool_id: str = Path(..., description="工具ID"),
    tool_data: ToolUpdate = Body(...),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[ToolInDB]:
    """
    更新工具
    """
    try:
        tool_service = ToolService(db, redis)
        
        request = ToolRequest(
            operation=ToolOperation.UPDATE,
            tool_id=tool_id,
            user_id=current_user.id,
            tool_data=tool_data.dict(exclude_unset=True)
        )
        
        result = await tool_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=ToolInDB(**result.data.tool_data),
                message="工具更新成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "工具更新失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"更新工具时发生错误: {str(e)}"
        )


@router.delete(
    "/{tool_id}",
    response_model=StandardResponse[Dict[str, str]],
    summary="删除工具",
    description="删除指定的工具"
)
async def delete_tool(
    tool_id: str = Path(..., description="工具ID"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, str]]:
    """
    删除工具
    """
    try:
        tool_service = ToolService(db, redis)
        
        request = ToolRequest(
            operation=ToolOperation.DELETE,
            tool_id=tool_id,
            user_id=current_user.id
        )
        
        result = await tool_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data={"tool_id": tool_id, "status": "deleted"},
                message="工具删除成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "工具删除失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"删除工具时发生错误: {str(e)}"
        )


@router.post(
    "/{tool_id}/execute",
    response_model=StandardResponse[Dict[str, Any]],
    summary="执行工具",
    description="执行指定的工具"
)
async def execute_tool(
    tool_id: str = Path(..., description="工具ID"),
    execute_request: ToolExecuteRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, Any]]:
    """
    执行工具
    """
    try:
        tool_service = ToolService(db, redis)
        
        request = ToolRequest(
            operation=ToolOperation.EXECUTE,
            tool_id=tool_id,
            user_id=current_user.id,
            execution_data={
                "inputs": execute_request.inputs,
                "parameters": execute_request.parameters,
                "context": execute_request.context
            }
        )
        
        result = await tool_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=result.data.execution_result,
                message="工具执行成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "工具执行失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"执行工具时发生错误: {str(e)}"
        )


@router.post(
    "/compose",
    response_model=StandardResponse[ToolInDB],
    summary="组合工具",
    description="将多个工具组合成一个复合工具"
)
async def compose_tools(
    composition_request: ToolCompositionRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[ToolInDB]:
    """
    组合工具
    """
    try:
        tool_service = ToolService(db, redis)
        
        request = ToolRequest(
            operation=ToolOperation.COMPOSE,
            user_id=current_user.id,
            composition_data={
                "name": composition_request.name,
                "description": composition_request.description,
                "tool_ids": composition_request.tool_ids,
                "composition_type": composition_request.composition_type,
                "config": composition_request.config
            }
        )
        
        result = await tool_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=ToolInDB(**result.data.tool_data),
                message="工具组合成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "工具组合失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"组合工具时发生错误: {str(e)}"
        )


@router.post(
    "/{tool_id}/evolve",
    response_model=StandardResponse[ToolInDB],
    summary="演化工具",
    description="基于使用数据演化优化工具"
)
async def evolve_tool(
    tool_id: str = Path(..., description="工具ID"),
    evolution_request: ToolEvolutionRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[ToolInDB]:
    """
    演化工具
    """
    try:
        tool_service = ToolService(db, redis)
        
        request = ToolRequest(
            operation=ToolOperation.EVOLVE,
            tool_id=tool_id,
            user_id=current_user.id,
            evolution_data={
                "strategy": evolution_request.strategy,
                "parameters": evolution_request.parameters,
                "feedback_data": evolution_request.feedback_data
            }
        )
        
        result = await tool_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=ToolInDB(**result.data.tool_data),
                message="工具演化成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "工具演化失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"演化工具时发生错误: {str(e)}"
        )


@router.get(
    "/{tool_id}/metrics",
    response_model=StandardResponse[Dict[str, Any]],
    summary="获取工具指标",
    description="获取工具的性能指标和使用统计"
)
async def get_tool_metrics(
    tool_id: str = Path(..., description="工具ID"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, Any]]:
    """
    获取工具指标
    """
    try:
        tool_service = ToolService(db, redis)
        
        request = ToolRequest(
            operation=ToolOperation.METRICS,
            tool_id=tool_id,
            user_id=current_user.id
        )
        
        result = await tool_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=result.data.metrics,
                message="工具指标获取成功"
            )
        else:
            raise HTTPException(
                status_code=404,
                detail=result.error or "工具不存在"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取工具指标时发生错误: {str(e)}"
        )


@router.get(
    "/{tool_id}/analysis",
    response_model=StandardResponse[ToolAnalysisResponse],
    summary="获取工具分析",
    description="获取工具的详细分析报告"
)
async def get_tool_analysis(
    tool_id: str = Path(..., description="工具ID"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[ToolAnalysisResponse]:
    """
    获取工具分析
    """
    try:
        tool_service = ToolService(db, redis)
        
        request = ToolRequest(
            operation=ToolOperation.ANALYZE,
            tool_id=tool_id,
            user_id=current_user.id
        )
        
        result = await tool_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=ToolAnalysisResponse(**result.data.analysis_result),
                message="工具分析获取成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "获取工具分析失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取工具分析时发生错误: {str(e)}"
        )


@router.get(
    "/discover",
    response_model=PaginatedResponse[ToolList],
    summary="发现工具",
    description="基于需求发现推荐的工具"
)
async def discover_tools(
    query: str = Query(..., description="需求描述"),
    category: Optional[ToolCategory] = Query(None, description="工具分类过滤"),
    limit: int = Query(10, ge=1, le=50, description="返回的记录数"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> PaginatedResponse[ToolList]:
    """
    发现工具
    """
    try:
        tool_service = ToolService(db, redis)
        
        request = ToolRequest(
            operation=ToolOperation.DISCOVER,
            user_id=current_user.id,
            discovery_data={
                "query": query,
                "category": category,
                "limit": limit
            }
        )
        
        result = await tool_service.execute(request)
        
        if result.success:
            tools_data = result.data.tools or []
            total = len(tools_data)
            
            return PaginatedResponse(
                success=True,
                data=[ToolList(**tool) for tool in tools_data],
                total=total,
                skip=0,
                limit=limit,
                message="工具发现成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "工具发现失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"发现工具时发生错误: {str(e)}"
        )


@router.get(
    "/bank",
    response_model=PaginatedResponse[ToolList],
    summary="获取工具银行",
    description="获取工具银行中的所有可用工具"
)
async def get_tool_bank(
    skip: int = Query(0, ge=0, description="跳过的记录数"),
    limit: int = Query(20, ge=1, le=100, description="返回的记录数"),
    category: Optional[ToolCategory] = Query(None, description="工具分类过滤"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> PaginatedResponse[ToolList]:
    """
    获取工具银行
    """
    try:
        tool_service = ToolService(db, redis)
        
        request = ToolRequest(
            operation=ToolOperation.BANK,
            user_id=current_user.id,
            filters={
                "category": category,
                "search": search,
                "skip": skip,
                "limit": limit
            }
        )
        
        result = await tool_service.execute(request)
        
        if result.success:
            tools_data = result.data.tools or []
            total = result.data.total or 0
            
            return PaginatedResponse(
                success=True,
                data=[ToolList(**tool) for tool in tools_data],
                total=total,
                skip=skip,
                limit=limit,
                message="工具银行获取成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "获取工具银行失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取工具银行时发生错误: {str(e)}"
        )


@router.post(
    "/{tool_id}/validate",
    response_model=StandardResponse[Dict[str, Any]],
    summary="验证工具",
    description="验证工具的实现和配置"
)
async def validate_tool(
    tool_id: str = Path(..., description="工具ID"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, Any]]:
    """
    验证工具
    """
    try:
        tool_service = ToolService(db, redis)
        
        request = ToolRequest(
            operation=ToolOperation.VALIDATE,
            tool_id=tool_id,
            user_id=current_user.id
        )
        
        result = await tool_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=result.data.validation_result,
                message="工具验证完成"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "工具验证失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"验证工具时发生错误: {str(e)}"
        )


@router.get(
    "/categories",
    response_model=StandardResponse[List[Dict[str, Any]]],
    summary="获取工具分类",
    description="获取所有可用的工具分类"
)
async def get_tool_categories(
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[List[Dict[str, Any]]]:
    """
    获取工具分类
    """
    try:
        tool_service = ToolService(db, redis)
        
        request = ToolRequest(
            operation=ToolOperation.CATEGORIES,
            user_id=current_user.id
        )
        
        result = await tool_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=result.data.categories,
                message="工具分类获取成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "获取工具分类失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取工具分类时发生错误: {str(e)}"
        )


@router.get(
    "/statistics",
    response_model=StandardResponse[Dict[str, Any]],
    summary="获取工具统计",
    description="获取工具的统计信息"
)
async def get_tool_statistics(
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, Any]]:
    """
    获取工具统计
    """
    try:
        tool_service = ToolService(db, redis)
        
        request = ToolRequest(
            operation=ToolOperation.STATISTICS,
            user_id=current_user.id
        )
        
        result = await tool_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=result.data.statistics,
                message="工具统计获取成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "获取工具统计失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取工具统计时发生错误: {str(e)}"
        )
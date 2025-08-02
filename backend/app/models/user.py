#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent用户数据模型

本模块定义了ZK-Agent系统中用户相关的数据模型，包括用户基本信息、
角色权限、认证信息等。使用SQLAlchemy ORM进行数据库映射。

主要模型：
- User: 用户基本信息模型
- Role: 角色模型
- Permission: 权限模型
- UserRole: 用户角色关联模型
- RolePermission: 角色权限关联模型
- UserSession: 用户会话模型
- UserProfile: 用户详细资料模型

作者: ZK-Agent Team
创建时间: 2024-01-20
最后更新: 2024-01-20
"""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Table,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


# 用户角色关联表
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    Column("created_by", Integer, ForeignKey("users.id"), nullable=True),
)

# 角色权限关联表
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    Column("created_by", Integer, ForeignKey("users.id"), nullable=True),
)


class User(Base):
    """
    用户模型
    
    存储用户的基本信息和认证数据。
    """
    
    __tablename__ = "users"
    
    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    
    # 基本信息
    username: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=False,
        comment="用户名"
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
        comment="邮箱地址"
    )
    full_name: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="全名"
    )
    
    # 认证信息
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="加密后的密码"
    )
    
    # 状态信息
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="是否激活"
    )
    is_superuser: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="是否超级用户"
    )
    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="是否已验证邮箱"
    )
    
    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="创建时间"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="更新时间"
    )
    last_login_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="最后登录时间"
    )
    
    # 安全信息
    failed_login_attempts: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="失败登录次数"
    )
    locked_until: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="锁定到期时间"
    )
    password_changed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="密码修改时间"
    )
    
    # 关联关系
    roles: Mapped[List["Role"]] = relationship(
        "Role",
        secondary=user_roles,
        back_populates="users",
        lazy="selectin"
    )
    
    profile: Mapped[Optional["UserProfile"]] = relationship(
        "UserProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )
    
    sessions: Mapped[List["UserSession"]] = relationship(
        "UserSession",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    
    api_keys: Mapped[List["ApiKey"]] = relationship(
        "ApiKey",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    
    # 索引
    __table_args__ = (
        Index("idx_user_email_active", "email", "is_active"),
        Index("idx_user_username_active", "username", "is_active"),
        Index("idx_user_created_at", "created_at"),
    )
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, username='{self.username}', email='{self.email}')>"
    
    @property
    def is_locked(self) -> bool:
        """检查用户是否被锁定"""
        if self.locked_until is None:
            return False
        return datetime.utcnow() < self.locked_until
    
    def get_permissions(self) -> List[str]:
        """获取用户所有权限"""
        permissions = set()
        for role in self.roles:
            for permission in role.permissions:
                permissions.add(permission.name)
        return list(permissions)
    
    def has_permission(self, permission_name: str) -> bool:
        """检查用户是否有指定权限"""
        if self.is_superuser:
            return True
        return permission_name in self.get_permissions()
    
    def has_role(self, role_name: str) -> bool:
        """检查用户是否有指定角色"""
        return any(role.name == role_name for role in self.roles)


class Role(Base):
    """
    角色模型
    
    定义系统中的角色信息。
    """
    
    __tablename__ = "roles"
    
    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    
    # 基本信息
    name: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=False,
        comment="角色名称"
    )
    display_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="显示名称"
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="角色描述"
    )
    
    # 状态信息
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="是否激活"
    )
    is_system: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="是否系统角色"
    )
    
    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="创建时间"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="更新时间"
    )
    
    # 关联关系
    users: Mapped[List[User]] = relationship(
        "User",
        secondary=user_roles,
        back_populates="roles"
    )
    
    permissions: Mapped[List["Permission"]] = relationship(
        "Permission",
        secondary=role_permissions,
        back_populates="roles",
        lazy="selectin"
    )
    
    def __repr__(self) -> str:
        return f"<Role(id={self.id}, name='{self.name}', display_name='{self.display_name}')>"


class Permission(Base):
    """
    权限模型
    
    定义系统中的权限信息。
    """
    
    __tablename__ = "permissions"
    
    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    
    # 基本信息
    name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
        comment="权限名称"
    )
    display_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="显示名称"
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="权限描述"
    )
    
    # 分类信息
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="权限分类"
    )
    resource: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="资源名称"
    )
    action: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="操作名称"
    )
    
    # 状态信息
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="是否激活"
    )
    is_system: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="是否系统权限"
    )
    
    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="创建时间"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="更新时间"
    )
    
    # 关联关系
    roles: Mapped[List[Role]] = relationship(
        "Role",
        secondary=role_permissions,
        back_populates="permissions"
    )
    
    # 索引
    __table_args__ = (
        Index("idx_permission_category", "category"),
        Index("idx_permission_resource_action", "resource", "action"),
        UniqueConstraint("resource", "action", name="uq_permission_resource_action"),
    )
    
    def __repr__(self) -> str:
        return f"<Permission(id={self.id}, name='{self.name}', resource='{self.resource}', action='{self.action}')>"


class UserProfile(Base):
    """
    用户详细资料模型
    
    存储用户的详细信息和偏好设置。
    """
    
    __tablename__ = "user_profiles"
    
    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        comment="用户ID"
    )
    
    # 个人信息
    avatar_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        comment="头像URL"
    )
    bio: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="个人简介"
    )
    location: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="所在地"
    )
    website: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        comment="个人网站"
    )
    phone: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
        comment="电话号码"
    )
    
    # 偏好设置
    language: Mapped[str] = mapped_column(
        String(10),
        default="zh-CN",
        nullable=False,
        comment="语言偏好"
    )
    timezone: Mapped[str] = mapped_column(
        String(50),
        default="Asia/Shanghai",
        nullable=False,
        comment="时区"
    )
    theme: Mapped[str] = mapped_column(
        String(20),
        default="light",
        nullable=False,
        comment="主题偏好"
    )
    
    # 通知设置
    email_notifications: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="邮件通知"
    )
    push_notifications: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="推送通知"
    )
    
    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="创建时间"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="更新时间"
    )
    
    # 关联关系
    user: Mapped[User] = relationship(
        "User",
        back_populates="profile"
    )
    
    def __repr__(self) -> str:
        return f"<UserProfile(id={self.id}, user_id={self.user_id})>"


class UserSession(Base):
    """
    用户会话模型
    
    记录用户的登录会话信息。
    """
    
    __tablename__ = "user_sessions"
    
    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="用户ID"
    )
    
    # 会话信息
    session_id: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
        comment="会话ID"
    )
    refresh_token_jti: Mapped[Optional[str]] = mapped_column(
        String(255),
        index=True,
        nullable=True,
        comment="刷新令牌JTI"
    )
    
    # 设备信息
    user_agent: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="用户代理"
    )
    ip_address: Mapped[Optional[str]] = mapped_column(
        String(45),
        nullable=True,
        comment="IP地址"
    )
    device_type: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        comment="设备类型"
    )
    device_name: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="设备名称"
    )
    
    # 状态信息
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="是否活跃"
    )
    
    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="创建时间"
    )
    last_activity_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="最后活动时间"
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="过期时间"
    )
    
    # 关联关系
    user: Mapped[User] = relationship(
        "User",
        back_populates="sessions"
    )
    
    # 索引
    __table_args__ = (
        Index("idx_session_user_active", "user_id", "is_active"),
        Index("idx_session_expires_at", "expires_at"),
    )
    
    def __repr__(self) -> str:
        return f"<UserSession(id={self.id}, user_id={self.user_id}, session_id='{self.session_id[:8]}...')>"
    
    @property
    def is_expired(self) -> bool:
        """检查会话是否过期"""
        return datetime.utcnow() > self.expires_at


class ApiKey(Base):
    """
    API密钥模型
    
    管理用户的API访问密钥。
    """
    
    __tablename__ = "api_keys"
    
    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="用户ID"
    )
    
    # 密钥信息
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="密钥名称"
    )
    key_hash: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
        comment="密钥哈希"
    )
    prefix: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        comment="密钥前缀"
    )
    
    # 权限信息
    scopes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="权限范围（JSON格式）"
    )
    
    # 状态信息
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="是否激活"
    )
    
    # 使用统计
    last_used_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="最后使用时间"
    )
    usage_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="使用次数"
    )
    
    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="创建时间"
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="过期时间"
    )
    
    # 关联关系
    user: Mapped[User] = relationship(
        "User",
        back_populates="api_keys"
    )
    
    # 索引
    __table_args__ = (
        Index("idx_api_key_user_active", "user_id", "is_active"),
        Index("idx_api_key_expires_at", "expires_at"),
        UniqueConstraint("user_id", "name", name="uq_api_key_user_name"),
    )
    
    def __repr__(self) -> str:
        return f"<ApiKey(id={self.id}, user_id={self.user_id}, name='{self.name}', prefix='{self.prefix}')>"
    
    @property
    def is_expired(self) -> bool:
        """检查API密钥是否过期"""
        if self.expires_at is None:
            return False
        return datetime.utcnow() > self.expires_at
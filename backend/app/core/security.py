#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent安全认证模块

本模块负责管理ZK-Agent后端服务的安全认证功能，包括JWT令牌管理、
密码加密验证、权限控制、安全中间件等。提供全面的安全防护能力。

主要功能：
- JWT令牌生成和验证
- 密码加密和验证
- 用户权限管理
- API访问控制
- 安全中间件
- 多因素认证支持
- 会话管理

作者: ZK-Agent Team
创建时间: 2024-01-20
最后更新: 2024-01-20
"""

import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union

import bcrypt
import jwt
from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr

from app.core.config import settings
from app.core.redis import redis_manager

# 密码加密上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer认证
security = HTTPBearer()


class TokenData(BaseModel):
    """
    令牌数据模型
    
    用于存储JWT令牌中的用户信息。
    """
    user_id: int
    username: str
    email: EmailStr
    roles: List[str] = []
    permissions: List[str] = []
    is_active: bool = True
    is_superuser: bool = False
    exp: Optional[datetime] = None
    iat: Optional[datetime] = None
    jti: Optional[str] = None  # JWT ID


class TokenPair(BaseModel):
    """
    令牌对模型
    
    包含访问令牌和刷新令牌。
    """
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class SecurityManager:
    """
    安全管理器
    
    负责管理JWT令牌、密码加密、权限验证等安全功能。
    """
    
    def __init__(self):
        """初始化安全管理器"""
        self.secret_key = settings.SECRET_KEY
        self.algorithm = settings.ALGORITHM
        self.access_token_expire_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
        self.refresh_token_expire_days = settings.REFRESH_TOKEN_EXPIRE_DAYS
        
        # 黑名单令牌前缀
        self.blacklist_prefix = "blacklist:token:"
        
        # 刷新令牌前缀
        self.refresh_prefix = "refresh:token:"
        
        # 用户会话前缀
        self.session_prefix = "session:user:"
    
    # ==================== 密码管理 ====================
    
    def hash_password(self, password: str) -> str:
        """
        加密密码
        
        Args:
            password: 明文密码
            
        Returns:
            str: 加密后的密码哈希
        """
        return pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """
        验证密码
        
        Args:
            plain_password: 明文密码
            hashed_password: 加密后的密码哈希
            
        Returns:
            bool: 密码是否正确
        """
        return pwd_context.verify(plain_password, hashed_password)
    
    def validate_password_strength(self, password: str) -> Dict[str, Any]:
        """
        验证密码强度
        
        Args:
            password: 密码
            
        Returns:
            Dict[str, Any]: 验证结果
        """
        errors = []
        
        # 检查长度
        if len(password) < settings.PASSWORD_MIN_LENGTH:
            errors.append(f"密码长度至少{settings.PASSWORD_MIN_LENGTH}位")
        
        # 检查大写字母
        if settings.PASSWORD_REQUIRE_UPPERCASE and not any(c.isupper() for c in password):
            errors.append("密码必须包含大写字母")
        
        # 检查小写字母
        if settings.PASSWORD_REQUIRE_LOWERCASE and not any(c.islower() for c in password):
            errors.append("密码必须包含小写字母")
        
        # 检查数字
        if settings.PASSWORD_REQUIRE_NUMBERS and not any(c.isdigit() for c in password):
            errors.append("密码必须包含数字")
        
        # 检查特殊字符
        if settings.PASSWORD_REQUIRE_SPECIAL:
            special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
            if not any(c in special_chars for c in password):
                errors.append("密码必须包含特殊字符")
        
        return {
            "is_valid": len(errors) == 0,
            "errors": errors,
            "strength": self._calculate_password_strength(password)
        }
    
    def _calculate_password_strength(self, password: str) -> str:
        """
        计算密码强度
        
        Args:
            password: 密码
            
        Returns:
            str: 密码强度等级
        """
        score = 0
        
        # 长度评分
        if len(password) >= 8:
            score += 1
        if len(password) >= 12:
            score += 1
        if len(password) >= 16:
            score += 1
        
        # 字符类型评分
        if any(c.isupper() for c in password):
            score += 1
        if any(c.islower() for c in password):
            score += 1
        if any(c.isdigit() for c in password):
            score += 1
        if any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            score += 1
        
        # 复杂度评分
        if len(set(password)) > len(password) * 0.7:  # 字符多样性
            score += 1
        
        if score <= 2:
            return "weak"
        elif score <= 5:
            return "medium"
        else:
            return "strong"
    
    # ==================== JWT令牌管理 ====================
    
    def create_access_token(
        self,
        data: Dict[str, Any],
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """
        创建访问令牌
        
        Args:
            data: 令牌数据
            expires_delta: 过期时间增量
            
        Returns:
            str: JWT访问令牌
        """
        to_encode = data.copy()
        
        # 设置过期时间
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        
        # 添加标准声明
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "access",
            "jti": secrets.token_urlsafe(16),  # JWT ID
        })
        
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    def create_refresh_token(
        self,
        data: Dict[str, Any],
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """
        创建刷新令牌
        
        Args:
            data: 令牌数据
            expires_delta: 过期时间增量
            
        Returns:
            str: JWT刷新令牌
        """
        to_encode = data.copy()
        
        # 设置过期时间
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(days=self.refresh_token_expire_days)
        
        # 添加标准声明
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "refresh",
            "jti": secrets.token_urlsafe(16),
        })
        
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    async def create_token_pair(self, user_data: Dict[str, Any]) -> TokenPair:
        """
        创建令牌对
        
        Args:
            user_data: 用户数据
            
        Returns:
            TokenPair: 令牌对
        """
        # 创建访问令牌
        access_token = self.create_access_token(user_data)
        
        # 创建刷新令牌
        refresh_token = self.create_refresh_token({
            "user_id": user_data["user_id"],
            "username": user_data["username"]
        })
        
        # 存储刷新令牌到Redis
        refresh_payload = jwt.decode(
            refresh_token,
            self.secret_key,
            algorithms=[self.algorithm]
        )
        
        await redis_manager.set(
            f"{self.refresh_prefix}{refresh_payload['jti']}",
            {
                "user_id": user_data["user_id"],
                "username": user_data["username"],
                "created_at": datetime.utcnow().isoformat()
            },
            ttl=self.refresh_token_expire_days * 24 * 3600
        )
        
        return TokenPair(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=self.access_token_expire_minutes * 60
        )
    
    async def verify_token(self, token: str) -> TokenData:
        """
        验证JWT令牌
        
        Args:
            token: JWT令牌
            
        Returns:
            TokenData: 令牌数据
            
        Raises:
            HTTPException: 令牌无效或过期
        """
        try:
            # 解码令牌
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm]
            )
            
            # 检查令牌类型
            if payload.get("type") != "access":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="无效的令牌类型"
                )
            
            # 检查令牌是否在黑名单中
            jti = payload.get("jti")
            if jti and await redis_manager.exists(f"{self.blacklist_prefix}{jti}"):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="令牌已被撤销"
                )
            
            # 创建令牌数据
            token_data = TokenData(
                user_id=payload.get("user_id"),
                username=payload.get("username"),
                email=payload.get("email"),
                roles=payload.get("roles", []),
                permissions=payload.get("permissions", []),
                is_active=payload.get("is_active", True),
                is_superuser=payload.get("is_superuser", False),
                exp=datetime.fromtimestamp(payload.get("exp")),
                iat=datetime.fromtimestamp(payload.get("iat")),
                jti=jti
            )
            
            return token_data
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="令牌已过期"
            )
        except jwt.JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效的令牌"
            )
    
    async def refresh_access_token(self, refresh_token: str) -> TokenPair:
        """
        刷新访问令牌
        
        Args:
            refresh_token: 刷新令牌
            
        Returns:
            TokenPair: 新的令牌对
            
        Raises:
            HTTPException: 刷新令牌无效或过期
        """
        try:
            # 解码刷新令牌
            payload = jwt.decode(
                refresh_token,
                self.secret_key,
                algorithms=[self.algorithm]
            )
            
            # 检查令牌类型
            if payload.get("type") != "refresh":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="无效的刷新令牌类型"
                )
            
            # 检查刷新令牌是否存在于Redis中
            jti = payload.get("jti")
            stored_data = await redis_manager.get(f"{self.refresh_prefix}{jti}")
            
            if not stored_data:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="刷新令牌已失效"
                )
            
            # 获取用户信息（这里应该从数据库获取最新的用户信息）
            user_data = {
                "user_id": payload.get("user_id"),
                "username": payload.get("username"),
                "email": stored_data.get("email", ""),
                "roles": stored_data.get("roles", []),
                "permissions": stored_data.get("permissions", []),
                "is_active": stored_data.get("is_active", True),
                "is_superuser": stored_data.get("is_superuser", False)
            }
            
            # 创建新的令牌对
            return await self.create_token_pair(user_data)
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="刷新令牌已过期"
            )
        except jwt.JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效的刷新令牌"
            )
    
    async def revoke_token(self, token: str) -> bool:
        """
        撤销令牌
        
        Args:
            token: 要撤销的令牌
            
        Returns:
            bool: 是否撤销成功
        """
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm],
                options={"verify_exp": False}  # 允许过期的令牌
            )
            
            jti = payload.get("jti")
            if not jti:
                return False
            
            # 计算剩余过期时间
            exp = payload.get("exp")
            if exp:
                ttl = max(0, exp - datetime.utcnow().timestamp())
                await redis_manager.set(
                    f"{self.blacklist_prefix}{jti}",
                    {"revoked_at": datetime.utcnow().isoformat()},
                    ttl=int(ttl)
                )
            
            # 如果是刷新令牌，也要删除存储的数据
            if payload.get("type") == "refresh":
                await redis_manager.delete(f"{self.refresh_prefix}{jti}")
            
            return True
            
        except jwt.JWTError:
            return False
    
    async def revoke_all_user_tokens(self, user_id: int) -> bool:
        """
        撤销用户的所有令牌
        
        Args:
            user_id: 用户ID
            
        Returns:
            bool: 是否撤销成功
        """
        try:
            # 删除用户的所有刷新令牌
            pattern = f"{self.refresh_prefix}*"
            keys = await redis_manager.keys(pattern)
            
            for key in keys:
                data = await redis_manager.get(key)
                if data and data.get("user_id") == user_id:
                    await redis_manager.delete(key)
            
            # 删除用户会话
            await redis_manager.delete(f"{self.session_prefix}{user_id}")
            
            return True
            
        except Exception:
            return False
    
    # ==================== 权限管理 ====================
    
    def check_permission(self, user_permissions: List[str], required_permission: str) -> bool:
        """
        检查用户权限
        
        Args:
            user_permissions: 用户权限列表
            required_permission: 所需权限
            
        Returns:
            bool: 是否有权限
        """
        # 超级用户拥有所有权限
        if "admin" in user_permissions or "superuser" in user_permissions:
            return True
        
        # 检查具体权限
        return required_permission in user_permissions
    
    def check_role(self, user_roles: List[str], required_role: str) -> bool:
        """
        检查用户角色
        
        Args:
            user_roles: 用户角色列表
            required_role: 所需角色
            
        Returns:
            bool: 是否有角色
        """
        return required_role in user_roles
    
    # ==================== 会话管理 ====================
    
    async def create_session(self, user_id: int, session_data: Dict[str, Any]) -> str:
        """
        创建用户会话
        
        Args:
            user_id: 用户ID
            session_data: 会话数据
            
        Returns:
            str: 会话ID
        """
        session_id = secrets.token_urlsafe(32)
        
        await redis_manager.set(
            f"{self.session_prefix}{user_id}",
            {
                "session_id": session_id,
                "created_at": datetime.utcnow().isoformat(),
                "last_activity": datetime.utcnow().isoformat(),
                **session_data
            },
            ttl=24 * 3600  # 24小时
        )
        
        return session_id
    
    async def get_session(self, user_id: int) -> Optional[Dict[str, Any]]:
        """
        获取用户会话
        
        Args:
            user_id: 用户ID
            
        Returns:
            Optional[Dict[str, Any]]: 会话数据
        """
        return await redis_manager.get(f"{self.session_prefix}{user_id}")
    
    async def update_session_activity(self, user_id: int) -> bool:
        """
        更新会话活动时间
        
        Args:
            user_id: 用户ID
            
        Returns:
            bool: 是否更新成功
        """
        session_data = await self.get_session(user_id)
        if session_data:
            session_data["last_activity"] = datetime.utcnow().isoformat()
            return await redis_manager.set(
                f"{self.session_prefix}{user_id}",
                session_data,
                ttl=24 * 3600
            )
        return False
    
    async def delete_session(self, user_id: int) -> bool:
        """
        删除用户会话
        
        Args:
            user_id: 用户ID
            
        Returns:
            bool: 是否删除成功
        """
        result = await redis_manager.delete(f"{self.session_prefix}{user_id}")
        return result > 0
    
    # ==================== 工具方法 ====================
    
    def generate_api_key(self, length: int = 32) -> str:
        """
        生成API密钥
        
        Args:
            length: 密钥长度
            
        Returns:
            str: API密钥
        """
        return secrets.token_urlsafe(length)
    
    def hash_api_key(self, api_key: str) -> str:
        """
        哈希API密钥
        
        Args:
            api_key: API密钥
            
        Returns:
            str: 哈希后的API密钥
        """
        return hashlib.sha256(api_key.encode()).hexdigest()
    
    def generate_csrf_token(self) -> str:
        """
        生成CSRF令牌
        
        Returns:
            str: CSRF令牌
        """
        return secrets.token_urlsafe(32)


# 全局安全管理器实例
security_manager = SecurityManager()


# 依赖注入函数
async def get_current_user(credentials: HTTPAuthorizationCredentials = security) -> TokenData:
    """
    获取当前用户
    
    FastAPI依赖注入函数，用于验证JWT令牌并获取用户信息。
    
    Args:
        credentials: HTTP认证凭据
        
    Returns:
        TokenData: 当前用户数据
    """
    token_data = await security_manager.verify_token(credentials.credentials)
    
    # 更新会话活动时间
    await security_manager.update_session_activity(token_data.user_id)
    
    return token_data


async def get_current_active_user(current_user: TokenData = get_current_user) -> TokenData:
    """
    获取当前活跃用户
    
    Args:
        current_user: 当前用户
        
    Returns:
        TokenData: 当前活跃用户数据
        
    Raises:
        HTTPException: 用户未激活
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户账户未激活"
        )
    return current_user


async def get_current_superuser(current_user: TokenData = get_current_active_user) -> TokenData:
    """
    获取当前超级用户
    
    Args:
        current_user: 当前用户
        
    Returns:
        TokenData: 当前超级用户数据
        
    Raises:
        HTTPException: 用户不是超级用户
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权限不足，需要超级用户权限"
        )
    return current_user


def require_permission(permission: str):
    """
    权限装饰器工厂
    
    Args:
        permission: 所需权限
        
    Returns:
        Callable: 权限检查依赖
    """
    async def check_permission(current_user: TokenData = get_current_active_user) -> TokenData:
        if not security_manager.check_permission(current_user.permissions, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"权限不足，需要权限: {permission}"
            )
        return current_user
    
    return check_permission


def require_role(role: str):
    """
    角色装饰器工厂
    
    Args:
        role: 所需角色
        
    Returns:
        Callable: 角色检查依赖
    """
    async def check_role(current_user: TokenData = get_current_active_user) -> TokenData:
        if not security_manager.check_role(current_user.roles, role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"权限不足，需要角色: {role}"
            )
        return current_user
    
    return check_role
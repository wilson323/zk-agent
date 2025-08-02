#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent数据库初始化脚本

用于创建PostgreSQL数据库用户和数据库，解决启动时的认证问题。
"""

import asyncio
import asyncpg
import sys
from typing import Optional


class DatabaseSetup:
    """数据库设置类"""
    
    def __init__(self, 
                 host: str = "localhost",
                 port: int = 5432,
                 admin_user: str = "postgres",
                 admin_password: str = "postgres"):
        self.host = host
        self.port = port
        self.admin_user = admin_user
        self.admin_password = admin_password
        
    async def create_user_and_database(self,
                                      username: str = "zkagent",
                                      password: str = "zkagent123",
                                      database: str = "zkagent") -> bool:
        """
        创建用户和数据库
        
        Args:
            username: 用户名
            password: 密码
            database: 数据库名
            
        Returns:
            bool: 是否成功
        """
        try:
            # 连接到PostgreSQL服务器
            conn = await asyncpg.connect(
                host=self.host,
                port=self.port,
                user=self.admin_user,
                password=self.admin_password,
                database="postgres"
            )
            
            print(f"已连接到PostgreSQL服务器 {self.host}:{self.port}")
            
            # 检查用户是否存在
            user_exists = await conn.fetchval(
                "SELECT 1 FROM pg_roles WHERE rolname = $1", username
            )
            
            if not user_exists:
                # 创建用户
                await conn.execute(f"""
                    CREATE USER {username} WITH 
                    PASSWORD '{password}'
                    CREATEDB
                    LOGIN;
                """)
                print(f"用户 '{username}' 创建成功")
            else:
                print(f"用户 '{username}' 已存在")
                
            # 检查数据库是否存在
            db_exists = await conn.fetchval(
                "SELECT 1 FROM pg_database WHERE datname = $1", database
            )
            
            if not db_exists:
                # 创建数据库
                await conn.execute(f"CREATE DATABASE {database} OWNER {username};")
                print(f"数据库 '{database}' 创建成功")
            else:
                print(f"数据库 '{database}' 已存在")
                
            # 授予权限
            await conn.execute(f"GRANT ALL PRIVILEGES ON DATABASE {database} TO {username};")
            print(f"已授予用户 '{username}' 对数据库 '{database}' 的所有权限")
            
            await conn.close()
            return True
            
        except Exception as e:
            print(f"数据库设置失败: {e}")
            return False
            
    async def test_connection(self,
                            username: str = "zkagent",
                            password: str = "zkagent123",
                            database: str = "zkagent") -> bool:
        """
        测试数据库连接
        
        Args:
            username: 用户名
            password: 密码
            database: 数据库名
            
        Returns:
            bool: 连接是否成功
        """
        try:
            conn = await asyncpg.connect(
                host=self.host,
                port=self.port,
                user=username,
                password=password,
                database=database
            )
            
            # 测试查询
            result = await conn.fetchval("SELECT version();")
            print(f"数据库连接测试成功: {result[:50]}...")
            
            await conn.close()
            return True
            
        except Exception as e:
            print(f"数据库连接测试失败: {e}")
            return False


async def main():
    """主函数"""
    print("ZK-Agent数据库初始化脚本")
    print("=" * 40)
    
    # 获取管理员凭据
    admin_password = input("请输入PostgreSQL管理员(postgres)密码: ").strip()
    if not admin_password:
        admin_password = "postgres"
        
    setup = DatabaseSetup(admin_password=admin_password)
    
    # 创建用户和数据库
    success = await setup.create_user_and_database()
    
    if success:
        print("\n数据库设置完成，正在测试连接...")
        test_success = await setup.test_connection()
        
        if test_success:
            print("\n✅ 数据库初始化成功！")
            print("现在可以启动ZK-Agent后端服务了。")
        else:
            print("\n❌ 数据库连接测试失败")
            sys.exit(1)
    else:
        print("\n❌ 数据库设置失败")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
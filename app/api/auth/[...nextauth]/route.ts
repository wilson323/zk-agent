/**
 * @file NextAuth Configuration
 * @description NextAuth.js 认证配置和路由处理
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getLogger } from '@/lib/utils/logger';
import { verifyPassword } from '@/lib/auth/password-utils';
import { getUserByEmail } from '@/lib/services/user-service';

const logger = getLogger();

/**
 * NextAuth 配置选项
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            logger.warn('登录尝试缺少凭据');
            return null;
          }

          // 获取用户信息
          const user = await getUserByEmail(credentials.email);
          if (!user) {
            logger.warn({ message: '用户不存在', email: credentials.email });
            return null;
          }

          // 验证密码
          const isValidPassword = await verifyPassword(
            credentials.password,
            user.password
          );

          if (!isValidPassword) {
            logger.warn('密码验证失败:', credentials.email);
            return null;
          }

          logger.info('用户登录成功:', credentials.email);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          };
        } catch (error) {
          logger.error('认证过程中发生错误:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24小时
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24小时
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.TT;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/login',
    signUp: '/auth/register',
    error: '/auth/error'
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key',
  debug: process.env.NODE_ENV === 'development'
};

/**
 * NextAuth 处理器
 */
const handler = NextAuth(authOptions);

/**
 * 导出 GET 和 POST 处理器
 */
export { handler as GET, handler as POST };

/**
 * 默认导出
 */
export default handler;
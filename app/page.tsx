// @ts-nocheck
/**
 * @file 主页面重定向
 * @description 将根路径重定向到用户端页面
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import { redirect } from 'next/navigation';

export default function RootPage() {
  // 重定向到用户端主页
  redirect('/user');
}

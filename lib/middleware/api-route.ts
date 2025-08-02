/**
 * @file API Route 别名导出
 * @description 为了兼容现有导入路径而创建的别名文件
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

// 从 api-route-wrapper 导出主要功能
export { 
  createApiRoute, 
  ApiResponseWrapper,
  CommonValidations,
  RouteConfigs
} from './api-route-wrapper';

// 导出类型
export type { ApiRouteConfig } from './api-route-wrapper';
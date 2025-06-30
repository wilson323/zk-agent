/**
 * @file proxy\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      // Get the URL from the query parameter
      const url = _validatedQuery?.url as string;
      
      if (!url) {
        return ApiResponseWrapper.error('URL parameter is required', 400);
      }
      
      // Construct the full URL
      const fullUrl = url.startsWith("http") ? url : `https://${url}`;
      
      // Forward the request to the target URL
      const response = await fetch(fullUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: req.headers.get("Authorization") || "",
        },
      });
      
      // Return the response from the target URL
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          "Content-Type": response.headers.get("Content-Type") || "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      console.error('Proxy GET request failed:', error);
      return ApiResponseWrapper.error('Proxy request failed', 500);
    }
  }
);

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      // 获取请求路径
      const url = new URL(req.url);
      const path = url.pathname.replace("/api/proxy", "");
      
      // 获取环境变量
      const apiUrl = process.env.FASTGPT_API_URL;
      const apiKey = process.env.FASTGPT_API_KEY;
      
      if (!apiUrl || !apiKey) {
        return ApiResponseWrapper.error('FastGPT API configuration is missing', 500);
      }
      
      // Get the request body
      const body = _validatedBody || {};
      
      // Construct the full URL
      const fullUrl = `${apiUrl}${path}`;
      
      // Forward the request to the target URL
      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
      
      // Return the response from the target URL
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          "Content-Type": response.headers.get("Content-Type") || "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      console.error('Proxy POST request failed:', error);
      return ApiResponseWrapper.error('Proxy request failed', 500);
    }
  }
);

export const PUT = createApiRoute(
  RouteConfigs.protectedPut(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      // 获取请求路径
      const url = new URL(req.url);
      const path = url.pathname.replace("/api/proxy", "");
      
      // 获取环境变量
      const apiUrl = process.env.FASTGPT_API_URL;
      const apiKey = process.env.FASTGPT_API_KEY;
      
      if (!apiUrl || !apiKey) {
        return ApiResponseWrapper.error('FastGPT API configuration is missing', 500);
      }
      
      // Get the request body
      const body = _validatedBody || {};
      
      // Construct the full URL
      const fullUrl = `${apiUrl}${path}`;
      
      // Forward the request to the target URL
      const response = await fetch(fullUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
      
      // Return the response from the target URL
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          "Content-Type": response.headers.get("Content-Type") || "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      console.error('Proxy PUT request failed:', error);
      return ApiResponseWrapper.error('Proxy request failed', 500);
    }
  }
);

export const DELETE = createApiRoute(
  RouteConfigs.admin('DELETE'),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      // 获取请求路径
      const url = new URL(req.url);
      const path = url.pathname.replace("/api/proxy", "");
      
      // 获取环境变量
      const apiUrl = process.env.FASTGPT_API_URL;
      const apiKey = process.env.FASTGPT_API_KEY;
      
      if (!apiUrl || !apiKey) {
        return ApiResponseWrapper.error('FastGPT API configuration is missing', 500);
      }
      
      // Construct the full URL
      const fullUrl = `${apiUrl}${path}`;
      
      // Forward the request to the target URL
      const response = await fetch(fullUrl, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      });
      
      // Return the response from the target URL
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          "Content-Type": response.headers.get("Content-Type") || "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      console.error('Proxy DELETE request failed:', error);
      return ApiResponseWrapper.error('Proxy request failed', 500);
    }
  }
);


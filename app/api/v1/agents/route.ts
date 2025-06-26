/**
 * @file v1\agents\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { z } from 'zod'
import { AgentService } from '@/lib/services/agent-service'
import { AgentType, CreateAgentRequest } from '@/types/agents'


import { NextRequest, NextResponse } from 'next/server';
import { register } from 'prom-client';
import { databaseMonitor } from '@/lib/database/monitoring';
import { aiModelManager } from '@/lib/ai-models/model-manager';

export async function GET(req: NextRequest) {
  try {
    // Ensure metrics are collected before exposing
    // This might involve calling methods on databaseMonitor and aiModelManager
    // to update their internal metrics that are then exposed by prom-client

    // Example: Manually trigger metric collection if not already automated
    // databaseMonitor.collectMetrics(); 
    // aiModelManager.collectMetrics(); 

    const metrics = await register.metrics();
    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': register.contentType,
      },
    });
  } catch (error) {
    console.error('Error generating Prometheus metrics:', error);
    return new NextResponse('Error generating metrics', { status: 500 });
  }
}

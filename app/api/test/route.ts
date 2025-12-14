import { NextResponse } from 'next/server';

/**
 * GET /api/test - 测试API和环境变量
 */
export async function GET() {
  try {
    const envCheck = {
      hasArkApiKey: !!process.env.ARK_API_KEY,
      hasArkEndpointId: !!process.env.ARK_ENDPOINT_ID,
      hasArkApiUrl: !!process.env.ARK_API_URL,
      arkApiKeyLength: process.env.ARK_API_KEY?.length || 0,
      arkEndpointId: process.env.ARK_ENDPOINT_ID || 'not set',
      arkApiUrl: process.env.ARK_API_URL || 'not set',
    };

    return NextResponse.json({
      success: true,
      message: 'API测试成功',
      environment: envCheck,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from 'next/server';

const ASSET_MANAGER_URL = process.env.ASSET_MANAGER_SERVICE_URL || 
  `http://asset-manager-service.${process.env.K8S_NAMESPACE || '3d-inferencing'}.svc.cluster.local:8000`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.service || !body.s3_uri) {
      return NextResponse.json(
        { error: 'Missing required fields: service and s3_uri' },
        { status: 400 }
      );
    }

    // Validate S3 URI format
    if (!body.s3_uri.startsWith('s3://')) {
      return NextResponse.json(
        { error: 'Invalid S3 URI format. Must start with s3://' },
        { status: 400 }
      );
    }

    // Forward request to Asset Manager backend with timeout
    // Backend polls for 60s, so we set 65s timeout (5s buffer)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 65000);

    try {
      const response = await fetch(`${ASSET_MANAGER_URL}/generate-3d`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { error: data.detail || 'Failed to generate 3D model' },
          { status: response.status }
        );
      }

      return NextResponse.json(data);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // Handle timeout specifically
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Generation timeout. The service took too long to respond.' },
          { status: 504 }
        );
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error('Error in generate-3d route:', error);
    
    // Provide more specific error messages
    if (error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { error: 'Backend service unavailable. Please try again later.' },
        { status: 503 }
      );
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      return NextResponse.json(
        { error: 'Cannot reach backend service. Network configuration issue.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

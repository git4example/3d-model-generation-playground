import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/client/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page') || '1';
    const page_size = searchParams.get('page_size') || '50';
    
    // Determine backend URL based on context (SSR vs browser)
    const backendUrl = typeof window === 'undefined' 
      ? `${config.assetManagerInternal}/images`
      : `${config.publicApiBase}/asset-manager/images`;
    
    const url = new URL(backendUrl);
    url.searchParams.set('page', page);
    url.searchParams.set('page_size', page_size);
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Failed to fetch images: ${error}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error fetching images:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

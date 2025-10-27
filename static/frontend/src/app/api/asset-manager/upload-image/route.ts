import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/client/client';

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    // Validate file exists
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Supported types: PNG, JPG, JPEG, WEBP' },
        { status: 400 }
      );
    }
    
    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' },
        { status: 413 }
      );
    }
    
    // Determine backend URL based on execution context
    const backendUrl = typeof window === 'undefined' 
      ? `${config.assetManagerInternal}/upload-image`
      : `${config.publicApiBase}/asset-manager/upload-image`;
    
    // Forward the form data to the backend with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for upload
    
    try {
      const response = await fetch(backendUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
    
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend request failed: ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      return NextResponse.json(data);
      
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // Handle timeout specifically
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Upload timeout. Please check your network connection.' },
          { status: 504 }
        );
      }
      throw fetchError;
    }
    
  } catch (error: any) {
    console.error('Asset Manager upload-image error:', error);
    
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
      { error: error instanceof Error ? error.message : 'Failed to upload image' },
      { status: 500 }
    );
  }
}

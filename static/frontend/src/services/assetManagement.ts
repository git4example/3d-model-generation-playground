import { apiClient } from '@/client/client';

export interface ImageObject {
  job_id: string;
  item_type: 'image';
  status: string;
  created_at: string;
  s3_key: string;
  presigned_url: string;
  file_size_bytes: number;
  width?: number;
  height?: number;
}

export interface Model3D {
  job_id: string;
  item_type: 'job';
  model: string;
  status: string;
  created_at: string;
  completed_at?: string;
  s3_key: string;
  download_url: string;
  file_size_bytes: number;
  format: string;
  vertices?: number;
  faces?: number;
  background_removed?: boolean;
  processing_time?: number;
}

/**
 * Business service for asset and job management operations
 * Handles gallery, storage, and job monitoring workflows
 */
export class AssetManagementService {

  /**
   * Get all source images
   */
  async getAllImages(params?: { 
    page?: number; 
    page_size?: number; 
  }) {
    const response = await apiClient.get('/api/asset-manager/images', { params });
    return response.data;
  }

  /**
   * Get all 3D models
   */
  async getAll3DModels(params?: { 
    model?: string; 
    page?: number; 
    page_size?: number; 
  }) {
    const response = await apiClient.get('/api/asset-manager/3d-models', { params });
    return response.data;
  }

  /**
   * Get recent source images (top N)
   */
  async getRecentImages(limit = 10): Promise<{ images: ImageObject[]; total: number }> {
    const response = await this.getAllImages({ 
      page: 1, 
      page_size: limit 
    });
    return {
      images: response.images || [],
      total: response.total || 0
    };
  }

  /**
   * Get recent 3D models (top N)
   */
  async getRecent3DModels(limit = 10): Promise<{ models: Model3D[]; total: number }> {
    const response = await this.getAll3DModels({ 
      page: 1, 
      page_size: limit 
    });
    return {
      models: response.models || [],
      total: response.total || 0
    };
  }

  /**
   * Get gallery data (images + 3D models)
   * Business workflow for gallery modal
   */
  async getGalleryDataNew(limit = 10): Promise<{
    images: ImageObject[];
    models: Model3D[];
    stats: {
      totalImages: number;
      totalModels: number;
    };
  }> {
    const [imagesData, modelsData] = await Promise.all([
      this.getRecentImages(limit),
      this.getRecent3DModels(limit)
    ]);
    
    return {
      images: imagesData.images,
      models: modelsData.models,
      stats: {
        totalImages: imagesData.total,
        totalModels: modelsData.total
      }
    };
  }

  /**
   * Upload image to S3
   * Returns S3 URI and presigned URL for immediate use
   */
  async uploadImage(file: File): Promise<{
    s3_uri: string;
    s3_key: string;
    presigned_url: string;
    file_size_bytes: number;
    content_type: string;
    filename: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post('/api/asset-manager/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  }

  /**
   * Generate 3D model from image
   * Blocks until model generation completes (polls backend)
   * Backend handles polling DynamoDB until job completes/fails/timeout
   */
  async generate3D(params: {
    service: 'triposr' | 'stable-3dgen' | 'direct3d-s2';
    s3_uri: string;
    model_save_format?: 'glb' | 'obj' | 'ply';
    no_remove_bg?: boolean;
  }): Promise<{
    success: boolean;
    service: string;
    job_id: string;
    output?: {
      model_url?: string;
      glb_url?: string;
      obj_url?: string;
      ply_url?: string;
      mtl_url?: string;
      texture_url?: string;
    };
    error?: string;
  }> {
    const response = await apiClient.post('/api/asset-manager/generate-3d', params);
    return response.data;
  }
}

// Export singleton instance
export const assetManagementService = new AssetManagementService();

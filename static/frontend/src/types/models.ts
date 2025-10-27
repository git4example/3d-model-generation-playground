/**
 * Shared types and enums for 3D model generation
 */

export enum ModelService {
  TRIPOSR = 'triposr',
  STABLE3DGEN = 'stable-3dgen',
  DIRECT3DS2 = 'direct3d-s2'
}

export enum ModelFormat {
  GLB = 'glb',
  OBJ = 'obj',
  PLY = 'ply',
  STL = 'stl'
}

export enum JobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface Generate3DRequest {
  service: ModelService
  s3_uri: string
  model_save_format?: ModelFormat
  no_remove_bg?: boolean
}

export interface Generate3DResponse {
  success: boolean
  service: string
  job_id: string
  output?: {
    model_url?: string
    glb_url?: string
    obj_url?: string
    ply_url?: string
    mtl_url?: string
    texture_url?: string
    download_url?: string
  }
  error?: string
}

/**
 * Type for Promise.allSettled results from 3D generation
 * Used when calling multiple generation services in parallel
 */
export type GenerationResult = 
  | { status: 'fulfilled'; value: Generate3DResponse }
  | { status: 'rejected'; reason: any }

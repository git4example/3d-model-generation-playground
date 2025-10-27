"""
Asset Manager - Centralized management for 3D model jobs and objects
"""

from fastapi import FastAPI, HTTPException, Query, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import logging
import os
import sys
import uuid
import time
import asyncio
from datetime import datetime
import httpx

# Add shared utilities
sys.path.insert(0, '/app/shared')
from dynamodb_utils import DynamoDBJobManager
from s3_utils import S3ModelUploader
from constants import ModelService, ModelFormat, JobStatus, get_service_url

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Read root path from environment variable, default to empty for local dev
ROOT_PATH = os.getenv("ROOT_PATH", "")

# Initialize shared utilities
dynamodb = DynamoDBJobManager()
s3 = S3ModelUploader()

# FastAPI app
app = FastAPI(
    title="Asset Manager",
    description="Centralized management for 3D model jobs and objects",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def strip_path_prefix(request: Request, call_next):
    """Strip ROOT_PATH prefix from incoming requests for proper routing"""
    original_path = request.url.path
    logger.info(f"Middleware: Original path={original_path}, ROOT_PATH={ROOT_PATH}")
    
    if ROOT_PATH and request.url.path.startswith(ROOT_PATH):
        # Remove the prefix from the request path
        new_path = request.url.path[len(ROOT_PATH):]
        request.scope["path"] = new_path
        logger.info(f"Middleware: Stripped path from {original_path} to {new_path}")
    else:
        logger.info(f"Middleware: No stripping needed")
    
    response = await call_next(request)
    return response

# ============================================================================
# IMAGES ENDPOINTS
# ============================================================================

@app.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    """
    Upload an image to S3 and return S3 URI
    
    NOTE: This endpoint will be moved to the image-processing service in the future.
    For now, it's temporarily hosted in asset-manager for quick implementation.
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Validate file extension
        allowed_extensions = ['.png', '.jpg', '.jpeg', '.webp']
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"File extension must be one of: {', '.join(allowed_extensions)}"
            )
        
        # Check S3 is enabled
        if not s3.enabled or not s3.client:
            raise HTTPException(status_code=500, detail="S3 not configured")
        
        # Generate unique filename
        unique_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        s3_key = f"images/{timestamp}_{unique_id}{file_ext}"
        
        # Read file content
        file_content = await file.read()
        file_size = len(file_content)
        
        # Upload to S3
        s3.client.put_object(
            Bucket=s3.bucket,
            Key=s3_key,
            Body=file_content,
            ContentType=file.content_type
        )
        
        # Generate presigned URL
        presigned_url = s3.get_presigned_url(s3_key, expiry=3600)
        
        # Construct S3 URI
        s3_uri = f"s3://{s3.bucket}/{s3_key}"
        
        logger.info(f"Uploaded image to S3: {s3_key} ({file_size} bytes)")
        
        return {
            's3_uri': s3_uri,
            's3_key': s3_key,
            'presigned_url': presigned_url,
            'file_size_bytes': file_size,
            'content_type': file.content_type,
            'filename': file.filename
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upload image: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/images")
async def list_images(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page")
):
    """
    List all source images from S3
    
    Queries S3 bucket for images/ prefix and returns with presigned URLs
    """
    try:
        if not s3.enabled or not s3.client:
            logger.warning("S3 not configured, returning empty list")
            return {
                'images': [],
                'total': 0,
                'page': page,
                'page_size': page_size,
                'has_more': False
            }
        
        # List all objects in images/ prefix
        response = s3.client.list_objects_v2(
            Bucket=s3.bucket,
            Prefix='images/',
            MaxKeys=1000  # Get up to 1000 images
        )
        
        objects = response.get('Contents', [])
        
        # Filter out directory markers and build image list
        images = []
        for obj in objects:
            s3_key = obj['Key']
            
            # Skip directory markers
            if s3_key.endswith('/'):
                continue
            
            # Only include actual image files
            if not any(s3_key.lower().endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.webp']):
                continue
            
            # Generate presigned URL
            presigned_url = s3.get_presigned_url(s3_key, expiry=3600)
            
            # Extract metadata
            file_size = obj['Size']
            last_modified = obj['LastModified'].isoformat()
            
            # Create unique job_id from s3_key
            job_id = s3_key.replace('images/', '').replace('/', '_').split('.')[0]
            
            images.append({
                'job_id': job_id,
                'item_type': 'image',
                'status': 'completed',
                'created_at': last_modified,
                's3_key': s3_key,
                'presigned_url': presigned_url,
                'file_size_bytes': file_size
            })
        
        # Sort by created_at (newest first)
        images.sort(key=lambda x: x['created_at'], reverse=True)
        
        # Paginate
        total = len(images)
        start = (page - 1) * page_size
        end = start + page_size
        
        return {
            'images': images[start:end],
            'total': total,
            'page': page,
            'page_size': page_size,
            'has_more': end < total
        }
        
    except Exception as e:
        logger.error(f"Failed to list images: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/3d-models")
async def list_3d_models(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    model: Optional[str] = Query(None, description="Filter by model type (triposr, stable3dgen, direct3d-s2)")
):
    """
    List all 3D models (completed jobs with S3 uploads)
    
    This is an alias for /objects endpoint with clearer naming.
    Queries DynamoDB for completed jobs with S3 output.
    """
    try:
        # Get jobs from DynamoDB
        all_jobs = dynamodb.list_jobs(limit=1000, model=model)
        
        # Filter for completed jobs with S3 output
        models = []
        for job in all_jobs:
            if job.get('status') != 'completed':
                continue
            
            output = job.get('output', {})
            if not output.get('s3_key'):
                continue
            
            models.append({
                'job_id': job['job_id'],
                'item_type': 'job',
                'model': job.get('model'),
                'status': job.get('status'),
                'created_at': job.get('created_at'),
                'completed_at': job.get('completed_at'),
                's3_key': output.get('s3_key'),
                'download_url': output.get('download_url'),
                'file_size_bytes': output.get('file_size_bytes'),
                'format': output.get('formats', ['glb'])[0] if output.get('formats') else 'glb',
                'vertices': output.get('vertices'),
                'faces': output.get('faces'),
                'background_removed': output.get('background_removed'),
                'processing_time': output.get('processing_time')
            })
        
        # Sort by created_at (newest first)
        models.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        # Paginate
        total = len(models)
        start = (page - 1) * page_size
        end = start + page_size
        
        return {
            'models': models[start:end],
            'total': total,
            'page': page,
            'page_size': page_size,
            'has_more': end < total
        }
        
    except Exception as e:
        logger.error(f"Failed to list 3D models: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# OBJECTS ENDPOINTS
# ============================================================================

@app.get("/objects")
async def list_objects(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    model: Optional[str] = Query(None, description="Filter by model type (triposr, stable3dgen, direct3d-s2)"),
    status: str = Query("completed", description="Filter by status")
):
    """
    List all 3D model objects stored in S3
    
    Data is queried from DynamoDB for performance. Only completed jobs with S3 uploads are returned.
    """
    try:
        # Get jobs from DynamoDB
        all_jobs = dynamodb.list_jobs(limit=1000, model=model)
        
        # Filter for jobs with specified status and S3 output
        objects = []
        for job in all_jobs:
            if job.get('status') != status:
                continue
            
            output = job.get('output', {})
            if not output.get('s3_key'):
                continue
            
            objects.append({
                'job_id': job['job_id'],
                'model': job.get('model'),
                'status': job.get('status'),
                'created_at': job.get('created_at'),
                'completed_at': job.get('completed_at'),
                's3_key': output.get('s3_key'),
                'download_url': output.get('download_url'),
                'file_size_bytes': output.get('file_size_bytes'),
                'format': output.get('formats', ['glb'])[0] if output.get('formats') else 'glb',
                'vertices': output.get('vertices'),
                'faces': output.get('faces'),
                'background_removed': output.get('background_removed'),
                'processing_time': output.get('processing_time')
            })
        
        # Sort by created_at (newest first)
        objects.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        # Paginate
        total = len(objects)
        start = (page - 1) * page_size
        end = start + page_size
        
        return {
            'objects': objects[start:end],
            'total': total,
            'page': page,
            'page_size': page_size,
            'has_more': end < total
        }
        
    except Exception as e:
        logger.error(f"Failed to list objects: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/objects/{job_id}")
async def get_object(
    job_id: str,
    refresh_url: bool = Query(False, description="Refresh presigned URL if expired")
):
    """
    Get details for a specific object
    
    Optionally refresh the presigned download URL if it has expired.
    """
    try:
        job = dynamodb.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Object not found")
        
        output = job.get('output', {})
        if not output.get('s3_key'):
            raise HTTPException(status_code=404, detail="No S3 object for this job")
        
        # Optionally refresh presigned URL
        download_url = output.get('download_url')
        if refresh_url and s3.enabled and output.get('s3_key'):
            download_url = s3.get_presigned_url(output['s3_key'])
            logger.info(f"Refreshed presigned URL for job {job_id}")
        
        return {
            'job_id': job['job_id'],
            'model': job.get('model'),
            'status': job.get('status'),
            'created_at': job.get('created_at'),
            'completed_at': job.get('completed_at'),
            's3_key': output.get('s3_key'),
            'download_url': download_url,
            'file_size_bytes': output.get('file_size_bytes'),
            'format': output.get('formats', ['glb'])[0] if output.get('formats') else 'glb',
            'vertices': output.get('vertices'),
            'faces': output.get('faces'),
            'background_removed': output.get('background_removed'),
            'processing_time': output.get('processing_time')
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get object {job_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/objects/stats/storage")
async def get_storage_stats():
    """
    Get S3 storage statistics
    
    Returns total object count and storage size across all models.
    """
    if not s3.enabled or not s3.client:
        return {"error": "S3 not configured"}
    
    try:
        response = s3.client.list_objects_v2(
            Bucket=s3.bucket,
            Prefix='models/'
        )
        
        objects = response.get('Contents', [])
        total_size = sum(obj['Size'] for obj in objects)
        
        # Group by model type (extract from S3 key path)
        by_model = {}
        for obj in objects:
            parts = obj['Key'].split('/')
            if len(parts) >= 2:
                # Try to determine model type from metadata or path
                model_type = 'unknown'
                by_model[model_type] = by_model.get(model_type, 0) + obj['Size']
        
        return {
            'total_objects': len(objects),
            'total_size_bytes': total_size,
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'total_size_gb': round(total_size / (1024 * 1024 * 1024), 2),
            'bucket': s3.bucket,
            'region': s3.region
        }
        
    except Exception as e:
        logger.error(f"Failed to get storage stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# 3D GENERATION ENDPOINTS
# ============================================================================

class Generate3DRequest(BaseModel):
    """Request model for 3D generation"""
    service: ModelService
    s3_uri: str
    model_save_format: ModelFormat = ModelFormat.GLB
    no_remove_bg: Optional[bool] = False


async def poll_job_until_complete(job_id: str, timeout: int = 60) -> dict:
    """
    Poll DynamoDB until job completes or times out
    Returns job data when complete/failed or timeout
    """
    start_time = time.time()
    
    while (time.time() - start_time) < timeout:
        job = dynamodb.get_job(job_id)
        
        if not job:
            logger.warning(f"Job {job_id} not found in DynamoDB")
            await asyncio.sleep(2)
            continue
        
        status = job.get('status')
        
        if status == JobStatus.COMPLETED.value:
            logger.info(f"Job {job_id} completed successfully")
            return job
        
        if status == JobStatus.FAILED.value:
            logger.error(f"Job {job_id} failed: {job.get('error')}")
            return job
        
        # Still processing
        logger.debug(f"Job {job_id} status: {status}, progress: {job.get('progress', 0)}%")
        await asyncio.sleep(2)
    
    # Timeout
    logger.error(f"Job {job_id} timed out after {timeout}s")
    return {
        'status': JobStatus.FAILED.value,
        'error': f'Timeout after {timeout}s'
    }


@app.post("/generate-3d")
async def generate_3d(request: Generate3DRequest):
    """
    Generate 3D model with specified service - blocks until complete
    
    This endpoint:
    1. Calls the model service (gets job_id)
    2. Polls DynamoDB until job completes (max 60s)
    3. Returns final result with S3 URLs
    
    Frontend makes 3 parallel calls to this endpoint for progressive results
    """
    try:
        logger.info(f"Starting 3D generation with {request.service.value} for {request.s3_uri}")
        
        # 1. Call model service to start generation
        service_url = get_service_url(request.service)
        endpoint = f"{service_url}/generate-from-s3"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                endpoint,
                json=request.dict()
            )
            response.raise_for_status()
            result = response.json()
        
        job_id = result.get('job_id')
        if not job_id:
            raise HTTPException(500, "Model service didn't return job_id")
        
        logger.info(f"Job {job_id} created for {request.service.value}")
        
        # 2. Poll DynamoDB until complete (max 180s to accommodate slower services like direct3d-s2)
        job = await poll_job_until_complete(job_id, timeout=180)
        
        # 3. Return result
        if job['status'] == JobStatus.COMPLETED.value:
            return {
                'success': True,
                'service': request.service.value,
                'job_id': job_id,
                'output': job.get('output', {})
            }
        else:
            return {
                'success': False,
                'service': request.service.value,
                'job_id': job_id,
                'error': job.get('error', 'Unknown error')
            }
    
    except httpx.HTTPError as e:
        logger.error(f"HTTP error calling {request.service.value}: {e}")
        raise HTTPException(500, f"Failed to call {request.service.value} service")
    except Exception as e:
        logger.error(f"Error in generate_3d: {e}")
        raise HTTPException(500, str(e))


# ============================================================================
# JOBS ENDPOINTS
# ============================================================================

@app.get("/jobs/{job_id}")
async def get_job(job_id: str):
    """
    Get status of a specific job
    
    Returns complete job details including status, progress, and output.
    """
    try:
        job = dynamodb.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return job
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/jobs")
async def list_jobs(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    model: Optional[str] = Query(None, description="Filter by model type"),
    status: Optional[str] = Query(None, description="Filter by status (queued, processing, completed, failed)")
):
    """
    List all jobs with optional filtering
    
    Returns paginated list of jobs across all model types.
    """
    try:
        # Get jobs from DynamoDB
        all_jobs = dynamodb.list_jobs(limit=1000, model=model)
        
        # Filter by status if provided
        if status:
            all_jobs = [j for j in all_jobs if j.get('status') == status]
        
        # Sort by created_at (newest first)
        all_jobs.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        # Paginate
        total = len(all_jobs)
        start = (page - 1) * page_size
        end = start + page_size
        
        return {
            'jobs': all_jobs[start:end],
            'total': total,
            'page': page,
            'page_size': page_size,
            'has_more': end < total
        }
        
    except Exception as e:
        logger.error(f"Failed to list jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/jobs/stats/summary")
async def get_job_stats(model: Optional[str] = Query(None, description="Filter stats by model type")):
    """
    Get aggregate statistics about jobs
    
    Returns counts by status and model type.
    """
    try:
        # Use existing DynamoDB stats method if available
        if hasattr(dynamodb, 'get_job_stats'):
            return dynamodb.get_job_stats(model=model)
        
        # Otherwise build stats manually
        jobs = dynamodb.list_jobs(limit=1000, model=model)
        
        stats = {
            'total': len(jobs),
            'by_status': {},
            'by_model': {}
        }
        
        for job in jobs:
            status = job.get('status', 'unknown')
            model_type = job.get('model', 'unknown')
            
            stats['by_status'][status] = stats['by_status'].get(status, 0) + 1
            stats['by_model'][model_type] = stats['by_model'].get(model_type, 0) + 1
        
        return stats
        
    except Exception as e:
        logger.error(f"Failed to get job stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# HEALTH ENDPOINTS
# ============================================================================

@app.get("/health")
async def health_check():
    """
    Health check endpoint
    
    Returns service health and configuration status.
    """
    return {
        'status': 'healthy',
        'service': 'asset-manager',
        'version': '1.0.0',
        'dynamodb_enabled': dynamodb.enabled,
        's3_enabled': s3.enabled,
        'dynamodb_table': os.getenv('DYNAMODB_TABLE_NAME', 'not-configured'),
        's3_bucket': os.getenv('S3_BUCKET', 'not-configured')
    }


@app.get("/")
async def root():
    """
    Root endpoint - API information
    """
    return {
        'service': 'Asset Manager',
        'version': '1.0.0',
        'description': 'Centralized management for 3D model jobs and objects',
        'status': 'running',
        'docs': '/docs',
        'redoc': '/redoc',
        'endpoints': {
            'objects': {
                'list': 'GET /objects',
                'get': 'GET /objects/{job_id}',
                'storage_stats': 'GET /objects/stats/storage'
            },
            'jobs': {
                'get': 'GET /jobs/{job_id}',
                'list': 'GET /jobs',
                'stats': 'GET /jobs/stats/summary'
            },
            'health': 'GET /health'
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

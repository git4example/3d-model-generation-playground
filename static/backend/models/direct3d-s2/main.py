from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from contextlib import asynccontextmanager
import torch
import os
import sys
import base64
import json
import uuid
import time
import logging
import traceback

sys.path.insert(0, '/app/shared')
from s3_utils import S3ModelUploader, JobManager
from dynamodb_utils import DynamoDBJobManager

from inference import Direct3DS2Inference

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Read root path from environment variable, default to empty for local dev
ROOT_PATH = os.getenv("ROOT_PATH", "")

inference_model = None
s3_uploader = S3ModelUploader()

# Initialize job manager - use DynamoDB if configured, otherwise fallback to in-memory
dynamodb_manager = DynamoDBJobManager()
if dynamodb_manager.enabled:
    job_manager = dynamodb_manager
    logger.info("Using DynamoDB job manager for distributed job tracking")
else:
    job_manager = JobManager()
    logger.info("Using in-memory job manager (not suitable for multi-pod deployments)")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model on startup, cleanup on shutdown"""
    global inference_model
    
    # S3 is optional - warn if not configured
    if not s3_uploader.enabled:
        logger.warning("⚠️  S3_BUCKET not set - /generate endpoint will be disabled")
        logger.warning("⚠️  Only /test endpoint will be available for testing")
    
    try:
        logger.info("Loading Direct3D-S2 models...")
        inference_model = Direct3DS2Inference()
        logger.info("Direct3D-S2 models loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load models: {e}")
        logger.error(traceback.format_exc())
        inference_model = None
    yield

    logger.info("Shutting down Direct3D-S2 service...")

    if inference_model:
        logger.info("Cleaning up model resources...")
        try:
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                torch.cuda.synchronize()
        except Exception as e:
            logger.warning(f"Error during GPU cleanup: {e}")

app = FastAPI(title="Direct3D-S2 Model Service", lifespan=lifespan)

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

async def process_job_async(job_id: str, request: dict):
    """Background task to process 3D generation and upload to S3"""
    try:
        job_manager.update_job(job_id, status='processing', progress=10)

        # Extract parameters
        image_base64 = request.get('input', '')
        remove_background = not request.get('no_remove_bg', False)
        use_alpha_channel = request.get('use_alpha_channel', False)
        sdf_resolution = request.get('sdf_resolution', 512)
        mc_threshold = request.get('mc_threshold', 0.2)
        remesh = request.get('remesh', True)
        simplify_ratio = request.get('simplify_ratio', 0.95)
        remove_interior = request.get('remove_interior', True)
        output_format = request.get('model_save_format', 'obj')

        logger.info(f"Job {job_id}: Processing - remove_bg: {remove_background}, sdf_resolution: {sdf_resolution}")

        job_manager.update_job(job_id, progress=20)

        logger.info(f"Job {job_id}: Starting inference")
        result = inference_model.generate(
            image_base64=image_base64,
            remove_background=remove_background,
            use_alpha_channel=use_alpha_channel,
            sdf_resolution=sdf_resolution,
            mc_threshold=mc_threshold,
            remesh=remesh,
            simplify_ratio=simplify_ratio,
            remove_interior=remove_interior,
            output_format=output_format
        )
        logger.info(f"Job {job_id}: Inference completed successfully")

        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.synchronize()

        model_data = result["mesh_data"]
        job_manager.update_job(job_id, progress=80)

        s3_result = s3_uploader.upload_model(
            job_id=job_id,
            model_data=model_data,
            model_type=result["format"],
            metadata={
                'model': 'direct3d-s2',
                'vertices': result['vertices'],
                'faces': result['faces'],
                'background_removed': str(remove_background),
                'sdf_resolution': str(sdf_resolution),
                'mc_threshold': str(mc_threshold),
                'remesh': str(remesh),
                'simplify_ratio': str(simplify_ratio) if remesh else 'none'
            }
        )

        if s3_result:
            job_manager.update_job(
                job_id,
                status='completed',
                progress=100,
                output={
                    's3_key': s3_result['s3_key'],
                    'download_url': s3_result['presigned_url'],
                    'vertices': result['vertices'],
                    'faces': result['faces'],
                    'file_size_bytes': len(model_data),
                    'formats': [result["format"]],
                    'background_removed': remove_background,
                    'sdf_resolution': sdf_resolution
                }
            )
            logger.info(f"Job {job_id}: Completed with S3 upload")
        else:
            job_manager.update_job(
                job_id,
                status='completed',
                progress=100,
                output={
                    f'{result["format"]}_base64': base64.b64encode(model_data).decode('utf-8'),
                    'vertices': result['vertices'],
                    'faces': result['faces'],
                    'file_size_bytes': len(model_data),
                    'formats': [result["format"]],
                    'background_removed': remove_background,
                    'sdf_resolution': sdf_resolution
                }
            )
            logger.info(f"Job {job_id}: Completed with base64 output")

    except Exception as e:
        logger.error(f"Job {job_id}: Failed - {str(e)}")
        logger.error(traceback.format_exc())
        job_manager.update_job(
            job_id,
            status='failed',
            error=str(e)
        )

@app.post("/generate")
async def generate_3d(request: dict, background_tasks: BackgroundTasks):
    """Generate 3D model from base64 encoded image (async only with S3 upload)"""
    if inference_model is None:
        logger.error("Model not loaded - returning 503")
        raise HTTPException(status_code=503, detail="Model not loaded")

    if not s3_uploader.enabled:
        raise HTTPException(
            status_code=503,
            detail="S3 upload is required but not configured. Set S3_BUCKET environment variable."
        )

    job_id = str(uuid.uuid4())
    job = job_manager.create_job(job_id, 'direct3d-s2', request.get('input_type', 'image'))

    background_tasks.add_task(process_job_async, job_id, request)

    logger.info(f"Job {job_id}: Created and queued for async processing")

    return {
        "success": True,
        "job_id": job_id,
        "status": "queued",
        "message": "Job queued for processing",
        "status_url": f"/status/{job_id}"
    }

@app.post("/generate-from-s3")
async def generate_3d_from_s3(request: dict, background_tasks: BackgroundTasks):
    """Generate 3D model from image stored in S3"""
    if inference_model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    if not s3_uploader.enabled:
        raise HTTPException(
            status_code=503,
            detail="S3 is required but not configured. Set S3_BUCKET environment variable."
        )
    
    s3_uri = request.get('s3_uri', '')
    if not s3_uri:
        raise HTTPException(status_code=400, detail="s3_uri is required")
    
    # Support s3:// format
    if s3_uri.startswith('s3://'):
        # Parse: s3://bucket/key
        parts = s3_uri[5:].split('/', 1)
        if len(parts) != 2:
            raise HTTPException(status_code=400, detail="Invalid S3 URI format. Expected: s3://bucket/key")
        bucket, key = parts
    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid URI format. Use s3://bucket/key"
        )
    
    try:
        # Download image from S3
        logger.info(f"Downloading image from S3: {s3_uri}")
        response = s3_uploader.client.get_object(Bucket=bucket, Key=key)
        image_data = response['Body'].read()
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        logger.info(f"Downloaded {len(image_data)} bytes from S3")
        
        # Create modified request with base64 image
        modified_request = request.copy()
        modified_request['input'] = image_base64
        modified_request['input_type'] = 'image'
        
        # Call existing generate endpoint logic
        job_id = str(uuid.uuid4())
        job = job_manager.create_job(job_id, 'direct3d-s2', 'image')
        
        background_tasks.add_task(process_job_async, job_id, modified_request)
        
        logger.info(f"Job {job_id}: Created from S3 URI {s3_uri}")
        
        return {
            "success": True,
            "job_id": job_id,
            "status": "queued",
            "message": "Job queued for processing",
            "source": s3_uri
        }
        
    except s3_uploader.client.exceptions.NoSuchKey:
        raise HTTPException(status_code=404, detail=f"S3 object not found: {s3_uri}")
    except s3_uploader.client.exceptions.NoSuchBucket:
        raise HTTPException(status_code=404, detail=f"S3 bucket not found: {bucket}")
    except Exception as e:
        logger.error(f"Failed to download from S3: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to download from S3: {str(e)}")

@app.get("/health")
async def health():
    """Health check endpoint"""
    status = {
        "status": "healthy" if inference_model is not None else "unhealthy",
        "model": "direct3d-s2",
        "loaded": inference_model is not None,
        "gpu_available": torch.cuda.is_available(),
        "s3_enabled": s3_uploader.enabled,
        "s3_required": True,
        "dynamodb_enabled": dynamodb_manager.enabled
    }
    return status

@app.get("/info")
async def model_info():
    """Model information endpoint"""
    return {
        "name": "Direct3D-S2",
        "description": "Gigascale 3D Generation Made Easy with Spatial Sparse Attention",
        "paper": "Direct3D-S2: Gigascale 3D Generation Made Easy with Spatial Sparse Attention (NeurIPS 2025)",
        "capabilities": ["image-to-3d", "spatial-sparse-attention", "gigascale-generation"],
        "output_formats": ["obj", "glb", "ply", "stl"],
        "gpu_required": True,
        "recommended_gpu": "A10G (24GB VRAM)",
        "vram_requirement": "10GB+ for 512 resolution, 24GB+ for 1024 resolution",
        "inference_speed": "~1-2 minutes (faster than v1.0 with SSA)",
        "async_mode": True,
        "s3_enabled": s3_uploader.enabled,
        "s3_required": True,
        "s3_bucket": s3_uploader.bucket if s3_uploader.bucket else None,
        "gallery_enabled": s3_uploader.enabled,
        "dynamodb_enabled": dynamodb_manager.enabled,
        "job_persistence": "DynamoDB" if dynamodb_manager.enabled else "In-memory (ephemeral)",
        "features": {
            "background_removal": "BiRefNet (optional)",
            "spatial_sparse_attention": "3.9x faster forward pass, 9.6x faster backward pass",
            "unified_sparse_vae": "Consistent sparse volumetric format",
            "gigascale_generation": "1024³ resolution with 8 GPUs",
            "mesh_simplification": "Configurable remeshing and simplification"
        }
    }

@app.get("/test")
async def test_generate():
    """
    Test endpoint that reads cat.jpg and generates 3D model
    Returns OBJ directly in response (no S3, no job tracking)
    For internal testing only! Use /generate for production.
    """
    if inference_model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    test_image_path = "/app/cat.jpg"
    
    try:
        with open(test_image_path, "rb") as image_file:
            test_image_base64 = base64.b64encode(image_file.read()).decode('utf-8')
        logger.info(f"Loaded test image from {test_image_path}")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Test image not found at {test_image_path}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load test image: {str(e)}")
    
    try:
        start_time = time.time()
        
        # Use default parameters for test
        remove_background = True
        use_alpha_channel = False
        sdf_resolution = 512  # Optimized for g5.2xlarge (22GB VRAM) with refiner disabled
        mc_threshold = 0.05
        remesh = False
        simplify_ratio = 0.95
        remove_interior = True
        output_format = 'obj'
        
        logger.info(f"Test generation with cat.jpg: remove_bg={remove_background}, sdf_resolution={sdf_resolution}")
        
        result = inference_model.generate(
            image_base64=test_image_base64,
            remove_background=remove_background,
            use_alpha_channel=use_alpha_channel,
            sdf_resolution=sdf_resolution,
            mc_threshold=mc_threshold,
            remesh=remesh,
            simplify_ratio=simplify_ratio,
            remove_interior=remove_interior,
            output_format=output_format
        )
        
        processing_time = time.time() - start_time
        
        # Return OBJ as base64
        return {
            "success": True,
            "model": "direct3d-s2",
            "processing_time": round(processing_time, 2),
            "output": {
                "obj_base64": base64.b64encode(result["mesh_data"]).decode('utf-8'),
                "vertices": result["vertices"],
                "faces": result["faces"],
                "file_size_bytes": len(result["mesh_data"]),
                "format": result["format"],
                "background_removed": remove_background,
                "sdf_resolution": sdf_resolution
            },
            "message": "Test generation completed with cat.jpg (no S3 upload)"
        }
        
    except Exception as e:
        logger.error(f"Test generation failed: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@app.get("/test-s3")
async def test_generate_with_s3(background_tasks: BackgroundTasks):
    """
    Test endpoint with S3 upload and DynamoDB tracking
    Reads cat.jpg and calls /generate endpoint
    Returns job ID for status polling
    """
    if inference_model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    if not s3_uploader.enabled:
        raise HTTPException(
            status_code=503,
            detail="S3 not configured. Use /test endpoint for local testing."
        )
    
    test_image_path = "/app/cat.jpg"
    
    try:
        with open(test_image_path, "rb") as image_file:
            test_image_base64 = base64.b64encode(image_file.read()).decode('utf-8')
        logger.info(f"Loaded test image from {test_image_path} for S3 test")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Test image not found at {test_image_path}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load test image: {str(e)}")
    
    # Build test request with default parameters
    test_request = {
        "input": test_image_base64,
        "no_remove_bg": False,
        "use_alpha_channel": False,
        "sdf_resolution": 512,
        "model_save_format": "obj"
    }
    
    logger.info("Test-S3 endpoint: calling /generate with cat.jpg")
    
    # Call /generate endpoint
    return await generate_3d(test_request, background_tasks)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Direct3D-S2 3D Generation API",
        "status": "running",
        "endpoints": {
            "/generate": "POST - Generate 3D model from base64 image (async with S3 upload)",
            "/generate-from-s3": "POST - Generate 3D model from S3 image URI (s3://bucket/images/...)",
            "/test": "GET - Test with sample image (sync, returns OBJ base64)",
            "/test-s3": "GET - Test with sample image (async with S3 upload)",
            "/health": "GET - Health check",
            "/info": "GET - Model information"
        },
        "s3_structure": {
            "images": "s3://bucket/images/ - Uploaded input images",
            "models": "s3://bucket/models/ - Generated 3D models"
        },
        "note": "For job status, object listing, and gallery management, use the Asset Manager service"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

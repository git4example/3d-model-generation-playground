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

from inference import model_fn, input_fn, predict_fn

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Read root path from environment variable, default to empty for local dev
ROOT_PATH = os.getenv("ROOT_PATH", "")

model_artifacts = None
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
    global model_artifacts
    try:
        logger.info("Loading TripoSR model...")
        model_artifacts = model_fn(None)
        logger.info("Model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        model_artifacts = None
    yield

    logger.info("Shutting down TripoSR service...")

    if model_artifacts:
        logger.info("Cleaning up model resources...")
        try:
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                torch.cuda.synchronize()
        except Exception as e:
            logger.warning(f"Error during GPU cleanup: {e}")

app = FastAPI(title="TripoSR Model Service", lifespan=lifespan)

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

        request_body = json.dumps(request)
        input_data = input_fn(request_body, "application/json")

        logger.info(f"Job {job_id}: Processing - remove_bg: {not input_data['no_remove_bg']}, resolution: {input_data['mc_resolution']}")

        job_manager.update_job(job_id, progress=30)

        logger.info(f"Job {job_id}: Starting inference")
        prediction = predict_fn(input_data, model_artifacts)
        logger.info(f"Job {job_id}: Inference completed successfully")

        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.synchronize()

        model_data = prediction["model_data"]
        job_manager.update_job(job_id, progress=80)

        s3_result = s3_uploader.upload_model(
            job_id=job_id,
            model_data=model_data,
            model_type=prediction["format"],
            metadata={
                'model': 'triposr',
                'vertices': prediction['vertices'],
                'faces': prediction['faces'],
                'background_removed': str(not input_data['no_remove_bg']),
                'resolution': str(input_data['mc_resolution'])
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
                    'vertices': prediction['vertices'],
                    'faces': prediction['faces'],
                    'file_size_bytes': len(model_data),
                    'formats': [prediction["format"]],
                    'background_removed': not input_data['no_remove_bg']
                }
            )
            logger.info(f"Job {job_id}: Completed with S3 upload")
        else:
            job_manager.update_job(
                job_id,
                status='completed',
                progress=100,
                output={
                    'glb_base64': base64.b64encode(model_data).decode('utf-8'),
                    'vertices': prediction['vertices'],
                    'faces': prediction['faces'],
                    'file_size_bytes': len(model_data),
                    'formats': [prediction["format"]],
                    'background_removed': not input_data['no_remove_bg']
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
    """Generate 3D model from base64 encoded image"""
    if model_artifacts is None:
        logger.error("Model not loaded - returning 503")
        raise HTTPException(status_code=503, detail="Model not loaded")

    if s3_uploader.enabled:
        job_id = str(uuid.uuid4())
        job = job_manager.create_job(job_id, 'triposr', request.get('input_type', 'image'))

        background_tasks.add_task(process_job_async, job_id, request)

        logger.info(f"Job {job_id}: Created and queued for async processing")

        return {
            "success": True,
            "job_id": job_id,
            "status": "queued",
            "message": "Job queued for processing",
            "status_url": f"/status/{job_id}"
        }
    else:
        try:
            start_time = time.time()

            request_body = json.dumps(request)
            input_data = input_fn(request_body, "application/json")

            logger.info(f"Sync generation - remove_bg: {not input_data['no_remove_bg']}, resolution: {input_data['mc_resolution']}")

            logger.info("Starting inference")
            prediction = predict_fn(input_data, model_artifacts)
            logger.info("Inference completed successfully")

            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                torch.cuda.synchronize()

            processing_time = time.time() - start_time

            return {
                "success": True,
                "model": "triposr",
                "input_type": "image",
                "output": {
                    "glb_base64": base64.b64encode(prediction["model_data"]).decode('utf-8'),
                    "vertices": prediction["vertices"],
                    "faces": prediction["faces"],
                    "processing_time": round(processing_time, 2),
                    "file_size_bytes": len(prediction["model_data"]),
                    "formats": [prediction["format"]],
                    "background_removed": not input_data["no_remove_bg"]
                },
                "message": "3D reconstruction completed successfully"
            }

        except Exception as e:
            logger.error(f"Sync generation failed: {str(e)}")
            logger.error(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@app.post("/generate-from-s3")
async def generate_3d_from_s3(request: dict, background_tasks: BackgroundTasks):
    """Generate 3D model from image stored in S3"""
    if model_artifacts is None:
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
        job = job_manager.create_job(job_id, 'triposr', 'image')
        
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
        "status": "healthy" if model_artifacts is not None else "unhealthy",
        "model": "triposr",
        "loaded": model_artifacts is not None,
        "gpu_available": torch.cuda.is_available(),
        "s3_enabled": s3_uploader.enabled,
        "dynamodb_enabled": dynamodb_manager.enabled
    }
    return status

@app.get("/info")
async def model_info():
    """Model information endpoint"""
    return {
        "name": "TripoSR",
        "description": "Fast 3D object reconstruction from single image",
        "capabilities": ["image-to-3d"],
        "output_formats": ["obj", "glb"],
        "gpu_required": True,
        "vram_requirement": "6GB+",
        "inference_speed": "<0.5s",
        "async_mode": s3_uploader.enabled,
        "s3_enabled": s3_uploader.enabled,
        "s3_bucket": s3_uploader.bucket if s3_uploader.bucket else None,
        "gallery_enabled": s3_uploader.enabled,
        "dynamodb_enabled": dynamodb_manager.enabled,
        "job_persistence": "DynamoDB" if dynamodb_manager.enabled else "In-memory (ephemeral)"
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "TripoSR 3D Generation API",
        "status": "running",
        "endpoints": {
            "/generate": "POST - Generate 3D model from base64 image",
            "/generate-from-s3": "POST - Generate 3D model from S3 image URI (s3://bucket/images/...)",
            "/test": "GET - Test with sample image (sync, returns GLB base64)",
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

@app.get("/test")
async def test_inference():
    """
    Test endpoint that reads cat.jpg and generates 3D model
    Returns GLB directly in response (no S3, no job tracking)
    For internal testing only! Use /test-s3 or /generate for production.
    """
    if model_artifacts is None:
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
        
        # Build test request with default parameters
        test_request = {
            "input": test_image_base64,
            "input_type": "image",
            "no_remove_bg": False,
            "foreground_ratio": 0.85,
            "mc_resolution": 128,
            "model_save_format": "glb"
        }
        
        request_body = json.dumps(test_request)
        input_data = input_fn(request_body, "application/json")
        
        logger.info("Test generation with cat.jpg")
        prediction = predict_fn(input_data, model_artifacts)
        
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.synchronize()
        
        processing_time = time.time() - start_time
        
        return {
            "success": True,
            "model": "triposr",
            "processing_time": round(processing_time, 2),
            "output": {
                "glb_base64": base64.b64encode(prediction["model_data"]).decode('utf-8'),
                "vertices": prediction["vertices"],
                "faces": prediction["faces"],
                "file_size_bytes": len(prediction["model_data"]),
                "format": prediction["format"],
                "background_removed": True
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
    if model_artifacts is None:
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
        "input_type": "image",
        "no_remove_bg": False,
        "foreground_ratio": 0.85,
        "mc_resolution": 128,
        "model_save_format": "glb"
    }
    
    logger.info("Test-S3 endpoint: calling /generate with cat.jpg")
    
    # Call /generate endpoint
    return await generate_3d(test_request, background_tasks)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

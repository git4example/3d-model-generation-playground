# StabilityAI 3D Model Generation Service
# Provides endpoints for Fast 3D and Point Aware 3D model generation

from fastapi import FastAPI
from pydantic import BaseModel
import requests
import base64
import io
import boto3
import uuid
import json
from botocore.exceptions import ClientError

# AWS Secrets Manager integration for API key retrieval
def get_secret(secret_name):
    region_name = "us-west-2"
    session = boto3.session.Session()
    client = session.client(
        service_name='secretsmanager',
        region_name=region_name
    )
    try:
        get_secret_value_response = client.get_secret_value(
            SecretId=secret_name
        )
    except ClientError as e:
        raise e
    secret = get_secret_value_response['SecretString']
    return json.loads(secret)

# Initialize StabilityAI API key from AWS Secrets Manager
STABILITY_API_KEY = get_secret("stabilityai-api-key")["api-key"]

# FastAPI application instance
app = FastAPI()

# Health check endpoint
@app.get("/health")
async def health():
    return {"status": "healthy", "model": "stabilityai-3d"}

# Request model for image input
class ImageRequest(BaseModel):
    image: str  # Base64 encoded image

# Fast 3D generation endpoint - optimized for speed
@app.post("/generate-fast-3d")
async def generate_fast_3d(request: ImageRequest):
    # Decode base64 image to binary
    image_binary = base64.b64decode(request.image)

    # Call StabilityAI Fast 3D API
    response = requests.post(
        f"https://api.stability.ai/v2beta/3d/stable-fast-3d",
        headers={
            "authorization": f"Bearer {STABILITY_API_KEY}",
        },
        files={
            "image": io.BytesIO(image_binary)
        },
        data={
            "remesh": "quad",
            "texture_resolution": "2048"
        }
    )

    if response.status_code == 200:
        # Upload generated model to S3 storage
        s3 = boto3.client('s3')
        bucket_name = 'model-inference-assets'
        key = f'stabilityai-3d-assets/{uuid.uuid4()}.glb'
        
        s3.put_object(
            Bucket=bucket_name,
            Key=key,
            Body=response.content,
            ContentType='model/gltf-binary'
        )

        # Save local copy for debugging/backup
        # with open("./output.glb", 'wb') as file:
        #     file.write(response.content)
        
        return {"message": "Fast 3D model generated and uploaded successfully", "s3_key": key}
    else:
        raise Exception(str(response.json()))

# Point Aware 3D generation endpoint - higher quality with point cloud awareness
@app.post("/generate-point-aware-3d")
async def generate_point_aware_3d(request: ImageRequest):
    # Decode base64 image to binary
    image_binary = base64.b64decode(request.image)

    # Call StabilityAI Point Aware 3D API
    response = requests.post(
        f"https://api.stability.ai/v2beta/3d/stable-point-aware-3d",
        headers={
            "authorization": f"Bearer {STABILITY_API_KEY}",
        },
        files={
            "image": io.BytesIO(image_binary)
        },
        data={
            "remesh": "quad",
            "texture_resolution": "2048"
        }
    )

    if response.status_code == 200:
        # Upload generated model to S3 storage
        s3 = boto3.client('s3')
        bucket_name = 'model-inference-assets'
        key = f'stabilityai-3d-assets/{uuid.uuid4()}.glb'
        
        s3.put_object(
            Bucket=bucket_name,
            Key=key,
            Body=response.content,
            ContentType='model/gltf-binary'
        )
        
        return {"message": "Point Aware 3D model generated and uploaded successfully", "s3_key": key}
    else:
        raise Exception(str(response.json()))
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
    

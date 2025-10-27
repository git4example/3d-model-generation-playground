# Direct API test script for StabilityAI Fast 3D generation
# Demonstrates standalone usage without FastAPI wrapper

import requests
import base64
import io
import json
import boto3
from botocore.exceptions import ClientError

# Retrieve API key from AWS Secrets Manager
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

# Initialize API key from AWS Secrets Manager
STABILITY_API_KEY = get_secret("stabilityai-api-key")["api-key"]

# Helper function to load and encode image file
def load_image_as_base64(image_path):
    with open(image_path, 'rb') as f:
        return base64.b64encode(f.read()).decode('utf-8')
    
# Load test image and prepare binary data for API request
image_base64 = load_image_as_base64('./images/raccoon_wizard.png')
image_binary = base64.b64decode(image_base64)

# Call StabilityAI Fast 3D API with image and generation parameters
response = requests.post(
    f"https://api.stability.ai/v2beta/3d/stable-fast-3d",
    headers={
        "authorization": f"Bearer {STABILITY_API_KEY}",
    },
    files={
        # Using BytesIO for in-memory image data (alternative: direct file handle)
        "image": io.BytesIO(image_binary)
    },
    data={
        "remesh": "quad",  # Quad-based mesh topology
        "texture_resolution": "2048"  # High-resolution texture output
    }
)

# Handle API response and save generated 3D model
if response.status_code == 200:
    # Save GLB model file to local directory
    with open("./output.glb", 'wb') as file:
        file.write(response.content)
    print("3D model generated successfully: output.glb")
else:
    # Handle API errors
    raise Exception(str(response.json()))
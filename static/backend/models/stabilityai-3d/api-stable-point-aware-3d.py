# Direct API test script for StabilityAI Point Aware 3D generation
# Higher quality 3D generation with point cloud awareness

import requests
import boto3
import json
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

# Call StabilityAI Point Aware 3D API for high-quality generation
response = requests.post(
    f"https://api.stability.ai/v2beta/3d/stable-point-aware-3d",
    headers={
        "authorization": f"Bearer {STABILITY_API_KEY}",
    },
    files={
        "image": open("./images/raccoon_wizard.png", "rb")  # Direct file handle
    },
    data={
        "remesh": "quad",  # Quad-based mesh topology
        "texture_resolution": "2048"  # High-resolution texture output
    }
)

# Handle API response and save generated 3D model
if response.status_code == 200:
    # Save GLB model with descriptive filename
    with open("./output-point-aware-3d.glb", 'wb') as file:
        file.write(response.content)
    print("Point Aware 3D model generated successfully: output-point-aware-3d.glb")
else:
    # Handle API errors
    raise Exception(str(response.json()))
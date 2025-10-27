# Test script for StabilityAI 3D model generation endpoints
# Tests both Fast 3D and Point Aware 3D generation APIs

import requests
import base64

# Load test image and encode to base64 for API request
with open('./images/raccoon_wizard.png', 'rb') as f:
    image_base64 = base64.b64encode(f.read()).decode('utf-8')

def test_fast_3d():
    """Test the Fast 3D generation endpoint - optimized for speed"""
    print("Testing Fast 3D endpoint...")
    response = requests.post(
        'http://localhost:8000/generate-fast-3d',
        json={'image': image_base64}
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")

def test_point_aware_3d():
    """Test the Point Aware 3D generation endpoint - higher quality with point cloud awareness"""
    print("\nTesting Point Aware 3D endpoint...")
    response = requests.post(
        'http://localhost:8000/generate-point-aware-3d',
        json={'image': image_base64}
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")

# Execute both test functions to validate API endpoints
if __name__ == "__main__":
    test_fast_3d()
    test_point_aware_3d()
"""
Shared constants and enums for the 3D model generation system
"""
from enum import Enum
import os


class ModelService(str, Enum):
    """3D Model generation services"""
    TRIPOSR = "triposr"
    STABLE3DGEN = "stable-3dgen"
    DIRECT3DS2 = "direct3d-s2"


class ModelFormat(str, Enum):
    """3D Model output formats"""
    GLB = "glb"
    OBJ = "obj"
    PLY = "ply"
    STL = "stl"


class JobStatus(str, Enum):
    """Job processing status"""
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


def get_service_url(service: ModelService) -> str:
    """
    Get service URL from environment or default to full Kubernetes DNS name
    
    Args:
        service: ModelService enum value
        
    Returns:
        Full service URL with protocol and port
    """
    namespace = os.getenv('K8S_NAMESPACE', '3d-inferencing')
    
    urls = {
        ModelService.TRIPOSR: os.getenv(
            'TRIPOSR_SERVICE_URL',
            f'http://triposr-service.{namespace}.svc.cluster.local:8000'
        ),
        ModelService.STABLE3DGEN: os.getenv(
            'STABLE3DGEN_SERVICE_URL',
            f'http://stable3dgen-service.{namespace}.svc.cluster.local:8000'
        ),
        ModelService.DIRECT3DS2: os.getenv(
            'DIRECT3DS2_SERVICE_URL',
            f'http://direct3d-s2-service.{namespace}.svc.cluster.local:8000'
        )
    }
    
    return urls[service]

"""
Direct3D-S2 Inference Module

Handles model loading and 3D generation using Direct3DS2Pipeline.
"""

import os
import base64
import io
import torch
import numpy as np
from PIL import Image
import logging
import traceback
from typing import Dict, Any, Optional
import trimesh

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class Direct3DS2Inference:
    """
    Direct3D-S2 inference class for gigascale 3D generation from images.
    Uses Direct3DS2Pipeline with Spatial Sparse Attention (SSA).
    """
    
    def __init__(self):
        """Initialize and load all required models"""
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Initializing Direct3D-S2 on device: {self.device}")
        
        try:
            # Import Direct3DS2Pipeline
            from direct3d_s2.pipeline import Direct3DS2Pipeline
            from direct3d_s2.utils.rembg import BiRefNet
            
            # Load Direct3D-S2 pipeline
            logger.info("Loading Direct3DS2Pipeline from wushuang98/Direct3D-S2...")
            self.pipeline = Direct3DS2Pipeline.from_pretrained(
                'wushuang98/Direct3D-S2', 
                subfolder="direct3d-s2-v-1-1"
            )
            self.pipeline.to(self.device)
            logger.info("Direct3DS2Pipeline loaded successfully")
            
            # Load BiRefNet for background removal
            logger.info("Loading BiRefNet for background removal...")
            self.rembg = BiRefNet(device=self.device)
            logger.info("BiRefNet loaded successfully")
            
            if torch.cuda.is_available():
                total_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
                logger.info(f"GPU memory available: {total_memory:.1f}GB")
                
            logger.info("Direct3D-S2 inference engine initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Direct3D-S2: {e}")
            logger.error(traceback.format_exc())
            raise
    
    def _decode_image(self, image_data: str) -> Image.Image:
        """
        Decode base64 image data to PIL Image
        
        Args:
            image_data: Base64 encoded image string (with or without data URI prefix)
            
        Returns:
            PIL Image object
        """
        try:
            # Handle data URI format
            if image_data.startswith('data:image'):
                if ',' not in image_data:
                    raise ValueError("Invalid data URI format")
                image_data = image_data.split(',', 1)[1]
            
            # Decode base64
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
            
            # Convert to RGB if needed
            if image.mode not in ['RGB', 'RGBA']:
                image = image.convert('RGB')
                
            return image
            
        except Exception as e:
            logger.error(f"Failed to decode image: {e}")
            raise ValueError(f"Invalid image data: {e}")
    
    def generate(
        self,
        image_base64: str,
        remove_background: bool = True,
        use_alpha_channel: bool = False,
        sdf_resolution: int = 512,
        mc_threshold: float = 0.05,
        remesh: bool = False,
        simplify_ratio: float = 0.95,
        remove_interior: bool = True,
        output_format: str = 'obj'
    ) -> Dict[str, Any]:
        """
        Generate 3D model from input image
        
        Args:
            image_base64: Base64 encoded input image
            remove_background: Whether to remove background using BiRefNet
            use_alpha_channel: Whether to use alpha channel for background
            sdf_resolution: SDF resolution (512 or 1024)
            mc_threshold: Marching cubes threshold
            remesh: Whether to remesh/simplify the output
            simplify_ratio: Mesh simplification ratio if remesh is True
            remove_interior: Whether to remove interior faces
            output_format: Output mesh format ('obj', 'glb', 'ply', 'stl')
            
        Returns:
            Dictionary containing:
                - mesh_data: bytes of the exported mesh
                - format: output format
                - vertices: number of vertices
                - faces: number of faces
        """
        try:
            logger.info(f"Starting generation with sdf_resolution={sdf_resolution}, remove_bg={remove_background}")
            
            # Decode input image
            image = self._decode_image(image_base64)
            logger.info(f"Image decoded: {image.size}, mode: {image.mode}")
            
            # Process background removal
            if remove_background:
                logger.info("Removing background with BiRefNet...")
                processed_image = self.rembg.run(image, use_alpha_channel)
                # BiRefNet always returns numpy array (RGBA with 4 channels)
                # Convert to PIL Image with correct dtype and mode
                if isinstance(processed_image, np.ndarray):
                    # Ensure uint8 dtype and RGBA mode for 4-channel arrays
                    if processed_image.shape[-1] == 4:
                        processed_image = Image.fromarray(processed_image.astype(np.uint8), mode='RGBA')
                    else:
                        processed_image = Image.fromarray(processed_image.astype(np.uint8), mode='RGB')
                elif not isinstance(processed_image, Image.Image):
                    raise TypeError(f"Unexpected type from BiRefNet: {type(processed_image)}")
                logger.info(f"Background removal completed, image mode: {processed_image.mode}")
            else:
                logger.info("Skipping background removal")
                processed_image = image
            
            # Clear CUDA cache before generation
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                torch.cuda.synchronize()
            
            # Run Direct3D-S2 pipeline
            logger.info(f"Running Direct3D-S2 pipeline at {sdf_resolution} resolution...")
            logger.info(f"Parameters: mc_threshold={mc_threshold}, remesh={remesh}, simplify_ratio={simplify_ratio}")
            
            result = self.pipeline(
                processed_image,
                sdf_resolution=sdf_resolution,
                mc_threshold=mc_threshold,
                remesh=remesh,
                simplify_ratio=simplify_ratio if remesh else None,
                remove_interior=remove_interior
            )
            
            mesh = result["mesh"]
            logger.info("3D generation completed successfully")
            
            # Clear CUDA cache after generation
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                torch.cuda.synchronize()
            
            # Export to bytes
            logger.info(f"Exporting mesh to {output_format} format...")
            mesh_bytes = io.BytesIO()
            
            # Handle different output formats
            if output_format.lower() == 'obj':
                mesh.export(mesh_bytes, file_type='obj', include_normals=True)
            elif output_format.lower() == 'glb':
                mesh.export(mesh_bytes, file_type='glb')
            elif output_format.lower() == 'ply':
                mesh.export(mesh_bytes, file_type='ply')
            elif output_format.lower() == 'stl':
                mesh.export(mesh_bytes, file_type='stl')
            else:
                # Default to OBJ
                mesh.export(mesh_bytes, file_type='obj', include_normals=True)
                output_format = 'obj'
            
            mesh_bytes.seek(0)
            mesh_data = mesh_bytes.read()
            
            vertices = len(mesh.vertices)
            faces = len(mesh.faces)
            
            logger.info(f"Mesh exported: {vertices} vertices, {faces} faces, {len(mesh_data)} bytes")
            
            return {
                'mesh_data': mesh_data,
                'format': output_format,
                'vertices': vertices,
                'faces': faces
            }
            
        except Exception as e:
            logger.error(f"Generation failed: {e}")
            logger.error(traceback.format_exc())
            raise

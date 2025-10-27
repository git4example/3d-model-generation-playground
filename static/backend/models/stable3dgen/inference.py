"""
Stable3DGen Inference Module

Handles model loading and 3D generation using Hi3DGenPipeline.
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


class Stable3DGenInference:
    """
    Stable3DGen inference class for high-fidelity 3D generation from images.
    Uses Hi3DGenPipeline with normal bridging approach.
    """
    
    def __init__(self):
        """Initialize and load all required models"""
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Initializing Stable3DGen on device: {self.device}")
        
        try:
            # Set spconv algorithm
            os.environ['SPCONV_ALGO'] = 'native'
            
            # Import Hi3DGenPipeline
            from hi3dgen.pipelines import Hi3DGenPipeline
            
            # Load Hi3DGen pipeline
            logger.info("Loading Hi3DGenPipeline from Stable-X/trellis-normal-v0-1...")
            self.pipeline = Hi3DGenPipeline.from_pretrained("Stable-X/trellis-normal-v0-1")
            self.pipeline.to(self.device)
            logger.info("Hi3DGenPipeline loaded successfully")
            
            # Load StableNormal predictor via torch.hub
            logger.info("Loading StableNormal predictor...")
            try:
                # Try loading from local cache first
                hub_dir = torch.hub.get_dir()
                local_path = os.path.join(hub_dir, 'hugoycj_StableNormal_main')
                if os.path.exists(local_path):
                    self.normal_predictor = torch.hub.load(
                        local_path,
                        "StableNormal_turbo",
                        yoso_version='yoso-normal-v1-8-1',
                        source='local'
                    )
                else:
                    # Download from HuggingFace
                    self.normal_predictor = torch.hub.load(
                        "hugoycj/StableNormal",
                        "StableNormal_turbo",
                        trust_repo=True,
                        yoso_version='yoso-normal-v1-8-1'
                    )
                logger.info("StableNormal predictor loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load StableNormal: {e}")
                raise
            
            if torch.cuda.is_available():
                total_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
                logger.info(f"GPU memory available: {total_memory:.1f}GB")
                
            logger.info("Stable3DGen inference engine initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Stable3DGen: {e}")
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
        seed: int = 42,
        ss_guidance_strength: float = 3.0,
        ss_sampling_steps: int = 50,
        slat_guidance_strength: float = 3.0,
        slat_sampling_steps: int = 6,
        output_format: str = 'glb'
    ) -> Dict[str, Any]:
        """
        Generate 3D model from input image
        
        Args:
            image_base64: Base64 encoded input image
            remove_background: Whether to remove background using BiRefNet
            seed: Random seed for reproducibility
            ss_guidance_strength: Sparse structure generation guidance strength
            ss_sampling_steps: Sparse structure generation sampling steps
            slat_guidance_strength: Structured latent generation guidance strength
            slat_sampling_steps: Structured latent generation sampling steps
            output_format: Output mesh format ('glb', 'obj', 'ply', 'stl')
            
        Returns:
            Dictionary containing:
                - mesh_data: bytes of the exported mesh
                - format: output format
                - vertices: number of vertices
                - faces: number of faces
        """
        try:
            logger.info(f"Starting generation with seed={seed}, remove_bg={remove_background}")
            
            # Decode input image
            image = self._decode_image(image_base64)
            logger.info(f"Image decoded: {image.size}, mode: {image.mode}")
            
            # Pipeline checks for RGBA with alpha channel - if present, skips BiRefNet
            # We exploit this to make background removal optional
            if not remove_background:
                # Add fake alpha channel so pipeline skips BiRefNet
                logger.info("Skipping background removal - adding alpha channel")
                if image.mode != 'RGBA':
                    image = image.convert('RGB')
                    img_array = np.array(image)
                    # Create fully opaque alpha channel
                    alpha = np.ones((img_array.shape[0], img_array.shape[1]), dtype=np.uint8) * 255
                    rgba_array = np.dstack((img_array, alpha))
                    image = Image.fromarray(rgba_array, mode='RGBA')
            else:
                # Convert to RGB so pipeline DOES use BiRefNet
                logger.info("Using background removal via BiRefNet")
                image = image.convert('RGB')
            
            # Pipeline will automatically handle background removal based on image format
            image = self.pipeline.preprocess_image(image, resolution=1024)
            
            # Generate normal map with StableNormal
            logger.info("Generating normal map with StableNormal...")
            normal_image = self.normal_predictor(
                image,
                resolution=768,
                match_input_resolution=True,
                data_type='object'
            )
            logger.info("Normal map generated successfully")
            
            # Clear CUDA cache before generation
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                torch.cuda.synchronize()
            
            # Run two-stage generation
            logger.info("Running two-stage 3D generation...")
            logger.info(f"Stage 1 (Sparse Structure): steps={ss_sampling_steps}, guidance={ss_guidance_strength}")
            logger.info(f"Stage 2 (Structured Latent): steps={slat_sampling_steps}, guidance={slat_guidance_strength}")
            
            outputs = self.pipeline.run(
                normal_image,
                seed=seed,
                formats=["mesh"],
                preprocess_image=False,  # Already preprocessed
                sparse_structure_sampler_params={
                    "steps": ss_sampling_steps,
                    "cfg_strength": ss_guidance_strength,
                },
                slat_sampler_params={
                    "steps": slat_sampling_steps,
                    "cfg_strength": slat_guidance_strength,
                },
            )
            
            generated_mesh = outputs['mesh'][0]
            logger.info("3D generation completed successfully")
            
            # Clear CUDA cache after generation
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                torch.cuda.synchronize()
            
            # Convert to trimesh and export
            logger.info(f"Exporting mesh to {output_format} format...")
            trimesh_mesh = generated_mesh.to_trimesh(transform_pose=True)
            
            # Export to bytes
            mesh_bytes = io.BytesIO()
            trimesh_mesh.export(mesh_bytes, file_type=output_format)
            mesh_bytes.seek(0)
            mesh_data = mesh_bytes.read()
            
            vertices = len(trimesh_mesh.vertices)
            faces = len(trimesh_mesh.faces)
            
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

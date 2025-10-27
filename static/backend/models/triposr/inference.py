import json
import base64
import io
import os
import torch
import numpy as np
from PIL import Image
import rembg
import logging
import traceback

from tsr.system import TSR
from tsr.utils import remove_background, resize_foreground, to_gradio_3d_orientation

logger = logging.getLogger(__name__)

def model_fn(model_dir):
    """Load TripoSR model and rembg session once at startup"""
    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Starting model load on {device}")

    try:
        logger.info("Loading TripoSR model from HuggingFace...")
        model = TSR.from_pretrained(
            "stabilityai/TripoSR",
            config_name="config.yaml",
            weight_name="model.ckpt"
        )

        chunk_size = int(os.environ.get('TRIPOSR_CHUNK_SIZE', '8192'))
        model.renderer.set_chunk_size(chunk_size)
        logger.info(f"Set renderer chunk size to {chunk_size}")

        model.to(device)
        logger.info("Model loaded and moved to device")

        if torch.cuda.is_available():
            total_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            logger.info(f"GPU memory available: {total_memory:.1f}GB")

        logger.info("Creating rembg session...")
        rembg_session = rembg.new_session()
        logger.info("Rembg session created successfully")

        return {
            'model': model,
            'device': device,
            'rembg_session': rembg_session
        }
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        logger.error(traceback.format_exc())
        raise

def input_fn(request_body, content_type):
    """Parse input and decode base64 image"""
    if content_type != 'application/json':
        raise ValueError(f"Unsupported content type: {content_type}")

    try:
        input_data = json.loads(request_body)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON: {e}")

    if not isinstance(input_data, dict):
        raise ValueError("Request must be JSON object")

    input_str = input_data.get('input', '')
    if not input_str:
        raise ValueError("'input' field required")

    if input_str.startswith('data:image'):
        if ',' not in input_str:
            raise ValueError("Invalid data URI")
        base64_data = input_str.split(',', 1)[1]
    else:
        base64_data = input_str

    try:
        image_bytes = base64.b64decode(base64_data)
        image = Image.open(io.BytesIO(image_bytes))
    except Exception as e:
        raise ValueError(f"Invalid image: {e}")

    return {
        'image': image,
        'no_remove_bg': bool(input_data.get('no_remove_bg', False)),
        'foreground_ratio': float(input_data.get('foreground_ratio', 0.85)),
        'mc_resolution': int(input_data.get('mc_resolution', 256)),
        'model_save_format': input_data.get('model_save_format', 'glb')
    }

def predict_fn(input_data, model_artifacts):
    """Run inference using official TripoSR pattern"""
    try:
        model = model_artifacts['model']
        device = model_artifacts['device']
        rembg_session = model_artifacts['rembg_session']

        image = input_data['image']

        if not input_data['no_remove_bg']:
            logger.info("Removing background...")
            image = remove_background(image, rembg_session)

            logger.info("Resizing foreground...")
            image = resize_foreground(image, input_data['foreground_ratio'])

            logger.info("Alpha blending...")
            image = np.array(image).astype(np.float32) / 255.0
            image = image[:, :, :3] * image[:, :, 3:4] + (1 - image[:, :, 3:4]) * 0.5
            image = Image.fromarray((image * 255.0).astype(np.uint8))

            logger.info("Background removal completed")

            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                torch.cuda.synchronize()

        logger.info("Running model inference...")
        with torch.no_grad():
            scene_codes = model([image], device=device)
        logger.info("Model inference completed")

        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        logger.info("Extracting mesh...")
        meshes = model.extract_mesh(scene_codes, True, resolution=input_data['mc_resolution'])
        meshes[0] = to_gradio_3d_orientation(meshes[0])
        logger.info("Mesh extraction completed")

        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.synchronize()

        mesh_bytes = io.BytesIO()
        meshes[0].export(mesh_bytes, file_type=input_data['model_save_format'])
        mesh_bytes.seek(0)

        return {
            'model_data': mesh_bytes.read(),
            'format': input_data['model_save_format'],
            'vertices': len(meshes[0].vertices),
            'faces': len(meshes[0].faces)
        }
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        logger.error(traceback.format_exc())
        raise

def output_fn(prediction, content_type):
    """Format output"""
    return json.dumps({
        'model_data': base64.b64encode(prediction['model_data']).decode(),
        'format': prediction['format'],
        'vertices': prediction['vertices'],
        'faces': prediction['faces']
    })

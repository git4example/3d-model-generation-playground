#!/usr/bin/env python3
"""
Download and cache model weights for Stable3DGen
This script downloads BiRefNet and other required models to the weights/ directory
"""

import os
from huggingface_hub import snapshot_download

WEIGHTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'weights')
os.makedirs(WEIGHTS_DIR, exist_ok=True)

def cache_weights(weights_dir: str) -> dict:
    """Download and cache model weights"""
    model_ids = [
        "ZhengPeng7/BiRefNet",  # Background removal model
    ]
    
    cached_paths = {}
    for model_id in model_ids:
        print(f"Downloading and caching model: {model_id}")
        local_path = os.path.join(weights_dir, model_id.split("/")[-1])
        
        if os.path.exists(local_path):
            print(f"Already cached at: {local_path}")
            cached_paths[model_id] = local_path
            continue
        
        # Download the model
        local_path = snapshot_download(
            repo_id=model_id,
            local_dir=local_path,
            force_download=False
        )
        cached_paths[model_id] = local_path
        print(f"Cached at: {local_path}")
    
    return cached_paths

if __name__ == "__main__":
    print("Downloading model weights...")
    cache_weights(WEIGHTS_DIR)
    print("All weights downloaded successfully!")

FROM pytorch/pytorch:2.4.0-cuda12.1-cudnn9-runtime

WORKDIR /app
ENV PYTHONUNBUFFERED=1
ENV SPCONV_ALGO=native
ENV TORCH_HOME=/app/.cache/torch
ENV HF_HOME=/app/.cache/huggingface

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch and CUDA dependencies (following official Stable3DGen instructions)
RUN pip install --no-cache-dir torch==2.4.0 torchvision==0.19.0 --index-url https://download.pytorch.org/whl/cu121
RUN pip install --no-cache-dir spconv-cu121==2.3.8 xformers==0.0.27.post2

# Install application requirements
COPY models/stable3dgen/requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Clone Stable3DGen repository and copy hi3dgen module
RUN git clone --recursive https://github.com/Stable-X/Stable3DGen.git /tmp/stable3dgen && \
    cp -r /tmp/stable3dgen/hi3dgen /app/ && \
    rm -rf /tmp/stable3dgen

# Copy shared utilities from parent directory
COPY shared /app/shared

# Copy application code
COPY models/stable3dgen/main.py /app/
COPY models/stable3dgen/inference.py /app/
COPY models/stable3dgen/download_weights.py /app/

# Copy test image
COPY models/stable3dgen/cat.jpg /app/

# Download model weights
RUN python /app/download_weights.py

RUN mkdir -p /tmp/stable3dgen_outputs

EXPOSE 8000

# Health check with longer timeout for model loading
HEALTHCHECK --interval=30s --timeout=10s --start-period=300s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]

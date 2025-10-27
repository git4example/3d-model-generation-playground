FROM nvidia/cuda:12.4.1-devel-ubuntu22.04

# Install Python 3.10 and system dependencies
RUN apt update && apt install -y \
    python3 python3-pip \
    git \
    sudo \
    wget \
    build-essential \
    cmake \
    ninja-build \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsparsehash-dev && \
    rm -rf /var/lib/apt/lists/*

# Use python3.10 as default
RUN ln -sf /usr/bin/python3.10 /usr/bin/python && \
    ln -sf /usr/bin/pip3 /usr/bin/pip

# Upgrade pip and install PyTorch 2.5.1 for CUDA 12.4
RUN pip install --upgrade pip && \
    pip install torch==2.5.1 torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124

# Set architecture for g5.2xlarge (A10G = compute capability 8.6)
ENV TORCH_CUDA_ARCH_LIST="8.6"
ENV FORCE_CUDA=1
ENV MAX_JOBS=12

# Clone torchsparse into third_party
RUN mkdir -p /tmp/third_party && \
    git clone https://github.com/mit-han-lab/torchsparse.git /tmp/third_party/torchsparse

# Copy local Direct3D-S2 (with our OOM fix: remove_interior=False in pipeline.py)
COPY models/direct3d-s2/Direct3D-S2 /tmp/direct3d-s2

# Set working directory
WORKDIR /app

# Copy application files
COPY shared /app/shared
COPY models/direct3d-s2/main.py /app/
COPY models/direct3d-s2/inference.py /app/
COPY models/direct3d-s2/cat.jpg /app/
COPY models/direct3d-s2/requirements.txt /app/
COPY models/direct3d-s2/entrypoint.sh /app/

# Copy third_party to app
RUN cp -r /tmp/third_party /app/
RUN cp -r /tmp/direct3d-s2/third_party/voxelize /app/third_party/

ENV PYTHONPATH="/app:$PYTHONPATH"
ENV TORCH_HOME=/app/.cache/torch
ENV HF_HOME=/app/.cache/huggingface
ENV PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True

# Install Python dependencies (torchsparse and flash-attn excluded - installed separately)
RUN pip install --no-cache-dir -r /app/requirements.txt

# Install local C++/CUDA extensions (y4my4m's proven method)
RUN pip install --no-cache-dir "filelock>=3.20"
RUN cd /app/third_party/torchsparse && python setup.py install
RUN pip install --no-cache-dir /app/third_party/voxelize

# Install FlashAttention (PyTorch 2.5.1 + CUDA 12.4 + Python 3.10 pre-built wheel)
RUN wget 'https://github.com/Dao-AILab/flash-attention/releases/download/v2.7.4.post1/flash_attn-2.7.4.post1+cu12torch2.5cxx11abiFALSE-cp310-cp310-linux_x86_64.whl' && \
    pip install --no-cache-dir flash_attn-2.7.4.post1+cu12torch2.5cxx11abiFALSE-cp310-cp310-linux_x86_64.whl && \
    rm flash_attn-2.7.4.post1+cu12torch2.5cxx11abiFALSE-cp310-cp310-linux_x86_64.whl

# Install Direct3D-S2 package
RUN cd /tmp/direct3d-s2 && pip install -e .

RUN chmod +x /app/entrypoint.sh
RUN mkdir -p /app/.cache/torch /app/.cache/huggingface /tmp/direct3d_s2_outputs

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=15s --start-period=600s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]

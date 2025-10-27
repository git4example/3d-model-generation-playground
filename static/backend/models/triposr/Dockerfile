FROM pytorch/pytorch:2.6.0-cuda12.4-cudnn9-devel AS builder

ARG TORCH_CUDA_ARCH_LIST="7.5;8.0;8.6;8.9;9.0+PTX"
ENV TORCH_CUDA_ARCH_LIST=${TORCH_CUDA_ARCH_LIST}
ENV FORCE_CUDA=1
ARG MAX_JOBS=16
ENV MAX_JOBS=${MAX_JOBS}

ENV CUDA_HOME=/usr/local/cuda-12.4
ENV PATH=${CUDA_HOME}/bin:${PATH}
ENV LD_LIBRARY_PATH=${CUDA_HOME}/lib64:${LD_LIBRARY_PATH}

WORKDIR /build

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip && \
    pip install --force-reinstall "setuptools<70.0.0"

COPY models/triposr/requirements.txt /build/
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install git+https://github.com/tatsy/torchmcubes.git

RUN --mount=type=cache,target=/root/.cache/git \
    git clone https://github.com/VAST-AI-Research/TripoSR.git /build/triposr

FROM pytorch/pytorch:2.6.0-cuda12.4-cudnn9-runtime

ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/conda /opt/conda

COPY --from=builder /build/triposr/tsr /app/tsr

COPY shared /app/shared

COPY models/triposr/main.py /app/
COPY models/triposr/inference.py /app/
COPY models/triposr/cat.jpg /app/

RUN mkdir -p /tmp/triposr_outputs
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD sh -c "uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1 ${UVICORN_RELOAD:+--reload}"

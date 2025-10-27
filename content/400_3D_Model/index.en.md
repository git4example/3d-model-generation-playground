---
title : "4. Image-to-3D Model Generation"
weight : 400
---

## Workshop Experience: 3D Model Generation Deep Dive

In this module, you'll work with multiple state-of-the-art 3D generation models, comparing their approaches and deploying your own models on AWS EKS. You'll experience the complete pipeline from 2D images to interactive 3D models.

### What You'll Experience

- **Multiple 3D Models**: Test different approaches to 3D generation
- **API vs Self-Hosted**: Compare managed services with self-deployed solutions
- **Model Comparison**: Understand trade-offs between speed, quality, and cost
- **AWS EKS Deployment**: Deploy and scale models on Kubernetes with GPU acceleration

### Available 3D Models

#### Pre-deployed Models (Ready to Use)
- **Stability AI Fast 3D**: Generates 3D models in under 1 second with UV unwrapping
- **Stable3DGen**: High-fidelity 3D geometry with normal bridging for production quality

#### Workshop Deployment (You'll Deploy This)
- **Direct3D-S2**: Highest quality with native 3D generation - you'll deploy this on AWS EKS
- **Texture Enhancement**: Advanced texture painting and detail enhancement models

### Hands-on Activities

1. **Pre-deployed Model Testing**: Test Stability AI Fast 3D and Stable3DGen through the frontend
2. **Direct3D-S2 Deployment**: Deploy and configure Direct3D-S2 on AWS EKS with GPU support
3. **Model Comparison**: Test all models with the same input images
4. **Performance Analysis**: Benchmark generation speed, quality, and resource usage
5. **Integration Testing**: Experience the complete pipeline from image to 3D model

### Technical Skills You'll Gain

- **Containerization**: Package Direct3D-S2 model for Kubernetes deployment
- **GPU Management**: Configure NVIDIA GPU resources for optimal performance
- **EKS Deployment**: Deploy and scale models on Amazon EKS with GPU acceleration
- **ALB Configuration**: Set up Application Load Balancer routing for model access

![3D Asset Generated](/static/images/3d-asset-generated.png)

Ready to transform 2D images into 3D models? Let's explore the world of AI-powered 3D generation!

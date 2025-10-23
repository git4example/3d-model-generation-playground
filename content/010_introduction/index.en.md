---
title: 'Introduction'
weight: 10
---

Copyright Amazon Web Services, Inc. and its affiliates. All rights reserved. This sample code is made available under the MIT-0 license. See the [LICENSE](./LICENSE.en.md) file.

Need updates or seeing errors? Contact awsjlin@amazon.com, calliecg@amazon.com, lestesim@amazon.com, quinncsh@amazon.com, and bryancwh@amazon.com

-------------------------------------------------------------
## Workshop Objective
In this workshop, you will learn how you can:
1. Generate 3D models from 3D generative AI models from 2D images/text-to-2D images on NVIDIA GPUs on AWS.
2. Use Amazon Bedrock for customization and modification of images.
3. Deploy and scale image-to-3D model inference using Amazon EKS.
4. Learn to build a scalable architecture for 3D asset generation and management.

****Target Audience****: Technical leaders, Engineering Managers, Solutions Architects, DevOps Engineers/Platform Engineers, Game Developers/Technical Artists, Machine Learning Scientists/Engineers, Cloud Architects, Students

****Prerequisites****: Recommended to have an fundamental understanding of AWS Cloud
- AWS account access
- Basic understanding of AWS services
- Familiarity with containerization concepts
- Download and install Blender at the start of the workshop

****Duration****: Approximately 1 hour.

![lab-image](/static/images/lab-image.png)

-----

## Generative AI and Machine Learning in 3D Model Generation

### Understanding the AI/ML Pipeline
Generative AI and Machine Learning (ML) is helping businesses transform the way they operate and innovate. Generative AI refers to a class of Artificial Intelligence that leverages Large Language Models (LLM) in order to generate new content from a prompt, content such as text, images, audio, and software code.

#### Foundational Concepts
* **Neural Networks**: Deep learning architectures that process and transform input data
* **Training Data**: Typically consists of paired 2D images and their corresponding 3D models
* **Inference**: Process of generating new 3D models from unseen 2D images

-----

## Basic Concepts of 3D Models

### What is a 3D Model?
A 3D model is a digital representation of a three-dimensional object. Modern 3D models used in web and mobile applications are typically stored in formats like .glb (GL Binary) and .usdz (Universal Scene Description Zip).

### Core Components of 3D Models

#### 1. Geometry (Mesh)
* **Vertices**: Points in 3D space that define the shape
* **Edges**: Lines connecting vertices
* **Faces**: Triangles or polygons formed by edges
* **Topology**: How vertices, edges, and faces connect to form the model

#### 2. Materials
* **Properties that define how surfaces look and react to light**
* Common attributes include:
  * Base Color
  * Metallic/Roughness
  * Normal maps
  * Opacity
  * Reflectivity

#### 3. Textures
* **2D images mapped onto 3D surfaces**
* Types include:
  * Diffuse/Albedo maps (color)
  * Normal maps (surface detail)
  * Roughness maps (surface smoothness)
  * Specular maps (highlight intensity)

#### 4. UV Mapping
* Process of projecting 2D textures onto 3D surfaces
* Similar to "unwrapping" a 3D object into a flat pattern
* Critical for proper texture application

#### 5. Rigging (for animated models)
* Skeletal structure for animation
* Defines how model deforms when moved
* Consists of:
  * Bones/Joints
  * Skin weights
  * Animation data

### Common 3D File Formats

#### GLB/GLTF (.glb, .gltf)
* Industry standard for web/mobile 3D
* Efficient binary format
* Supports:
  * PBR materials
  * Animations
  * Skeletal data

#### USDZ (.usdz)
* Apple's AR format
* Optimized for iOS/macOS
* Self-contained archive
* AR Quick Look compatible

#### FBX (.fbx)
* Industry standard for content creation
* Supports complex animations
* Commonly used in game development

### 3D Model Quality Factors

#### 1. Polygon Count
* Higher count = more detail but larger file size
* Optimization levels:
  * High-poly (original model)
  * Mid-poly (optimized for real-time)
  * Low-poly (mobile/web)

### Open Source Models Overview

#### 1. TripoSR (Stability AI)
* **Architecture**: Transformer-based feed-forward model with triplane representation
* **Key Features**:
  * Fast inference (< 0.5s on NVIDIA A100)
  * Quality geometry reconstruction
  * Efficient memory usage
* **Technical Components**:
  * Image Encoder: Vision transformer (DINOv1) for feature extraction
  * Triplane Decoder: Converts features to 3D triplane representation
  * Neural Radiance Field (NeRF): Final 3D reconstruction
* **Innovation**:
  * Feed-forward architecture (non-iterative, single-pass generation)
  * Balances speed and quality for practical applications

#### 2. Step1X-3D
* **Architecture**: Two-stage VAE-DiT (Variational Autoencoder + Diffusion Transformer)
* **Key Features**:
  * High-fidelity texture generation
  * Direct 2D-to-3D control transfer
  * Support for complex materials and surface details
  * Trained on 2M curated high-quality 3D assets
* **Technical Components**:
  * Stage 1: Hybrid VAE-DiT geometry generator (TSDF representations)
  * Stage 2: Texture synthesis module for fine detail refinement
  * Multi-modal conditioning for diverse input types
* **Innovation**:
  * Two-stage approach separates geometry and texture generation
  * Curated dataset enables high quality results
  * Efficient control transfer from 2D references to 3D outputs

#### 3. Direct3D-S2
* **Architecture**: Sparse volumetric VAE with Diffusion Transformer
* **Key Features**:
  * Gigascale 3D generation at 1024³ resolution
  * 3.9× forward pass speedup, 9.6× backward pass speedup
  * Trainable on only 8 GPUs at full resolution
  * End-to-end geometry and texture coherence
* **Technical Components**:
  * Sparse SDF VAE (SS-VAE): Encoding/decoding of sparse volumetric data
  * Diffusion Transformer (SS-DiT): Generation with Spatial Sparse Attention
  * Unified sparse volumetric format across all stages
* **Innovation**:
  * Spatial Sparse Attention (SSA) mechanism for efficient processing
  * Consistent sparse representation throughout pipeline
  * Enables scale in 3D generation

#### 4. Stable3DGen
* **Architecture**: Two-stage Structured Latent (SLAT) with Rectified Flow Transformers
* **Key Features**:
  * Unified structured 3D latent representation
  * Multiple output formats (Radiance Fields, 3D Gaussians, meshes)
  * Supports up to 2B parameter models
  * Trained on 500K diverse 3D assets
  * Flexible editing and local 3D manipulation
* **Technical Components**:
  * Stage 1: Sparse structure generation using VAE and Rectified Flow Transformer
  * Stage 2: Detail generation with dense multiview features
  * Sparse voxel grid combined with vision foundation model features
* **Innovation**:
  * Sparse structures with powerful visual representations
  * Modular decoders for diverse 3D output formats

## What is Amazon EKS (Elastic Kubernetes Service)
[**Amazon EKS**](https://aws.amazon.com/eks/), is a managed service that makes it easy for you to deploy, run, manage and scale container based apps using Kubernetes on AWS, without installing and operating your own Kubernetes control plane or worker nodes. Amazon EKS clusters can scale to support thousands of containers, which makes it ideal for Generative AI and ML workloads, where you can tune and deploy LLMs on Amazon EKS. Amazon EKS serves as an effective orchestrator to help achieve rapid scale out and scale in that is required for Generative AI and ML workloads, optimal cost efficiency.

## Frontend to use the model inference
You can connect to the Inference Service using the **WebUI** application, which is designed to [@Callie TO fill in]


## Storing and accessing your model and training data
In this workshop the **TripoSR** model is stored in an Amazon S3 bucket [**Amazon S3**](https://aws.amazon.com/s3/), [[To Update]]

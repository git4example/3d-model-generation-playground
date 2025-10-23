---
title : "Deploying TripoSR on Amazon EKS"
weight : 100
---

## Module Overview

In this workshop the **TripoSR** model is stored in an Amazon ECR... [[Lester to Update]]

## Module 3: Deploying TripoSR on Amazon EKS

### Overview of TripoSR
- Introduction to TripoSR capabilities and architecture
- GitHub repository: https://github.com/VAST-AI-Research/TripoSR
- Model strengths and use cases

### Hands-on Exercise
- Examine the containerized TripoSR model
- Deploy the pre-built container to EKS
- Configure scaling and resource allocation
- Test the deployment with sample inputs

### Key Implementation Steps
1. Review the EKS cluster configuration
2. Understand the Kubernetes deployment manifests
3. Deploy the TripoSR container using kubectl
4. Configure API endpoints for the model
5. Test the integration with the frontend UI

[[Replace image below]]
![fsxl-lab](/static/images/fsxl_lab.png)

---
## Amazon EKS
   [**Amazon EKS**](https://docs.aws.amazon.com/eks/latest/userguide/what-is-eks.html) Amazon Elastic Kubernetes Service (Amazon EKS) is a managed service provided by Amazon Web Services (AWS) that facilitates the deployment, management, and scaling of containerized applications using Kubernetes.

## Kubernetes concepts and integration 
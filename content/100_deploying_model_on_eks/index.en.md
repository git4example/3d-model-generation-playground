---
title : "Deploying TripoSR on Amazon EKS"
weight : 100
---

## Module Overview

In this workshop the **TripoSR** model is stored in an Amazon ECR...

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
## Amazon FSx for Lustre

   [**Amazon FSx for Lustre**](https://docs.aws.amazon.com/fsx/latest/LustreGuide/what-is.html) is a fully managed service that provides a high-performance parallel file system for workloads where speed matters (i.e. Machine Learning, analytics, high performance compute). FSx for Lustre provides sub-millisecond latency access to data, and the ability to scale to TB/s of throughput and millions of IOPS. FSx for Lustre also integrates with [**Amazon S3**](https://aws.amazon.com/s3/), making it easy for you to store, access and process vast amounts of cloud data with a Lustre high-performance file system. When linked to an S3 bucket, an FSx for Lustre file system transparently presents S3 objects as files to the end user, and can automatically update the contents of the linked S3 bucket, as files are added to, modified, or deleted from the Lustre file system.


## Kubernetes storage concepts, and integration with FSx for Lustre

**CSI driver** - The Container Storage Interface (CSI) is a standard for exposing block and file storage systems to Container Orchestration Systems like Kubernetes, allowing Kubernetes to natively manage persistent storage for containerized applications.

The **FSx for Lustre** Container Storage Interface (CSI) driver provides a CSI interface that allows Amazon EKS clusters to manage the lifecycle of persistent volumes which are based on FSx for Lustre file systems. The FSx for Lustre CSI driver allows for fast and easy integration of high-performance, low-latency persistent storage for container workloads.

**StorageClass** - A StorageClass provides a way for EKS administrators to describe the "classes" of storage they offer. Different storage classes might map to different storage types (i.e. different AWS Storage Service types such as Amazon FSx, or  Amazon EBS, or Amazon EFS), or to backup policies. Kubernetes is unopinionated about what these storage classes represent

**Persistent volume (PV)** - is a storage volume mapped to an EKS cluster that has already been provisioned by an administrator. A Persistent Volume's lifecycle goes beyond the life of a Pod, hence it is an ideal choice for Pods that require access to shared data, which needs to be persisted beyond the life of the Pods that use the storage volume.

**Persistent volume claim (PVC)** - Persistent Volume Claim (PVC) is the request for storage volume by a user. Claims can request specific size and access modes (e.g., they can be mounted ReadWriteOnce, ReadOnlyMany or ReadWriteMany)


**Static vs Dynamic provisioning of storage resources:**
  - **Static provisioning** - This involves a two step process to create and use storage:
    1. An administrator creates the backend storage volume on the storage instance (i.e. a new FSx for Lustre instance), and then creates a corresponding Persistent Volume (PV) definition for the FSx for Lustre Instance on the Kubernetes cluster.
    2. The application developer then submits a PVC request to use the Persistent Volume in their Pod.
  - **Dynamic provisioning** - Dynamic provisioning eliminates the need for administrators to pre-provision storage to the EKS cluster. Instead, users can create and use persistent storage on-demand, where it automatically provisions a Persistent Volume (and its associated FSx for Lustre instance) when a user makes a Persistent Volume Claim (PVC) request.

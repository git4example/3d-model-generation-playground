provider "aws" {
  alias  = "ecr"
  region = "us-east-1"
}

# Use existing ECR repository instead of creating new one
data "aws_ecrpublic_repository" "triposr" {
  provider        = aws.ecr
  repository_name = "triposr-model"
}

# Commented out to use existing repository
# resource "aws_ecrpublic_repository" "triposr" {
#   provider        = aws.ecr
#   repository_name = "triposr-model-${random_id.suffix.hex}"
#   catalog_data {
#     description       = "TripoSR inference service for 3D reconstruction from single images"
#     about_text        = "Fast 3D object reconstruction from a single RGB image using TripoSR model with GPU acceleration"
#     usage_text        = "docker pull public.ecr.aws/$(aws ecr-public describe-registries --region us-east-1 --query 'registries[0].registryId' --output text)/triposr:latest"
#     architectures     = ["x86-64"]
#     operating_systems = ["Linux"]
#   }
# }

# ECR Public repository policy removed to avoid validation issues
# The repository owner has full access by default
# resource "aws_ecrpublic_repository_policy" "triposr" {
#   provider        = aws.ecr
#   repository_name = aws_ecrpublic_repository.triposr.repository_name
#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Sid    = "AllowPushForOwner"
#         Effect = "Allow"
#         Principal = {
#           AWS = "arn:aws:iam::${local.account_id}:root"
#         }
#         Action = [
#           "ecr-public:BatchCheckLayerAvailability",
#           "ecr-public:PutImage",
#           "ecr-public:InitiateLayerUpload",
#           "ecr-public:UploadLayerPart",
#           "ecr-public:CompleteLayerUpload"
#         ]
#       }
#     ]
#   })
# }

output "triposr_repository_uri" {
  description = "TripoSR ECR repository URI"
  value       = aws_ecrpublic_repository.triposr.repository_uri
}

# NOTE: ECR Public repositories do not support force_delete
# To destroy, manually delete images first:
# aws ecr-public delete-repository --repository-name stable3dgen-model --force --region us-east-1
# Use existing ECR repository
data "aws_ecrpublic_repository" "stable3dgen" {
  provider        = aws.ecr
  repository_name = "stable3dgen-model"
}

# Commented out to use existing repository  
# resource "aws_ecrpublic_repository" "stable3dgen" {
#   provider        = aws.ecr
#   repository_name = "stable3dgen-model-${random_id.suffix.hex}"
#   catalog_data {
#     description       = "Stable3DGen inference service for high-fidelity 3D generation from images"
#     about_text        = "High-fidelity 3D geometry generation from single images using Hi3DGen with normal bridging and two-stage generation"
#     usage_text        = "docker pull public.ecr.aws/$(aws ecr-public describe-registries --region us-east-1 --query 'registries[0].registryId' --output text)/stable3dgen:latest"
#     architectures     = ["x86-64"]
#     operating_systems = ["Linux"]
#   }
# }

# ECR Public repository policy removed to avoid validation issues
# resource "aws_ecrpublic_repository_policy" "stable3dgen" {
#   provider        = aws.ecr
#   repository_name = aws_ecrpublic_repository.stable3dgen.repository_name
#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Sid    = "AllowPushForOwner"
#         Effect = "Allow"
#         Principal = {
#           AWS = "arn:aws:iam::${local.account_id}:root"
#         }
#         Action = [
#           "ecr-public:BatchCheckLayerAvailability",
#           "ecr-public:PutImage",
#           "ecr-public:InitiateLayerUpload",
#           "ecr-public:UploadLayerPart",
#           "ecr-public:CompleteLayerUpload"
#         ]
#       }
#     ]
#   })
# }

output "stable3dgen_repository_uri" {
  description = "Stable3DGen ECR repository URI"
  value       = aws_ecrpublic_repository.stable3dgen.repository_uri
}

# NOTE: ECR Public repositories do not support force_delete
# To destroy, manually delete images first:
# aws ecr-public delete-repository --repository-name direct3d-s2-model --force --region us-east-1
# Use existing ECR repository
data "aws_ecrpublic_repository" "direct3d_s2" {
  provider        = aws.ecr
  repository_name = "direct3d-s2-model"
}

# Commented out to use existing repository
# resource "aws_ecrpublic_repository" "direct3d_s2" {
#   provider        = aws.ecr
#   repository_name = "direct3d-s2-model-${random_id.suffix.hex}"
#   catalog_data {
#     description       = "Direct3D-S2 inference service for gigascale 3D generation from images"
#     about_text        = "Gigascale 3D generation from single images using Direct3D-S2 with Spatial Sparse Attention (SSA) for high-resolution 3D models up to 1024³ resolution"
#     usage_text        = "docker pull public.ecr.aws/$(aws ecr-public describe-registries --region us-east-1 --query 'registries[0].registryId' --output text)/direct3d-s2:latest"
#     architectures     = ["x86-64"]
#     operating_systems = ["Linux"]
#   }
# }

# ECR Public repository policy removed to avoid validation issues
# resource "aws_ecrpublic_repository_policy" "direct3d_s2" {
#   provider        = aws.ecr
#   repository_name = aws_ecrpublic_repository.direct3d_s2.repository_name
#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Sid    = "AllowPushForOwner"
#         Effect = "Allow"
#         Principal = {
#           AWS = "arn:aws:iam::${local.account_id}:root"
#         }
#         Action = [
#           "ecr-public:BatchCheckLayerAvailability",
#           "ecr-public:PutImage",
#           "ecr-public:InitiateLayerUpload",
#           "ecr-public:UploadLayerPart",
#           "ecr-public:CompleteLayerUpload"
#         ]
#       }
#     ]
#   })
# }

output "direct3d_s2_repository_uri" {
  description = "Direct3D-S2 ECR repository URI"
  value       = aws_ecrpublic_repository.direct3d_s2.repository_uri
}

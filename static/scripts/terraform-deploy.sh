#!/bin/bash
terraform --version

# Create VPC
echo '=== Create VPC for EKS Cluster ==='
terraform apply -target="module.vpc" --auto-approve 

# Create S3 bucket for 3D models
echo "Creating S3 bucket for 3D models"
terraform apply -target="aws_s3_bucket.models_bucket" -auto-approve 

# Create EKS Cluster and EFS Filesystem
echo '=== Create EKS Cluster and EFS Filesystem ==='
terraform apply -target="aws_efs_file_system.efs" -target="module.eks" --auto-approve

# Create DynamoDB tables
echo "Creating DynamoDB tables"
terraform apply -target="aws_dynamodb_table.models_table" -auto-approve

echo "Terraform Apply for rest of the resources ..."
terraform apply --auto-approve

echo "Deployment completed successfully!"
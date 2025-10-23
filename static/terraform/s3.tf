resource "aws_s3_bucket" "models" {
  bucket_prefix = "${lower(var.name)}-models-"
  force_destroy = false
}

resource "aws_s3_bucket_public_access_block" "models" {
  bucket = aws_s3_bucket.models.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "models" {
  bucket = aws_s3_bucket.models.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "models" {
  bucket = aws_s3_bucket.models.id

  rule {
    id     = "cleanup-old-models"
    status = "Enabled"

    filter {
      prefix = ""
    }

    expiration {
      days = 7
    }
  }
}

output "s3_bucket_name" {
  description = "S3 bucket name for model storage"
  value       = aws_s3_bucket.models.id
}

output "s3_bucket_region" {
  description = "S3 bucket region"
  value       = aws_s3_bucket.models.region
}

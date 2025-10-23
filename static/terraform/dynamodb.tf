resource "aws_dynamodb_table" "inference_jobs" {
  name         = "${replace(lower(var.name), " ", "-")}-jobs"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "job_id"

  attribute {
    name = "job_id"
    type = "S"
  }

  attribute {
    name = "model"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  global_secondary_index {
    name            = "model-created_at-index"
    hash_key        = "model"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  ttl {
    enabled        = true
    attribute_name = "ttl_expiry"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name        = "${var.name} Inference Jobs"
    Environment = "production"
    Purpose     = "3D model inference job tracking"
  }
}

output "dynamodb_jobs_table_name" {
  value       = aws_dynamodb_table.inference_jobs.name
  description = "Name of the DynamoDB table for job tracking"
}

output "dynamodb_jobs_table_arn" {
  value       = aws_dynamodb_table.inference_jobs.arn
  description = "ARN of the DynamoDB table for job tracking"
}
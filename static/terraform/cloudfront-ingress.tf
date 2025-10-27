# CloudFront + Kubernetes Ingress Setup (No Domain Required)
# This file creates a shared Ingress for all services and CloudFront distribution
# Only active when var.domain is empty

locals {
  create_cloudfront_setup = var.domain == ""
}

# Create shared Ingress in Kubernetes
resource "kubectl_manifest" "shared_ingress" {
  count = local.create_cloudfront_setup ? 1 : 0
  
  yaml_body = <<-YAML
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: 3d-inferencing
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP":80}]'
    alb.ingress.kubernetes.io/healthcheck-interval-seconds: '30'
    alb.ingress.kubernetes.io/healthcheck-timeout-seconds: '10'
    alb.ingress.kubernetes.io/healthy-threshold-count: '2'
    alb.ingress.kubernetes.io/unhealthy-threshold-count: '3'
    alb.ingress.kubernetes.io/load-balancer-attributes: idle_timeout.timeout_seconds=300
spec:
  ingressClassName: internet-facing-alb
  rules:
  - http:
      paths:
      - path: /triposr
        pathType: Prefix
        backend:
          service:
            name: triposr-service
            port:
              number: 8000
      - path: /stable3dgen
        pathType: Prefix
        backend:
          service:
            name: stable3dgen-service
            port:
              number: 8000
      - path: /direct3d-s2
        pathType: Prefix
        backend:
          service:
            name: direct3d-s2-service
            port:
              number: 8000
      - path: /asset-manager
        pathType: Prefix
        backend:
          service:
            name: asset-manager-service
            port:
              number: 8000
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 3000
  YAML

  depends_on = [
    module.eks_blueprints_addons_core,
    kubectl_manifest.ingressclass_internet_facing_alb
  ]
}

# Wait for ALB to be provisioned by AWS Load Balancer Controller
resource "time_sleep" "wait_for_alb" {
  count = local.create_cloudfront_setup ? 1 : 0
  
  depends_on = [kubectl_manifest.shared_ingress]
  
  create_duration = "3m"  # Wait 3 minutes for ALB provisioning
}

# Wait for ALB to be created and get its DNS
data "kubernetes_ingress_v1" "api" {
  count = local.create_cloudfront_setup ? 1 : 0
  
  metadata {
    name      = "api-ingress"
    namespace = "3d-inferencing"
  }
  
  depends_on = [
    kubectl_manifest.shared_ingress,
    time_sleep.wait_for_alb
  ]
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "api" {
  count   = local.create_cloudfront_setup ? 1 : 0
  enabled = true
  comment = "3D Model Inference API - CloudFront Distribution"

  origin {
    domain_name = data.kubernetes_ingress_v1.api[0].status[0].load_balancer[0].ingress[0].hostname
    origin_id   = "k8s-alb-origin"
    
    custom_origin_config {
      http_port                = 80
      https_port               = 443
      origin_protocol_policy   = "http-only"
      origin_ssl_protocols     = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    target_origin_id       = "k8s-alb-origin"
    viewer_protocol_policy = "redirect-to-https"
    
    # Disable caching for API endpoints
    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0

    forwarded_values {
      query_string = true
      headers      = ["*"]
      
      cookies {
        forward = "all"
      }
    }

    response_headers_policy_id = aws_cloudfront_response_headers_policy.cors[0].id
  }

  price_class = "PriceClass_100"
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name        = "3d-inference-api-cloudfront"
    Environment = "production"
  }

  depends_on = [data.kubernetes_ingress_v1.api]
}

# CORS Response Headers Policy
resource "aws_cloudfront_response_headers_policy" "cors" {
  count   = local.create_cloudfront_setup ? 1 : 0
  name    = "3d-inference-cors-policy"
  comment = "CORS policy for 3D inference API"

  cors_config {
    access_control_allow_credentials = false

    access_control_allow_headers {
      items = ["*"]
    }

    access_control_allow_methods {
      items = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    }

    access_control_allow_origins {
      items = ["*"]
    }

    access_control_expose_headers {
      items = ["*"]
    }

    access_control_max_age_sec = 3600
    origin_override            = false
  }
}

# Outputs
output "cloudfront_domain" {
  value       = local.create_cloudfront_setup ? aws_cloudfront_distribution.api[0].domain_name : null
  description = "CloudFront domain name"
}

output "cloudfront_url" {
  value       = local.create_cloudfront_setup ? "https://${aws_cloudfront_distribution.api[0].domain_name}" : null
  description = "Full CloudFront URL for API access"
}

output "alb_dns" {
  value       = local.create_cloudfront_setup ? try(data.kubernetes_ingress_v1.api[0].status[0].load_balancer[0].ingress[0].hostname, "ALB not ready yet") : null
  description = "ALB DNS name (for debugging)"
}

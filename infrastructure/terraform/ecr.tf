# ─── ECR Repositories ─────────────────────────────────────────────────────────
# One repository per service

locals {
  services = [
    "api-gateway",
    "auth-service",
    "order-service",
    "delivery-service",
    "notification-service",
    "pharmacy-service",
    "frontend"
  ]
}

resource "aws_ecr_repository" "services" {
  for_each             = toset(local.services)
  name                 = "${var.project_name}/${each.key}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true # Automatically scan for vulnerabilities
  }

  tags = {
    Name        = "${var.project_name}-${each.key}"
    Environment = var.environment
  }
}

# ─── Lifecycle policy — keep only last 10 images ──────────────────────────────

resource "aws_ecr_lifecycle_policy" "services" {
  for_each   = aws_ecr_repository.services
  repository = each.value.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = {
        type = "expire"
      }
    }]
  })
}

# ─── Data source for current AWS account ──────────────────────────────────────

data "aws_caller_identity" "current" {}

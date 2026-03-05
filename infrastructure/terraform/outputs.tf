output "alb_dns_name" {
  description = "Public URL of the API Gateway load balancer"
  value       = aws_lb.main.dns_name
}

output "frontend_url" {
  description = "Public URL of the frontend"
  value       = aws_lb.frontend.dns_name
}

output "ecr_registry" {
  description = "ECR registry URL"
  value       = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
}

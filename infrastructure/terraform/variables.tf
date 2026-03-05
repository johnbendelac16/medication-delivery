variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "medication-delivery"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

# ─── Database ─────────────────────────────────────────────────────────────────

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "admin"
  sensitive   = true
}

variable "db_password" {
  description = "PostgreSQL master password"
  type        = string
  sensitive   = true
}

# ─── RabbitMQ ─────────────────────────────────────────────────────────────────

variable "rabbitmq_username" {
  description = "RabbitMQ username"
  type        = string
  default     = "rabbit_user"
  sensitive   = true
}

variable "rabbitmq_password" {
  description = "RabbitMQ password"
  type        = string
  sensitive   = true
}

# ─── Amazon MQ — RabbitMQ managé ─────────────────────────────────────────────

resource "aws_mq_broker" "rabbitmq" {
  broker_name        = "${var.project_name}-rabbitmq"
  engine_type        = "RabbitMQ"
  engine_version     = "3.11.20"
  host_instance_type = "mq.t3.micro" # Free tier eligible
  deployment_mode    = "SINGLE_INSTANCE"

  subnet_ids         = [aws_subnet.private[0].id]
  security_groups    = [aws_security_group.mq.id]

  user {
    username = var.rabbitmq_username
    password = var.rabbitmq_password
  }

  publicly_accessible = false # Only accessible from within VPC

  tags = {
    Name        = "${var.project_name}-rabbitmq"
    Environment = var.environment
  }
}

# ─── Output RabbitMQ endpoint ─────────────────────────────────────────────────

output "rabbitmq_endpoint" {
  description = "RabbitMQ AMQP endpoint"
  value       = aws_mq_broker.rabbitmq.instances[0].endpoints[0]
}

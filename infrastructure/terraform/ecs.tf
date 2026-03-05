# ─── ECS Cluster ──────────────────────────────────────────────────────────────

resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "${var.project_name}-cluster"
    Environment = var.environment
  }
}

# ─── IAM Role for ECS Tasks ───────────────────────────────────────────────────

resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.project_name}-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ─── CloudWatch Log Groups ────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "services" {
  for_each          = toset(local.services)
  name              = "/ecs/${var.project_name}/${each.key}"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-${each.key}-logs"
  }
}

# ─── ECS Task Definition — API Gateway ───────────────────────────────────────

resource "aws_ecs_task_definition" "api_gateway" {
  family                   = "${var.project_name}-api-gateway"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([{
    name  = "api-gateway"
    image = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.project_name}/api-gateway:latest"
    portMappings = [{ containerPort = 3000, protocol = "tcp" }]
    environment = [
      { name = "PORT",                    value = "3000" },
      { name = "JWT_SECRET",              value = "change_me_in_production" },
      { name = "AUTH_SERVICE_URL",        value = "http://auth-service.${var.project_name}.local:3001" },
      { name = "ORDER_SERVICE_URL",       value = "http://order-service.${var.project_name}.local:3002" },
      { name = "DELIVERY_SERVICE_URL",    value = "http://delivery-service.${var.project_name}.local:3003" },
      { name = "NOTIFICATION_SERVICE_URL",value = "http://notification-service.${var.project_name}.local:3004" },
      { name = "PHARMACY_SERVICE_URL",    value = "http://pharmacy-service.${var.project_name}.local:3005" }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = "/ecs/${var.project_name}/api-gateway"
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ecs"
      }
    }
  }])
}

# ─── ECS Task Definition — Auth Service ──────────────────────────────────────

resource "aws_ecs_task_definition" "auth_service" {
  family                   = "${var.project_name}-auth-service"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([{
    name  = "auth-service"
    image = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.project_name}/auth-service:latest"
    portMappings = [{ containerPort = 3001, protocol = "tcp" }]
    environment = [
      { name = "PORT",         value = "3001" },
      { name = "DATABASE_URL", value = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.auth.address}:5432/auth_db" },
      { name = "JWT_SECRET",   value = "change_me_in_production" },
      { name = "RABBITMQ_URL", value = "amqps://${var.rabbitmq_username}:${var.rabbitmq_password}@${replace(aws_mq_broker.rabbitmq.instances[0].endpoints[0], "amqps://", "")}" }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = "/ecs/${var.project_name}/auth-service"
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ecs"
      }
    }
  }])
}

# ─── ECS Task Definition — Order Service ─────────────────────────────────────

resource "aws_ecs_task_definition" "order_service" {
  family                   = "${var.project_name}-order-service"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([{
    name  = "order-service"
    image = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.project_name}/order-service:latest"
    portMappings = [{ containerPort = 3002, protocol = "tcp" }]
    environment = [
      { name = "PORT",         value = "3002" },
      { name = "DATABASE_URL", value = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.order.address}:5432/order_db" },
      { name = "RABBITMQ_URL", value = "amqps://${var.rabbitmq_username}:${var.rabbitmq_password}@${replace(aws_mq_broker.rabbitmq.instances[0].endpoints[0], "amqps://", "")}" }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = "/ecs/${var.project_name}/order-service"
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ecs"
      }
    }
  }])
}

# ─── ECS Task Definition — Delivery Service ──────────────────────────────────

resource "aws_ecs_task_definition" "delivery_service" {
  family                   = "${var.project_name}-delivery-service"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([{
    name  = "delivery-service"
    image = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.project_name}/delivery-service:latest"
    portMappings = [{ containerPort = 3003, protocol = "tcp" }]
    environment = [
      { name = "PORT",         value = "3003" },
      { name = "DATABASE_URL", value = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.delivery.address}:5432/delivery_db" },
      { name = "RABBITMQ_URL", value = "amqps://${var.rabbitmq_username}:${var.rabbitmq_password}@${replace(aws_mq_broker.rabbitmq.instances[0].endpoints[0], "amqps://", "")}" }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = "/ecs/${var.project_name}/delivery-service"
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ecs"
      }
    }
  }])
}

# ─── ECS Task Definition — Notification Service ──────────────────────────────

resource "aws_ecs_task_definition" "notification_service" {
  family                   = "${var.project_name}-notification-service"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([{
    name  = "notification-service"
    image = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.project_name}/notification-service:latest"
    portMappings = [{ containerPort = 3004, protocol = "tcp" }]
    environment = [
      { name = "PORT",         value = "3004" },
      { name = "RABBITMQ_URL", value = "amqps://${var.rabbitmq_username}:${var.rabbitmq_password}@${replace(aws_mq_broker.rabbitmq.instances[0].endpoints[0], "amqps://", "")}" }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = "/ecs/${var.project_name}/notification-service"
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ecs"
      }
    }
  }])
}

# ─── ECS Task Definition — Pharmacy Service ──────────────────────────────────

resource "aws_ecs_task_definition" "pharmacy_service" {
  family                   = "${var.project_name}-pharmacy-service"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([{
    name  = "pharmacy-service"
    image = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.project_name}/pharmacy-service:latest"
    portMappings = [{ containerPort = 3005, protocol = "tcp" }]
    environment = [
      { name = "PORT",         value = "3005" },
      { name = "DATABASE_URL", value = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.pharmacy.address}:5432/pharmacy_db" },
      { name = "RABBITMQ_URL", value = "amqps://${var.rabbitmq_username}:${var.rabbitmq_password}@${replace(aws_mq_broker.rabbitmq.instances[0].endpoints[0], "amqps://", "")}" }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = "/ecs/${var.project_name}/pharmacy-service"
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ecs"
      }
    }
  }])
}

# ─── ECS Task Definition — Frontend ──────────────────────────────────────────

resource "aws_ecs_task_definition" "frontend" {
  family                   = "${var.project_name}-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([{
    name  = "frontend"
    image = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.project_name}/frontend:latest"
    portMappings = [{ containerPort = 80, protocol = "tcp" }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = "/ecs/${var.project_name}/frontend"
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ecs"
      }
    }
  }])
}

# ─── ECS Services ─────────────────────────────────────────────────────────────

resource "aws_ecs_service" "api_gateway" {
  name            = "api-gateway"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api_gateway.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api_gateway.arn
    container_name   = "api-gateway"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.main]
}

resource "aws_ecs_service" "auth_service" {
  name            = "auth-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.auth_service.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.ecs.id]
  }

  depends_on = [aws_ecs_service.api_gateway]
}

resource "aws_ecs_service" "order_service" {
  name            = "order-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.order_service.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.ecs.id]
  }

  depends_on = [aws_ecs_service.api_gateway]
}

resource "aws_ecs_service" "delivery_service" {
  name            = "delivery-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.delivery_service.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.ecs.id]
  }

  depends_on = [aws_ecs_service.api_gateway]
}

resource "aws_ecs_service" "notification_service" {
  name            = "notification-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.notification_service.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.ecs.id]
  }

  depends_on = [aws_ecs_service.api_gateway]
}

resource "aws_ecs_service" "pharmacy_service" {
  name            = "pharmacy-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.pharmacy_service.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.ecs.id]
  }

  depends_on = [aws_ecs_service.api_gateway]
}

resource "aws_ecs_service" "frontend" {
  name            = "frontend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 80
  }

  depends_on = [aws_lb_listener.frontend]
}

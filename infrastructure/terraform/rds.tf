# ─── RDS Subnet Group ─────────────────────────────────────────────────────────

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

# ─── Auth DB ──────────────────────────────────────────────────────────────────

resource "aws_db_instance" "auth" {
  identifier        = "${var.project_name}-auth-db"
  engine            = "postgres"
  engine_version    = "15"
  instance_class    = "db.t3.micro"
  allocated_storage = 20

  db_name  = "auth_db"
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  skip_final_snapshot = true  # Set to false in production
  deletion_protection = false # Set to true in production

  tags = {
    Name        = "${var.project_name}-auth-db"
    Environment = var.environment
  }
}

# ─── Order DB ─────────────────────────────────────────────────────────────────

resource "aws_db_instance" "order" {
  identifier        = "${var.project_name}-order-db"
  engine            = "postgres"
  engine_version    = "15"
  instance_class    = "db.t3.micro"
  allocated_storage = 20

  db_name  = "order_db"
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  skip_final_snapshot = true
  deletion_protection = false

  tags = {
    Name        = "${var.project_name}-order-db"
    Environment = var.environment
  }
}

# ─── Delivery DB ──────────────────────────────────────────────────────────────

resource "aws_db_instance" "delivery" {
  identifier        = "${var.project_name}-delivery-db"
  engine            = "postgres"
  engine_version    = "15"
  instance_class    = "db.t3.micro"
  allocated_storage = 20

  db_name  = "delivery_db"
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  skip_final_snapshot = true
  deletion_protection = false

  tags = {
    Name        = "${var.project_name}-delivery-db"
    Environment = var.environment
  }
}

# ─── Pharmacy DB ──────────────────────────────────────────────────────────────

resource "aws_db_instance" "pharmacy" {
  identifier        = "${var.project_name}-pharmacy-db"
  engine            = "postgres"
  engine_version    = "15"
  instance_class    = "db.t3.micro"
  allocated_storage = 20

  db_name  = "pharmacy_db"
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  skip_final_snapshot = true
  deletion_protection = false

  tags = {
    Name        = "${var.project_name}-pharmacy-db"
    Environment = var.environment
  }
}

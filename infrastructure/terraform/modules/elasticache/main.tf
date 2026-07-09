resource "aws_elasticache_subnet_group" "redis" {
  name       = "${var.project_name}-${var.environment}-redis-subnet-group"
  subnet_ids = var.private_subnet_ids
}

resource "random_password" "redis_auth" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "${var.project_name}-${var.environment}-redis"
  description                = "Redis replication group for BookMyVenue caching and sessions"
  node_type                  = var.redis_node_type
  num_cache_clusters         = var.redis_num_cache_nodes
  port                       = 6379
  parameter_group_name       = "default.redis7"
  subnet_group_name          = aws_elasticache_subnet_group.redis.name
  security_group_ids         = [var.redis_sg_id]
  engine                     = "redis"
  engine_version             = "7.0"
  automatic_failover_enabled = true

  transit_encryption_enabled = true
  at_rest_encryption_enabled = true
  auth_token                 = random_password.redis_auth.result

  tags = {
    Name        = "${var.project_name}-${var.environment}-redis-cluster"
    Environment = var.environment
  }
}

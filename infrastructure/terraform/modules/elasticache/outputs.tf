output "primary_endpoint" {
  value = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "auth_token" {
  value     = random_password.redis_auth.result
  sensitive = true
}

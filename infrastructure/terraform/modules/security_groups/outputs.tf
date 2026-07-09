output "eks_nodes_sg_id" {
  value = aws_security_group.eks_nodes.id
}

output "redis_sg_id" {
  value = aws_security_group.redis.id
}

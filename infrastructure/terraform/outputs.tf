output "vpc_id" {
  description = "AWS Virtual Private Cloud Resource ID"
  value       = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  description = "Elastic Kubernetes Service Control Plane API Endpoint"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_name" {
  description = "EKS Cluster resource name tag"
  value       = module.eks.cluster_name
}

output "eks_cluster_security_group_id" {
  description = "Security Group ID attached to EKS Control Plane nodes"
  value       = module.security_groups.eks_nodes_sg_id
}

output "s3_assets_bucket_name" {
  description = "AWS S3 Assets Storage Bucket Resource ID"
  value       = module.s3.assets_bucket_name
}

output "redis_replication_group_primary_endpoint" {
  description = "AWS ElastiCache Redis replication endpoint link"
  value       = module.elasticache.primary_endpoint
}

output "mongodb_atlas_connection_string" {
  description = "MongoDB Atlas database connection URI template"
  value       = module.mongodb_atlas.connection_string
  sensitive   = true
}

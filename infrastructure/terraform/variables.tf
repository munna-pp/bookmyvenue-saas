variable "aws_region" {
  description = "AWS Target Deployment Region"
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "AWS CLI Credential Profile Name"
  type        = string
  default     = "default"
}

variable "environment" {
  description = "Target Hosting Environment (staging/production)"
  type        = string
  default     = "staging"
}

variable "project_name" {
  description = "Namespace name for resource tag bindings"
  type        = string
  default     = "bookmyvenue"
}

variable "vpc_cidr" {
  description = "Classless Inter-Domain Routing IP Block for AWS VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "eks_cluster_name" {
  description = "Elastic Kubernetes Service Cluster Name"
  type        = string
  default     = "bmv-eks-cluster"
}

variable "eks_kubernetes_version" {
  description = "EKS Control Plane Target Kubernetes Engine Version"
  type        = string
  default     = "1.30"
}

variable "mongodb_atlas_org_id" {
  description = "MongoDB Atlas Organization Identifier"
  type        = string
  default     = "placeholder_mongodb_atlas_org_id"
}

variable "mongodb_atlas_project_id" {
  description = "MongoDB Atlas Project Identifier"
  type        = string
  default     = "placeholder_mongodb_atlas_project_id"
}

variable "mongodb_atlas_cluster_name" {
  description = "MongoDB Atlas Database Instance Name"
  type        = string
  default     = "bmv-atlas-cluster"
}

variable "mongodb_atlas_public_key" {
  description = "MongoDB Atlas Access API Key (Public Token)"
  type        = string
  sensitive   = true
}

variable "mongodb_atlas_private_key" {
  description = "MongoDB Atlas Access API Key (Private Token)"
  type        = string
  sensitive   = true
}

variable "mongodb_atlas_db_user" {
  description = "Database Account Username for Express Backend application mapping"
  type        = string
  default     = "bmv-app-user"
}

variable "mongodb_atlas_db_password" {
  description = "Database Account Secure Password for Express Backend application mapping"
  type        = string
  sensitive   = true
}

variable "redis_node_type" {
  description = "ElastiCache Node hardware resource profile type"
  type        = string
  default     = "cache.t4g.medium"
}

variable "redis_num_cache_nodes" {
  description = "Number of active nodes in Redis cluster configuration"
  type        = number
  default     = 2
}

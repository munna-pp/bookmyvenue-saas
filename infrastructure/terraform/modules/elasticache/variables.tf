variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "redis_sg_id" {
  type = string
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "Subnets mapping for ElastiCache Subnet Group"
}

variable "redis_node_type" {
  type = string
}

variable "redis_num_cache_nodes" {
  type = number
}

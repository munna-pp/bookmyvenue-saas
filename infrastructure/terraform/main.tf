# Root main.tf linking devops modules

module "vpc" {
  source = "./modules/vpc"

  vpc_cidr     = var.vpc_cidr
  project_name = var.project_name
  environment  = var.environment
}

module "security_groups" {
  source = "./modules/security_groups"

  vpc_id       = module.vpc.vpc_id
  project_name = var.project_name
  environment  = var.environment
}

module "iam" {
  source = "./modules/iam"

  project_name = var.project_name
  environment  = var.environment
}

module "s3" {
  source = "./modules/s3"

  project_name = var.project_name
  environment  = var.environment
}

module "elasticache" {
  source = "./modules/elasticache"

  project_name          = var.project_name
  environment           = var.environment
  redis_sg_id           = module.security_groups.redis_sg_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  redis_node_type       = var.redis_node_type
  redis_num_cache_nodes = var.redis_num_cache_nodes
}

module "eks" {
  source = "./modules/eks"

  project_name       = var.project_name
  environment        = var.environment
  cluster_name       = var.eks_cluster_name
  kubernetes_version = var.eks_kubernetes_version
  cluster_role_arn   = module.iam.cluster_role_arn
  nodes_role_arn     = module.iam.nodes_role_arn
  public_subnet_ids  = module.vpc.public_subnet_ids
  private_subnet_ids = module.vpc.private_subnet_ids
}

module "mongodb_atlas" {
  source = "./modules/mongodb_atlas"

  mongodb_atlas_project_id   = var.mongodb_atlas_project_id
  mongodb_atlas_cluster_name = var.mongodb_atlas_cluster_name
  mongodb_atlas_db_user      = var.mongodb_atlas_db_user
  mongodb_atlas_db_password  = var.mongodb_atlas_db_password
  environment                = var.environment
}

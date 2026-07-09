terraform {
  required_providers {
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.15"
    }
  }
}

resource "mongodbatlas_advanced_cluster" "cluster" {
  project_id   = var.mongodb_atlas_project_id
  name         = var.mongodb_atlas_cluster_name
  cluster_type = "REPLICASET"

  replication_specs {
    region_configs {
      provider_name = "AWS"
      region_name   = "US_EAST_1"
      priority      = 7
      electable_specs {
        instance_size = "M10"
        node_count    = 3
      }
    }
  }
}

resource "mongodbatlas_database_user" "db_user" {
  username           = var.mongodb_atlas_db_user
  password           = var.mongodb_atlas_db_password
  project_id         = var.mongodb_atlas_project_id
  auth_database_name = "admin"

  roles {
    role_name     = "readWriteAnyDatabase"
    database_name = "admin"
  }
}

# Template IP access whitelist (For production, EKS VPC peering should be used instead of 0.0.0.0/0)
resource "mongodbatlas_project_ip_access_list" "whitelist" {
  project_id = var.mongodb_atlas_project_id
  cidr_block = "0.0.0.0/0"
  comment    = "Allow ingress access from cluster NAT gateways (Whitelist configured for staging verification)"
}

variable "mongodb_atlas_project_id" {
  type = string
}

variable "mongodb_atlas_cluster_name" {
  type = string
}

variable "mongodb_atlas_db_user" {
  type = string
}

variable "mongodb_atlas_db_password" {
  type      = string
  sensitive = true
}

variable "environment" {
  type = string
}

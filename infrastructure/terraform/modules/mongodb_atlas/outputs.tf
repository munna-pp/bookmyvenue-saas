output "connection_string" {
  value = mongodbatlas_advanced_cluster.cluster.connection_strings[0].standard_srv
}

output "cluster_id" {
  value = mongodbatlas_advanced_cluster.cluster.id
}

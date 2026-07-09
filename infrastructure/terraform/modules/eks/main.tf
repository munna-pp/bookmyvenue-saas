resource "aws_eks_cluster" "this" {
  name     = var.cluster_name
  role_arn = var.cluster_role_arn
  version  = var.kubernetes_version

  vpc_config {
    subnet_ids              = concat(var.public_subnet_ids, var.private_subnet_ids)
    endpoint_private_access = true
    endpoint_public_access  = true
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-eks-cluster"
    Environment = var.environment
  }
}

resource "aws_eks_node_group" "nodes" {
  cluster_name    = aws_eks_cluster.this.name
  node_group_name = "${var.project_name}-managed-nodes"
  node_role_arn   = var.nodes_role_arn
  subnet_ids      = var.private_subnet_ids

  scaling_config {
    desired_size = var.environment == "production" ? 3 : 2
    max_size     = var.environment == "production" ? 10 : 5
    min_size     = var.environment == "production" ? 3 : 2
  }

  update_config {
    max_unavailable = 1
  }

  instance_types = ["t3.medium"]
  capacity_type  = "ON_DEMAND"

  tags = {
    Name        = "${var.project_name}-${var.environment}-eks-nodes"
    Environment = var.environment
  }

  depends_on = [
    aws_eks_cluster.this
  ]
}

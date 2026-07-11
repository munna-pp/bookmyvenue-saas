# BookMyVenue Terraform Infrastructure as Code

This directory contains Terraform specifications to provision and configure high-availability AWS and MongoDB Atlas cloud infrastructure.

## Module Architecture

- **`vpc`**: Sets up a VPC with 3 Public Subnets (load balancer ingress mapping) and 3 Private Subnets (backend/EKS workers) across Availability Zones.
- **`security_groups`**: Enforces strict firewall blocks, securing EKS instances and preventing outside access to the Redis clusters.
- **`iam`**: Maps AWS IAM roles to EKS Cluster planes and Managed worker groups.
- **`s3`**: Deploys private, encrypted S3 buckets for media/assets storage.
- **`elasticache`**: Configures multi-node Redis clusters with transit/at-rest encryption.
- **`mongodb_atlas`**: Provisions scalable replica sets in MongoDB Atlas and registers DB users.
- **`eks`**: Configures EKS control plane (K8s v1.30) and autoscaling Managed node groups.

## Deployment Guide

1. **Configure credentials**:
   Copy the example input file:

   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

   Provide valid AWS and MongoDB Atlas credentials inside `terraform.tfvars`. Do not commit this file.

2. **Initialize Workspace**:
   Downloads providers and configures modules:

   ```bash
   terraform init
   ```

3. **Plan changes**:
   Inspect resources that will be provisioned:

   ```bash
   terraform plan
   ```

4. **Apply Infrastructure**:
   Provision resources to the cloud:

   ```bash
   terraform apply
   ```

5. **Destroy resources**:
   ```bash
   terraform destroy
   ```

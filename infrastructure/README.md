# BookMyVenue Production Readiness & DevOps

This directory contains the configurations and deployment specifications to compile, containerize, and host **BookMyVenue** services inside a Kubernetes cluster using Helm.

---

## Directory Structure

- **`docker/`**: Standalone production Dockerfile specifications.
- **`kubernetes/`**: Plain Kubernetes YAML files for manual deployments.
- **`helm/bookmyvenue/`**: Reusable Helm chart templates supporting environments configuration overrides.
- **`nginx/`**: Nginx proxy pass routing logic configurations.
- **`terraform/`**: Infrastructure as Code configs (detailed in Phase 9.3).

---

## 1. Local Deployment Verification

To run and verify the production build state locally using Docker Compose, execute:

```bash
# Build standalone images
docker compose -f docker-compose.prod.yml build

# Spin up production stack
docker compose -f docker-compose.prod.yml up -d

# Verify services report healthy state
docker ps

# Tear down stack
docker compose -f docker-compose.prod.yml down
```

---

## 2. Minikube Deployment Guide

Ensure `minikube` is running and the ingress addon is enabled:

```bash
minikube start --driver=docker
minikube addons enable ingress
```

### Steps:

1. **Point Local Shell to Minikube Docker Daemon**:
   This allows you to build images directly inside the Minikube registry without pushing to external hubs:
   ```bash
   minikube docker-env | Invoke-Expression
   ```
2. **Build Stack Images**:
   ```bash
   docker compose -f docker-compose.prod.yml build
   ```
3. **Deploy using Helm Chart**:
   Install the release applying local configurations:
   ```bash
   helm install bmv-release ./infrastructure/helm/bookmyvenue -f ./infrastructure/helm/bookmyvenue/values-local.yaml
   ```
4. **Access the Application**:
   Retrieve the minikube IP address:
   ```bash
   minikube ip
   ```
   Add a local hosts mapping in `C:\Windows\System32\drivers\etc\hosts`:
   ```text
   <MINIKUBE_IP> localhost
   ```

---

## 3. Docker Desktop Kubernetes Guide

Enable Kubernetes in Docker Desktop settings and switch your cluster context:

```bash
kubectl config use-context docker-desktop
```

### Steps:

1. **Install NGINX Ingress Controller**:
   ```bash
   kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml
   ```
2. **Deploy the Helm Release**:
   ```bash
   helm install bmv-release ./infrastructure/helm/bookmyvenue -f ./infrastructure/helm/bookmyvenue/values-local.yaml
   ```
3. **Check Resources Status**:
   ```bash
   kubectl get all -n default
   ```

---

## 4. AWS EKS Deployment Overview

To deploy to production AWS EKS (with MongoDB Atlas and AWS ElastiCache):

1. **Infrastructure Provisioning**:
   Apply Terraform scripts (Phase 9.3) to establish VPC networks, EKS control plane, and DB peering.
2. **Configure Helm for Production**:
   Ensure `values-production.yaml` contains correct database and cache service URIs, and install:
   ```bash
   helm install bmv-release ./infrastructure/helm/bookmyvenue \
     -f ./infrastructure/helm/bookmyvenue/values.yaml \
     -f ./infrastructure/helm/bookmyvenue/values-production.yaml
   ```
3. **Configure AWS ALB Ingress Controller**:
   The `aws-alb` ingress options will provision an internet-facing Application Load Balancer mapping HTTP(S) listener ports.

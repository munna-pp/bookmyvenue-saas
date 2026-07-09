# BookMyVenue Raw Kubernetes Manifests

This directory contains plain Kubernetes manifests for manual deployment, inspection, and verification purposes.

## Deployment Manifests

* **`namespace.yaml`**: Initializes the custom `bookmyvenue` namespace to isolate our container assets.
* **`configmap.yaml`**: Contains environmental configurations for routing API and service requests.
* **`secrets-template.yaml`**: A template mapping system and Stripe/Razorpay/SMTP secret fields. Always duplicate this file, populate actual credentials, and do not commit the production secret file.
* **`networkpolicy.yaml`**: Isolates internal cluster communication, allowing only the backend API pod to query databases (`mongodb` and `redis`), while securing other ingress paths.

## Usage Guide

1. **Create the Namespace**:
   ```bash
   kubectl apply -f namespace.yaml
   ```

2. **Deploy Configuration Maps**:
   ```bash
   kubectl apply -f configmap.yaml
   ```

3. **Deploy Configured Secrets**:
   Copy the secrets template, customize values in base64 format, and apply it:
   ```bash
   cp secrets-template.yaml secrets.yaml
   # edit secrets.yaml
   kubectl apply -f secrets.yaml
   ```

4. **Deploy Network Policy**:
   ```bash
   kubectl apply -f networkpolicy.yaml
   ```

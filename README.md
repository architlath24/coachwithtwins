# FitTwins DevOps Platform

A production-style DevOps project deploying the FitTwins fitness coaching platform on AWS using industry-standard tools.

## Live Demo
http://13.127.25.4

## Architecture
- **Cloud**: AWS (EC2, VPC, S3, IAM, Elastic IP) — Mumbai region
- **IaC**: Terraform — provisions all AWS infrastructure as code
- **Containerization**: Docker + Nginx Alpine
- **Orchestration**: Kubernetes (k3s) — deployment, service, autoscaling
- **CI/CD**: Jenkins — automated build, push, deploy pipeline
- **Monitoring**: Prometheus + Grafana (coming soon)

## Tech Stack
| Tool | Purpose |
|------|---------|
| Terraform | Infrastructure as Code |
| AWS EC2 | Cloud compute |
| Docker | Containerization |
| Nginx | Web server |
| Kubernetes | Container orchestration |
| Jenkins | CI/CD pipeline |
| GitHub | Source control |

## Project Structure

## Infrastructure (Terraform)
- VPC with public subnet (10.0.0.0/16)
- Internet Gateway + Route Tables
- Security Groups (ports 22, 80, 443)
- EC2 t3.micro (free tier)
- Elastic IP (static public IP)

## CI/CD Pipeline (Jenkins)
1. Developer pushes code to GitHub
2. GitHub webhook triggers Jenkins
3. Jenkins builds Docker image
4. Pushes to DockerHub
5. Deploys to Kubernetes
6. Verifies rollout

## How to Deploy
```bash
# 1. Provision infrastructure
cd infrastructure
terraform init
terraform apply

# 2. Build and run container
docker build -t fittwins:v1 .
docker run -d -p 80:80 fittwins:v1

# 3. Deploy to Kubernetes
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

## Author
Archit Lath — Cloud/Platform Engineer

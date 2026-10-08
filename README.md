# FitTwins — Cloud-Native Fitness & Biological Age Platform

FitTwins is a real fitness coaching platform combined with an AI-powered Biological Age assessment application.

The project was built end-to-end using AWS, Terraform, Docker, Jenkins CI/CD, FastAPI, React, PostgreSQL, Amazon RDS, S3, Secrets Manager, Application Load Balancing, CloudWatch, and HTTPS.

---

## Architecture

Internet
  |
  v
Cloudflare DNS
  |
  v
AWS Application Load Balancer
  |
  +-- HTTP :80  -> HTTPS redirect
  |
  +-- HTTPS :443
          |
          v
      EC2 Instance
      Docker Host
          |
          v
        Nginx
          |
          +----------------------+
          |                      |
          v                      v
   Main FitTwins Site     Biological Age React App
                                  |
                                  v
                             FastAPI Backend
                                  |
                     +------------+------------+
                     |            |            |
                     v            v            v
                   RDS           S3       Secrets Manager
                PostgreSQL
                                  |
                                  v
                           Google Gemini API

---

## Live Application

### Main Coaching Website

https://fitwithtwins.com/

### Biological Age Application

https://fitwithtwins.com/biological-age/

### Backend API

https://fitwithtwins.com/api/

---

## Key Features

### Fitness Coaching Website

- FitTwins coaching landing page
- Fitness-focused content and CTAs
- Intake form
- Biological Age application integration
- Nginx-based static content delivery

### Biological Age Application

Users can:

1. Create an account
2. Log in securely
3. Upload a blood report
4. Extract biomarkers using Google Gemini
5. View biomarker results
6. Identify out-of-range values
7. Calculate Biological Age
8. View categorized biomarkers
9. Generate personalized food-first diet recommendations
10. Track previous reports

### Backend

The FastAPI backend provides:

- User registration
- Authentication
- Password hashing
- Blood report processing
- Biomarker extraction
- Biological Age calculation
- Diet-plan generation
- PostgreSQL persistence
- S3 integration

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| AI | Google Gemini |
| Authentication | bcrypt |
| Web Server | Nginx |
| Containers | Docker |
| CI/CD | Jenkins |
| Cloud | AWS |
| Infrastructure as Code | Terraform |
| Load Balancing | AWS Application Load Balancer |
| HTTPS | AWS ACM |
| Object Storage | Amazon S3 |
| Database Hosting | Amazon RDS |
| Secrets | AWS Secrets Manager |
| Monitoring | Amazon CloudWatch |
| DNS | Cloudflare |
| Kubernetes | Kubernetes manifests |

---

## AWS Infrastructure

Terraform manages the AWS infrastructure in `infrastructure/`.

### Networking

- VPC
- Public subnet
- Private subnets
- Internet Gateway
- Route table
- Security groups

### Compute

- Amazon EC2
- Elastic IP
- Docker runtime
- Jenkins CI/CD server

### Database

- Amazon RDS PostgreSQL
- Private database subnets
- Dedicated RDS security group

### Load Balancing

- Application Load Balancer
- HTTP listener
- HTTPS listener
- HTTP to HTTPS redirect
- Target group
- EC2 target attachment

### Security and Storage

- AWS ACM certificate
- AWS Secrets Manager
- Amazon S3
- IAM role and instance profile
- Restricted Jenkins access

### Monitoring

- CloudWatch Agent
- EC2 CPU, memory and disk metrics
- CloudWatch dashboard
- High CPU alarm

---

## CI/CD Pipeline

Jenkins runs on the EC2 infrastructure and deploys the application from GitHub.

Developer
  |
  v
GitHub
  |
  v
Jenkins
  |
  +-- Checkout
  +-- Docker Build
  +-- Deploy Container
  +-- Application Verification
  |
  v
Production EC2

The pipeline:

1. Checks out the latest Git commit
2. Builds the Docker image
3. Removes the previous frontend container
4. Starts the new container
5. Connects it to the Docker network
6. Runs HTTP smoke tests
7. Reports build success or failure

---

## Docker Architecture

The main Docker image uses a multi-stage build.

Node.js Build Stage
  |
  +-- npm ci
  +-- React/Vite build
  |
  v
Nginx Alpine Runtime
  |
  +-- Main FitTwins website
  +-- Biological Age React application
  +-- FastAPI reverse proxy

Nginx routes:

- `/` -> Main FitTwins website
- `/biological-age/` -> React Biological Age application
- `/api/` -> FastAPI backend

---

## Biological Age Flow

User
  |
  v
React Application
  |
  | Upload blood report
  v
FastAPI Backend
  |
  v
Google Gemini
  |
  | Structured biomarker extraction
  v
Biomarker Processing
  |
  +-- Categorization
  +-- Normal/out-of-range classification
  +-- Biological Age calculation
  |
  v
PostgreSQL
  |
  v
React Dashboard

Biomarkers are grouped into categories including:

- Iron Studies
- Lipid Profile
- Liver Function
- Kidney Function
- Blood Count
- Thyroid
- Vitamins & Minerals
- Glucose & Metabolic
- Other

---

## Database

PostgreSQL is hosted on Amazon RDS.

Application tables include:

- `users`
- `reports`
- `biomarkers`

The backend uses SQLAlchemy for database access.

RDS is deployed in private subnets and is not directly exposed to the public internet.

---

## Security

Security controls implemented include:

- HTTPS through AWS ACM
- HTTP to HTTPS redirection
- Private RDS deployment
- Dedicated RDS security group
- EC2 IAM role
- AWS Secrets Manager
- bcrypt password hashing
- Restricted Jenkins access
- Security-group based service communication
- Secrets excluded from Git

---

## Infrastructure as Code

Terraform manages:

- VPC
- Public subnet
- Private subnets
- Internet Gateway
- Route table
- Security groups
- EC2
- Elastic IP
- RDS PostgreSQL
- RDS subnet group
- Application Load Balancer
- Target group
- HTTP listener
- HTTPS listener
- ACM certificate
- IAM role
- IAM instance profile
- S3
- Secrets Manager

Typical workflow:

    cd infrastructure
    terraform init
    terraform validate
    terraform plan
    terraform apply

The current Terraform configuration has been verified against AWS and returns:

    No changes. Your infrastructure matches the configuration.

---

## Kubernetes

The repository also contains Kubernetes manifests under `k8s/`.

They demonstrate:

- Kubernetes Deployment
- Multiple replicas
- Resource requests and limits
- Service exposure
- Container orchestration

The current production deployment uses Docker on EC2 with Jenkins. The Kubernetes manifests are retained as part of the project's container-orchestration implementation and learning path.

---

## Repository Structure

coachwithtwins/
|
+-- backend/
|   +-- main.py
|   +-- database.py
|   +-- models.py
|   +-- schemas.py
|   +-- gemini_service.py
|   +-- biomarker_utils.py
|   +-- supplement_guide.py
|   +-- aws_config.py
|   +-- create_tables.py
|   +-- requirements.txt
|   +-- Dockerfile
|
+-- frontend/
|   +-- src/
|   |   +-- App.jsx
|   |   +-- App.css
|   |   +-- index.css
|   |   +-- main.jsx
|   |   +-- categorize.js
|   +-- package.json
|   +-- vite.config.js
|
+-- infrastructure/
|   +-- main.tf
|   +-- variables.tf
|   +-- outputs.tf
|   +-- deploy.sh
|
+-- k8s/
|   +-- deployment.yaml
|   +-- service.yaml
|
+-- Dockerfile
+-- Jenkinsfile
+-- nginx.conf
+-- index.html
+-- fittwins-form.html
+-- .gitignore
+-- README.md

---

## Local Development

### Frontend

    cd frontend
    npm install
    npm run dev

### Backend

    cd backend
    pip install -r requirements.txt
    uvicorn main:app --reload

### Docker

    docker build -t fittwins-frontend .

    docker run -d \
      --name fittwins-frontend \
      -p 80:80 \
      fittwins-frontend

---

## Deployment Flow

git push
  |
  v
GitHub
  |
  v
Jenkins
  |
  v
Docker Build
  |
  v
Docker Container
  |
  v
EC2
  |
  v
Application Load Balancer
  |
  v
https://fitwithtwins.com

---

## DevOps Concepts Demonstrated

### Infrastructure

- Infrastructure as Code
- AWS networking
- Public/private subnet design
- Security groups
- IAM
- Load balancing
- TLS certificates
- Managed databases

### Containers

- Docker image creation
- Multi-stage builds
- Container networking
- Nginx reverse proxy
- Container lifecycle management

### CI/CD

- Git-based workflow
- Jenkins pipelines
- Automated Docker builds
- Automated deployment
- Deployment verification
- Failure handling

### Cloud

- EC2
- RDS
- S3
- ACM
- Secrets Manager
- CloudWatch
- IAM
- ALB

### Application Engineering

- React
- FastAPI
- PostgreSQL
- REST APIs
- Authentication
- AI integration
- Structured data extraction

---

## Project Status

| Component | Status |
|---|---|
| FitTwins coaching website | Live |
| Biological Age application | Live |
| FastAPI backend | Deployed |
| PostgreSQL RDS | Deployed |
| S3 integration | Configured |
| AWS Secrets Manager | Configured |
| Application Load Balancer | Live |
| HTTPS / ACM | Live |
| Docker | Production |
| Jenkins CI/CD | Working |
| Terraform | Infrastructure managed |
| CloudWatch | Configured |
| Kubernetes manifests | Included |

---

## Author

**Archit Lath**

Cloud / DevOps Engineer

AWS · Terraform · Docker · Jenkins · Kubernetes · Python · FastAPI · React · PostgreSQL · Nginx · CloudWatch

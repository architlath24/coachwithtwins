# FitTwins — Cloud-Native Fitness & Biological-Age Platform

FitTwins is a fitness-coaching website combined with an AI-assisted **Biological Age** assessment app. A user uploads a blood-test report, the backend extracts biomarkers with Google Gemini, computes a biological age using the published PhenoAge model, and returns categorized results and a food-first diet plan.

The point of this repository is not just that the app runs — it is a hands-on **AWS / DevOps engineering project**: VPC networking, an Application Load Balancer, EC2 + Docker, managed PostgreSQL on RDS, S3, Secrets Manager, IAM, Terraform, and a Jenkins CI/CD pipeline — built, operated, and debugged end to end.

**Live:** https://fitwithtwins.com/ · **Biological Age app:** https://fitwithtwins.com/biological-age/ · **API:** https://fitwithtwins.com/api/

---

## Architecture

```
                         Internet
                            |
                     Cloudflare DNS
                            |
                            v
         AWS Application Load Balancer (fittwins-alb)
            :80  --(HTTP 301)-->  :443 (ACM TLS cert)
                            |
                            v
                    EC2 t3.micro (Docker host)
          +-----------------------------------------------+
          |  fittwins-frontend  (Nginx :80)               |
          |    /                -> static coaching site   |
          |    /biological-age/ -> React (Vite) SPA       |
          |    /api/            -> reverse proxy ------+   |
          |                                            |   |
          |  fittwins-backend  (FastAPI :8000) <-------+   |
          |    on Docker network "fittwins-net"           |
          +-----------------------|-----------------------+
                                  |
            +---------------------+---------------------+
            |                     |                     |
            v                     v                     v
     RDS PostgreSQL 16        Amazon S3          Secrets Manager
     (private subnets)     (report storage)   (DB + Gemini creds)
                                  |
                                  v
                         Google Gemini API
                     (biomarker extraction)

   Jenkins (CI/CD) runs on the same EC2 instance (:8080, SG-restricted).
```

A single EC2 instance is registered to the ALB target group. This is a deliberate cost/learning trade-off, not a high-availability design — see [Engineering trade-offs](#engineering-trade-offs).

---

## Request routing

Nginx in the frontend container owns all HTTP routing:

| Path | Serves |
|---|---|
| `/` | Static coaching homepage (`index.html`) |
| `/biological-age/` | React SPA (Vite `base: '/biological-age/'`, with SPA fallback) |
| `/api/` | Reverse proxy to `http://fittwins-backend:8000/` |

`client_max_body_size 25M` is set so blood-report PDFs don't hit an HTTP 413 at the proxy before reaching FastAPI.

---

## API

FastAPI backend (OpenAPI at `/api/openapi.json`):

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/` | Liveness check |
| `POST` | `/signup` | Create a user (JSON body; bcrypt-hashed password) |
| `POST` | `/login` | Authenticate a user |
| `POST` | `/upload-report?user_id=` | Upload a PDF report (multipart) |
| `GET` | `/diet-plan/{report_id}` | Generate a diet plan for a report |
| `GET` | `/biomarker-info/{marker_name}` | Supplement/guidance lookup for a marker |

---

## Biological-age pipeline

1. User uploads a blood-report PDF through the React app.
2. Request passes Nginx → FastAPI.
3. The backend extracts the PDF text layer with **pypdf**. If the extracted text is too short (e.g. a scanned/image-only report), it falls back to sending the original PDF to Gemini's native file processing.
4. Gemini returns biomarkers as JSON; a tolerant parser handles fenced or prose-wrapped responses.
5. Each marker is classified in/out of range.
6. Biological age is computed with the **PhenoAge model (Levine et al., 2018)**, including conventional→SI unit conversion. If the required markers aren't all present, it falls back to a simple estimate and says so.
7. Report metadata + biomarkers are stored in PostgreSQL; the PDF is stored in S3 when running in AWS mode.
8. Results are returned to the React dashboard.

Biomarkers are grouped into categories (Iron Studies, Lipid Profile, Liver, Kidney, Blood Count, Thyroid, Vitamins & Minerals, Glucose/Metabolic, Other).

---

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8 |
| Backend | Python 3.12, FastAPI, SQLAlchemy |
| AI | Google Gemini, pypdf |
| Auth | bcrypt (passlib) |
| Web server / proxy | Nginx |
| Containers | Docker (multi-stage frontend build) |
| CI/CD | Jenkins (pipeline-as-code) |
| IaC | Terraform |
| DNS | Cloudflare |
| Cloud | AWS (see below) |

---

## AWS services used

| Service | Role in this project |
|---|---|
| **EC2** (t3.micro, Amazon Linux 2) | Docker host for both containers + Jenkins |
| **VPC** (subnets, Internet Gateway, route tables) | Network isolation; public subnet for compute, private subnets for RDS |
| **Security Groups** | Instance/ALB and RDS ingress control |
| **Elastic IP** | Stable public address for the instance |
| **Elastic Load Balancing** (ALB + target group) | Public entry point, HTTP→HTTPS redirect, health checks |
| **ACM** | TLS certificate for `fitwithtwins.com` |
| **RDS** (PostgreSQL 16, db.t3.micro) | Managed database in private subnets, not publicly accessible |
| **S3** | Blood-report object storage (`reports/` prefix) |
| **Secrets Manager** | DB and Gemini credentials, read at runtime via IAM role |
| **IAM** | EC2 instance role + least-privilege policy (S3, Secrets Manager, CloudWatch logs) |
| **CloudWatch + Budgets + SNS** | Billing alarm, monthly budget, email alerts |

> Honesty note: broader CloudWatch **application/host** monitoring (metrics dashboard, CPU/memory alarms) is on the roadmap, not yet implemented. Only billing monitoring is live today.

---

## CI/CD pipeline (Jenkins)

Jenkins runs on the EC2 instance and uses the `Jenkinsfile` in this repo (pipeline-as-code, built from `main`):

```
Checkout -> Build Images -> Deploy Backend -> Deploy Frontend -> Verify
```

- **Build Images** — builds the backend and frontend images, tagged with the short Git SHA (and `latest`) for traceability and rollback.
- **Deploy Backend** — renames the current backend container to `fittwins-backend-prev` (kept for rollback), then starts the new one on `fittwins-net`.
- **Deploy Frontend** — recreates the frontend container and reloads Nginx so it re-resolves the backend's container IP.
- **Verify** — smoke-tests `/`, `/biological-age/`, and `/api/openapi.json` and fails the build if any route is unhealthy.

---

## Repository structure

```
coachwithtwins/
├── index.html              # Static coaching homepage
├── fittwins-form.html      # Intake form (WhatsApp / UPI deep links)
├── frontend/               # React + Vite biological-age SPA
│   ├── src/ (App.jsx, categorize.js, ...)
│   └── vite.config.js      # base: '/biological-age/'
├── backend/                # FastAPI service
│   ├── main.py             # Routes
│   ├── models.py           # SQLAlchemy models (users, reports, biomarkers)
│   ├── database.py         # Engine; Secrets Manager in AWS, env var locally
│   ├── gemini_service.py   # pypdf extraction + Gemini calls
│   ├── biomarker_utils.py  # PhenoAge calc, unit conversion, JSON parsing
│   ├── aws_config.py       # Secrets Manager helper
│   └── requirements.txt
├── Dockerfile              # Frontend multi-stage build (Node -> Nginx)
├── backend/Dockerfile      # Backend (python:3.12-slim)
├── nginx.conf              # Routing + proxy + upload limit
├── Jenkinsfile             # CI/CD pipeline
├── infrastructure/         # Terraform (VPC, EC2, RDS, ALB, IAM, S3, ...)
└── k8s/                    # Kubernetes manifests (learning artifact; not the live deployment)
```

---

## Infrastructure as Code

Terraform in `infrastructure/` manages the VPC, subnets, IGW, route table, security groups, EC2 + Elastic IP, RDS + subnet group, ALB + listeners + target group, ACM certificate, IAM role/policy/instance profile, S3 bucket, and the Secrets Manager container for the DB secret.

```bash
cd infrastructure
terraform init
terraform validate
terraform plan      # review before every apply
terraform apply
```

> State is currently local and git-ignored. Migrating to a remote backend (S3 + DynamoDB lock) is on the roadmap. The Gemini secret value, Cloudflare DNS, and the billing/CloudWatch resources are managed outside this Terraform.

---

## Engineering trade-offs

Deliberate decisions worth understanding rather than copying blindly:

- **Single EC2 behind an ALB.** The ALB gives TLS termination, a health check, and a stable DNS name, but there's one instance behind it, so this is *not* HA. Chosen to keep cost low while still practicing ALB/target-group operations. Horizontal scaling or an Auto Scaling Group would be the next step for real availability.
- **Docker-on-EC2 instead of ECS/EKS.** Keeps the Docker/Nginx/Linux operational surface visible and debuggable. Kubernetes manifests are kept in `k8s/` as a learning artifact, not the production path.
- **Jenkins co-located with the app.** Simple and cheap, but it shares the instance's memory with the app — a known pressure point addressed with a swap file.

---

## Operational notes / incidents

Real problems diagnosed and fixed (the engineering story behind this project):

- **Intermittent TLS timeouts** traced to one ALB subnet lacking a default route to the Internet Gateway; fixed by correcting the route-table association.
- **HTTP 413 on uploads** traced to the Nginx body-size limit; raised to 25 MB.
- **Transient 502 after a backend swap** — Nginx resolves its upstream hostname once at startup, so a new backend container (new IP) left Nginx pointing at the old one. Fixed with `nginx -s reload`, now built into the pipeline.
- **Deployment drift** — production hotfixes once lived only in a running container, not in Git or CI. Resolved by committing them, building a reproducible SHA-tagged image, and extending the pipeline to deploy the backend with a rollback container.

---

## Security & hardening roadmap

Implemented: HTTPS/ACM with HTTP→HTTPS redirect, bcrypt password hashing, RDS in private subnets (not publicly accessible), secrets in Secrets Manager (not in source), least-privilege IAM for the instance role, secrets git-ignored.

In progress / planned (tracked, prioritized):

1. Token-based authentication and per-user authorization on report routes.
2. Move login credentials out of the query string into a request body.
3. Tighten security groups (restrict SSH; front all public traffic through the ALB).
4. Enable RDS encryption at rest and automated backups; add deletion protection.
5. S3 public-access block, versioning, and a lifecycle policy for reports.
6. Upload hardening: filename sanitisation, content-type/size validation, temp-file cleanup.
7. Consent and medical-disclaimer handling for health data.

> This is a learning/portfolio project. It is **not** a certified medical device and makes no regulatory-compliance claims. Biological-age output is informational only.

---

## Local development

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

**Backend**
```bash
cd backend
pip install -r requirements.txt
# Local mode reads DATABASE_URL and GEMINI_API_KEY from a .env file
uvicorn main:app --reload
```

**Docker (frontend image)**
```bash
docker build -t fittwins-frontend .
docker run -d --name fittwins-frontend -p 80:80 fittwins-frontend
```

The backend runs in AWS mode when `AWS_ENV=true` (credentials from Secrets Manager via the instance role); otherwise it reads `DATABASE_URL` and `GEMINI_API_KEY` from the environment.

---

## Roadmap

- Wire real application/host monitoring (CloudWatch agent, dashboard, CPU/memory/target-health alarms).
- Automated tests + build/config validation in CI.
- Remote Terraform state with locking; import existing drift.
- The security items listed above.
- Paid coaching plans with server-side-verified payments (Razorpay/Stripe), signed webhooks, and idempotency.

---

## Author

**Archit Lath** — Cloud / DevOps Engineer
AWS · Terraform · Docker · Jenkins · Python · FastAPI · React · PostgreSQL · Nginx

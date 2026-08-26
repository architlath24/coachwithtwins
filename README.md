# FitTwins — Cloud Infrastructure & AI Health Platform

A real fitness coaching business's tech stack, built end-to-end in two phases: cloud infrastructure (Terraform, Docker, Kubernetes) and a full-stack AI health feature (FastAPI, PostgreSQL, React, Google Gemini).

---

## Phase 1 — Cloud Infrastructure

Provisioned and deployed the FitTwins marketing site on AWS using infrastructure-as-code and container orchestration.

**What's in this phase:**
- **Terraform** (`infrastructure/`) — provisions a VPC, public subnet, Internet Gateway, route tables, security groups, an EC2 instance, and an Elastic IP. Fully reproducible: `terraform apply` builds everything, `terraform destroy` tears it down cleanly.
- **Docker** (`Dockerfile`) — containerizes the static site (nginx + HTML/CSS/JS).
- **Kubernetes** (`k8s/`) — a Deployment (2 replicas) and a Service, demonstrating self-healing (a killed Pod is automatically replaced) and zero-downtime rolling updates when the image version changes.
- **Automated deployment** — a `user_data` cloud-init script means a single `terraform apply` provisions the server *and* deploys the app, with zero manual SSH steps.

**Why these choices:**
- Terraform over manual console clicks — reproducible, version-controlled infrastructure.
- Docker over a bare install — the app runs identically anywhere, no "works on my machine" issues.
- Kubernetes over a single server — self-healing and rolling updates without downtime, the same pattern real production systems use, demonstrated at small scale.

---

## Phase 2 — Know Your Biological Age

A lead-generation health tool: users upload a blood report, get a computed **Biological Age**, a visual breakdown of their biomarkers, and a personalized, food-first diet plan — before ever booking a coaching call.

### Why this exists (not just "because AI is cool")
This tool sits at the top of the FitTwins funnel — a free, personalized hook that draws visitors in with real value before they see the coaching offer. It's intentionally a **separate application** from the main marketing site (`index.html`), linked by a CTA button, because:
- The marketing site is static and needs to load instantly and never break — coupling it to a database and a 10–20 second AI call would put that at risk.
- This is the same pattern most real products use: a fast marketing site and a full application, deployed independently, linked by a button (e.g. `stripe.com` vs `dashboard.stripe.com`).

### How it works
1. User signs up / logs in (password hashed with bcrypt, never stored in plain text).
2. User uploads a blood report (PDF or image).
3. The file is sent to **Google Gemini** (`gemini-3.6-flash`), which extracts every biomarker as structured JSON — name, value, unit, and normal range.
4. Each biomarker is classified **red** (out of range) or **green** (normal).
5. **Biological Age** is computed using the real, peer-reviewed **PhenoAge formula** (Levine et al., 2018) when the report contains all 9 required markers (albumin, creatinine, glucose, CRP, lymphocyte %, MCV, RDW, alkaline phosphatase, WBC). If any are missing, the system falls back to a simplified estimate and **explicitly tells the user which marker to add next time** — no false precision.
6. A second, separate Gemini call generates a personalized diet plan — organized by deficiency, with three variants (vegetarian / non-vegetarian / vegan), prioritizing whole foods and recommending supplements only where diet genuinely can't close the gap.
7. Results are stored in PostgreSQL (`users`, `reports`, `biomarkers` tables) so history can be tracked over time.

### Tech stack
| Layer | Tool |
|---|---|
| Frontend | React (Vite) |
| Backend | Python, FastAPI |
| Database | PostgreSQL (SQLAlchemy ORM) |
| AI | Google Gemini API |
| Auth | bcrypt password hashing |
| Infra (planned) | AWS S3 (file storage), RDS (managed Postgres), same Kubernetes setup as Phase 1 |

### Design notes worth knowing
- Extraction and diet-plan generation are two separate, focused Gemini calls rather than one large prompt — smaller prompts are more reliable.
- The frontend includes retry logic for transient Gemini `503` (server overload) errors.
- Biomarkers are grouped into categories (Iron Studies, Lipid Profile, Liver Function, CBC, Thyroid, etc.) with a summary "ring" overview, rather than one long flat list.

---

## Repository structure

```
coachwithtwins/
├── index.html              # Marketing site (Phase 1), now with biological-age CTA
├── fittwins-form.html       # Intake form
├── Dockerfile                # Containerizes the marketing site
├── Jenkinsfile               # CI pipeline (in progress)
├── infrastructure/           # Terraform: VPC, EC2, security groups, etc.
├── k8s/                      # Kubernetes Deployment + Service manifests
└── frontend/
    └── src/
        ├── App.jsx            # Biological Age dashboard (React)
        ├── App.css            # Styling, matched to FitTwins brand
        └── categorize.js      # Groups biomarkers into panels
```

*(Backend code — FastAPI app, database models, Gemini integration — lives locally during development and will be added to this repo under `backend/` as part of the AWS deployment phase.)*

---

## Status
- ✅ Phase 1 complete — infrastructure provisioned, tested, and torn down repeatedly with zero cost overruns.
- ✅ Phase 2 backend complete and tested locally (auth, extraction, biological age, diet plans).
- ✅ Phase 2 frontend built and connected end-to-end.
- 🔜 In progress: migrating local Postgres → AWS RDS, local file storage → S3, CI/CD pipeline, containerizing and deploying the dashboard via the existing Kubernetes setup.

---

## Live Demo
Marketing site: http://13.127.25.4 *(infrastructure is destroyed between sessions to avoid unnecessary AWS costs — redeploy with `cd infrastructure && terraform apply`)*

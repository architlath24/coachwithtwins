#!/bin/bash
set -euxo pipefail

yum update -y
yum install -y docker git

systemctl enable --now docker

until curl -s --fail http://checkip.amazonaws.com >/dev/null; do
  sleep 5
done

rm -rf /home/ec2-user/coachwithtwins

git clone https://github.com/architlath24/coachwithtwins.git \
  /home/ec2-user/coachwithtwins

cd /home/ec2-user/coachwithtwins

docker network inspect fittwins-net >/dev/null 2>&1 || \
  docker network create fittwins-net

docker build -t fittwins-backend -f backend/Dockerfile .

docker build -t fittwins-frontend .

docker rm -f fittwins-backend fittwins-frontend 2>/dev/null || true

docker run -d \
  --name fittwins-backend \
  --network fittwins-net \
  --restart unless-stopped \
  -e AWS_ENV=true \
  -e AWS_REGION=ap-south-1 \
  -e RDS_SECRET_ID=fittwins/rds \
  -e GEMINI_SECRET_ID=fittwins/gemini \
  -e S3_BUCKET=fittwins-768296856147 \
  fittwins-backend

docker run -d \
  --name fittwins-frontend \
  --network fittwins-net \
  --restart unless-stopped \
  -p 80:80 \
  fittwins-frontend

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

docker build -t fittwins-app .

docker rm -f fittwins-container 2>/dev/null || true

docker run -d \
  --name fittwins-container \
  --restart unless-stopped \
  -p 80:80 \
  fittwins-app

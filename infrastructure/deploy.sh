#!/bin/bash
yum update -y
yum install docker -y
systemctl start docker
systemctl enable docker
yum install git -y
git clone https://github.com/architlath24/coachwithtwins.git /home/ec2-user/coachwithtwins
cd /home/ec2-user/coachwithtwins
docker build -t fittwins-app .
docker run -d -p 80:80 --name fittwins-container fittwins-app

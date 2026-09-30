terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "ap-south-1"
}

resource "aws_vpc" "fittwins_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags                 = { Name = "fittwins-vpc", Project = "fittwins" }
}

resource "aws_subnet" "fittwins_public_subnet" {
  vpc_id                  = aws_vpc.fittwins_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "ap-south-1a"
  map_public_ip_on_launch = true
  tags                    = { Name = "fittwins-public-subnet", Project = "fittwins" }
}

resource "aws_internet_gateway" "fittwins_igw" {
  vpc_id = aws_vpc.fittwins_vpc.id
  tags   = { Name = "fittwins-igw", Project = "fittwins" }
}

resource "aws_route_table" "fittwins_rt" {
  vpc_id = aws_vpc.fittwins_vpc.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.fittwins_igw.id
  }
  tags = { Name = "fittwins-rt", Project = "fittwins" }
}

resource "aws_route_table_association" "fittwins_rta" {
  subnet_id      = aws_subnet.fittwins_public_subnet.id
  route_table_id = aws_route_table.fittwins_rt.id
}

resource "aws_security_group" "fittwins_sg" {
  name        = "fittwins-sg"
  description = "Allow HTTP, HTTPS and SSH"
  vpc_id      = aws_vpc.fittwins_vpc.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "fittwins-sg", Project = "fittwins" }
}

resource "aws_key_pair" "fittwins_key" {
  key_name   = "fittwins-key"
  public_key = file("~/.ssh/fittwins.pub")
}

resource "aws_instance" "fittwins_server" {
  ami                    = "ami-00c5d5e886a26d124"
  instance_type          = "t3.micro"
  subnet_id              = aws_subnet.fittwins_public_subnet.id
  vpc_security_group_ids = [aws_security_group.fittwins_sg.id]
  key_name               = aws_key_pair.fittwins_key.key_name
  iam_instance_profile   = aws_iam_instance_profile.fittwins_ec2_profile.name
  user_data              = file("deploy.sh")
  tags                   = { Name = "fittwins-server", Project = "fittwins" }
}

resource "aws_eip" "fittwins_eip" {
  instance = aws_instance.fittwins_server.id
  domain   = "vpc"
  tags     = { Name = "fittwins-eip", Project = "fittwins" }
}

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "fittwins_bucket" {
  bucket = "fittwins-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name    = "fittwins-storage"
    Project = "fittwins"
  }
}

resource "aws_db_subnet_group" "fittwins_db_subnet_group" {
  name       = "fittwins-db-subnet-group"
  subnet_ids = [aws_subnet.fittwins_private_subnet_a.id, aws_subnet.fittwins_private_subnet_b.id]

  tags = {
    Name    = "fittwins-db-subnet-group"
    Project = "fittwins"
  }
}

resource "aws_db_instance" "fittwins_db" {
  identifier        = "fittwins-db"
  engine            = "postgres"
  engine_version    = "16"
  instance_class    = "db.t3.micro"
  allocated_storage = 20
  storage_type      = "gp3"

  db_name  = "fittwins"
  username = "fittwinsadmin"
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.fittwins_db_subnet_group.name
  vpc_security_group_ids = [aws_security_group.fittwins_rds_sg.id]

  publicly_accessible = false
  skip_final_snapshot = true
  deletion_protection = false

  tags = {
    Name    = "fittwins-db"
    Project = "fittwins"
  }
}

resource "aws_subnet" "fittwins_private_subnet_a" {
  vpc_id            = aws_vpc.fittwins_vpc.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "ap-south-1a"

  tags = {
    Name    = "fittwins-private-subnet-a"
    Project = "fittwins"
  }
}

resource "aws_subnet" "fittwins_private_subnet_b" {
  vpc_id            = aws_vpc.fittwins_vpc.id
  cidr_block        = "10.0.3.0/24"
  availability_zone = "ap-south-1b"

  tags = {
    Name    = "fittwins-private-subnet-b"
    Project = "fittwins"
  }
}

resource "aws_security_group" "fittwins_rds_sg" {
  name        = "fittwins-rds-sg"
  description = "Allow PostgreSQL access to FitTwins RDS"
  vpc_id      = aws_vpc.fittwins_vpc.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.fittwins_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "fittwins-rds-sg"
    Project = "fittwins"
  }
}

resource "aws_iam_role" "fittwins_ec2_s3_role" {
  name = "fittwins-ec2-s3-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"

        Principal = {
          Service = "ec2.amazonaws.com"
        }

        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name    = "fittwins-ec2-s3-role"
    Project = "fittwins"
  }
}

resource "aws_iam_role_policy" "fittwins_s3_access" {
  name = "fittwins-s3-access"
  role = aws_iam_role.fittwins_ec2_s3_role.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Sid    = "ListFitTwinsBucket"
        Effect = "Allow"

        Action = [
          "s3:ListBucket"
        ]

        Resource = aws_s3_bucket.fittwins_bucket.arn
      },
      {
        Sid    = "ManageFitTwinsObjects"
        Effect = "Allow"

        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]

        Resource = "${aws_s3_bucket.fittwins_bucket.arn}/*"
      },
      {
        Sid    = "ReadFitTwinsDBSecret"
        Effect = "Allow"

        Action = [
          "secretsmanager:GetSecretValue"
        ]

        Resource = [
          aws_secretsmanager_secret.fittwins_db_secret.arn,
          "arn:aws:secretsmanager:ap-south-1:768296856147:secret:fittwins/gemini-*"
        ]
      },
      {
        Sid    = "CloudWatchAgent"
        Effect = "Allow"

        Action = [
          "cloudwatch:PutMetricData",
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams",
          "logs:DescribeLogGroups",
        ]

        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_instance_profile" "fittwins_ec2_profile" {
  name = "fittwins-ec2-profile"
  role = aws_iam_role.fittwins_ec2_s3_role.name
}

resource "aws_secretsmanager_secret" "fittwins_db_secret" {
  name        = "fittwins/rds"
  description = "Credentials for FitTwins PostgreSQL RDS"

  tags = {
    Name    = "fittwins-rds-secret"
    Project = "fittwins"
  }
}


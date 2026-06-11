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
  tags = { Name = "fittwins-vpc", Project = "fittwins" }
}

resource "aws_subnet" "fittwins_public_subnet" {
  vpc_id                  = aws_vpc.fittwins_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "ap-south-1a"
  map_public_ip_on_launch = true
  tags = { Name = "fittwins-public-subnet", Project = "fittwins" }
}

resource "aws_internet_gateway" "fittwins_igw" {
  vpc_id = aws_vpc.fittwins_vpc.id
  tags = { Name = "fittwins-igw", Project = "fittwins" }
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
  ingress { from_port = 22  to_port = 22  protocol = "tcp" cidr_blocks = ["0.0.0.0/0"] }
  ingress { from_port = 80  to_port = 80  protocol = "tcp" cidr_blocks = ["0.0.0.0/0"] }
  ingress { from_port = 443 to_port = 443 protocol = "tcp" cidr_blocks = ["0.0.0.0/0"] }
  egress  { from_port = 0   to_port = 0   protocol = "-1"  cidr_blocks = ["0.0.0.0/0"] }
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
  tags = { Name = "fittwins-server", Project = "fittwins" }
}

resource "aws_eip" "fittwins_eip" {
  instance = aws_instance.fittwins_server.id
  domain   = "vpc"
  tags = { Name = "fittwins-eip", Project = "fittwins" }
}

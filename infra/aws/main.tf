terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_s3_bucket" "resume_bucket" {
  bucket = var.s3_bucket_name
}

resource "aws_db_instance" "postgres" {
  identifier             = "careerbridge-db"
  engine                 = "postgres"
  instance_class         = "db.t4g.micro"
  allocated_storage      = 20
  username               = var.db_username
  password               = var.db_password
  db_name                = "careerbridge"
  skip_final_snapshot    = true
  publicly_accessible    = false
  backup_retention_period = 7
}

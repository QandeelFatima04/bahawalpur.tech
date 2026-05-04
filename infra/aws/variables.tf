variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "s3_bucket_name" {
  type = string
}

variable "db_username" {
  type = string
}

variable "db_password" {
  type      = string
  sensitive = true
}

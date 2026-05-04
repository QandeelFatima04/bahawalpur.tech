output "resume_bucket_name" {
  value = aws_s3_bucket.resume_bucket.bucket
}

output "postgres_endpoint" {
  value = aws_db_instance.postgres.address
}

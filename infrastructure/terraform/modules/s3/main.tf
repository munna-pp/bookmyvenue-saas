resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

resource "aws_s3_bucket" "assets" {
  bucket        = "${var.project_name}-${var.environment}-assets-${random_string.suffix.result}"
  force_destroy = var.environment == "staging" ? true : false

  tags = {
    Name        = "${var.project_name}-${var.environment}-assets-bucket"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_public_access_block" "block_public" {
  bucket = aws_s3_bucket.assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "encryption" {
  bucket = aws_s3_bucket.assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

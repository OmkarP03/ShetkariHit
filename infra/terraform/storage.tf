resource "aws_s3_bucket" "project" {
  for_each      = toset(["site", "artifacts"])
  bucket_prefix = "${var.bucket_prefix}-${each.key}-"
  force_destroy = false
  lifecycle { prevent_destroy = true }
}
resource "aws_s3_bucket_public_access_block" "private" {
  for_each                = aws_s3_bucket.project
  bucket                  = each.value.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
resource "aws_s3_bucket_ownership_controls" "owner" {
  for_each = aws_s3_bucket.project
  bucket   = each.value.id
  rule { object_ownership = "BucketOwnerEnforced" }
}
resource "aws_s3_bucket_server_side_encryption_configuration" "encrypted" {
  for_each = aws_s3_bucket.project
  bucket   = each.value.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}
resource "aws_s3_bucket_versioning" "site" {
  bucket = aws_s3_bucket.project["site"].id
  versioning_configuration { status = "Enabled" }
}
resource "aws_s3_bucket_lifecycle_configuration" "artifacts" {
  bucket = aws_s3_bucket.project["artifacts"].id
  rule {
    id     = "expire-builds"
    status = "Enabled"
    filter {}
    expiration { days = 14 }
  }
}
resource "aws_s3_bucket_policy" "private" {
  for_each = aws_s3_bucket.project
  bucket   = each.value.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat([{
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource  = [each.value.arn, "${each.value.arn}/*"]
      Condition = { Bool = { "aws:SecureTransport" = "false", "aws:PrincipalIsAWSService" = "false" } }
      }], each.key == "site" ? [{
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.project["site"].arn}/*"
      Condition = { StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.site.arn } }
    }] : [])
  })
}

terraform {
  required_version = ">= 1.5, < 2.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region              = "ap-south-1"
  profile             = "codex-shetkarihit-dev"
  allowed_account_ids = ["818783923752"]
  default_tags {
    tags = { Project = "ShetkariHit", Environment = "demo", ManagedBy = "Terraform" }
  }
}

variable "repository" {
  type    = string
  default = "OmkarP03/ShetkariHit"
}
variable "branch" {
  type    = string
  default = "sarthak/shetkarihit"
}
variable "connection_arn" {
  type = string
  validation {
    condition     = can(regex("^arn:aws:codeconnections:ap-south-1:818783923752:connection/[0-9a-f-]{36}$", var.connection_arn))
    error_message = "Supply the authorized Mumbai CodeConnections ARN for this account."
  }
}
variable "bucket_prefix" {
  type    = string
  default = "shetkarihit"
  validation {
    condition     = can(regex("^shetkarihit[a-z0-9-]{0,12}$", var.bucket_prefix))
    error_message = "Start with shetkarihit and add up to twelve lowercase letters, digits or hyphens."
  }
}
variable "supabase_url" {
  type = string
  validation {
    condition     = can(regex("(?i)^https://[a-z0-9-]+[.]supabase[.]co/?$", var.supabase_url))
    error_message = "Use the hosted Supabase HTTPS project origin supported by the frontend."
  }
}
variable "supabase_public_key" {
  type      = string
  sensitive = true
  validation {
    condition     = can(regex("^sb_publishable_[A-Za-z0-9_-]+$", var.supabase_public_key)) || (can(regex("^[A-Za-z0-9_-]+[.][A-Za-z0-9_-]+[.][A-Za-z0-9_-]+$", var.supabase_public_key)) && try(jsondecode(base64decode(format("%s%s", replace(replace(split(".", var.supabase_public_key)[1], "-", "+"), "_", "/"), substr("===", 0, (4 - length(split(".", var.supabase_public_key)[1]) % 4) % 4)))).role == "anon", false))
    error_message = "Use a publishable key or legacy anon JWT."
  }
}
output "website" { value = "https://${aws_cloudfront_distribution.site.domain_name}" }
output "distribution_id" { value = aws_cloudfront_distribution.site.id }
output "buckets" { value = { for k, b in aws_s3_bucket.project : k => b.id } }

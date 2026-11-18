locals {
  projects = toset(["Build", "Deploy"])
}
resource "aws_cloudwatch_log_group" "job" {
  for_each          = local.projects
  name              = "/aws/codebuild/ShetkariHit-${each.key}"
  retention_in_days = 7
}
resource "aws_codebuild_project" "job" {
  for_each      = local.projects
  name          = "ShetkariHit-${each.key}"
  service_role  = aws_iam_role.service[each.key].arn
  build_timeout = 15
  artifacts { type = "CODEPIPELINE" }
  source {
    type      = "CODEPIPELINE"
    buildspec = each.key == "Build" ? "buildspec.yml" : file("${path.module}/deploy.yml")
  }
  environment {
    compute_type = "BUILD_GENERAL1_SMALL"
    image        = "aws/codebuild/standard:7.0"
    type         = "LINUX_CONTAINER"
    dynamic "environment_variable" {
      for_each = each.key == "Build" ? toset(["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"]) : toset(["SITE_BUCKET", "DISTRIBUTION_ID"])
      content {
        name = environment_variable.value
        value = lookup({
          VITE_SUPABASE_URL      = var.supabase_url
          VITE_SUPABASE_ANON_KEY = var.supabase_public_key
          SITE_BUCKET            = aws_s3_bucket.project["site"].id
          DISTRIBUTION_ID        = aws_cloudfront_distribution.site.id
        }, environment_variable.value)
      }
    }
  }
  logs_config {
    cloudwatch_logs {
      group_name = aws_cloudwatch_log_group.job[each.key].name
    }
  }
}
resource "aws_codepipeline" "site" {
  name           = "ShetkariHit-demo"
  role_arn       = aws_iam_role.service["Pipeline"].arn
  pipeline_type  = "V2"
  execution_mode = "QUEUED"
  depends_on     = [aws_iam_role_policy.service, aws_s3_bucket_policy.private, aws_s3_bucket_public_access_block.private, aws_s3_bucket_versioning.site, aws_s3_bucket_ownership_controls.owner, aws_s3_bucket_server_side_encryption_configuration.encrypted]
  artifact_store {
    type     = "S3"
    location = aws_s3_bucket.project["artifacts"].id
  }
  stage {
    name = "Source"
    action {
      name             = "GitHub"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["Source"]
      configuration = {
        ConnectionArn    = var.connection_arn
        FullRepositoryId = var.repository
        BranchName       = var.branch
        DetectChanges    = "true"
      }
    }
  }
  dynamic "stage" {
    for_each = ["Build", "Deploy"]
    content {
      name = stage.value
      action {
        name             = stage.value
        category         = "Build"
        owner            = "AWS"
        provider         = "CodeBuild"
        version          = "1"
        input_artifacts  = [stage.value == "Build" ? "Source" : "Frontend"]
        output_artifacts = stage.value == "Build" ? ["Frontend"] : []
        configuration    = { ProjectName = aws_codebuild_project.job[stage.value].name }
      }
    }
  }
}

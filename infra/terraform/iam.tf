locals {
  principals = { Pipeline = "codepipeline.amazonaws.com", Build = "codebuild.amazonaws.com", Deploy = "codebuild.amazonaws.com" }
  artifact   = aws_s3_bucket.project["artifacts"].arn
  site       = aws_s3_bucket.project["site"].arn
  artifact_reads = {
    Pipeline = ["Source", "Frontend"]
    Build    = ["Source"]
    Deploy   = ["Frontend"]
  }
}
resource "aws_iam_role" "service" {
  for_each = local.principals
  name     = "ShetkariHit-${each.key}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [merge({
      Effect = "Allow", Action = "sts:AssumeRole", Principal = { Service = each.value }
      }, each.key == "Pipeline" ? {} : {
      Condition = {
        StringEquals = { "aws:SourceAccount" = "818783923752" }
        ArnEquals    = { "aws:SourceArn" = "arn:aws:codebuild:ap-south-1:818783923752:project/ShetkariHit-${each.key}" }
      }
    })]
  })
}
resource "aws_iam_role_policy" "service" {
  for_each = local.principals
  name     = "ShetkariHit-${each.key}"
  role     = aws_iam_role.service[each.key].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat([
      { Effect = "Allow", Action = ["s3:GetBucketVersioning", "s3:GetBucketLocation", "s3:GetBucketAcl"], Resource = local.artifact },
      { Effect = "Allow", Action = ["s3:GetObject", "s3:GetObjectVersion"], Resource = [for name in local.artifact_reads[each.key] : "${local.artifact}/ShetkariHit-demo/${name}/*"] }
      ], each.key != "Deploy" ? [
      { Effect = "Allow", Action = ["s3:PutObject"], Resource = "${local.artifact}/ShetkariHit-demo/${each.key == "Build" ? "Frontend" : "Source"}/*" }
      ] : [], each.key == "Pipeline" ? [
      { Effect = "Allow", Action = ["codeconnections:UseConnection", "codestar-connections:UseConnection"], Resource = [var.connection_arn] },
      { Effect = "Allow", Action = ["codebuild:StartBuild", "codebuild:BatchGetBuilds"], Resource = [for job in aws_codebuild_project.job : job.arn] }
      ] : [], each.key != "Pipeline" ? [
      { Effect = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents"], Resource = "${aws_cloudwatch_log_group.job[each.key].arn}:log-stream:*" }
      ] : [], [for statement in [
        { Effect = "Allow", Action = ["s3:PutObject"], Resource = "${local.site}/*" },
        { Effect = "Allow", Action = ["s3:ListBucket"], Resource = local.site, Condition = { StringLike = { "s3:prefix" = "assets/*" } } },
        { Effect = "Allow", Action = ["cloudfront:CreateInvalidation"], Resource = aws_cloudfront_distribution.site.arn }
    ] : statement if each.key == "Deploy"])
  })
}

# Terraform 1.7+ mock provider. All runs are offline plans.
mock_provider "aws" {}
variables {
  connection_arn      = "arn:aws:codeconnections:ap-south-1:818783923752:connection/00000000-0000-0000-0000-000000000000"
  supabase_url        = "https://example.supabase.co"
  supabase_public_key = "sb_publishable_fixture"
}
run "pipeline" {
  command = plan
  assert {
    condition     = jsondecode(aws_iam_role.service["Deploy"].assume_role_policy).Statement[0].Condition.ArnEquals["aws:SourceArn"] == "arn:aws:codebuild:ap-south-1:818783923752:project/ShetkariHit-Deploy"
    error_message = "Deploy trust must be scoped to its own project."
  }
}
run "reject_custom_origin" {
  command = plan
  variables { supabase_url = "https://example.invalid" }
  expect_failures = [var.supabase_url]
}
run "reject_non_anon_role" {
  command = plan
  variables { supabase_public_key = "fixture.${base64encode(jsonencode({ role = "service_role" }))}.fixture" }
  expect_failures = [var.supabase_public_key]
}

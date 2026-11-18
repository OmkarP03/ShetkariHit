# ShetkariHit demo deployment

This directory describes a new deployment in Mumbai, account 818783923752. Creating the pipeline can immediately start its first release and publish the frontend over HTTPS. Review the source, costs and plan before authorizing that step.

## Inputs and source

1. After approval, use RELEASE.md to select and review the first-release files before committing them to the configured GitHub branch. GitHub only serves committed files. Review local changes individually. Protect the release branch and limit who can edit it or start builds.
2. In the AWS console choose Mumbai → Developer Tools → Settings → Connections → Create connection → GitHub. Name it ShetkariHit-GitHub, choose **Connect to GitHub**, install or select the GitHub App and grant access to the ShetkariHit repository. Complete the connection and verify **Available**. Copy its modern CodeConnections ARN into the local variable file. The connection is external to this Terraform state.
3. Use a Terraform 1.5+ CLI (below 2.0). From the repository root run the following PowerShell commands. Keep the local state and plans on an access-controlled encrypted disk. Back up state after changes. Local state has no shared locking between machines, so use one operator and one working directory.

```powershell
$env:AWS_PROFILE = 'codex-shetkarihit-dev'
aws sts get-caller-identity
Set-Location infra/terraform
Copy-Item terraform.tfvars.example terraform.tfvars  # first setup only
```

Edit the ignored terraform.tfvars locally. Supply the hosted HTTPS project origin (one project label under supabase.co, no path except an optional trailing slash) and a Supabase publishable key or legacy anon JWT. CodeBuild passes them to Vite as VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Anyone can read both from the browser bundle. RLS, storage policies and Supabase Auth enforce access. Never enter a secret or service-role key. State, plans and the CodeBuild environment include these public inputs. The existing frontend/.env.example covers local development.

```powershell
terraform init
terraform fmt -check
terraform validate
terraform state list
terraform plan -out=demo.tfplan
terraform show demo.tfplan
```

On first setup there may be no state file. If state already exists, inspect ownership before proceeding. Check the account, branch, authorized connection and both generated bucket prefixes. S3 allocates provider-generated suffixes at creation; final names cannot be verified at plan time. A global name collision must fail creation. Never import or adopt an existing bucket. Require only additions for the first plan. Keep the dependency lock file in Git.

Only after explicit deployment approval, use the reviewed plan:

```powershell
terraform apply demo.tfplan
terraform output website
aws codepipeline get-pipeline-state --name ShetkariHit-demo --region ap-south-1
```

Check Source, Build and Deploy in CodePipeline and both log groups in CloudWatch. Deploy uploads build output only, uploads immutable assets first and publishes index.html and sw.js last. It queues a wildcard invalidation. Multiple object writes are not atomic; a failed deployment can be retried after correcting its cause. Previous assets stay available to older tabs. Verify the home page and a refreshed /today deep link, missing static file, manifest, offline launch and service-worker update. Direct S3 access should be denied. In Supabase Auth URL configuration, authorize the exact CloudFront URLs ending /today and /reset-password for OAuth and recovery if needed. Verify sign-in, password reset, data access and avatars with a test account. Signup supplies no emailRedirectTo. If confirmation is enabled, check the existing Supabase Site URL and confirmation template destination, then complete a new signup from its email in a test browser. Verify the session and account data at the intended origin. The OAuth and recovery allow-list alone does not establish this. Input validation only checks syntax and public key type; test the project/key pairing in the authorized environment.

In the deploy log find the invalidation ID returned by create-invalidation. From an operator account with scoped read access, wait for propagation:

```powershell
$distribution = terraform output -raw distribution_id
aws cloudfront wait invalidation-completed --distribution-id $distribution --id <INVALIDATION_ID>
```

Replace the ID placeholder before running. Compare the SHA-256 of an HTTPS download of /index.html with index.html extracted from the Frontend artifact of the reviewed pipeline execution; verify its Source commit SHA in CodePipeline. Request a referenced hashed asset and check Content-Type and immutable caching. Verify index.html and sw.js revalidate. Visit a deep link in a fresh browser, then test an existing installation online so the new worker activates. In DevTools confirm sh-api disappears, the static precache survives, and offline/account-switch tests cannot retrieve private farm records. Older, still-offline installations need to reconnect to upgrade.

If release verification fails, stop further releases and redeploy a reviewed last-good revision containing the cache fix through the same pipeline. Verify the full asset set, HTML, worker and invalidation again. Do not restore only index.html, empty the bucket, or roll back to a worker that caches private data. Versioned objects support investigation; coordinate restoration as one release.

The pipeline stores artifacts under ShetkariHit-demo/Source/ and ShetkariHit-demo/Frontend/. These short names avoid the long artifact name truncation illustrated in the AWS CLI CodePipeline examples. Verify input/output object keys in action execution details on the first authorized run. Build reads Source and writes Frontend; Deploy reads Frontend only. Keep artifact names and IAM prefixes in sync.

## Permissions and cost

The provisioning identity needs scoped lifecycle and tag permissions for the resources declared here, permission to pass the three named roles to their respective services, and permission to pass the authorized connection to CodePipeline when attaching it. A successful STS or S3 list does not establish provisioning rights. Check the exact denied action and ARN on any failure. Runtime roles have no IAM administration or PassRole. Object and log-stream suffix wildcards cover generated keys and stream names only.

Costs include both small on-demand Linux CodeBuild jobs, V2 pipeline action minutes, private S3 storage/requests, CloudWatch ingestion and seven-day retention, CloudFront data/requests, viewer-request function invocations and invalidations. Example: ten releases at one source, five build and two deployment minutes each use about 80 pipeline action-minutes ($0.16 before allowances) and 70 build minutes at Mumbai rates. Light traffic and sub-GB storage should generally cost on the order of a few USD per month before allowances; large downloads or frequent builds change that. No fixed V1 pipeline fee or always-running compute. Sync skips already-present immutable Vite assets with the same size; reserve assets/ for content-hashed filenames. Mutable objects still create new versions on each release. Review noncurrent storage and retained assets monthly and agree a rollback window before enabling any expiry. Artifact archives expire after 14 days. Terraform CLI and IAM roles add no runtime charges. Verify [CodePipeline](https://aws.amazon.com/codepipeline/pricing/), [CodeBuild](https://aws.amazon.com/codebuild/pricing/), [CloudFront](https://aws.amazon.com/cloudfront/pricing/), [S3](https://aws.amazon.com/s3/pricing/) and [CloudWatch](https://aws.amazon.com/cloudwatch/pricing/) rates before release.

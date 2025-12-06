```hcl
# /terraform/variables.tf

variable "aws_region" {
  description = "The AWS region to deploy resources into."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "The name of the project, used for tagging and naming resources."
  type        = string
  default     = "echo-tree"
}

variable "frontend_domain" {
  description = "The custom domain for the CloudFront distribution. e.g., echo-tree.example.com"
  type        = string
  default     = "" # We'll leave this empty for now to avoid dependency on a registered domain
}
```
```hcl
# /terraform/main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Best practice: Use a remote backend like S3 to store the state file
  # This allows for team collaboration and keeps state off local machines.
  # We will configure this part in the CI/CD pipeline.
  /*
  backend "s3" {
    bucket         = "echo-tree-tfstate-bucket" # Needs to be created manually and be unique
    key            = "global/s3/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-lock"
  }
  */
}

provider "aws" {
  region = var.aws_region
}
```
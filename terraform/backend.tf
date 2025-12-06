# /terraform/backend.tf

# 1. DynamoDB Table
# ------------------
resource "aws_dynamodb_table" "cards_table" {
  name         = "${var.project_name}-cards"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "cardId"

  attribute {
    name = "cardId"
    type = "S"
  }

  tags = {
    Project   = var.project_name
    ManagedBy = "Terraform"
  }
}

# 2. IAM Role for Lambda
# ----------------------
data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_exec_role" {
  name               = "${var.project_name}-lambda-exec-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

# IAM Policy for Lambda to access DynamoDB and CloudWatch
data "aws_iam_policy_document" "lambda_dynamodb_policy" {
  statement {
    actions = [
      "dynamodb:Scan",
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem"
    ]
    resources = [aws_dynamodb_table.cards_table.arn]
  }
}

resource "aws_iam_policy" "lambda_policy" {
  name   = "${var.project_name}-lambda-dynamodb-policy"
  policy = data.aws_iam_policy_document.lambda_dynamodb_policy.json
}

resource "aws_iam_role_policy_attachment" "lambda_dynamodb_attach" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = aws_iam_policy.lambda_policy.arn
}

# Attach basic Lambda execution policy for CloudWatch Logs
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}


# 3. Lambda Function
# ------------------
# Note: The source code zip will be created and uploaded by the CI/CD pipeline.
# Here, we define the function and point to a placeholder.
resource "aws_lambda_function" "cards_api_lambda" {
  filename      = "${path.module}/../api.zip" # Built by CI/CD in project root
  function_name = "${var.project_name}-cards-api"
  role          = aws_iam_role.lambda_exec_role.arn
  handler       = "index.handler" # Assuming the entry point is index.js and exports a 'handler' function

  source_code_hash = filebase64sha256("${path.module}/../api.zip") # Detects changes in deployment package

  runtime = "nodejs18.x"

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.cards_table.name
    }
  }

  tags = {
    Project   = var.project_name
    ManagedBy = "Terraform"
  }
}

# 4. API Gateway
# --------------
resource "aws_api_gateway_rest_api" "api" {
  name        = "${var.project_name}-api"
  description = "API for Echo Tree project"
}

resource "aws_api_gateway_resource" "cards_resource" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "cards"
}

# GET /cards
resource "aws_api_gateway_method" "get_cards_method" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.cards_resource.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "get_cards_integration" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.cards_resource.id
  http_method             = aws_api_gateway_method.get_cards_method.http_method
  integration_http_method = "POST" # Lambda integrations are always POST
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.cards_api_lambda.invoke_arn
}

# POST /cards
resource "aws_api_gateway_method" "post_cards_method" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.cards_resource.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "post_cards_integration" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.cards_resource.id
  http_method             = aws_api_gateway_method.post_cards_method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.cards_api_lambda.invoke_arn
}

# Allow OPTIONS for CORS preflight requests
resource "aws_api_gateway_method" "options_method" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.cards_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# OPTIONS integration - proxy to Lambda for consistent CORS handling
resource "aws_api_gateway_integration" "options_integration" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.cards_resource.id
  http_method             = aws_api_gateway_method.options_method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.cards_api_lambda.invoke_arn
}

# Deployment of the API Gateway
resource "aws_api_gateway_deployment" "api_deployment" {
  rest_api_id = aws_api_gateway_rest_api.api.id

  # This depends on all methods and integrations
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.cards_resource.id,
      aws_api_gateway_method.get_cards_method.id,
      aws_api_gateway_integration.get_cards_integration.id,
      aws_api_gateway_method.post_cards_method.id,
      aws_api_gateway_integration.post_cards_integration.id,
      aws_api_gateway_method.options_method.id,
      aws_api_gateway_integration.options_integration.id
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "api_stage" {
  deployment_id = aws_api_gateway_deployment.api_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.api.id
  stage_name    = "v1"
}

# Lambda permission to be invoked by API Gateway
resource "aws_lambda_permission" "api_gateway_permission" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cards_api_lambda.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_api_gateway_rest_api.api.execution_arn}/*/*"
}
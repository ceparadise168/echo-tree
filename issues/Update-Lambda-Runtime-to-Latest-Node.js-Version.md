## Update Lambda Runtime to Latest Node.js Version

The current AWS Lambda runtime being used is outdated. Currently, it is set to `nodejs18.x`, which no longer receives active support from AWS. 

To ensure compatibility with the latest features and security updates, we need to update the Lambda runtime to the most recent supported version as recommended by AWS. 

### Suggested Actions
- Review the latest supported Node.js versions on the AWS Lambda runtime support policy.
- Update the project configuration to specify the latest Node.js runtime.
- Test the Lambda functions to ensure they work correctly with the new runtime.

By making this change, we will be able to leverage improvements in performance, security, and functionality that come with the newer Node.js versions.  

**Please consider this update as a priority.**
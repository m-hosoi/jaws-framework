# JAWS: Deployment

Every JAWS application can have multiple stages and multiple regions within each stage.  JAWS relies heavily on AWS Cloudformation to keep track of all of the AWS resources your application requires in each stage/region.  This way, you can easily provision/replicate your AWS resources at once, and roll back to previous deployments, for every stage/region your application uses.

![jaws framework deployment diagram](../img/jaws_deployment_diagram.png)

## Lambda Deployment Process:

### Node.js

![jaws framework deployment process diagram](../img/jaws_deployment_process.png)

*  Check the Runtime specified in the current lambda’s jaws.json (dir running JAWS cli from).
*  Perform a build pipeline corresponding to the lambda's runtime.  Optionally optimize the code for performance in Lambda (browserify & uglifyjs2).  See the [lambda attributes](https://github.com/awsm-org/awsm#lambda-configuration-options) for optimization options. [Why optimize?](./FAQ.md#why-optimize-code-before-deployment)
*  Create a temp/dist directory for your lambda and move your lambda files to it.
*  Download the ENV variables from the project/stage/region's S3 bucket and put in the root of the temp directory, and title it `.env`.  This exactly replicates the code layout of local development.
*  Compress the lambda into a zip file and upload it to your project's S3 bucket, in the correct stage and region.
*  Add/update the lambda and its S3 key in your lambda Cloudformation template for this stage/region: `lambdas-cf.json`.
*  Save copies of your updated `lambdas-cf.json` to your local project and your project's S3 bucket in the correct stage/region.
*  Perform a Cloudformation stack update to create/update/delete your modified lambdas.

## Api Gateway/Endpoint Deployment Process:

Needs documentation...


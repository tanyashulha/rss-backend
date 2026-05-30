import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as sqs from 'aws-cdk-lib/aws-sqs';

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = s3.Bucket.fromBucketName(
      this,
      'ImportBucket',
      'import-service-bucket-shop'
    );

    const importProductsFileLambda = new lambda.Function(
      this,
      'ImportProductsFile',
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'importProductsFile.handler',
        code: lambda.Code.fromAsset(
          path.join(__dirname, '../lambda/handlers')
        ),
        environment: {
          BUCKET_NAME: bucket.bucketName,
        },
      }
    );

    bucket.grantPut(importProductsFileLambda);

    const basicAuthorizerFn = lambda.Function.fromFunctionName(
      this,
      'BasicAuthorizerFn',
      'basicAuthorizer',
    );

    const basicAuthorizer = new apigateway.TokenAuthorizer(
      this,
      'BasicAuthorizer',
      {
        handler: basicAuthorizerFn,
        identitySource: apigateway.IdentitySource.header('Authorization'),
      },
    );

    const api = new apigateway.RestApi(this, 'ImportApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
      },
    });

    const corsGatewayResponseHeaders = {
      'Access-Control-Allow-Origin': "'*'",
      'Access-Control-Allow-Headers': "'*'",
    };

    api.addGatewayResponse('Unauthorized', {
      type: apigateway.ResponseType.UNAUTHORIZED,
      statusCode: '401',
      responseHeaders: corsGatewayResponseHeaders,
      templates: {
        'application/json':
          '{"message":"Error 401: Unauthorized — authorization is required (Import Service)"}',
      },
    });

    api.addGatewayResponse('AccessDenied', {
      type: apigateway.ResponseType.ACCESS_DENIED,
      statusCode: '403',
      responseHeaders: corsGatewayResponseHeaders,
      templates: {
        'application/json':
          '{"message":"Error 403: Forbidden — invalid or expired credentials (Import Service)"}',
      },
    });

    const importResource = api.root.addResource('import');

    importResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(importProductsFileLambda),
      {
        authorizer: basicAuthorizer,
        authorizationType: apigateway.AuthorizationType.CUSTOM,
        requestParameters: {
          'method.request.querystring.name': true,
        },
      }
    );

    const catalogItemsQueue = sqs.Queue.fromQueueArn(
      this,
      'CatalogItemsQueue',
      cdk.Fn.importValue('CatalogItemsQueueArn')
    );

    const importFileParserLambda = new lambda.Function(
      this,
      'ImportFileParser',
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'importFileParser.handler',
        code: lambda.Code.fromAsset(
          path.join(__dirname, '../lambda/handlers')
        ),
        environment: {
          BUCKET_NAME: bucket.bucketName,
          SQS_URL: catalogItemsQueue.queueUrl,
        },
      }
    );

    catalogItemsQueue.grantSendMessages(importFileParserLambda);

    bucket.grantPut(importFileParserLambda);
    bucket.grantRead(importFileParserLambda);
    bucket.grantDelete(importFileParserLambda);

    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParserLambda),
      {
        prefix: 'uploaded/',
      }
    );
  }
}
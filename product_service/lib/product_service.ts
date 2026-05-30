import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';

export class ProductServiceStack extends cdk.Stack {
  public readonly catalogItemsQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productsTable = new dynamodb.Table(this, 'ProductsTable', {
      tableName: 'products',
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const stocksTable = new dynamodb.Table(this, 'StocksTable', {
      tableName: 'stocks',
      partitionKey: {
        name: 'product_id',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const createProductTopic = new sns.Topic(this, 'CreateProductTopic', {
      topicName: 'createProductTopic',
    });

    createProductTopic.addSubscription(
      new subs.EmailSubscription('tsulga6@gmail.com', {
        filterPolicy: {
          price: sns.SubscriptionFilter.numericFilter({
            greaterThan: 10000,
          }),
        },
      })
    );

    createProductTopic.addSubscription(
      new subs.EmailSubscription('u0131934749@gmail.com', {
        filterPolicy: {
          price: sns.SubscriptionFilter.numericFilter({
            lessThanOrEqualTo: 10000,
          }),
        },
      })
    );

    const createProductFn = new lambda.Function(this, 'CreateProductFn', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/createProduct.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCKS_TABLE: stocksTable.tableName,
      },
    });

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

    const authorizedMethodOptions = {
      authorizer: basicAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    };

    const api = new apigateway.RestApi(this, 'ProductApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
      }
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
          '{"message":"Error 401: Unauthorized — authorization is required (Product Service)"}',
      },
    });

    api.addGatewayResponse('AccessDenied', {
      type: apigateway.ResponseType.ACCESS_DENIED,
      statusCode: '403',
      responseHeaders: corsGatewayResponseHeaders,
      templates: {
        'application/json':
          '{"message":"Error 403: Forbidden — invalid or expired credentials (Product Service)"}',
      },
    });

    const getProductsListFn = new lambda.Function(this, 'GetProductsListFn', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/getProductsList.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCKS_TABLE: stocksTable.tableName,
      },
    });

    const getProductByIdFn = new lambda.Function(this, 'GetProductByIdFn', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/getProductsById.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCKS_TABLE: stocksTable.tableName,
      },
    });

    const catalogBatchProcessFn = new lambda.Function(this, 'CatalogBatchProcessFn', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/catalogBatchProcess.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCKS_TABLE: stocksTable.tableName,
        CREATE_PRODUCT_TOPIC_ARN: createProductTopic.topicArn,
      },
    });

    createProductTopic.grantPublish(catalogBatchProcessFn);

    productsTable.grantReadData(getProductsListFn);
    stocksTable.grantReadData(getProductsListFn);

    productsTable.grantReadData(getProductByIdFn);
    stocksTable.grantReadData(getProductByIdFn);

    productsTable.grantWriteData(createProductFn);
    stocksTable.grantWriteData(createProductFn);

    productsTable.grantWriteData(catalogBatchProcessFn);
    stocksTable.grantWriteData(catalogBatchProcessFn);

    this.catalogItemsQueue = new sqs.Queue(this, 'CatalogItemsQueue', {
      visibilityTimeout: cdk.Duration.seconds(30),
    });

    new cdk.CfnOutput(this, 'CatalogItemsQueueUrl', {
      value: this.catalogItemsQueue.queueUrl,
      exportName: 'CatalogItemsQueueUrl',
    });

    new cdk.CfnOutput(this, 'CatalogItemsQueueArn', {
      value: this.catalogItemsQueue.queueArn,
      exportName: 'CatalogItemsQueueArn',
    });

    const products = api.root.addResource('products');

    products.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getProductsListFn),
      authorizedMethodOptions,
    );

    const productById = products.addResource('{productId}');
    productById.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getProductByIdFn),
      authorizedMethodOptions,
    );

    products.addMethod(
      'POST',
      new apigateway.LambdaIntegration(createProductFn),
      authorizedMethodOptions,
    );

    catalogBatchProcessFn.addEventSource(
      new lambdaEventSources.SqsEventSource(this.catalogItemsQueue, {
        batchSize: 5,
      })
    );

    const importResource = api.root.addResource('import');
  }
}
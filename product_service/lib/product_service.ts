import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';

export class ProductServiceStack extends cdk.Stack {
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

    const createProductFn = new lambda.Function(this, 'CreateProductFn', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/createProduct.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCKS_TABLE: stocksTable.tableName,
      },
    });

    const api = new apigateway.RestApi(this, 'ProductApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
      }
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

    const bucket = s3.Bucket.fromBucketName(
      this,
      'ImportBucket',
      'import-service-bucket-shop'
    );

    const importProductsFileLambda = new lambda.Function(this, 'ImportProductsFile', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'importProductsFile.handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../import-service/lambda/handlers')
      ),
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
    });

    bucket.grantPut(importProductsFileLambda);

    productsTable.grantReadData(getProductsListFn);
    stocksTable.grantReadData(getProductsListFn);

    productsTable.grantReadData(getProductByIdFn);
    stocksTable.grantReadData(getProductByIdFn);

    productsTable.grantWriteData(createProductFn);
    stocksTable.grantWriteData(createProductFn);

    const products = api.root.addResource('products');

    products.addMethod('GET', new apigateway.LambdaIntegration(getProductsListFn));

    const productById = products.addResource('{productId}');
    productById.addMethod('GET', new apigateway.LambdaIntegration(getProductByIdFn));

    products.addMethod(
      'POST',
      new apigateway.LambdaIntegration(createProductFn)
    );

    const importResource = api.root.addResource('import');

    importResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(importProductsFileLambda),
      {
        requestParameters: {
          'method.request.querystring.name': true,
        },
      }
    );
  }
}
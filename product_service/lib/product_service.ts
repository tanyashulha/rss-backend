import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const getProductsListFn = new lambda.Function(this, 'GetProductsListFn', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'getProductsList.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
    });

    const getProductByIdFn = new lambda.Function(this, 'GetProductByIdFn', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'getProductsById.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
    });

    const api = new apigateway.RestApi(this, 'ProductApi');

    const products = api.root.addResource('products');

    products.addMethod('GET', new apigateway.LambdaIntegration(getProductsListFn));

    const productById = products.addResource('{productId}');
    productById.addMethod('GET', new apigateway.LambdaIntegration(getProductByIdFn));
  }
}
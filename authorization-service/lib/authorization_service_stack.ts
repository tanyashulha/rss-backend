import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as fs from 'fs';
import { config } from 'dotenv';

const loadCredentialsFromEnv = (): Record<string, string> => {
  const envPath = path.join(__dirname, '../.env');

  if (!fs.existsSync(envPath)) {
    throw new Error(
      'Missing .env file. Copy .env.example to .env and set your GitHub login credentials.',
    );
  }

  config({ path: envPath });

  const credentials: Record<string, string> = {};

  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (key) {
      credentials[key] = value;
    }
  }

  if (Object.keys(credentials).length === 0) {
    throw new Error('.env file must contain at least one credential in login=password format.');
  }

  return credentials;
};

export class AuthorizationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const credentials = loadCredentialsFromEnv();

    const basicAuthorizerFn = new lambda.Function(this, 'BasicAuthorizer', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'basicAuthorizer.handler',
      functionName: 'basicAuthorizer',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../lambda/handlers'),
      ),
      environment: credentials,
    });

    new cdk.CfnOutput(this, 'BasicAuthorizerArn', {
      value: basicAuthorizerFn.functionArn,
      exportName: 'BasicAuthorizerArn',
    });
  }
}

#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AuthorizationServiceStack } from '../lib/authorization_service_stack';

const app = new cdk.App();
new AuthorizationServiceStack(app, 'AuthorizationServiceStack');

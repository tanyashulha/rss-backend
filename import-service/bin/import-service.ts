#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ImportServiceStack } from '../lib/import_service_stack';

const app = new cdk.App();
new ImportServiceStack(app, 'ImportServiceStack');

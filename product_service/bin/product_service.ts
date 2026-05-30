#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ProductServiceStack } from '../lib/product_service';

const app = new cdk.App();
new ProductServiceStack(app, 'ProductServiceStack');

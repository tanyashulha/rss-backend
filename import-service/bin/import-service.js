#!/usr/bin/env node
const cdk = require('aws-cdk-lib');
const { ImportServiceStack } = require('../lib/import_service_stack');

const app = new cdk.App();
new ImportServiceStack(app, 'ImportServiceStack');
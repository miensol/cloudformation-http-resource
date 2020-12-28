#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { ExamplesStack } from '../lib/examples-stack';

const app = new cdk.App();
new ExamplesStack(app, 'ExamplesStack');

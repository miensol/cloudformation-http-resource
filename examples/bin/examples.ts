#!/usr/bin/env node
import 'source-map-support/register';
import { Tags } from "@aws-cdk/core";
import * as cdk from '@aws-cdk/core';
import { ExamplesStack } from '../lib/examples-stack';

const app = new cdk.App();
new ExamplesStack(app, 'ExamplesStack');

const appTags = Tags.of(app);
appTags.add("source", "https://github.com/miensol/cloudformation-http-resource")
appTags.add("project", "cloudformation-http-resource")

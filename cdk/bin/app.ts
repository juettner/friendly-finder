#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { FriendlyFinderStack } from "../lib/friendly-finder-stack";

const app = new cdk.App();

// Account/region come from your AWS CLI profile (CDK_DEFAULT_*). CloudFront is global;
// the bucket + Lambda live in this region (defaults to us-east-1).
new FriendlyFinderStack(app, "FriendlyFinderStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
  },
});

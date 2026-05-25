#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { FriendlyFinderStack } from "../lib/friendly-finder-stack";
import { FriendlyFinderCertStack } from "../lib/friendly-finder-cert-stack";

const app = new cdk.App();

const domainName = "friendly-finder.com";
const altNames = ["www.friendly-finder.com"];
const hostedZoneId = "Z0997421231N06SL0JTXC";

const account = process.env.CDK_DEFAULT_ACCOUNT;

// CloudFront certs must be in us-east-1; this stack is pinned there and shared
// back to the main stack via crossRegionReferences.
const certStack = new FriendlyFinderCertStack(app, "FriendlyFinderCertStack", {
  env: { account, region: "us-east-1" },
  crossRegionReferences: true,
  domainName,
  altNames,
  hostedZoneId,
});

// The live stack runs in us-west-2; pin it so a profile's default region can't
// retarget the deploy to a different region. CloudFront itself is global.
new FriendlyFinderStack(app, "FriendlyFinderStack", {
  env: {
    account,
    region: "us-west-2",
  },
  crossRegionReferences: true,
  domainName,
  altNames,
  hostedZoneId,
  certificate: certStack.certificate,
});

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";

export interface FriendlyFinderCertStackProps extends cdk.StackProps {
  domainName: string;
  altNames?: string[];
  hostedZoneId: string;
}

// CloudFront only accepts ACM certs from us-east-1, so the cert lives in its own
// us-east-1 stack and is consumed by the main stack via crossRegionReferences.
export class FriendlyFinderCertStack extends cdk.Stack {
  public readonly certificate: acm.ICertificate;

  constructor(scope: Construct, id: string, props: FriendlyFinderCertStackProps) {
    super(scope, id, props);

    const zone = route53.HostedZone.fromHostedZoneAttributes(this, "Zone", {
      hostedZoneId: props.hostedZoneId,
      zoneName: props.domainName,
    });

    this.certificate = new acm.Certificate(this, "Cert", {
      domainName: props.domainName,
      subjectAlternativeNames: props.altNames,
      validation: acm.CertificateValidation.fromDns(zone),
    });
  }
}

import * as path from "node:path";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";

// Repo root, relative to this file (cdk/lib/ -> ../../).
const REPO_ROOT = path.join(__dirname, "..", "..");

export class FriendlyFinderStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Private bucket holding the built PWA. Reachable only via CloudFront (OAC).
    const siteBucket = new s3.Bucket(this, "SiteBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // The proxy Lambda — reuses lib/parse.ts. esbuild bundles it (incl. fast-xml-parser).
    const barsFn = new lambdaNode.NodejsFunction(this, "BarsFn", {
      entry: path.join(REPO_ROOT, "lambda", "bars.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      // The Lambda source lives at the repo root (../lambda), not in this cdk/ project.
      projectRoot: REPO_ROOT,
      depsLockFilePath: path.join(REPO_ROOT, "package-lock.json"),
      bundling: { minify: true, target: "node22" },
    });

    // Public Function URL — fronted by CloudFront so the browser hits it same-origin.
    const barsUrl = barsFn.addFunctionUrl({ authType: lambda.FunctionUrlAuthType.NONE });

    // Cache /api responses keyed on lat/lng, honoring the function's Cache-Control (s-maxage).
    const apiCachePolicy = new cloudfront.CachePolicy(this, "ApiCachePolicy", {
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.allowList("lat", "lng"),
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
      minTtl: cdk.Duration.seconds(0),
      defaultTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.days(1),
    });

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      comment: "The Friendly Finder",
      defaultRootObject: "index.html",
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        "/api/*": {
          origin: new origins.FunctionUrlOrigin(barsUrl),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          cachePolicy: apiCachePolicy,
        },
      },
      // SPA fallback: S3 (with OAC) returns 403 for unknown keys -> serve the app shell.
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: "/index.html" },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: "/index.html" },
      ],
    });

    // Upload the built PWA and invalidate the CDN on each deploy.
    new s3deploy.BucketDeployment(this, "DeploySite", {
      sources: [s3deploy.Source.asset(path.join(REPO_ROOT, "dist"))],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ["/*"],
    });

    new cdk.CfnOutput(this, "SiteUrl", { value: `https://${distribution.distributionDomainName}` });
    new cdk.CfnOutput(this, "BucketName", { value: siteBucket.bucketName });
  }
}

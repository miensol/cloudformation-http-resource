import * as secretmanager from "@aws-cdk/aws-secretsmanager";
import * as cdk from "@aws-cdk/core";
import { PhysicalResourceId } from "@aws-cdk/custom-resources";
import { Http, HttpCall } from "cloudformation-http-resource";

export class GithubIssuesStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // To run this example create a secret with
    // aws secretsmanager create-secret --secret-string PERSONAL_API_TOKEN --name cloudformation-http-resource-github-api-token
    const githubApiToken = secretmanager.Secret.fromSecretNameV2(this, 'github api secret', 'cloudformation-http-resource-github-api-token')
    const baseRequest: HttpCall = {
      method: 'post',
      headers: {
        Accept: 'application/vnd.github.v3+json'
      },
      url: 'https://github.com/miensol/cloudformation-http-resource/issues'
    }

    const issue = new Http(this, 'Github Issue', {
      onCreate: {
        ...baseRequest,
        body: {
          title: "Github Issue Sample"
        },
        physicalResourceId: PhysicalResourceId.fromResponse("body.id")
      },
      onUpdate: {
        ...baseRequest,
        body: {
          title: "Github Issue Sample"
        },
        physicalResourceId: PhysicalResourceId.fromResponse("body.id")
      },
      onDelete: {
        
      }
    })
  }


}

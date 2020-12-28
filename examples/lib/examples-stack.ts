import { MockIntegration } from "@aws-cdk/aws-apigateway";
import * as cdk from '@aws-cdk/core';
import * as apigateway from '@aws-cdk/aws-apigateway';
import { Http, HttpCall } from "cloudformation-http-resource";

export class ExamplesStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const restApi = this.newEchoApi();

    const baseCall = {
      url: restApi.url,
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        test: 123
      })
    }

    new Http(this, 'Simple', {
      onCreate: {
        ...baseCall,
        method: 'POST'
      },
      onUpdate: {
        ...baseCall,
        method: 'PUT'
      },
      onDelete: {
        ...baseCall,
        method: 'DELETE'
      },
    })
  }

  private newEchoApi() {
    const restApi = new apigateway.RestApi(this, 'Echo Service RestAPI');

    const echoRequestBodyIntegration = new MockIntegration({
      // https://stackoverflow.com/a/61482410/155213
      integrationResponses: [{
        statusCode: '200',
        responseTemplates: {
          "application/json": `#set($body = $context.requestOverride.path.body)
          $body
          `
        }
      }],
      passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_MATCH,
      requestTemplates: {
        "application/json": `#set($context.requestOverride.path.body = $input.body)
        {\"statusCode\": 200}`
      },
    });

    restApi.root.addProxy({
      anyMethod: false
    }).addMethod('ANY', echoRequestBodyIntegration, {
      methodResponses: [{
        statusCode: '200'
      }]
    });

    return restApi
  }
}

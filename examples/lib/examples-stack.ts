import { MockIntegration } from "@aws-cdk/aws-apigateway";
import { CfnOutput } from "@aws-cdk/core";
import * as cdk from '@aws-cdk/core';
import * as secretmanager from '@aws-cdk/aws-secretsmanager';
import * as apigateway from '@aws-cdk/aws-apigateway';
import { Http, HttpCall } from "cloudformation-http-resource";

export class ExamplesStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const restApi = this.newEchoApi({
      "/": {
        status: 200
      },
      "/not-found": {
        status: 404
      }
    });

    const baseCall = {
      url: restApi.urlForPath("/"),
      headers: {
        'content-type': 'application/json'
      },
      body: {
        test: 123,
        nested: [{
          name: 'Piotr'
        }]
      }
    }

    const simpleOk = new Http(this, 'BodyTest', {
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
    });

    new CfnOutput(this, 'BodyTestTestField', {
      description: "test field from body",
      value: simpleOk.getResponseField("body.test")
    })

    new CfnOutput(this, 'BodyTestNestedName', {
      description: "",
      value: simpleOk.getResponseField("body.nested.0.name")
    })

    const sampleNotOk = new Http(this, 'Handle404', {
      onCreate: {
        url: restApi.urlForPath("/not-found"),
        method: 'GET',
        successStatusCodes: [404]
      }
    })

    new CfnOutput(this, 'Handle404Status', {
      description: "Handle404 resource response status code",
      value: simpleOk.getResponseField("statusCode")
    })


    const secret = new secretmanager.Secret(this, 'SampleSecret', {
      description: 'Example Api Key '
    });

    const secretCall: HttpCall = {
      url: restApi.urlForPath("/"),
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${secret.secretValue}`
      },
      body: {
        secret: secret.secretValue,
        nested: {
          secondSecret: secret.secretValue
        }
      }
    };

    const includeSecret = new Http(this, 'IncludeSecret', {
      onCreate: secretCall,
      onUpdate: secretCall
    })

    new CfnOutput(this, 'SecretField', {
      description: "Echo service responds with body so read the secret to test things out",
      value: includeSecret.getResponseField("body.secret")
    })


  }

  private newEchoApi(paths: { [path: string]: { status: number } }) {
    const restApi = new apigateway.RestApi(this, 'Echo Service RestAPI');

    for (const path in paths) {

      const resource = path.split('/').filter(it => it)
        .reduce((parent, path) => parent.addResource(path), restApi.root)

      const pathModel = paths[path]

      const echoRequestBodyIntegration = new MockIntegration({
        // https://stackoverflow.com/a/61482410/155213
        integrationResponses: [{
          statusCode: `${pathModel.status}`,
          responseTemplates: {
            "application/json": `#set($body = $context.requestOverride.path.body)
$body
`
          }
        }],
        passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_MATCH,
        requestTemplates: {
          "application/json": `#set($context.requestOverride.path.body = $input.body)
{\"statusCode\": ${pathModel.status}}
`
        },
      });


      resource.addMethod('ANY', echoRequestBodyIntegration, {
        methodResponses: [{
          statusCode: pathModel.status.toString()
        }]
      });
    }

    return restApi
  }
}

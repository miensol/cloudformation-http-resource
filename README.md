# Call any HTTP API using CloudFormation

An [aws-cdk](https://github.com/aws/aws-cdk) construct for calling HTTP API during CloudFormation
stack update.

## Usage

The `Http` resource provides 3 callbacks: `onCreate`, `onUpdate` and `onDelete`.

The following example will issue a POST request when a `Some API` resource creates:

```typescript
import * as cdk from '@aws-cdk/core';
import { Http } from "cloudformation-http-resource";

export class ExamplesStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const simpleOk = new Http(this, 'Some API', {
      onCreate: {
        method: 'POST',
        url: 'https://example.org/',
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
    });
  }
}
```

### Response data

You can access response data easily and e.g. put it into stack outputs like so:

```typescript
new CfnOutput(this, 'Response body test field', {
  description: "Response body test field",
  value: simpleOk.getResponseField("body.test")
})

new CfnOutput(this, 'Response header', {
  description: "Location of the resource",
  value: simpleOk.getResponseField("headers.location")
})

new CfnOutput(this, 'Response status code', {
  description: "Status code",
  value: simpleOk.getResponseField("statusCode")
})

```

### Secrets

You can call APIs that require authentication tokens
using [SecretsManager](https://docs.aws.amazon.com/cdk/api/latest/docs/aws-secretsmanager-readme.html):

```typescript
import { Http, HttpCall } from "cloudformation-http-resource";
...

const secret: secretmanager.ISecret = getOrCreateSecret()

const apiCall: HttpCall = {
  url: 'https://example.org/',
  method: 'PUT',
  headers: {
    Authorization: `Bearer ${secret.secretValue}`
  },
  body: {
    secret: secret.secretValue,
  }
};

const includeSecret = new Http(this, 'SecretHttpCall', {
  onCreate: apiCall,
  onUpdate: apiCall
})
```



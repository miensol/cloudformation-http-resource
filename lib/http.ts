import * as logs from "@aws-cdk/aws-logs";
import { Construct as CoreConstruct, CustomResource, Stack, Tokenization } from '@aws-cdk/core';
import { Construct } from 'constructs';
import { findAllSecretsInStackByLogicalId } from "./find-all-secrets-in-stack";
import { findRefs } from "./find-refs";
import { HttpProvider } from "./http-provider";
import { httpCallToCfnHttpCall } from "./http-to-cfn-http";
import { CfnHttpCall, HttpCall } from "./runtime/http-call";
import { flatMap } from "./utils";

interface HttpProps {
  onCreate?: HttpCall
  onUpdate?: HttpCall
  onDelete?: HttpCall
  logRetention?: logs.RetentionDays
}

interface CfnHttpResourceProperties {
  onCreate?: CfnHttpCall
  onUpdate?: CfnHttpCall
  onDelete?: CfnHttpCall
}

export class Http extends CoreConstruct {
  private customResource: CustomResource;
  private provider: HttpProvider;
  private properties: CfnHttpResourceProperties

  constructor(scope: Construct, id: string, props: HttpProps) {
    super(scope, id);
    this.provider = new HttpProvider(this, 'Provider', {
      provider: {
        logRetention: props.logRetention
      },
      lambda: {
        logRetention: props.logRetention
      }
    });

    this.properties = {
      onCreate: httpCallToCfnHttpCall(this, 'onCreate', props.onCreate),
      onUpdate: httpCallToCfnHttpCall(this, 'onUpdate', props.onUpdate),
      onDelete: httpCallToCfnHttpCall(this, 'onDelete', props.onDelete),
    };

    this.customResource = new CustomResource(this, 'Resource', {
      serviceToken: this.provider.serviceToken,
      resourceType: 'Custom::Http',
      properties: this.properties
    })
  }


  protected onPrepare() {
    Object.values(this.properties).forEach((call: CfnHttpCall | undefined) => {
      if (call) {
        this.resolveSecretsAndGrantAccessToLambda(call.body)
        if (call.headers) {
          Object.values(call.headers).forEach(headerValue => {
            this.resolveSecretsAndGrantAccessToLambda(headerValue)
          })
        }
      }
    })
    super.onPrepare();
  }

  getResponseFieldReference(dataPath: string) {
    return this.customResource.getAtt(dataPath);
  }

  getResponseField(dataPath: string) {
    return this.customResource.getAttString(dataPath);
  }

  private resolveSecretsAndGrantAccessToLambda(value: string | undefined) {
    if (!value) {
      return
    }

    const secretsByLogicalId = findAllSecretsInStackByLogicalId(this);

    const tokens = Tokenization.reverseString(value).tokens;

    const secretsReferencedInValue = flatMap(tokens, (token) => {
      const stack = Stack.of(this);
      const resolvedToken = stack.resolve(token);
      return findRefs(resolvedToken)
    }).map(ref => {
      const secret = secretsByLogicalId[ref.Ref]
      if (secret) {
        return secret
      } else {
        throw new Error(`Could not resolve Secret referenced in body or headers: ${ref.Ref}`)
      }
    });

    secretsReferencedInValue.forEach(secret => secret.grantRead(this.provider.executionRole))
  }
}


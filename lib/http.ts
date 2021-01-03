import * as lambdaNodejs from "@aws-cdk/aws-lambda-nodejs";
import { NodejsFunction } from "@aws-cdk/aws-lambda-nodejs";
import { NodejsFunctionProps } from "@aws-cdk/aws-lambda-nodejs/lib/function";
import * as logs from "@aws-cdk/aws-logs";
import { CfnSecret, Secret } from "@aws-cdk/aws-secretsmanager";
import {
  CfnJson,
  CfnResource,
  Construct as CoreConstruct,
  CustomResource,
  IConstruct,
  Stack,
  Tokenization
} from '@aws-cdk/core';
import * as cr from '@aws-cdk/custom-resources';
import { Provider } from '@aws-cdk/custom-resources';
import { ProviderProps } from '@aws-cdk/custom-resources/lib/provider-framework/provider';
import { Construct, Node } from 'constructs';
import { join as joinPath } from 'path'
import { findRefs } from "./find-refs";
import { CfnHttpCall, HttpCall } from "./runtime/http-call";
import { associateBy, flatMap } from "./utils";


interface HttpProps {
  onCreate?: HttpCall
  onUpdate?: HttpCall
  onDelete?: HttpCall
  logRetention?: logs.RetentionDays
}

function httpCallBodyToCfnBody(scope: Construct, idPrefix: string, body: any): any {
  if (body === undefined) {
    return undefined
  }

  if (typeof body === "object") {
    // otherwise we'll see  <unresolved-token> in json
    return new CfnJson(scope, idPrefix + '/body', {
      value: body
    }).toJSON()
  }

  return String(body)
}

function httpCallHeadersToCfnHeaders(scope: Construct, idPrefix: string, headers: { [p: string]: string } | undefined): any {
  return headers ? headers : undefined
}

function httpSuccessStatusCodesToCfnSuccessStatusCodes(call: HttpCall) {
  return call.successStatusCodes?.map(value => value.toString());
}

function httpCallToCfnHttpCall(scope: Construct, idPrefix: string, call: HttpCall | undefined): CfnHttpCall | undefined {
  if (!call) {
    return undefined
  }

  return {
    body: httpCallBodyToCfnBody(scope, idPrefix, call.body),
    headers: httpCallHeadersToCfnHeaders(scope, idPrefix, call.headers),
    method: call.method,
    successStatusCodes: httpSuccessStatusCodesToCfnSuccessStatusCodes(call),
    url: call.url,
  }
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

function findAllSecretsInStackByLogicalId(construct: IConstruct) {
  const stack = Stack.of(construct);
  const secrets: Secret[] = stack.node.children
    .filter(node => (node.node.defaultChild as CfnResource)?.cfnResourceType == CfnSecret.CFN_RESOURCE_TYPE_NAME)
    .map(node => node as Secret)

  return associateBy(secrets, secret => {
    const logicalId = (secret.node.defaultChild as CfnSecret).logicalId;
    return stack.resolve(Tokenization.reverseString(logicalId).firstToken);
  });
}

interface HttpProviderProps {
  provider?: Omit<ProviderProps, 'onEventHandler'>
  lambda?: Omit<NodejsFunctionProps, 'entry' | 'handler'>
}

class HttpProvider extends CoreConstruct {
  private provider: Provider;
  private lambda: NodejsFunction;

  constructor(scope: Construct, id: string, props?: HttpProviderProps) {
    super(scope, id);

    const runtimeHandlerEntryPath = joinPath(__dirname, 'runtime', 'index.ts');
    this.lambda = new lambdaNodejs.NodejsFunction(this, 'Lambda', {
      entry: runtimeHandlerEntryPath,
      ...props?.lambda
    })

    this.provider = new cr.Provider(this, 'Http', {
      onEventHandler: this.lambda,
      ...props?.provider
    })
  }

  get serviceToken() {
    return this.provider.serviceToken
  }

  get executionRole() {
    const role = this.lambda.role;
    if (!role) {
      throw new Error('No lambda.role defined')
    }
    return role
  }

  public static getOrCreateProvider(scope: Construct) {
    const stack = Stack.of(scope);
    const id = 'pl.miensol.cdk.custom-resources.http-provider';
    const x = Node.of(stack).tryFindChild(id) as HttpProvider || new HttpProvider(stack, id);
    return x.provider;
  }
}

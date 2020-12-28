import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import { NodejsFunctionProps } from "@aws-cdk/aws-lambda-nodejs/lib/function";
import * as logs from "@aws-cdk/aws-logs";
import { RetentionDays } from "@aws-cdk/aws-logs";
import { Construct as CoreConstruct, CustomResource, Stack } from '@aws-cdk/core';
import * as cr from '@aws-cdk/custom-resources';
import { Provider } from '@aws-cdk/custom-resources';
import { ProviderProps } from '@aws-cdk/custom-resources/lib/provider-framework/provider';
import { Construct, Node } from 'constructs';
import { join as joinPath } from 'path'
import { HttpCall } from "./runtime/http-call";


interface HttpProps {
  onCreate?: HttpCall
  onUpdate?: HttpCall
  onDelete?: HttpCall
  logRetention?: logs.RetentionDays
}

export class Http extends CoreConstruct {
  constructor(scope: Construct, id: string, props: HttpProps) {
    super(scope, id);

    const provider = new HttpProvider(this, 'Provider', {
      provider: {
        logRetention: props.logRetention
      },
      lambda: {
        logRetention: props.logRetention
      }
    });

    const resource = new CustomResource(this, 'Resource', {
      serviceToken: provider.serviceToken,
      resourceType: 'Custom::Http',
      properties: {
        onCreate: props.onCreate,
        onUpdate: props.onUpdate,
        onDelete: props.onDelete,
      }
    })
  }
}

interface HttpProviderProps {
  provider?: Omit<ProviderProps, 'onEventHandler'>
  lambda?: Omit<NodejsFunctionProps, 'entry' | 'handler'>
}

class HttpProvider extends CoreConstruct {
  private provider: Provider;

  constructor(scope: Construct, id: string, props?: HttpProviderProps) {
    super(scope, id);

    const runtimeHandlerEntryPath = joinPath(__dirname, 'runtime', 'index.ts');
    const httpLambda = new lambdaNodejs.NodejsFunction(this, 'Lambda', {
      entry: runtimeHandlerEntryPath,
      ...props?.lambda
    })

    this.provider = new cr.Provider(this, 'Http', {
      onEventHandler: httpLambda,
      ...props?.provider
    })
  }

  get serviceToken() {
    return this.provider.serviceToken
  }

  public static getOrCreateProvider(scope: Construct) {
    const stack = Stack.of(scope);
    const id = 'pl.miensol.cdk.custom-resources.http-provider';
    const x = Node.of(stack).tryFindChild(id) as HttpProvider || new HttpProvider(stack, id);
    return x.provider;
  }
}

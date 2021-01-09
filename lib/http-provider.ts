import * as lambda from "@aws-cdk/aws-lambda";
import * as lambdaNodejs from "@aws-cdk/aws-lambda-nodejs";
import { NodejsFunction } from "@aws-cdk/aws-lambda-nodejs";
import { NodejsFunctionProps } from "@aws-cdk/aws-lambda-nodejs/lib/function";
import { CfnLogGroup, LogGroup } from "@aws-cdk/aws-logs";
import { Construct as CoreConstruct, RemovalPolicy, Stack } from "@aws-cdk/core";
import * as cr from "@aws-cdk/custom-resources";
import { Provider } from "@aws-cdk/custom-resources";
import { ProviderProps } from "@aws-cdk/custom-resources/lib/provider-framework/provider";
import { Construct, Node } from "constructs";
import { join as joinPath } from "path";

interface HttpProviderProps {
  provider?: Omit<ProviderProps, 'onEventHandler'>
  lambda?: Omit<NodejsFunctionProps, 'entry' | 'handler'>
}

export class HttpProvider extends CoreConstruct {
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

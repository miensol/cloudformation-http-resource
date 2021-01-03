import { CfnSecret, Secret } from "@aws-cdk/aws-secretsmanager";
import { CfnResource, IConstruct, Stack, Tokenization } from "@aws-cdk/core";
import { associateBy } from "./utils";

export function findAllSecretsInStackByLogicalId(construct: IConstruct) {
  const stack = Stack.of(construct);
  const secrets: Secret[] = stack.node.children
    .filter(node => {
      const cfnReference = node.node.defaultChild as CfnResource;
      return cfnReference?.cfnResourceType == CfnSecret.CFN_RESOURCE_TYPE_NAME;
    })
    .map(node => node as Secret)

  return associateBy(secrets, secret => {
    const logicalId = (secret.node.defaultChild as CfnSecret).logicalId;
    return stack.resolve(Tokenization.reverseString(logicalId).firstToken);
  });
}

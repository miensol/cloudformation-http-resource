import { SecretsManager } from "aws-sdk"
import { AxiosRequestConfig } from "axios";
import { filterUndefined } from "./filter-undefined";
import { HttpCall } from "./http-call";
import { log } from "./log";
import { undefinedIfEmpty } from "./undefined-if-empty";

interface SecretManagerReferenceFields {
  arn: string
  jsonKey: string
  versionStage: string
  versionId: string
}

async function resolveDynamicReference(value: string, clients: { secretsManager: SecretsManager }): Promise<string> {
  // sample '{{resolve:arn:aws:secretsmanager:eu-central-1:987654321:secret:SampleSecret123:SecretString:::}}'
  // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references.html
  const secretManagerMatcher = /{{resolve:secretsmanager:(?<arn>[^}]+secret:[^:]+):SecretString:(?<jsonKey>[^:]*):(?<versionStage>[^:]*):(?<versionId>[^:}]*)}}/gi

  let match: RegExpExecArray | null

  let updatedValue = value;

  while (match = secretManagerMatcher.exec(value)) {
    const fullMatch = match[0];
    const {
      arn,
      jsonKey,
      versionStage,
      versionId
    } = match.groups as unknown as SecretManagerReferenceFields

    if (arn) {
      log({
        message: 'Resolving SecretsManager secret',
        arn, versionStage, versionId, jsonKey,
      })

      const args = filterUndefined({
        SecretId: arn,
        VersionId: undefinedIfEmpty(versionId),
        VersionStage: undefinedIfEmpty(versionStage)
      });

      let secretValue = (await clients.secretsManager.getSecretValue(args).promise()).SecretString;

      if (jsonKey && secretValue) {
        secretValue = JSON.parse(secretValue)[jsonKey]
      }

      if (secretValue != null) {
        updatedValue = updatedValue.replace(fullMatch, secretValue)
      }
    }
  }

  return updatedValue
}

interface AwsClients {
  secretsManager: SecretsManager
}

export async function resolveDynamicReferences(options: AxiosRequestConfig, clients: AwsClients = {
  secretsManager: new SecretsManager()
}): Promise<AxiosRequestConfig> {
  const headers = options.headers as HttpCall['headers'];

  for (const headerName in headers) {
    const headerValue = headers[headerName]
    if (headerValue) {
      headers[headerName] = await resolveDynamicReference(headerValue, clients)
    }
  }

  const body = options.data
  if (typeof body === "string") {
    options.data = await resolveDynamicReference(body, clients)
  }

  return options
}

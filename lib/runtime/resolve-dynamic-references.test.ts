import { GetSecretValueRequest, GetSecretValueResponse } from "aws-sdk/clients/secretsmanager";
import { resolveDynamicReferences } from "./resolve-dynamic-references";
import { SecretsManager } from "aws-sdk";
import fn = jest.fn;

describe(`resolveDynamicReferences`, () => {
  let clients = {
    secretsManager: new SecretsManager()
  }
  beforeEach(() => {
    clients = {
      secretsManager: new SecretsManager()
    }
  })

  function whenGetSecretValueIsCalledReturn(resolvedSecret: string) {
    const getSecretValue = fn().mockImplementationOnce((params: GetSecretValueRequest) => {
      return ({
        promise: async () => ({
          SecretString: resolvedSecret
        } as GetSecretValueResponse)
      });
    });

    Object.assign(clients.secretsManager, {
      getSecretValue: getSecretValue
    })
    return getSecretValue;
  }

  describe(`in headers`, () => {
    it(`can handle undefined headers`, async () => {
      const request = await resolveDynamicReferences({}, clients);

      expect(request.headers).toBeUndefined()
    });

    it(`can handle headers with no resolve reference`, async () => {
      const request = await resolveDynamicReferences({
        headers: {
          accept: 'application/json'
        }
      }, clients);

      expect(request.headers).toHaveProperty('accept', 'application/json')
    });

    it(`can resolve secret manager secrets`, async () => {
      const getSecretValue = whenGetSecretValueIsCalledReturn('Resolved Token');

      const request = await resolveDynamicReferences({
        headers: {
          authorization: 'Bearer {{resolve:secretsmanager:arn:aws:secretsmanager:eu-central-1:987654321:secret:SampleSecret123:SecretString:::}}'
        }
      }, clients);

      expect(request.headers.authorization).toEqual('Bearer Resolved Token')
      expect(getSecretValue).toHaveBeenCalledWith({
        SecretId: 'arn:aws:secretsmanager:eu-central-1:987654321:secret:SampleSecret123'
      })
    });
  });

  describe(`in body`, () => {
    it(`can handle undefined body`, async () => {
      const request = await resolveDynamicReferences({}, clients);

      expect(request.data).toBeUndefined()
    });

    it(`can handle body with no resolve reference`, async () => {
      const request = await resolveDynamicReferences({
        data: 'Plain text'
      }, clients);

      expect(request.data).toEqual('Plain text')
    });

    it(`can resolve secret manager secrets json key`, async () => {
      const getSecretValue = whenGetSecretValueIsCalledReturn('{"Property": "Resolved Token"}');

      const request = await resolveDynamicReferences({
        data: JSON.stringify({
          someProperty: 'Bearer {{resolve:secretsmanager:arn:aws:secretsmanager:eu-central-1:987654321:secret:SampleSecret123:SecretString:Property::}}'
        })
      }, clients);

      expect(request.data).toEqual(JSON.stringify({someProperty: 'Bearer Resolved Token'}))
      expect(getSecretValue).toHaveBeenCalledWith({
        SecretId: 'arn:aws:secretsmanager:eu-central-1:987654321:secret:SampleSecret123'
      })
    });

    it(`can resolve secret manager secrets with version stage and id`, async () => {
      const getSecretValue = whenGetSecretValueIsCalledReturn('Resolved Token');

      const request = await resolveDynamicReferences({
        data: JSON.stringify({
          someProperty: 'Bearer {{resolve:secretsmanager:arn:aws:secretsmanager:eu-central-1:987654321:secret:SampleSecret123:SecretString::vStage:vId}}'
        })
      }, clients);

      expect(request.data).toEqual(JSON.stringify({someProperty: 'Bearer Resolved Token'}))
      expect(getSecretValue).toHaveBeenCalledWith({
        SecretId: 'arn:aws:secretsmanager:eu-central-1:987654321:secret:SampleSecret123',
        VersionStage: 'vStage',
        VersionId: 'vId'
      })
    });

  });
});

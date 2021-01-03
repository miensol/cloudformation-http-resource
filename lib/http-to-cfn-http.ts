import { CfnJson } from "@aws-cdk/core";
import { Construct } from "constructs";
import { CfnHttpCall, HttpCall } from "./runtime/http-call";

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

export function httpCallToCfnHttpCall(scope: Construct, idPrefix: string, call: HttpCall | undefined): CfnHttpCall | undefined {
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

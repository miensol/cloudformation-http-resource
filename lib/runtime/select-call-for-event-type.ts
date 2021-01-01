import { CloudFormationCustomResourceEvent } from "aws-lambda/trigger/cloudformation-custom-resource";
import { CfnHttpCall, HttpCall } from "./http-call";
import { log } from "./log";

export function selectCallForEventType(event: CloudFormationCustomResourceEvent) {
  const onCreate: CfnHttpCall | undefined = event.ResourceProperties['onCreate']
  const onUpdate: CfnHttpCall | undefined = event.ResourceProperties['onUpdate']
  const onDelete: CfnHttpCall | undefined = event.ResourceProperties['onDelete']

  let call: CfnHttpCall | undefined;

  switch (event.RequestType) {
    case "Create":
      call = onCreate;
      break;
    case "Update":
      call = onUpdate;
      break;
    case "Delete":
      call = onDelete;
      break;
  }

  log({ message: 'Selected call', call, event })

  return call ? cfnHttpCallToHttpCall(call) : undefined
}

function cfnHttpCallToHttpCall(call: CfnHttpCall): HttpCall {
  return {
    ...call,
    successStatusCodes: call?.successStatusCodes?.map(sc => parseInt(sc))
  };
}

import {
  Handler,
  HandlerResponse
} from "@aws-cdk/core/lib/custom-resource-provider/nodejs-entrypoint";
import { CloudFormationCustomResourceEvent } from "aws-lambda/trigger/cloudformation-custom-resource";
import axios, { AxiosResponse } from "axios";
import { HttpCall } from "./http-call";

function selectCallForEventType(event: CloudFormationCustomResourceEvent) {
  const onCreate: HttpCall | undefined = event.ResourceProperties['onCreate']
  const onUpdate: HttpCall | undefined = event.ResourceProperties['onUpdate']
  const onDelete: HttpCall | undefined = event.ResourceProperties['onDelete']

  let call: HttpCall | undefined;

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

  return call
}


function parseHttpResponse(response: AxiosResponse<Buffer | undefined>) {
  const data = response.data;
  if (!data) {
    return {}
  }
  const contentType = response.headers['content-type'];
  switch (contentType) {
    case 'application/json':
      return JSON.parse(data.toString('utf8'))
    case 'application/xml':
    case 'text/xml':
      return data.toString('utf8')
    default:
      if (/^text\//.test(contentType)) {
        return data.toString('utf8')
      }
      return data.toString('base64')
  }
}

const log = <T extends { message: string }>(value: T) => {
  console.log(value)
}

export const handler: Handler = async (event: CloudFormationCustomResourceEvent) => {
  const call = selectCallForEventType(event);

  if (!call) {
    log({ message: 'No http call provided for event', event })
    return
  }

  log({ message: 'Request', call, event })

  const response: AxiosResponse<Buffer> = await axios({
    url: call.url,
    method: call.method,
    headers: call.headers,
    responseType: "arraybuffer",
    data: call.body
  });

  log({ message: 'Response', response, event })

  const result: HandlerResponse = {
    Data: {
      body: parseHttpResponse(response),
      headers: response.headers
    },
    PhysicalResourceId: event.RequestType == 'Create' ? response.headers['location'] : undefined
  };

  log({
    message: 'Result',
    event,
    result
  })

  return result
}

import type {
  Handler,
  HandlerResponse
} from "@aws-cdk/core/lib/custom-resource-provider/nodejs-entrypoint";
import type { CloudFormationCustomResourceEvent } from "aws-lambda/trigger/cloudformation-custom-resource";
import axios, { AxiosResponse } from "axios";
import { flatten } from "./flatten";
import { log } from "./log";
import { parseHttpResponse } from "./parse-http-response";
import { selectCallForEventType } from "./select-call-for-event-type";
import { validateStatusForOptions } from "./validate-status";

// noinspection JSUnusedGlobalSymbols
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
    data: call.body,
    validateStatus: validateStatusForOptions(call)
  });

  log({ message: 'Response', response, event })

  const result: HandlerResponse = {
    Data: flatten({ // Data must be a flat object
      statusCode: response.status,
      body: parseHttpResponse(response),
      headers: response.headers
    })
  };

  log({
    message: 'Result',
    event,
    result
  })

  return result
}

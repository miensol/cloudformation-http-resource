import { AxiosResponse } from "axios";

export function parseHttpResponse(response: AxiosResponse<Buffer | undefined>) {
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

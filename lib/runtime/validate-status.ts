import { AxiosRequestConfig } from "axios";

export function validateStatusForOptions({ successStatusCodes }: { successStatusCodes?: number[] }): AxiosRequestConfig['validateStatus'] {
  if (!successStatusCodes) {
    return undefined
  }

  return status => successStatusCodes.includes(status)
}

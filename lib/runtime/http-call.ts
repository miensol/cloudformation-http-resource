export type HttpMethod =
  | 'get' | 'GET'
  | 'delete' | 'DELETE'
  | 'head' | 'HEAD'
  | 'options' | 'OPTIONS'
  | 'post' | 'POST'
  | 'put' | 'PUT'
  | 'patch' | 'PATCH'
  | 'purge' | 'PURGE'
  | 'link' | 'LINK'
  | 'unlink' | 'UNLINK'


export interface HttpCall {
  method: HttpMethod,
  url: string
  headers?: {
    [key: string]: string
  }
  body?: string
  successStatusCodes?: number[]
}

export interface CfnHttpCall {
  method: HttpMethod,
  url: string
  headers?: {
    [key: string]: string
  }
  body?: string
  successStatusCodes?: string[]
}


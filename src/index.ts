import { Fetcher } from './fetcher.js'
import { SvelteFetcher } from './svelte'
import { arrayRequestBody } from './utils.js'

import type {
  ApiResponse,
  FetchArgType,
  FetchReturnType,
  FetchErrorType,
  Middleware,
  OpArgType,
  OpErrorType,
  OpDefaultReturnType,
  OpReturnType,
  TypedFetch,
} from './types'

import { ApiError } from './types.js'

export type {
  OpArgType,
  OpErrorType,
  OpDefaultReturnType,
  OpReturnType,
  FetchArgType,
  FetchReturnType,
  FetchErrorType,
  ApiResponse,
  Middleware,
  TypedFetch,
}

export { Fetcher, SvelteFetcher, ApiError, arrayRequestBody }

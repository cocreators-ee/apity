import { Apity } from './svelte/index.js'
import { arrayRequestBody } from './utils.js'

import type {
  FetchArgType,
  FetchReturnType,
  FetchErrorType,
  Middleware,
  OpArgType,
  OpErrorType,
  OpDefaultReturnType,
  OpReturnType,
  TypedFetch,
} from './types.js'
import type { ApiResponse, ApiRequest } from './svelte/types.js'
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
  ApiRequest,
  Middleware,
  TypedFetch,
}

export { Apity, ApiError, arrayRequestBody }

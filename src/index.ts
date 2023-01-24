import { Apity } from './svelte'
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

export { Apity, ApiError, arrayRequestBody }

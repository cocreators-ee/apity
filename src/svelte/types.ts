import type { Writable } from 'svelte/store'
import type { OpArgType, OpErrorType, OpReturnType, RealFetch } from '../types'
import type { ApiError } from '../types'

export type SuccessfulResp<R> = {
  ok: true
  data: R
  status: number
}
export type FailedResp = {
  ok: false
  data: any
  status: number
}

export type ApiResponse<R> = SuccessfulResp<R> | FailedResp

export type ApiRequest<R = any> = {
  readonly resp: Writable<ApiResponse<R> | undefined>
  readonly isLoaded: Promise<ApiResponse<R>>
  readonly ready: Writable<undefined | Promise<ApiResponse<R>>>
  readonly reload: () => Promise<ApiResponse<R>>
}

export type _SvelteTypedWrappedFetch<OP> = (
  arg: OpArgType<OP>,
  realFetch: RealFetch,
  init?: RequestInit,
) => ApiRequest<OpReturnType<OP>>

export type SvelteTypedWrappedFetch<OP> = _SvelteTypedWrappedFetch<OP> & {
  _name: string
  Error: new (error: ApiError) => ApiError & {
    getActualType: () => OpErrorType<OP>
  }
}

type _SvelteCreateFetch<OP, Q = never> = [Q] extends [never]
  ? () => SvelteTypedWrappedFetch<OP>
  : (query: Q) => SvelteTypedWrappedFetch<OP>

export type SvelteCreateFetch<M, OP> = M extends
  | 'post'
  | 'put'
  | 'patch'
  | 'delete'
  ? OP extends { parameters: { query: infer Q } }
    ? _SvelteCreateFetch<OP, { [K in keyof Q]: true | 1 }>
    : _SvelteCreateFetch<OP>
  : _SvelteCreateFetch<OP>

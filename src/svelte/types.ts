import type { Writable } from 'svelte/store'
import type { OpArgType, OpReturnType, RealFetch } from '../types.js'

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
  readonly ready: Writable<undefined | Promise<ApiResponse<R>>>
  reload: () => Promise<ApiResponse<R>>
  onData: Promise<ApiResponse<R>>
}

export type SvelteTypedWrappedFetch<OP> = (
  arg: OpArgType<OP>,
  realFetch?: RealFetch,
  init?: RequestInit,
) => ApiRequest<OpReturnType<OP>>

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

export type SvelteFetchArgType<F> = F extends SvelteTypedWrappedFetch<infer OP>
  ? OpArgType<OP>
  : never

export type SvelteFetchReturnType<F> = F extends SvelteTypedWrappedFetch<
  infer OP
>
  ? OpReturnType<OP>
  : never

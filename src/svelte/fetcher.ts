import { writable } from 'svelte/store'
import type { Unsubscriber } from 'svelte/store'

import { getFetchParams, mergeRequestInit } from '../fetcher.js'
import type {
  Request,
  TypedWrappedFetch,
  _TypedWrappedFetch,
  RealFetch,
  OpArgType,
  FetchConfig,
  OpErrorType,
  OpenapiPaths,
  Method,
} from '../types.js'
import type { ApiRequest, ApiResponse, SvelteCreateFetch } from './types.js'
import { ApiError } from '../types.js'

/***
 * Make an API call and compose an ApiResponse object from the result
 * @param request - Request wrapper
 */
async function fetchAndParse<R>(request: Request): Promise<ApiResponse<R>> {
  const { url, init } = getFetchParams(request)
  try {
    const response = await request.realFetch(url, init)
    try {
      const body = response.status === 204 ? undefined : await response.json()
      if (response.ok) {
        return {
          status: response.status,
          data: body as R,
          ok: true,
        }
      } else {
        return {
          status: response.status,
          data: body as R,
          ok: false,
        }
      }
    } catch (e) {
      console.warn('Failed to parse JSON from the response body', e)
      return {
        status: -2,
        data: undefined,
        ok: false,
      }
    }
  } catch (e) {
    console.warn('Failed to make an API request', e)
    return {
      status: -1,
      data: undefined,
      ok: false,
    }
  }
}

function fetchUrl<R>(request: Request) {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const ready = writable<Promise<ApiResponse<R>>>(new Promise(() => {}))
  const resp = writable<ApiResponse<R> | undefined>()
  let unsubscribe: Unsubscriber | undefined = undefined

  const retVal = {
    resp,
    ready,
    reload,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onData: new Promise(() => {}),
  } as ApiRequest<R>

  const apiCall: () => Promise<ApiResponse<R>> = () => {
    const promise = new Promise<ApiResponse<R>>(async (resolve) => {
      const result = await fetchAndParse<R>(request)
      unsubscribe = resp.subscribe((r) => {
        if (typeof r !== 'undefined' && r.data === result.data) {
          resolve(r)
          retVal.onData = Promise.resolve(r)
          if (unsubscribe) {
            unsubscribe()
            unsubscribe = undefined
          }
        }
      })
      resp.set(result)
    })
    ready.set(promise)
    return promise
  }

  async function reload() {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = undefined
    }
    const apiCallPromise = apiCall()
    retVal.onData = apiCallPromise
    return apiCallPromise
  }

  retVal.onData = apiCall()
  retVal.reload = reload
  return retVal
}

function createFetch<OP>(fetch: _TypedWrappedFetch<OP>): TypedWrappedFetch<OP> {
  const fun = (
    payload: OpArgType<OP>,
    realFetch?: RealFetch,
    init?: RequestInit,
  ) => {
    try {
      return fetch(payload, realFetch, init)
    } catch (err) {
      if (err instanceof ApiError) {
        throw new fun.Error(err)
      }
      throw err
    }
  }

  fun.Error = class extends ApiError {
    constructor(error: ApiError) {
      super(error)
      Object.setPrototypeOf(this, new.target.prototype)
    }

    getActualType() {
      return {
        status: this.status,
        data: this.data,
      } as OpErrorType<OP>
    }
  }

  fun._name = ''

  return fun
}

function fetcher<Paths>() {
  let baseUrl = ''
  let defaultInit: RequestInit = {}

  return {
    configure: (config: FetchConfig) => {
      baseUrl = config.baseUrl || ''
      defaultInit = config.init || {}
    },
    path: <P extends keyof Paths>(path: P) => ({
      method: <M extends keyof Paths[P]>(method: M) => ({
        create: function (queryParams?: Record<string, true | 1>) {
          const fn = createFetch((payload, realFetch, init) =>
            // @ts-ignore
            fetchUrl({
              baseUrl: baseUrl || '',
              path: path as string,
              method: method as Method,
              queryParams: Object.keys(queryParams || {}),
              payload,
              init: mergeRequestInit(defaultInit, init),
              realFetch: realFetch || fetch,
            }),
          )

          fn._name = `${String(method).toUpperCase()} ${String(path)}`

          return fn
        } as unknown as SvelteCreateFetch<M, Paths[P][M]>,
      }),
    }),
  }
}

export const Apity = {
  for: <Paths extends OpenapiPaths<Paths>>() => fetcher<Paths>(),
}

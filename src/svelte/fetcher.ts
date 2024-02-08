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
import { ApiError, LimitedResponse } from '../types.js'

const JSON_CONTENT_TYPES = ['application/json', 'application/ld+json']

async function getResponseBody(response: LimitedResponse) {
  // no content
  if (response.status === 204) {
    return undefined
  }
  const contentType = response.headers.get('content-type')
  if (contentType && JSON_CONTENT_TYPES.includes(contentType)) {
    return await response.json()
  } else if (contentType && contentType.indexOf('text') === -1) {
    // if the response is neither JSON nor text, return binary data as is
    // @ts-ignore
    return await response.blob()
  }
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch (e) {
    return text
  }
}

/***
 * Make an API call and compose an ApiResponse object from the result
 * @param request - Request wrapper
 */
async function fetchAndParse<R>(request: Request): Promise<ApiResponse<R>> {
  const { url, init } = getFetchParams(request)
  try {
    const response = await request.realFetch(url, init)
    try {
      const body = await getResponseBody(response)
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
      console.warn('Failed to parse the response body', e)
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
  const ready = writable<Promise<ApiResponse<R>>>(new Promise(() => { }))
  const resp = writable<ApiResponse<R> | undefined>()
  let unsubscribe: Unsubscriber | undefined = undefined

  const retVal = {
    resp,
    ready,
    reload,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    // Deprecated field. Will be removed in one of the major updates
    onData: new Promise(() => { }),
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    result: new Promise(() => { }),
  } as ApiRequest<R>

  const apiCall: () => Promise<ApiResponse<R>> = () => {
    const promise = new Promise<ApiResponse<R>>(async (resolve) => {
      const result = await fetchAndParse<R>(request)
      unsubscribe = resp.subscribe((r) => {
        if (typeof r !== 'undefined' && r.data === result.data) {
          resolve(r)
          retVal.result = Promise.resolve(r)
          retVal.onData = retVal.result
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
    retVal.result = apiCallPromise
    retVal.onData = apiCallPromise
    return apiCallPromise
  }

  retVal.result = apiCall()
  retVal.onData = retVal.result
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
  let defaultConfig: FetchConfig = {
    baseUrl: '',
    init: {},
    use: []
  }

  return {
    configure: (config: FetchConfig) => {
      defaultConfig.baseUrl = config.baseUrl || '';
      defaultConfig.init = config.init || {};
      defaultConfig.use = config.use || []
    },
    path: <P extends keyof Paths>(path: P) => ({
      method: <M extends keyof Paths[P]>(method: M) => ({
        create: function (queryParams?: Record<string, true | 1>) {
          const fn = createFetch((payload, realFetch, init) =>
            // @ts-ignore
            fetchUrl({
              path: path as string,
              method: method as Method,
              queryParams: Object.keys(queryParams || {}),
              payload,
              init: init,
              realFetch: realFetch || fetch,
              config: defaultConfig
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

import 'whatwg-fetch'

import { server } from './mocks/server'
import { arrayRequestBody, Apity } from '..'
import { paths } from './paths'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('fetch', () => {
  const apity = Apity.for<paths>()

  beforeEach(() => {
    apity.configure({
      baseUrl: 'https://api.backend.dev',
      init: {
        headers: {
          Authorization: 'Bearer token',
        },
      },
    })
  })

  const expectedHeaders = {
    authorization: 'Bearer token',
    accept: 'application/json',
  }

  const headersWithContentType = {
    ...expectedHeaders,
    'content-type': 'application/json',
  }

  it('GET /query/{a}/{b}', async () => {
    const fun = apity.path('/query/{a}/{b}').method('get').create()

    const request = fun({
      a: 1,
      b: '/',
      scalar: 'a',
      list: ['b', 'c'],
    })
    const { ok, status, data } = await request.onData

    expect(data.params).toEqual({ a: '1', b: '%2F' })
    expect(data.query).toEqual({ scalar: 'a', list: ['b', 'c'] })
    expect(data.headers).toEqual(expectedHeaders)
    expect(ok).toBe(true)
    expect(status).toBe(200)
  })

  const methods = ['post', 'put', 'patch', 'delete'] as const

  methods.forEach((method) => {
    it(`${method.toUpperCase()} /body/{id}`, async () => {
      const fun = apity.path('/body/{id}').method(method).create()

      const request = fun({
        id: 1,
        list: ['b', 'c'],
      })
      const { data } = await request.onData
      expect(data.params).toEqual({ id: '1' })
      expect(data.body).toEqual({ list: ['b', 'c'] })
      expect(data.query).toEqual({})
      expect(data.headers).toEqual(headersWithContentType)
    })
  })

  methods.forEach((method) => {
    it(`${method.toUpperCase()} /bodyarray/{id}`, async () => {
      const fun = apity.path('/bodyarray/{id}').method(method).create()

      const request = fun(arrayRequestBody(['b', 'c'], { id: 1 }))
      const { data } = await request.onData

      expect(data.params).toEqual({ id: '1' })
      expect(data.body).toEqual(['b', 'c'])
      expect(data.query).toEqual({})
      expect(data.headers).toEqual(headersWithContentType)
    })
  })

  methods.forEach((method) => {
    it(`${method.toUpperCase()} /bodyquery/{id}`, async () => {
      const fun = apity
        .path('/bodyquery/{id}')
        .method(method)
        .create({ scalar: 1 })

      const request = fun({
        id: 1,
        scalar: 'a',
        list: ['b', 'c'],
      })
      const { data } = await request.onData
      expect(data.params).toEqual({ id: '1' })
      expect(data.body).toEqual({ list: ['b', 'c'] })
      expect(data.query).toEqual({ scalar: 'a' })
      expect(data.headers).toEqual(headersWithContentType)
    })
  })

  it(`DELETE /body/{id} (empty body)`, async () => {
    const fun = apity.path('/body/{id}').method('delete').create()

    const request = fun({ id: 1 } as any)
    const { data } = await request.onData

    expect(data.params).toEqual({ id: '1' })
    expect(data.headers).toHaveProperty('accept')
    expect(data.headers).not.toHaveProperty('content-type')
  })

  it(`POST /nocontent`, async () => {
    const fun = apity.path('/nocontent').method('post').create()
    const request = fun(undefined)
    const { data, status } = await request.onData
    expect(status).toBe(204)
    expect(data).toBeUndefined()
  })

  // it('GET /error', async () => {
  //   expect.assertions(3)
  //
  //   const fun = apity.path('/error/{status}').method('get').create()
  //   const request = fun({ status: 400 })
  //   const {data, status, ok} = await request.onData
  //   expect(ok).toBe(false)
  //   // try {
  //   //   await fun(, fetch)
  //   // } catch (err) {
  //   //   expect(err instanceof ApiError).toBe(true)
  //   //   expect(err instanceof fun.Error).toBe(true)
  //   //
  //   //   if (err instanceof ApiError) {
  //   //     expect(err).toMatchObject({
  //   //       status: 400,
  //   //       statusText: 'Bad Request',
  //   //       data: '',
  //   //     })
  //   //   }
  //   // }
  // })

  // it('GET /error (json body)', async () => {
  //   const fun = apity.path('/error/{status}').method('get').create()
  //
  //   const errors = {
  //     badRequest: false,
  //     internalServer: false,
  //     other: false,
  //   }
  //
  //   const handleError = (e: any) => {
  //     if (e instanceof fun.Error) {
  //       const error = e.getActualType()
  //       // discriminated union
  //       if (error.status === 400) {
  //         errors.badRequest = error.data.badRequest
  //       } else if (error.status === 500) {
  //         errors.internalServer = error.data.internalServer
  //       } else {
  //         errors.other = error.data.message === 'unknown error'
  //       }
  //     }
  //   }
  //
  //   for (const status of [400, 500, 503]) {
  //     try {
  //       await fun({ status, detail: true }, fetch)
  //     } catch (e) {
  //       handleError(e)
  //     }
  //   }
  //
  //   expect(errors).toEqual({
  //     badRequest: true,
  //     internalServer: true,
  //     other: true,
  //   })
  // })
  // it('default error type {status: number, data: any}', async () => {
  //   expect.assertions(2)
  //
  //   const fun = apity.path('/defaulterror').method('get').create()
  //
  //   try {
  //     await fun({}, fetch, {})
  //   } catch (e) {
  //     if (e instanceof fun.Error) {
  //       const error = e.getActualType()
  //       expect(error.status).toBe(500)
  //       expect(error.data).toEqual('internal server error')
  //     }
  //   }
  // })

  // it('network error', async () => {
  //   expect.assertions(1)
  //
  //   const fun = apity.path('/networkerror').method('get').create()
  //
  //   try {
  //     await fun({}, fetch, {})
  //   } catch (e) {
  //     expect(e).not.toBeInstanceOf(ApiError)
  //   }
  // })

  // it('operation specific error type', () => {
  //   const one = apity.path('/query/{a}/{b}').method('get').create()
  //   const two = apity.path('/body/{id}').method('post').create()
  //
  //   expect(new one.Error({} as any)).not.toBeInstanceOf(two.Error)
  //   expect(new two.Error({} as any)).not.toBeInstanceOf(one.Error)
  // })

  it('override init', async () => {
    const fun = apity.path('/query/{a}/{b}').method('get').create()

    const request = fun(
      {
        a: 1,
        b: '2',
        scalar: 'a',
        list: ['b', 'c'],
      },
      fetch,
      {
        headers: { admin: 'true' },
        credentials: 'include',
      },
    )
    const { data } = await request.onData
    expect(data.headers).toEqual({ ...expectedHeaders, admin: 'true' })
  })
})

import 'whatwg-fetch'

import { server } from './mocks/server'
import { arrayRequestBody, Apity } from '../src'
import { paths } from './paths'
import {
  describe,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  it,
  expect,
} from 'vitest'

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

  it('GET /query/{a}/{b}', async () => {
    const fun = apity.path('/query/{a}/{b}').method('get').create()

    const request = fun({
      a: 1,
      b: '/',
      scalar: 'a',
      list: ['b', 'c'],
    })
    const { ok, status, data } = await request.result

    expect(data.params).toEqual({ a: '1', b: '%2F' })
    expect(data.query).toEqual({ scalar: 'a', list: ['b', 'c'] })
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
      const { data } = await request.result
      expect(data.params).toEqual({ id: '1' })
      expect(data.body).toEqual({ list: ['b', 'c'] })
      expect(data.query).toEqual({})
    })
  })

  methods.forEach((method) => {
    it(`${method.toUpperCase()} /bodyarray/{id}`, async () => {
      const fun = apity.path('/bodyarray/{id}').method(method).create()

      const request = fun(arrayRequestBody(['b', 'c'], { id: 1 }))
      const { data } = await request.result

      expect(data.params).toEqual({ id: '1' })
      expect(data.body).toEqual(['b', 'c'])
      expect(data.query).toEqual({})
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
      const { data } = await request.result
      expect(data.params).toEqual({ id: '1' })
      expect(data.body).toEqual({ list: ['b', 'c'] })
      expect(data.query).toEqual({ scalar: 'a' })
    })
  })

  it(`DELETE /body/{id} (empty body)`, async () => {
    const fun = apity.path('/body/{id}').method('delete').create()

    const request = fun({ id: 1 } as any)
    const { data } = await request.result

    expect(data.params).toEqual({ id: '1' })
    expect(data.headers).toHaveProperty('accept')
    expect(data.headers).not.toHaveProperty('content-type')
  })

  it(`POST /nocontent`, async () => {
    const fun = apity.path('/nocontent').method('post').create()
    const request = fun(undefined)
    const { data, status } = await request.result
    expect(status).toBe(204)
    expect(data).toBeUndefined()
  })

  it('reloads', async () => {
    const fun = apity.path('/counter').method('get').create()

    const request = fun({})
    const { data } = await request.result
    expect(data.counter).toEqual(1)

    const secondResp = await request.reload()
    expect(secondResp.data.counter).toEqual(2)

    request.reload()
    const thirdResp = await request.result
    expect(thirdResp.data.counter).toEqual(3)
  })
})

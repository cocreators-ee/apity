# 📘️ apity - Typed API client for Svelte and SvelteKit

A typed fetch client for [openapi-typescript](https://github.com/drwpow/openapi-typescript) compatible with SvelteKit's custom `fetch`

## Installation

```bash
npm install @cocreators-ee/apity
```

Or

```bash
pnpm add @cocreators-ee/apity
```

## Features

- [x] Support of JSON request and responses from [OpenAPI 3.0](https://swagger.io/specification)
- [x] Support of `{#await}` syntax in Svelte templates
- [x] Compatibility with SvelteKit's `fetch` in `load` functions
- [x] Request reloading
- [x] Configuration of default [fetch options](https://developer.mozilla.org/en-US/docs/Web/API/fetch#parameters)

On the roadmap:

- [ ] Caching of subsequent requests with the same URL and parameters

## Usage

### Generate typescript definition from schema

Before working with the library, you need to generate an API spec using [openapi-typescript](https://www.npmjs.com/package/openapi-typescript):

```bash
npx openapi-typescript https://petstore3.swagger.io/api/v3/openapi.json --output src/petstore.ts

🚀 https://petstore3.swagger.io/api/v3/openapi.json → file:./src/petstore.ts [870ms]
```

### Using Apity

Configure Apity instance and generate functions for making API calls:

```ts
// File: api.ts

import { Apity } from '@cocreators-ee/apity'
import type { paths } from 'src/petstore'

const apity = Apity.for<paths>()

// global configuration
apity.configure({
  // Base URL to your API
  baseUrl: 'https://petstore.swagger.io/v2',
  // RequestInit options, e.g. default headers
  init: {
    // mode: 'cors'
    // headers: {}
  },
})

// create fetch operations
export const findPetsByStatus = apity
  .path('/pet/findByStatus')
  .method('get')
  .create()
export const addPet = apity.path('/pet').method('post').create()
```

Each API call is represented as a request object that has the following properties:

```typescript
type ApiRequest<R = any> = {
  // Svelte store containing the response of the API call.
  readonly resp: Writable<ApiResponse<R> | undefined>

  // Svelte store that contains a promise for an API call.
  // If you reload the requets using reload() function, this store will be updated.
  readonly ready: Writable<undefined | Promise<ApiResponse<R>>>

  // Function that reloads the request with the same parameteres.
  reload: () => Promise<ApiResponse<R>>

  // Promise for the API call.
  // Useful for server code and places where you can't use the `ready` store.
  result: Promise<ApiResponse<R>>
}
```

Each response is a Svelte store returning either an `undefined`, or the following object:

```ts
type SuccessfulResp<R> = {
  ok: true
  // Typed object for a successful request. Built from the OpenAPI spec
  data: R
  // HTTP status code
  status: number
}

type FailedResp = {
  ok: false
  data: any
  // HTTP status code
  status: number
}

type ApiResponse<R> = SuccessfulResp<R> | FailedResp
```

### Error handling

There are certain conditions under which an API request could throw an exception without
actually reaching the desired server, for example, unpredictable network issues. For such
cases, the api response will contain a status set to a negative number, indicating that
an exception was thrown.

```js
{
  ok: false,
  status: -1,
  data: undefined,
}
```

### Using Apity with await syntax in templates

Assuming you've created an `src/api.ts` from [using Apity](#using-apity) section:

```svelte
<script lang="ts">
  import { findPetByStatus } from 'src/api.ts'
  const request = findPetByStatus({ status: 'sold' })
  const petsReady = request.ready
</script>

<div>
  {#await $petsReady}
    <p>Loading..</p>
  {:then resp}
    {#if resp.ok}
      {#each resp.data as pet}
        <p>{pet.name}</p>
      {/each}
    {:else}
      <p>Error while loading pets</p>
    {/if}
  {/await}

  <button on:click={() => {request.reload()}}>
    Reload pets
  </button>
</div>
```

### Subscribing to response store

Assuming you've created an `src/api.ts` from [using Apity](#using-apity) section:

```svelte
<script lang="ts">
  import { findPetByStatus } from 'src/api.ts'
  const request = findPetByStatus({ status: 'sold' })
  let names = []

  request.resp.subscribe(resp => {
    if (resp.ok) {
      names = resp.data.map(pet => pet.name)
    }
  })
</script>

<div>
  {#each names as name}
    <p>{name}</p>
  {/each}
</div>
```

### Using in load functions

Fetch operations support SvelteKit's [load](https://kit.svelte.dev/docs/load#making-fetch-requests) function from `+page.ts` and `+page.server.ts`.

Assuming you've created an `src/api.ts` from [using Apity](#using-apity) section:

```ts
import { findPetByStatus } from 'src/api.ts'

export async function load({ fetch }) {
  const request = findPetByStatus({ status: 'sold' })
  const resp = await request.result
  if (resp.ok) {
    return { pets: resp.data, error: '' }
  } else {
    return { pets: [], error: 'Failed to load pets' }
  }
}
```

# Financial support

This project has been made possible thanks to [Cocreators](https://cocreators.ee). You can help us continue our open source work by supporting us on [Buy me a coffee](https://www.buymeacoffee.com/cocreators).

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/cocreators)

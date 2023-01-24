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
npx openapi-typescript https://petstore3.swagger.io/ --output petstore.ts

🚀 https://petstore3.swagger.io/api/v3/openapi.json → file:.petstore.ts [870ms]
```

### Using Apity

Configure Apity instance and generate functions for making API calls:

```ts
// File: api.ts

import { Apity } from '@cocreators-ee/apity'
import { paths } from './petstore'

const apity = Apity.for<paths>()

// global configuration
apity.configure({
  // Base URL to your API, e.g. `/` if you're serving API from the same domain
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

```ts
{
  // Svelte store that contains a promise for an API call.
  // If you reload the requets using reload() function, this store will be updated
  ready,
  // Promise for the initial API call. Will not be updated by `reload()` function.
  // Usefull for server code and places where you can't use the `ready` store.
  onData,
  // Svelte store containing the response of the API call.
  resp,
  // Function that reloads the request with the same parameteres
  reload,
}
```

Each response is a Svelte store returning either an `undefined`, or the following object:

```ts
{
  // HTTP status code
  status,
  // Boolean, whether the request was successful or not
  ok,
  // Typed object for a successfull request. Built from the OpenAPI spec
  data,
}
```

### Using Apity with await syntax in templates

```svelte
<script lang="ts">
  import { findPetByStatus } from './api.ts'
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

```svelte
<script lang="ts">
  import { findPetByStatus } from './api.ts'
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

Fetch operations support SvelteKit's [load](https://kit.svelte.dev/docs/load#making-fetch-requests) function from `+page.ts` and `+page.server.ts`:

```ts
export async function load({ fetch }) {
  const request = findPetByStatus({ status: 'sold' })
  const resp = await request.onData
  return { resp }
}
```

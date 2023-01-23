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

**Features**

Supports JSON request and responses

- ✅ [OpenAPI 3.0](https://swagger.io/specification)
- ✅ [Swagger 2.0](https://swagger.io/specification/v2/)

## Usage

### Generate typescript definition from schema

```bash
npx openapi-typescript https://petstore.swagger.io/v2/swagger.json --output petstore.ts

# 🔭 Loading spec from https://petstore.swagger.io/v2/swagger.json…
# 🚀 https://petstore.swagger.io/v2/swagger.json -> petstore.ts [650ms]
```

### Using SvelteFetcher

Configure SvelteFetcher instance and generate functions for making API calls:

```ts
// File: api.ts

import { SvelteFetcher } from '@cocreators-ee/apity'
import { paths } from './petstore'

// declare fetcher for paths
const fetcher = Fetcher.for<paths>()

// global configuration
fetcher.configure({
  // Base URL to your API, e.g. `/` if you're serving API from the same domain
  baseUrl: 'https://petstore.swagger.io/v2',
  // RequestInit options, e.g. default headers
  init: {
    // mode: 'cors'
    // headers: {}
  },
})

// create fetch operations
export const findPetsByStatus = fetcher
  .path('/pet/findByStatus')
  .method('get')
  .create()
export const addPet = fetcher.path('/pet').method('post').create()
```

Each API call is represented as a request object that has the following properties:

```ts
{
  // Svelte store that contains a promise for an API call.
  // If you reload the requets using reload() function, this store will be updated
  ready,
  // Promise for the initial API call. Will not be updated by `reload()` function.
  // Usefull for server code and places where you can't use the `ready` store.
  isLoaded,
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
  // Typed object for a 200/201 status. Built from the OpenAPI spec
  data,
}
```

### Using SvelteFetcher with await syntax in templates

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
  {#each resp.data as pet}
    <p>{pet.name}</p>
  {/each}
</div>
```

### Using in load functions

Fetch operations support SvelteKit's [load](https://kit.svelte.dev/docs/load#making-fetch-requests) function from `+page.ts` and `+page.server.ts`:

```ts
export async function load({ fetch }) {
  const request = findPetByStatus({ status: 'sold' })
  const resp = await request.isLoaded
  if (resp.ok) {
    return { pets: resp.data }
  } else {
    return { pets: [] }
  }
}
```

### Using Fetcher in pure JavaScript

If you work on non-Svelte project, then you can use `Fetcher` instead:

```ts
import { Fetcher } from 'openapi-typescript-fetch'

import { paths } from './petstore'

// declare fetcher for paths
const fetcher = Fetcher.for<paths>()

// global configuration
fetcher.configure({
  baseUrl: 'https://petstore.swagger.io/v2',
})

// create fetch operations
const findPetsByStatus = fetcher
  .path('/pet/findByStatus')
  .method('get')
  .create()
const addPet = fetcher.path('/pet').method('post').create()

const resp = await findPetsByStatus({ status: 'available' })
console.log(resp.ok)
console.log(resp.data)
console.log(resp.status)
```

### Typed Error Handling

A non-ok fetch response throws a generic `ApiError`

But an Openapi document can declare a different response type for each status code, or a default error response type

These can be accessed via a `discriminated union` on status, as in code snippet below

```ts
const findPetsByStatus = fetcher.path('/pet/findByStatus').method('get').create()
const addPet = fetcher.path('/pet').method('post').create()

try {
  await findPetsByStatus({ ... })
  await addPet({ ... })
} catch(e) {
  // check which operation threw the exception
  if (e instanceof addPet.Error) {
    // get discriminated union { status, data }
    const error = e.getActualType()
    if (error.status === 400) {
      error.data.validationErrors // only available for a 400 response
    } else if (error.status === 500) {
      error.data.errorMessage // only available for a 500 response
    } else {
      ...
    }
  }
}
```

### Utility Types

- `OpArgType` - Infer argument type of an operation
- `OpReturnType` - Infer return type of an operation
- `OpErrorType` - Infer error type of an operation
- `FetchArgType` - Argument type of a typed fetch operation
- `FetchReturnType` - Return type of a typed fetch operation
- `FetchErrorType` - Error type of a typed fetch operation
- `TypedFetch` - Fetch operation type

```ts
import { paths, operations } from './petstore'

type Arg = OpArgType<operations['findPetsByStatus']>
type Ret = OpReturnType<operations['findPetsByStatus']>
type Err = OpErrorType<operations['findPetsByStatus']>

type Arg = OpArgType<paths['/pet/findByStatus']['get']>
type Ret = OpReturnType<paths['/pet/findByStatus']['get']>
type Err = OpErrorType<paths['/pet/findByStatus']['get']>

type FindPetsByStatus = TypedFetch<operations['findPetsByStatus']>

const findPetsByStatus = fetcher
  .path('/pet/findByStatus')
  .method('get')
  .create()

type Arg = FetchArgType<typeof findPetsByStatus>
type Ret = FetchReturnType<typeof findPetsByStatus>
type Err = FetchErrorType<typeof findPetsByStatus>
```

### Utility Methods

- `arrayRequestBody` - Helper to merge params when request body is an array [see issue](https://github.com/ajaishankar/openapi-typescript-fetch/issues/3#issuecomment-952963986)

```ts
const body = arrayRequestBody([{ item: 1 }], { param: 2 })

// body type is { item: number }[] & { param: number }
```

Happy fetching! 👍

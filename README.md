- [NeTS](#nets)
- [Basic Functionality](#basic-functionality)
- [Extra functionality](#extra-functionality)
- [Quadruplets](#quadruplets)

## NeTS

NeTS is a TypeScript Graph Theory/Network Science library.
Latest release can also be found at https://deno.land/x/nets@v0.2.3

Import it using the Deno import:

```ts
import { Network } from "https://deno.land/x/nets@v0.1.0/mod.ts";
```

But it might be simpler to use the [Deno convention for external code linking](https://deno.land/manual/linking_to_external_code):

```ts
// In `./ne.ts`
export * from "https://deno.land/x/nets@v0.1.0/mod.ts";
```

This is what will be used from now on.

## Basic Functionality

You can create an instance the Network class:

```ts
const net = new Network();

net.addEdgeList([
  [1, 2],
  [2, 3],
  [3, 2],
  [1, 5],
]);
```

Adding edges is forced by default.
This means that if the nodes don't exist in the network, the function will create them before adding the edge.

The network has an `edge_limit = 2500` and a `vertex_limit = 1500` set when instancing.
It can be changed with the initial arguments for the network:

```ts
const net = new Network({ edge_limit: 100, vertex_limit = 200 });
```

## Extra functionality

You can import a network from a CSV using the `loadAdjacencyMatrix` function:

```ts
import { loadAdjacencyMatrix } from "./ne.ts";

const net = await loadAdtacencyMatrix("file_name.csv");
```

For testing, you can use the `randomNetworkGen` function.
It randomly generates a network with the given arguments.

## Quadruplets

The quadruplets algorithm has the same exponetial time complexity as
the edge pair algorithm.
However, the less dense the network, the faster the quadruplets algorithm can get.

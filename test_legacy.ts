import * as nets from "https://deno.land/x/nets@v0.3.2/mod.ts";
import * as nex from "https://deno.land/x/nets@v0.3.2/extra.ts";

const start = Date.now();
const network = await nex.loadAdjacencyMatrix("./data/networkMatrix.csv");
console.log(network.triplets().length, Date.now() - start);

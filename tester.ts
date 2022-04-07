/*
deno run --allow-read --allow-write tester.ts
*/

import * as nets from "./mod.ts";
import * as nex from "./extra.ts";

const start_time = new Date().getTime();

export async function testSpeed(
  network: nets.Network,
  algo: string,
  params: any
) {
  const start_time = new Date().getTime();
  await network[algo](params);
  const end_time = new Date().getTime();
  const elapsed_time = (end_time - start_time) / 1000;
  console.log("Time taken: ", elapsed_time);
}

function logNetwork(network: nets.Network) {
  return (
    "\n" +
    JSON.stringify(network.vertex_list) +
    "\n" +
    JSON.stringify(network.edge_list) +
    "\n"
  );
}

function valuesTest(network: nets.Network) {
  return (
    "--Values Test--\n" +
    `Weight:                ${network.weight}\n` +
    `Genus:                 ${network.genus}\n` +
    `Clique Size:           ${network.max_edges}\n` +
    `Density:               ${network.density}\n` +
    `Clustering for ETH:    ${network.clustering("ETH")}\n`
  );
}

function algorithmTest(network: nets.Network) {
  let test_string = "--Algorithms Tests--\n";

  const k_core = 10;
  const k10 = network.core(k_core);
  test_string += `${k_core}-core decomposition vertice number: ${k10.vertices.size}\n`;
  test_string += `${k_core}-core decomposition edge number: ${k10.edges.size}\n`;

  const triplets_start_time = new Date().getTime();
  const triplets = network.triplets();
  const triplets_end_time = new Date().getTime();
  test_string += `Number of triplets: ${triplets.length}\n`;
  test_string += `10 triplets sample: ${triplets.filter(
    (value, index) => index < 10
  )}\n`;
  test_string += `  -triplets algorithm time: ${
    (triplets_end_time - triplets_start_time) / 1000
  }\n`;

  const assortativity_start = new Date().getTime();
  test_string += `Network assortativity: ${network.assortativity()}\n`;
  test_string += `  -time taken: ${
    (new Date().getTime() - assortativity_start) / 1000
  }`;

  return test_string;
}

function getTestTime(): string {
  const date = new Date();
  return (
    date.getDate() +
    "_" +
    date.getMonth() +
    "_" +
    date.getFullYear() +
    "_" +
    date.getHours()
  );
}

async function quadrupletsAdjacencyMatrixTimeTesting() {
  const net_csv = await nex.loadAdjacencyMatrix(
    "./data/FTXAdjacencyMatrix.csv"
  );

  let algo_start = Date.now();
  const quad_csv_pair = net_csv.quadrupletsEdgePairing();
  const pair_time = (Date.now() - algo_start) / 1000;
  console.log("Edge pairing time taken:", pair_time);
  console.log("Edge pairing size:", quad_csv_pair.length);
  console.log("----------");
  algo_start = Date.now();
  const quad = net_csv.quadruplets();
  const quad_time = (Date.now() - algo_start) / 1000;
  // console.log(quad_csv_pair.map((c) => [...c.simple_edge_list]));
  console.log("Quadruplets time taken:", quad_time);
  console.log("Quad size:", quad.length);
}

async function mainTest() {
  const net_csv = await nex.loadAdjacencyMatrix(
    "./data/FTXAdjacencyMatrix.csv"
  );
  let test_data = valuesTest(net_csv) + "\n" + algorithmTest(net_csv);
  const end_time = new Date().getTime();
  const elapsed_time = (end_time - start_time) / 1000;
  test_data += "\nElapsed time: " + elapsed_time;
  Deno.writeTextFile(
    `./data/test_${getTestTime()}_${Math.floor(200 * Math.random())}.txt`,
    test_data
  );
}

function compareQuadAlgorithms(net: nets.Network, debug = false) {
  let start = Date.now();

  const quad = net.quadruplets();
  const quad_time = (Date.now() - start) / 1000;

  start = Date.now();
  const quad_pair = net.quadrupletsEdgePairing();
  const quad_pair_time = (Date.now() - start) / 1000;

  if (debug) {
    console.log("Quad algorithm");
    console.log(quad.length);
    console.log("Time taken: ", quad_time);

    console.log("------");

    console.log("Edge pairing algorithm");
    console.log(quad_pair.length);
    console.log("Time taken: ", quad_pair_time);
  }

  return [quad_time, quad_pair_time];
}

function getQuadTime(net: nets.Network): number {
  const start = Date.now();
  net.quadruplets();
  return (Date.now() - start) / 1000;
}
function getPairTime(net: nets.Network): number {
  const start = Date.now();
  net.quadrupletsEdgePairing();
  return (Date.now() - start) / 1000;
}

function quadEfficiencyTest(num = 20) {
  const quad_data: number[] = [];
  for (let n = 4; n < num; n++) {
    console.log(n);
    const complete_net = nex.genCompleteNetwork(n);
    quad_data.push(getQuadTime(complete_net));
  }

  Deno.writeTextFile(`./data/quad_data.json`, JSON.stringify(quad_data));
}

function pairEfficiencyTest(num = 20) {
  const quad_data: number[] = [];
  for (let n = 4; n < num; n++) {
    console.log(n);
    const complete_net = nex.genCompleteNetwork(n);
    quad_data.push(getPairTime(complete_net));
  }

  Deno.writeTextFile(`./data/quad_pair_data.json`, JSON.stringify(quad_data));
}

function randomNetEfficiencyTest(
  number_vertices = 20,
  edges_num = { min: 10, max: 50 },
  name = `random_efficiency_test.json`
) {
  const quad: number[] = [];
  const pair: number[] = [];
  const net_list: number[] = [];

  for (
    let number_edges = edges_num.min;
    number_edges < edges_num.max;
    number_edges++
  ) {
    console.log(number_edges);
    const net = nex.genRandomNetwork({ number_vertices, number_edges });

    if (!net_list.includes(net.edges.size)) {
      quad.push(getQuadTime(net));
      pair.push(getPairTime(net));

      net_list.push(net.edges.size);
    }
  }

  Deno.writeTextFile(
    `./data/${name}`,
    JSON.stringify({ quad, pair, number_vertices, net_list })
  );
}

function quadrupletsEfficiencyTest(num = 20) {
  quadEfficiencyTest(num);
  pairEfficiencyTest(num);
}

function generalTesting() {
  // const test_net = new nets.Network();
  // try {
  //   test_net.addEdgeList([
  //     [1, 0],
  //     [1, 2],
  //     [1, 3],
  //     [1, 4],
  //     [1, 5],
  //     [0, 6],
  //     [0, 7],
  //     [1, 8],
  //     [6, 7],
  //     [2, 5],
  //     [5, 4],
  //     [3, 8],
  //     [4, 3],
  //   ]);
  // } catch (e) {
  //   console.log(e);
  // }
  // const random_net = nex.genRandomNetwork({
  //   number_vertices: 15,
  //   number_edges: 20,
  // });
}

// compareQuadAlgorithms(nex.genCompleteNetwork(10), true);
// randomNetEfficiencyTest(20, { min: 20, max: 120 }, "rand_dense.json");

const start = Date.now();
const net = await nex.loadAdjacencyMatrix("./data/networkMatrix.csv");
console.log(net.triplets().length, Date.now() - start);

import * as nets from "./ne.ts";

const start_time = new Date().getTime();

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
  test_string += `Triplets algorithm time: ${
    (triplets_end_time - triplets_start_time) / 1000
  }\n`;

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
const net_csv = await nets.loadAdjacencyMatrix("./data/networkMatrix.csv");

let test_data = valuesTest(net_csv) + "\n" + algorithmTest(net_csv);

const end_time = new Date().getTime();
const elapsed_time = (end_time - start_time) / 1000;

test_data += "\nElapsed time: " + elapsed_time;

Deno.writeTextFile(`./data/test_${getTestTime()}.txt`, test_data);

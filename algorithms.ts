import { Network } from "./network.ts";
import { ParsedCSV } from "./enums.ts";

/**
 * Tries to generate a network with the given number of nodes and edges.
 * @param  {Object} args
 * @param  {number} args.number_vertices
 * @param  {number} args.number_edges
 * @param  {boolean} [args.is_directed]
 * @returns Network
 */
export function randomNetworkGen(args: {
  number_vertices: number;
  number_edges: number;
  is_directed?: boolean;
  edge_tries?: number;
}): Network {
  let { number_vertices, number_edges, is_directed } = args;
  is_directed ??= false;
  const net = new Network({ is_directed });

  for (let vertex = 0; vertex < number_vertices; vertex++)
    net.addVertex({ id: vertex });

  args.edge_tries ??= 20;
  while (net.edges.size < number_edges && args.edge_tries > 0) {
    const from = Math.floor(Math.random() * number_vertices);
    const to = Math.floor(Math.random() * number_vertices);
    try {
      net.addEdge({ from, to, do_force: false });
    } catch (e) {
      args.edge_tries--;
      console.log(e.message);
    }
  }

  return net;
}

/**
 * Reads an [adjacency matrix](https://www.wikiwand.com/en/Adjacency_matrix) CSV and returns a network object.
 * @param  {string} file_name
 * @returns Network
 */
export async function loadAdjacencyMatrix(
  file_name: string,
  is_directed = false
): Promise<Network> {
  const csv_file = await Deno.readTextFile(file_name);

  const parsed_csv = parseCSV([...csv_file]);

  const vertex_limit = parsed_csv[0].length;
  const edge_limit = (parsed_csv[0].length * (parsed_csv[0].length - 1)) / 2;

  const csv_network = new Network({ is_directed, vertex_limit, edge_limit });

  parsed_csv[0].forEach((vertex, index) => {
    if (index === 0) return;
    csv_network.addVertex({ id: vertex });
  });

  if (!is_directed) {
    parsed_csv.forEach((line, line_number) => {
      if (line_number === 0) return;
      line.forEach((edge_weight, column_number) => {
        if (column_number === 0) return;
        const weight = +edge_weight;
        if (weight) {
          const from = parsed_csv[line_number][0];
          const to = parsed_csv[0][column_number];
          csv_network.addEdge({ from, to, weight });
        }
      });
    });
  }

  return csv_network;
}

/**
 * Parses a CSV.
 * @param  {string[]} csv_file
 * @returns ParsedCSV
 */
function parseCSV(csv_file: string[]): ParsedCSV {
  const parsed_csv: ParsedCSV = [[]];

  let current_line = parsed_csv.length - 1;
  let current_char = "";
  csv_file.forEach((char) => {
    if (char === "\n") {
      parsed_csv.push([]);
      current_line = parsed_csv.length - 1;
      current_char = "";
      return;
    } else if (char === ",") {
      parsed_csv[current_line].push(current_char);
      current_char = "";
      return;
    }
    current_char += char;
  });

  return parsed_csv;
}

/*
TODO:
- [] write to csv
- [] read from csv
*/

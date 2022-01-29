export type base_id = string | number;

export type Triplet = base_id[];

export interface VertexArgs {
  id: base_id;
  weight?: number;
}

export interface EdgeArgs {
  from: base_id;
  to: base_id;
  id?: base_id;
  weight?: number;
  do_force?: boolean;
}

export interface NetworkArgs {
  is_directed?: boolean;
  is_multigraph?: boolean;
  edge_limit?: number;
  vertex_limit?: number;
}

export type ParsedCSV = string[][];

export const ERROR = {
  UNDEFINED_VALUES: "Undefined values being given as arguments!",
  EDGE_LIMIT: "Can't add new edge. Limit of Edges exceeded",
  VERTICE_LIMIT: "Can't add new vertex. Limit of Vertices exceeded",
  EXISTING_EDGE: "Trying to add an edge with already existing ID",
  EXISTING_VERTICE: "Trying to add a vertex with already existing ID",
  INEXISTENT_VERTICE: "Vertex doesn't exist",
  NOT_MULTIGRAPH:
    "Trying to add multiple edges between two vertices. Graph is not a multigraph!",
  UNDEFINED_ID: "Tried to use undefined id as input",
};

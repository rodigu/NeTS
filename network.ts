import { Vertex } from "./vertex.ts";
import { Edge } from "./edge.ts";
import {
  base_id,
  VertexArgs,
  EdgeArgs,
  NetworkArgs,
  ERROR,
  Triplet,
} from "./enums.ts";

export class Network {
  readonly edges: Map<base_id, Edge>;
  readonly vertices: Map<base_id, Vertex>;

  readonly is_directed: boolean;
  readonly is_multigraph: boolean;

  private edge_limit: number;
  private vertex_limit: number;
  private free_eid: number;
  private free_vid: number;

  /**
   * @param  {NetworkArgs} [args={}]
   */
  constructor(args: NetworkArgs = {}) {
    this.edges = new Map();
    this.vertices = new Map();
    this.is_directed = args.is_directed ?? false;
    this.vertex_limit = args.vertex_limit ?? 1500;
    this.edge_limit = args.edge_limit ?? 2500;
    this.free_eid = 0;
    this.free_vid = 0;
    this.is_multigraph = false;
  }

  get args(): NetworkArgs {
    return {
      is_directed: this.is_directed,
      is_multigraph: this.is_multigraph,
      edge_limit: this.edge_limit,
      vertex_limit: this.vertex_limit,
    };
  }

  /**
   * Get network's weight.
   *
   * A network's weight is the sum of all its vertices' weights
   * @returns number
   */
  get weight(): number {
    return this.vertex_list
      .map((vertex) => vertex.weight)
      .reduce((prev, curr) => prev + curr);
  }

  /**
   * List of vertices with negative weight.
   * @returns Vertex[]
   */
  get negative_vertices(): Vertex[] {
    const { vertex_list } = this;
    return vertex_list.filter((vertex) => vertex.weight < 0);
  }

  /**
   * List of vertices with positive weight.
   * @returns Vertex[]
   */
  get positive_vertices(): Vertex[] {
    const { vertex_list } = this;
    return vertex_list.filter((vertex) => vertex.weight > 0);
  }

  /**
   * List of vertices with zero weight.
   * @returns Vertex[]
   */
  get zero_vertices(): Vertex[] {
    const { vertex_list } = this;
    return vertex_list.filter((vertex) => vertex.weight == 0);
  }

  /**
   * Get network's [genus](https://en.wikipedia.org/wiki/Genus_%28mathematics%29).
   * @returns number
   */
  get genus(): number {
    return this.edges.size - this.vertices.size + 1;
  }

  /**
   * Get the values of the vertices.
   * @returns base_id[]
   */
  get vertex_list(): Vertex[] {
    return [...this.vertices.values()];
  }

  get edge_list(): Edge[] {
    return [...this.edges.values()];
  }

  /**
   * Number of edges in the [maximum clique possible](https://www.wikiwand.com/en/Clique_(graph_theory)) with the network's number of verices.
   * @returns number
   */
  get max_edges(): number {
    return (this.vertices.size * (this.vertices.size - 1)) / 2;
  }

  /**
   * Returns the network's [density](https://www.baeldung.com/cs/graph-density)
   * @returns number
   */
  get density(): number {
    return this.edges.size / this.max_edges;
  }

  /**
   * @param  {EdgeArgs} args
   */
  addEdge(args: EdgeArgs) {
    args.do_force ??= true;
    args.weight ??= 1;

    args.id ??= this.newEID();

    if (this.edges.has(args.id)) throw { message: ERROR.EXISTING_EDGE };

    if (this.edges.size >= this.edge_limit) throw { message: ERROR.EDGE_LIMIT };

    if (!args.do_force) {
      if (!this.vertices.has(args.from))
        throw { message: ERROR.INEXISTENT_VERTICE, vertex: args.from };
      if (!this.vertices.has(args.to))
        throw { message: ERROR.INEXISTENT_VERTICE, vertex: args.to };
    } else {
      if (!this.vertices.has(args.from)) this.addVertex({ id: args.from });
      if (!this.vertices.has(args.to)) this.addVertex({ id: args.to });
    }

    if (!this.is_multigraph && this.hasEdge(args.from, args.to)) return;
    // throw { message: ERROR.NOT_MULTIGRAPH };

    this.edges.set(args.id, new Edge(args));
  }

  /**
   * Add multiple edges from a map of edges.
   * @param  {Map<base_id, Edge>} edge_map
   */
  addEdgeMap(edge_map: Map<base_id, Edge>) {
    edge_map.forEach((edge) => this.addEdge(edge.args));
  }

  /**
   * Add multiple edges from a list of [base_id, base_id].
   * @param  {[base_id][]} edge_list
   */
  addEdgeList(edge_list: [base_id, base_id][]) {
    edge_list.forEach((edge) => this.addEdge({ from: edge[0], to: edge[1] }));
  }

  /**
   * Removes an edge between the two given vertices.
   *
   * If the network is a multigraph, an ID is needed to remove a specific edge.
   * @param  {Object} args
   * @param  {base_id} args.from
   * @param  {base_id} args.to
   * @param  {base_id} [args.id]
   */
  removeEdge(args: { from: base_id; to: base_id; id?: base_id }) {
    this.edges.forEach(({ vertices }, id) => {
      if (this.checkEdgeIsSame(vertices, args)) {
        this.edges.delete(id);
        return;
      }
    });
  }

  /**
   * Returns true if an edge (undirected) between from and to exists.
   * @param  {base_id} from
   * @param  {base_id} to
   * @returns boolean
   */
  hasEdge(from: base_id, to: base_id, is_directed = false): boolean {
    return this.edge_list.some(({ vertices }) =>
      this.checkEdgeIsSame(vertices, { from, to }, is_directed)
    );
  }

  /**
   * Returns a list of edges between two given nodes.
   *
   * If the network is not a multigraph, the list will always be either empty or have only one item.
   * @param  {base_id} from
   * @param  {base_id} to
   * @returns base_id[]
   */
  getEdgesBetween(
    from: base_id,
    to: base_id,
    is_directed = this.is_directed
  ): base_id[] | base_id {
    const edge_list: base_id[] = [];

    this.edges.forEach(({ vertices }, id) => {
      if (this.checkEdgeIsSame(vertices, { from, to }, is_directed)) {
        edge_list.push(id);
      }
    });

    return this.is_multigraph ? edge_list : edge_list[0];
  }

  /**
   * Returns the edge between two nodes.
   * @param  {base_id} from
   * @param  {base_id} to
   * @returns base_id[]
   */
  edgeBetween(
    from: base_id,
    to: base_id,
    is_directed = this.is_directed
  ): Edge | undefined {
    return this.edge_list.find(({ vertices }) =>
      this.checkEdgeIsSame(vertices, { from, to }, is_directed)
    );
  }

  /**
   * @param  {VertexArgs} args
   */
  addVertex(args: VertexArgs) {
    if (this.vertices.size >= this.vertex_limit)
      throw { message: ERROR.VERTICE_LIMIT };
    if (args.id !== undefined && this.vertices.has(args.id))
      throw { message: ERROR.EXISTING_VERTICE };

    this.vertices.set(args.id, new Vertex(args));
  }

  /**
   * Add multiple vertices from a map of vertices.
   * @param  {Map<base_id, Vertex>} vertex_map
   */
  addVertexMap(vertex_map: Map<base_id, Vertex>) {
    vertex_map.forEach((vertex, id) => this.vertices.set(id, vertex));
  }

  /**
   * Add multiple vertices from a list of VertexArgs.
   * @param  {VertexArgs[]} vertex_list
   */
  addVertexList(vertex_list: VertexArgs[]) {
    vertex_list.forEach((vertex_args, id) =>
      this.vertices.set(id, new Vertex(vertex_args))
    );
  }

  /**
   * Removes vertex with given id.
   * @param  {base_id} id
   */
  removeVertex(id: base_id) {
    if (!this.vertices.has(id))
      throw { message: ERROR.INEXISTENT_VERTICE, vertex: id };

    this.vertices.delete(id);

    this.edges.forEach(({ vertices }, key) => {
      const { from, to } = vertices;
      if (from === id || to === id) this.edges.delete(key);
    });
  }

  /**
   * Returns true if an edge with the given id exists
   * @param  {base_id} id
   * @returns boolean
   */
  hasVertex(id: base_id): boolean {
    return this.vertices.has(id);
  }

  /**
   * Get in-neighbors of a given vertex.
   *
   * Returns [] if network is undirected.
   * @param  {base_id} id
   * @returns base_id[]
   */
  inNeighbors(id: base_id): base_id[] {
    const in_neighbors: base_id[] = [];
    if (!this.is_directed) return in_neighbors;

    this.edges.forEach(({ vertices }) => {
      const { from, to } = vertices;
      if (to === id) in_neighbors.push(from);
    });

    return in_neighbors;
  }

  /**
   * Get out-neighbors of a given vertex.
   *
   * Returns [] if network is undirected.
   * @param  {base_id} id
   * @returns base_id[]
   */
  outNeighbors(id: base_id): base_id[] {
    const out_neighbors: base_id[] = [];
    if (!this.is_directed) return out_neighbors;

    this.edges.forEach(({ vertices }) => {
      const { from, to } = vertices;
      if (from === id) out_neighbors.push(to);
    });

    return out_neighbors;
  }

  /**
   * Get list of neighbors to a vertex.
   * @param  {base_id} id
   * @returns base_id
   */
  neighbors(id: base_id): base_id[] {
    const neighborhood: base_id[] = [];

    this.edges.forEach(({ vertices }) => {
      const { from, to } = vertices;
      if (from === id) neighborhood.push(to);
      else if (to === id) neighborhood.push(from);
    });

    return neighborhood;
  }

  /**
   * Return the degree of a vertex with the given ID.
   * @param  {base_id} id
   * @returns number
   */
  degree(id: base_id): number {
    let vertex_degree = 0;

    this.edges.forEach(({ vertices }) => {
      const { from, to } = vertices;
      if (from === id || to === id) vertex_degree++;
    });

    return vertex_degree;
  }

  /**
   * Return the in-degree of a vertex.
   *
   * The in-degree of a vertex is the sum of the dregrees of the edges that are directed to it.
   * @param  {base_id} id
   * @returns number
   */
  inDegree(id: base_id): number {
    let in_degree = 0;
    if (!this.is_directed) return in_degree;

    this.edges.forEach(({ vertices }) => {
      const { to } = vertices;
      if (to === id) in_degree++;
    });

    return in_degree;
  }

  /**
   * Return the out-degree of a vertex.
   *
   * The out-degree of a vertex is the sum of the dregrees of the edges that are directed away from it.
   * @param  {base_id} id
   * @returns number
   */
  outDegree(id: base_id): number {
    let out_degree = 0;
    if (!this.is_directed) return out_degree;

    this.edges.forEach(({ vertices }) => {
      const { from } = vertices;
      if (from === id) out_degree++;
    });

    return out_degree;
  }

  /**
   * [Assortativity](https://www.wikiwand.com/en/Assortativity) of a given vertex.
   * @param  {base_id} id
   * @returns number
   */
  assortativity(id: base_id): number {
    let vertex_assortativity = 0;

    this.edges.forEach(({ vertices }) => {
      const { from, to } = vertices;
      if (from === id) vertex_assortativity += this.degree(to);
      else if (to === id) vertex_assortativity += this.degree(from);
    });

    return vertex_assortativity / this.degree(id);
  }

  /**
   * Creates a [complement](https://www.wikiwand.com/en/Complement_graph) network.
   * @returns Network
   */
  complement(): Network {
    const complement_network = new Network({ is_directed: this.is_directed });

    this.vertices.forEach((vertex_a) => {
      const { id: id_a } = vertex_a;
      this.vertices.forEach((vertex_b) => {
        const { id: id_b } = vertex_b;
        if (id_a !== id_b) {
          if (!this.hasEdge(id_a, id_b))
            complement_network.addEdge({ from: id_a, to: id_b });
          if (complement_network.is_directed && !this.hasEdge(id_b, id_a))
            complement_network.addEdge({ from: id_b, to: id_a });
        }
      });
    });

    return complement_network;
  }

  /**
   * Creates an [ego network](https://transportgeography.org/contents/methods/graph-theory-definition-properties/ego-network-graph/) of the vertex with the given id.
   * @param  {base_id} id
   * @returns Network
   */
  ego(id: base_id): Network {
    const ego_network = new Network(this.args);

    this.edges.forEach((edge) => {
      const { from, to } = edge.vertices;
      if (from === id || to === id) {
        ego_network.addEdge({ from, to });
      }
    });

    this.edges.forEach(({ vertices }) => {
      const { from, to } = vertices;
      if (ego_network.vertices.has(from) && ego_network.vertices.has(to))
        ego_network.addEdge({ from, to });
    });

    return ego_network;
  }

  /**
   * Returns a copy of the network.
   * @returns Network
   */
  copy(): Network {
    const network_copy = new Network(this.args);
    network_copy.addEdgeMap(this.edges);
    network_copy.addVertexMap(this.vertices);
    return network_copy;
  }

  /**
   * Calculates the [clustering coefficient](https://www.wikiwand.com/en/Clustering_coefficient) of a given vertex.
   * @param  {base_id} id
   * @returns number
   */
  clustering(id: base_id): number {
    const ego_net = this.ego(id);

    if (ego_net.vertices.size <= 1) return 0;

    const centerless_ego = ego_net;

    // Max edges in a network without the given vertex.
    centerless_ego.removeVertex(id);
    const { max_edges } = centerless_ego;
    const existing_edges = centerless_ego.edges.size;

    // If graph is directed, multiply result by 2.
    const directed_const = this.is_directed ? 2 : 1;

    return directed_const * (existing_edges / max_edges);
  }

  /**
   * Calculates the newtork's average [clustering](https://www.wikiwand.com/en/Clustering_coefficient).
   * @returns number
   */
  averageClustering(): number {
    let average_clustering = 0;

    if (this.vertices.size <= 1) return average_clustering;

    const clustering_sum = this.vertex_list
      .map((vertex) => this.clustering(vertex.id))
      .reduce((prev, curr) => prev + curr);

    average_clustering = clustering_sum / this.vertices.size;

    return average_clustering;
  }

  /**
   * Returns a new network with all weighted paths between id and other vertices in the network.
   * @param  {base_id} id
   * @returns Network
   */
  weightedPaths(id: base_id): Network {
    const weighted_net = this.copy();
    const { vertices } = weighted_net;
    vertices.forEach((vertex) => {
      vertex.weight = vertex.id === id ? 0 : -1;
    });
    const get_path = (initial_vertex_id: base_id) => {
      const vertex_neighbors = weighted_net.neighbors(initial_vertex_id);
      const initial_vertex =
        weighted_net.vertices.get(initial_vertex_id) ??
        new Vertex({ id: initial_vertex_id });
      vertex_neighbors.forEach((vertex_id) => {
        const has_edge = weighted_net.hasEdge(
          initial_vertex_id,
          vertex_id,
          weighted_net.is_directed
        );
        const vertex =
          weighted_net.vertices.get(vertex_id) ?? new Vertex({ id: vertex_id });
        const edge =
          weighted_net.edgeBetween(initial_vertex_id, vertex_id) ??
          new Edge({ from: initial_vertex_id, to: vertex_id });
        if (
          has_edge &&
          (vertex?.weight === -1 ||
            initial_vertex.weight + edge.weight < vertex.weight)
        ) {
          vertex.weight = edge.weight + initial_vertex.weight;
          vertex.previous_vertex = initial_vertex_id;
          get_path(vertex_id);
        }
      });
    };
    get_path(id);
    return weighted_net;
  }

  /**
   * Creates a [k-core](https://www.wikiwand.com/en/Degeneracy_(graph_theory)) decomposition of a network.
   * @param  {number} k
   * @returns Network
   */
  core(k: number): Network {
    const k_decomposition = this.copy();

    while (k > 0 && k_decomposition.vertices.size > 0) {
      let { vertex_list } = k_decomposition;
      let vertex_counter;
      for (
        vertex_counter = 0;
        vertex_counter < vertex_list.length;
        vertex_counter++
      ) {
        const current_vertex = k_decomposition.vertex_list[vertex_counter];
        if (k_decomposition.degree(current_vertex.id) < k) {
          k_decomposition.removeVertex(current_vertex.id);
          vertex_list = k_decomposition.vertex_list;
          vertex_counter = 0;
        }
      }
      k--;
    }

    return k_decomposition;
  }

  /**
   * Returns a list with all triplets in the network.
   * @returns Triplet[]
   */
  triplets(): Triplet[] {
    const triplet_list: Triplet[] = [];

    const k2 = this.core(2);

    const { vertices, edges } = k2;

    edges.forEach((edge) => {
      const { from, to } = edge.vertices;
      vertices.forEach((vertex) => {
        const { id } = vertex;
        if (edge.hasVertex(id)) return;
        const triplet: Triplet = [id, from, to];
        if (k2.isSameTriplet(triplet, triplet.sort()))
          if (k2.hasEdge(id, from, false) && k2.hasEdge(id, to, false))
            triplet_list.push(triplet);
      });
    });

    return triplet_list;
  }

  /**
   * Generates a random ID that has not yet been used in the network.
   * @returns base_id
   */
  newVID(): base_id {
    let id = this.free_vid++;
    while (this.vertices.has(id)) {
      id = Math.floor(Math.random() * this.vertex_limit);
    }
    return id;
  }

  /**
   * Checks if a list of triplets contains a certain triplet
   * @param  {Triplet[]} triplet_arr
   * @param  {Triplet} triplet
   * @returns boolean
   */
  private listHasTriplet(triplet_arr: Triplet[], triplet: Triplet): boolean {
    return triplet_arr.some((trip) => this.isSameTriplet(triplet, trip));
  }

  /**
   * Compares two triplets (directed), returns whether they are the same.
   * @param  {Triplet} arr1
   * @param  {Triplet} arr2
   * @returns boolean
   */
  private isSameTriplet(arr1: Triplet, arr2: Triplet): boolean {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((element, index) => element === arr2[index]);
  }

  /**
   * Generates a new ID for an edge being generated.
   * @returns number
   */
  private newEID(): number {
    let id = this.free_eid++;
    while (this.edges.has(id)) {
      id = Math.floor(Math.random() * this.edge_limit);
    }
    return id;
  }

  /**
   * Checks if the two given edges are the same.
   * @param  {EdgeArgs} edge_a
   * @param  {EdgeArgs} edge_b
   * @param  {Boolean} [is_directed=this.is_directed]
   * @returns boolean
   */
  private checkEdgeIsSame(
    edge_a: EdgeArgs,
    edge_b: EdgeArgs,
    is_directed = this.is_directed
  ): boolean {
    if (edge_a.from === edge_b.from && edge_a.to === edge_b.to) return true;
    else if (
      edge_a.to === edge_b.from &&
      edge_a.from === edge_b.to &&
      !is_directed
    )
      return true;
    return false;
  }
}

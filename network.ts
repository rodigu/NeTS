import { Vertex } from "./vertex.ts";
import { Edge } from "./edge.ts";
import {
  base_id,
  VertexArgs,
  EdgeArgs,
  NetworkArgs,
  ERROR,
  EdgeNeighborhood,
} from "./enums.ts";

export class Network {
  readonly edges: Map<base_id, Edge>;
  readonly vertices: Map<base_id, Vertex>;

  readonly is_directed: boolean;
  readonly is_multigraph: boolean;

  readonly [key: string]: any;

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
   * Get network's vertex weight.
   *
   * A network's vertex weight is the sum of all its vertices' weights
   * @returns number
   */
  get vertex_weight(): number {
    return this.vertex_list
      .map((vertex) => vertex.weight)
      .reduce((prev, curr) => prev + curr);
  }

  /**
   * Get network's weight.
   *
   * A network's weight is the sum of all its edges' weights
   * @returns number
   */
  get weight(): number {
    return this.edge_list
      .map((edge) => edge.weight)
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
   * List of vertices with negative weight.
   * @returns Edge[]
   */
  get negative_edges(): Edge[] {
    const { edge_list } = this;
    return edge_list.filter((edge) => edge.weight < 0);
  }

  /**
   * List of vertices with positive weight.
   * @returns Edge[]
   */
  get positive_edges(): Edge[] {
    const { edge_list } = this;
    return edge_list.filter((edge) => edge.weight > 0);
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

  /**
   * Get an array with the edges of the network
   * @returns Edge[]
   */
  get edge_list(): Edge[] {
    return [...this.edges.values()];
  }

  /**
   * Returns pairs of nodes that represent `from` and `to` (respectively) vertices in an edge
   * @returns [base_id, base_id][]
   */
  get simple_edge_list(): [base_id, base_id][] {
    return this.edge_list.map(({ vertices }) => [vertices.from, vertices.to]);
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
   * Ranked neighborhood: list sorted by the number of neighbors by vertex
   * @returns { vertex: base_id; neighbors: number }[]
   */
  get ranked_neighborhood(): { vertex: base_id; neighbors: number }[] {
    return this.vertex_list
      .map((vertex) => {
        return {
          vertex: vertex.id,
          neighbors: this.neighbors(vertex.id).length,
        };
      })
      .sort((a, b) => (a.neighbors < b.neighbors ? 1 : -1));
  }

  /**
   * @param  {EdgeArgs} args
   */
  addEdge(args: EdgeArgs) {
    args.do_force ??= true;
    args.weight ??= 1;

    args.id ??= this.newEID();

    if (this.edges.has(args.id)) throw { message: ERROR.EXISTING_EDGE };

    if (args.from === args.to) throw { message: ERROR.SELF_LOOP, args };

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

    if (!this.is_directed) [args.from, args.to] = [args.from, args.to].sort();

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
   * Add multiple edges from a list of [base_id, base_id].
   * @param  {EdgeArgs[]} edge_list
   */
  addEdgeListArgs(edge_args: EdgeArgs[]) {
    edge_args.forEach((edge) => this.addEdge(edge));
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
    from: base_id | undefined,
    to: base_id | undefined,
    is_directed = this.is_directed
  ): Edge | undefined {
    if (from === undefined || to === undefined) return undefined;
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
   * Returns true if an edge with the given id exists
   * @param  {base_id} id
   * @returns boolean
   */
  hasVertices(ids: base_id[]): boolean {
    return ids.every((id) => this.vertices.has(id));
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
   * Average degree of a given vertex.
   * @param  {base_id} id
   * @returns number
   */
  averageDegree(id: base_id): number {
    let neighbor_degree_sum = 0;

    this.neighbors(id).forEach((neighbor_id) => {
      neighbor_degree_sum += this.degree(neighbor_id);
    });

    return neighbor_degree_sum / this.degree(id);
  }

  /**
   * Performs the given operation over the two vertices of all edges and returns the average.
   * @param  {(from:base_id,to:base_id)=>number} operation
   */
  edgeAverageOperation(operation: (vertices: EdgeArgs) => number) {
    let total = 0;
    this.edges.forEach(({ vertices }) => (total += operation(vertices)));

    return total / this.edges.size;
  }

  /**
   * Performs the given operation over the two vertices of all edges and returns the average.
   * @param  {(from:base_id,to:base_id)=>number} operation
   */
  edgeAverageOperationList(operations: Array<(vertices: EdgeArgs) => number>) {
    let totals = new Array(operations.length).fill(0);
    this.edges.forEach(
      ({ vertices }) =>
        (totals = totals.map(
          (total, index) => (total += operations[index](vertices))
        ))
    );

    return totals.map((total) => total / this.edges.size);
  }

  /**
   * [Assortativity](https://storage.googleapis.com/plos-corpus-prod/10.1371/journal.pone.0008090/1/pone.0008090.s001.pdf?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=wombat-sa%40plos-prod.iam.gserviceaccount.com%2F20220201%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20220201T012508Z&X-Goog-Expires=86400&X-Goog-SignedHeaders=host&X-Goog-Signature=525560a6254f5c978b9405a251534227f2f456692efcfe35f50b3716fee077481f914c530ed7545fe2d58f685cd98b22a31a874b419921cdd3ba2713c946a6ff60e69953a8ce304412618072f2cf8c58fa556f43a0c54197644a8405b219d29f59f27c4346261d0e1409e933984724af4171826ebc5039a5759366de138019bb7f56d08f91d5ec1f55dbb32428515fd011c1d8fb07c3d16614e7f6db0cad43501d96fd7ed48549d3977e5599c430ca6562d227e35455023e580abd8bb66c9277a42c52d628d8b675967d9cfb9754e1b80b6af60ea8373c72a2194d4a66d17bffe570751bb62e8eb2563c036150c063393b058758d9e599cd32a13ed17fc143bb) of a given vertex.
   * @param  {base_id} id
   * @returns number
   */
  assortativity(): number {
    const [edge_multi, edge_sum, edge_sqr_sum] = this.edgeAverageOperationList([
      ({ from, to }) => this.degree(from) * this.degree(to),
      ({ from, to }) => this.degree(from) + this.degree(to),
      ({ from, to }) => this.degree(from) ** 2 + this.degree(to) ** 2,
    ]);

    return (
      (4 * edge_multi - edge_sum ** 2) / (2 * edge_sqr_sum - edge_sum ** 2)
    );
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
   * @returns Cycle[]
   */
  triplets(): base_id[][] {
    const triplet_list: base_id[][] = [];

    const k2 = this.core(2);

    const { edges } = k2;

    edges.forEach((edge) => {
      const { from, to } = edge.vertices;
      k2.neighbors(from).forEach((id) => {
        if (edge.hasVertex(id)) return;
        const triplet: base_id[] = [id, from, to];
        const unsorted = [...triplet];

        if (
          k2.isSameCycle(unsorted, triplet.sort()) ||
          (this.is_directed && !this.listHasCycle(triplet_list, triplet))
        )
          if (k2.hasEdge(id, to, true) && !this.is_directed)
            triplet_list.push(triplet);
          else if (k2.hasEdge(id, to, false)) triplet_list.push(triplet);
      });
    });

    return triplet_list;
  }

  /**
   * Algorithm to find all quadruplets in a network.
   * @returns Cycle[]
   */
  quadruplets(): Cycle[] {
    const c4: Cycle[] = [];

    const k2 = this.core(2);
    const edges1 = k2.edges;

    edges1.forEach((edge1) => {
      const initial_edge = edge1.args;
      let loop_vertex = edge1.vertices.from;
      let pair_vertex = edge1.pairVertex(loop_vertex)!;
      let pair_vertex_neighbors = k2.neighbors(pair_vertex);

      if (!k2.is_directed) {
        const loop_vertex_neighbors = k2.neighbors(loop_vertex);
        if (pair_vertex_neighbors.length > loop_vertex_neighbors.length) {
          const temp = loop_vertex;
          loop_vertex = pair_vertex;
          pair_vertex = temp;
          pair_vertex_neighbors = loop_vertex_neighbors;
        }
      }

      pair_vertex_neighbors.forEach((vertex) => {
        const parallel_edges = k2.is_directed
          ? k2.edgesFrom(vertex)
          : k2.edgesWith(vertex);

        parallel_edges.forEach((p_edge) => {
          const cycle = new Cycle({
            is_directed: k2.is_directed,
            initial_edge,
            loop_vertex,
          });

          if (cycle.addEdge(k2.edgeBetween(cycle.tip, vertex)?.args))
            if (cycle.addEdge(p_edge.args))
              if (cycle.close(k2.edgeBetween(cycle.tip, loop_vertex)?.args))
                if (!c4.some((c) => c.isSameAs(cycle))) c4.push(cycle);
        });
      });
    });

    return c4;
  }

  /**
   * Edges that start at vertex_id. Excluding edges with a `to` vertex in the `except` array
   * @param  {base_id} vertex_id
   * @param  {base_id[]=[]} except
   * @returns Edge
   */
  edgesFrom(vertex_id: base_id, except: base_id[] = []): Edge[] {
    return this.edge_list.filter(
      (edge) =>
        edge.vertices.from === vertex_id && !except.includes(edge.vertices.to)
    );
  }

  /**
   * Returns all edges with the given vertex, regardless of the position of the vertex (`from` or `to`).
   * @param  {base_id} vertex_id
   * @returns Edge
   */
  edgesWith(vertex_id: base_id): Edge[] {
    return this.edge_list.filter(
      (edge) =>
        edge.vertices.from === vertex_id || edge.vertices.to === vertex_id
    );
  }

  /**
   * Returns the given edge's neighborhood. That is, the neighborhood of both its vertices.
   * @param  {Edge} edge
   * @returns EdgeNeighborhood
   */
  edgeNeighbors(edge: Edge): EdgeNeighborhood {
    const { from, to } = edge.vertices;
    const edge_neighbors: EdgeNeighborhood = {
      from: { id: from, neighbors: this.neighbors(from) },
      to: { id: to, neighbors: this.neighbors(to) },
    };

    return edge_neighbors;
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
   * @param  {Cycle[]} triplet_arr
   * @param  {Cycle} triplet
   * @returns boolean
   */
  private listHasCycle(cycle_arr: base_id[][], cycle: base_id[]): boolean {
    return cycle_arr.some((trip) => this.isSameCycle(cycle, trip));
  }

  /**
   * Compares two triplets (directed), returns whether they are the same.
   * @param  {Cycle} arr1
   * @param  {Cycle} arr2
   * @returns boolean
   */
  private isSameCycle(arr1: base_id[], arr2: base_id[]): boolean {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((element) => arr2.includes(element));
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

export class Cycle extends Network {
  private loop_vertex: base_id;
  private tip_vertex: base_id;
  private is_closed: boolean;

  constructor(args: {
    is_directed: boolean;
    initial_edge: EdgeArgs;
    loop_vertex?: base_id;
  }) {
    super(args);
    const { initial_edge, loop_vertex, is_directed } = args;
    super.addEdge(initial_edge);
    this.loop_vertex = initial_edge.from;
    this.tip_vertex = initial_edge.to;
    if (
      !is_directed &&
      loop_vertex !== undefined &&
      this.hasVertex(loop_vertex)
    ) {
      this.loop_vertex = loop_vertex;
      this.tip_vertex = this.edge_list[0].pairVertex(loop_vertex)!;
    }
    this.is_closed = false;
  }

  /**
   * Getter for the tip of the cycle.
   * @returns base_id
   */
  get tip(): base_id {
    return this.tip_vertex;
  }

  get loop(): base_id {
    return this.loop_vertex;
  }

  /**
   * Returns true if the cycle is closed, otherwise returns false.
   * @returns boolean
   */
  get is_complete(): boolean {
    return this.is_closed;
  }

  /**
   * Adds an edge to the cycle if possible.
   * Returns true if the addition is successful.
   * @param  {EdgeArgs|undefined} edge
   * @returns boolean
   */
  addEdge(edge: EdgeArgs | undefined): boolean {
    if (edge !== undefined && this.canAdd(edge)) {
      super.addEdge(edge);
      if (!this.is_directed && this.tip_vertex === edge.to)
        this.tip_vertex = edge.from;
      else this.tip_vertex = edge.to;

      return true;
    }

    return false;
  }

  /**
   * Tries to close the cycle.
   * Returns true if the operation was sucessful.
   * @param  {EdgeArgs|undefined} edge
   * @returns boolean
   */
  close(edge: EdgeArgs | undefined): boolean {
    if (edge !== undefined && this.canCloseWith(edge)) {
      super.addEdge(edge);
      this.is_closed = true;
      this.tip_vertex = this.loop_vertex;
      return true;
    }

    return false;
  }

  /**
   * Compares the cycle with a given cycle.
   * Returns whether they are the same or not.
   * @param  {Cycle} cycle
   * @returns boolean
   */
  isSameAs(cycle: Cycle): boolean {
    if (this.is_directed !== cycle.is_directed) return false;
    return this.edge_list.every(({ vertices }) => {
      return cycle.edge_list.some(({ vertices: compare }) => {
        return (
          (compare.from === vertices.from && compare.to === vertices.to) ||
          (!this.is_directed &&
            compare.from === vertices.to &&
            compare.to === vertices.from)
        );
      });
    });
  }

  private canCloseWith(edge: EdgeArgs): boolean {
    const edge_has_tip_and_loop_vertex =
      (edge.from === this.tip_vertex && edge.to === this.loop_vertex) ||
      (!this.is_directed &&
        edge.to === this.tip_vertex &&
        edge.from === this.loop_vertex);

    return !this.is_closed && edge_has_tip_and_loop_vertex;
  }

  private canAdd(edge: EdgeArgs) {
    const edge_has_tip =
      (edge.from === this.tip_vertex && !this.hasVertex(edge.to)) ||
      (!this.is_directed &&
        edge.to === this.tip_vertex &&
        !this.hasVertex(edge.from));

    return !this.is_closed && edge_has_tip;
  }
}

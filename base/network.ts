import { Vertex, VertexArgs, Neighborhood, Edge, Neighbor } from "./base.ts";

export class Network<InfoType = unknown> {
  readonly vertices: Map<string, Vertex<InfoType>>;
  readonly edges: Map<string, Edge<InfoType>>;
  readonly isDirected: boolean;
  private edgeSeparator = "\\";

  constructor(args: { isDirected: boolean }) {
    this.vertices = new Map();
    this.edges = new Map();
    this.isDirected = args.isDirected;
  }

  /**Takes in two vertices, returns id used by the `edges` Map.
   * @param  {[Vertex, Vertex]} vertices
   * @returns string
   */
  private getEdgeId(vertices: [Vertex, Vertex]): string {
    const [v1, v2] = vertices;
    return v1.id + this.edgeSeparator + v2.id;
  }

  /**Maximum number of edges possible in the network.
   *
   * @readonly
   * @type number
   */
  get maxEdges(): number {
    const n = this.edges.size;
    return this.isDirected ? n * (n - 1) : (n * (n - 1)) / 2;
  }

  get edgeList(): Edge<InfoType>[] {
    return [...this.edges.values()];
  }

  get vertexList(): Vertex<InfoType>[] {
    return [...this.vertices.values()];
  }

  get weight(): number | undefined {
    return this.edgeList.reduce((a, b) => {
      return {
        weight: a.weight + b.weight,
        isDirected: a.isDirected,
        vertices: b.vertices,
      };
    }).weight;
  }

  /**
   * Get network's [genus](https://en.wikipedia.org/wiki/Genus_%28mathematics%29).
   *
   * @readonly
   * @type number
   */
  get genus(): number {
    return this.edges.size - this.vertices.size + 1;
  }

  /**
   * Returns the network's [density](https://www.baeldung.com/cs/graph-density)
   *
   * @readonly
   * @type number
   */
  get density(): number {
    return this.edges.size / this.maxEdges;
  }

  /**
   * Returns list of vertices ranked by number of neighbors.
   * @date 10/24/2023 - 6:06:10 PM
   *
   * @readonly
   * @type {Vertex<InfoType>[]}
   */
  get rankedNeighborhood(): Vertex<InfoType>[] {
    return this.vertexList.sort((a, b) =>
      (a.neighbors?.size ?? 0) < (b.neighbors?.size ?? 0) ? 1 : -1
    );
  }

  /**Takes in the id of a vertex, returns the vertex object.
   * @param  {string} id
   * @returns Vertex | unknown
   */
  getVertex(id: string): Vertex<InfoType> | undefined {
    return this.vertices.get(id);
  }

  /**If vertex exists and `force = false` (default) vertex is not added and the function returns `undefined`.
   * Returns the vertex is successfully added to the network.
   * @param  {Vertex<InfoType>|VertexArgs<InfoType>} vertex
   * @param  {boolean} force?
   * @returns -1 | Vertex<InfoType>
   */
  addVertex(
    vertex: Vertex<InfoType> | VertexArgs<InfoType>,
    force = false
  ): undefined | Vertex<InfoType> {
    const newVertex = vertex instanceof Vertex ? vertex : new Vertex(vertex);
    if (!force && this.vertices.has(newVertex.id)) return;
    return newVertex;
  }

  deleteVertex(id: string): boolean {
    const delVertex = this.vertices.get(id);
    let success = true;
    if (delVertex?.neighbors)
      for (const [_, n] of delVertex?.neighbors) {
        const delEdges = this.getEdges({
          vertices: [delVertex, n.vertex],
          isDirected: false,
          weight: 1,
        });
        if (delEdges[0]) success &&= this.deleteEdge(delEdges[0]);
        if (delEdges[1]) success &&= this.deleteEdge(delEdges[1]);
      }
    success &&= this.vertices.delete(id);
    return success;
  }

  /**Returns the first edge between the given vertices, if it exists. Returns undefined otherwise
   * It is possible to force a directed/undirected edge search regardless of the edge's actual direction.
   * @param  {Edge<InfoType>} edge
   * @returns boolean
   */
  hasEdge(edge: Edge<InfoType>): Edge<InfoType> | undefined {
    if (edge.isDirected) return this.edges.get(this.getEdgeId(edge.vertices));
    const [v1, v2] = edge.vertices;
    return (
      this.edges.get(this.getEdgeId([v1, v2])) ??
      this.edges.get(this.getEdgeId([v2, v1]))
    );
  }

  /**Returns all edges between the given vertices in a list, if they exist. Returns `undefined[]` otherwise.
   * It is possible to force a directed/undirected edge search regardless of the edge's actual direction.
   * @param  {Edge<InfoType>} edge
   * @returns boolean
   */
  getEdges(edge: Edge<InfoType>): (Edge<InfoType> | undefined)[] {
    if (edge.isDirected) return [this.edges.get(this.getEdgeId(edge.vertices))];
    const [v1, v2] = edge.vertices;
    return [
      this.edges.get(this.getEdgeId([v1, v2])),
      this.edges.get(this.getEdgeId([v2, v1])),
    ];
  }

  /**Adds edge with given parameters, returns the edge map.
   * @param  {Edge<InfoType>} edge
   * @returns Map<string, Edge<InfoType>>
   */
  addEdge(edge: Edge<InfoType>): Map<string, Edge<InfoType>> {
    const [v1, v2] = edge.vertices;
    edge.isDirected ??= this.isDirected;
    v1.neighbors?.set(v2.id, { vertex: v2, weight: edge.weight });
    if (!edge.isDirected)
      v2.neighbors?.set(v1.id, { vertex: v1, weight: edge.weight });
    return this.edges.set(this.getEdgeId(edge.vertices), edge);
  }

  deleteEdge(edge: Edge<InfoType>): boolean {
    return this.edges.delete(this.getEdgeId(edge.vertices));
  }

  /**Neighborhood of given vertex. Vertex can be given as `Vertex` class instance object or `id`.
   * @param  {Vertex<InfoType>|string} vertex
   * @returns Neighborhood<InfoType> | undefined
   */
  neighborsOf(
    vertex: Vertex<InfoType> | string
  ): Neighborhood<InfoType> | undefined {
    if (typeof vertex === "string") return this.vertices.get(vertex)?.neighbors;
    return vertex.neighbors;
  }

  degreeOf(vertex: Vertex<InfoType> | string): number {
    return this.neighborsOf(vertex)?.size ?? 0;
  }

  private copyNeighbors(
    v: Vertex<InfoType>,
    v1: Vertex<InfoType>,
    copy: Network<InfoType>
  ) {
    v.neighbors?.forEach((n) => {
      // edges only need to be added if vertex adding is successful (i.e. the vertex doesn't already exist in the network)
      const v2 = copy.addVertex(n.vertex.copy());
      if (v2) this.copyEdges(v, v1, v2, n, copy);
    });
  }

  private copyEdges(
    v: Vertex<InfoType>,
    v1: Vertex<InfoType>,
    v2: Vertex<InfoType>,
    n: Neighbor<InfoType>,
    copy: Network<InfoType>
  ) {
    const [e1, e2] = this.getEdges({
      vertices: [n.vertex, v],
      isDirected: false,
      weight: n.weight,
    });

    if (e1)
      copy.addEdge({
        vertices: [v1, v2],
        weight: e1.weight,
      });

    if (e2)
      copy.addEdge({
        vertices: [v1, v2],
        weight: e2.weight,
      });
  }

  /**
   * Creates copy of the Network
   * @date 10/24/2023 - 6:04:45 PM
   *
   * @returns {Network}
   */
  copy(): Network {
    const copy = new Network<InfoType>(this);
    this.vertices.forEach((v) => {
      const v1 = copy.addVertex(v.copy());
      if (v1 && v.neighbors) this.copyNeighbors(v, v1, copy);
    });
    return copy;
  }
}

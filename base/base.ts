export interface Neighbor<InfoType = unknown> {
  vertex: Vertex<InfoType>;
  weight: number;
}

export type Neighborhood<InfoType> = Map<string, Neighbor<InfoType>>;

export interface VertexArgs<InfoType = unknown> {
  id: string;
  weight?: number;
  neighbors?: Neighborhood<InfoType>;
}

export class Vertex<InfoType = unknown> {
  id: string;
  weight?: number;
  neighbors?: Neighborhood<InfoType>;
  information?: InfoType;
  constructor(args: {
    id: string;
    weight?: number;
    neighbors?: Neighborhood<InfoType>;
  }) {
    this.id = args.id;
    this.weight = args.weight;
    if (args.neighbors) {
      this.neighbors = new Map(args.neighbors);
    }
  }
  /**Returns a neighborless copy of the vertex
   * @returns Vertex
   */
  copy(): Vertex<InfoType> {
    return new Vertex<InfoType>({ id: this.id, weight: this.weight });
  }
}

export interface Edge<InfoType> {
  weight: number;
  isDirected?: boolean;
  vertices: [Vertex<InfoType>, Vertex<InfoType>];
}

import { base_id, EdgeArgs } from "./enums.ts";

export class Edge {
  private to: base_id;
  private from: base_id;
  weight: number;

  /**
   * Create an edge between `from` and `to`.
   *
   * Weight is set to 1 by default (i.e. unweighted).
   * @param  {EdgeArgs} args
   */
  constructor(args: EdgeArgs) {
    this.from = args.from;
    this.to = args.to;
    this.weight = args.weight ?? 1;
  }

  /**
   * Returns an object with the two vertices in the egde.
   * @returns {{ from:base_id, to:base_id }}
   */
  get vertices(): { from: base_id; to: base_id } {
    return { from: this.from, to: this.to };
  }

  get args(): EdgeArgs {
    return { from: this.from, to: this.to, weight: this.weight };
  }

  hasVertex(vertex_id: base_id): boolean {
    if (this.from === vertex_id || this.to === vertex_id) return true;
    return false;
  }
}

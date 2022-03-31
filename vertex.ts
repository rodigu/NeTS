import { base_id, VertexArgs } from "./enums.ts";

export class Vertex {
  readonly id: base_id;
  weight: number;

  /**
   * Vertex constructor
   * @param  {VertexArgs} args
   */
  constructor(args: VertexArgs) {
    this.id = args.id;
    this.weight = args.weight ?? 1;
  }
}

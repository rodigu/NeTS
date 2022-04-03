import { Network } from "./network.ts";
import { base_id, EdgeArgs } from "./enums.ts";

export class Cycle extends Network {
  readonly loop_vertex: base_id;
  private tip_vertex: base_id;
  private is_closed: boolean;

  constructor(args: { is_directed: boolean; initial_edge: EdgeArgs }) {
    super(args);
    super.addEdge(args.initial_edge);
    this.loop_vertex = args.initial_edge.from;
    this.tip_vertex = args.initial_edge.to;
    this.is_closed = false;
  }

  get is_complete() {
    return this.is_closed;
  }

  addEdge(edge: EdgeArgs) {
    if (
      !this.is_closed &&
      ((edge.from === this.tip_vertex && !this.hasVertex(edge.to)) ||
        (!this.is_directed &&
          edge.to === this.tip_vertex &&
          !this.hasVertex(edge.from)))
    ) {
      super.addEdge(edge);
      this.tip_vertex = edge.to;
      if (!this.is_directed && this.tip_vertex === edge.to)
        this.tip_vertex = edge.from;
      return true;
    }
    return false;
  }

  close(edge: EdgeArgs) {
    if (
      !this.is_closed &&
      ((edge.from === this.tip_vertex && edge.to === this.loop_vertex) ||
        (!this.is_directed &&
          edge.to === this.tip_vertex &&
          edge.from === this.loop_vertex))
    ) {
      super.addEdge(edge);
      this.is_closed = true;
      this.tip_vertex = this.loop_vertex;
      return true;
    }
    return false;
  }
}

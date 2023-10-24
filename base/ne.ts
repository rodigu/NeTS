import { Vertex } from "./base.ts";
import { Network } from "./network.ts";

export class NeTS {
  /**
   * Creates a [k-core](https://www.wikiwand.com/en/Degeneracy_(graph_theory)) decomposition of a network.
   * @date 10/24/2023 - 6:15:38 PM
   *
   * @public
   * @static
   * @param {Network} net
   * @param {number} k
   * @returns {Network}
   */
  public static core(net: Network, k: number): Network {
    const kDecomposition = net.copy();

    while (k > 0 && kDecomposition.vertices.size > 0) {
      let { vertexList } = kDecomposition;
      let vertexCounter;
      for (
        vertexCounter = 0;
        vertexCounter < vertexList.length;
        vertexCounter++
      ) {
        const currentVertex = kDecomposition.vertexList[vertexCounter];
        if (kDecomposition.degreeOf(currentVertex.id) < k) {
          kDecomposition.deleteVertex(currentVertex.id);
          vertexList = kDecomposition.vertexList;
          vertexCounter = 0;
        }
      }
      k--;
    }

    return kDecomposition;
  }

  /**
   * Creates an [ego network](https://transportgeography.org/contents/methods/graph-theory-definition-properties/ego-network-graph/) of the vertex with the given id.
   * @date 10/24/2023 - 6:19:37 PM
   *
   * @param {Network} net
   * @param {string} id
   * @returns {Network}
   */
  public static ego(net: Network, id: string): Network {
    const egoNetwork = new Network({ isDirected: net.isDirected });

    net.edges.forEach(({ vertices, weight }) => {
      const [from, to] = vertices;
      if (from.id === id || to.id === id) {
        egoNetwork.addEdge({ weight: weight, vertices: [from, to] });
      }
    });

    net.edges.forEach(({ vertices, weight }) => {
      const [from, to] = vertices;
      if (egoNetwork.vertices.has(from.id) && egoNetwork.vertices.has(to.id))
        egoNetwork.addEdge({ weight: weight, vertices: [from, to] });
    });

    return egoNetwork;
  }

  /**
   * Calculates the [clustering coefficient](https://www.wikiwand.com/en/Clustering_coefficient) of a given vertex.
   * @date 10/24/2023 - 6:24:07 PM
   *
   * @public
   * @static
   * @param {Network} net
   * @param {string} id
   * @returns {number}
   */
  public static clustering(net: Network, id: string): number {
    const egoNet = NeTS.ego(net, id);

    if (egoNet.vertices.size <= 1) return 0;

    const centerlessEgo = egoNet;

    // Max edges in a network without the given vertex.
    centerlessEgo.deleteVertex(id);
    const { maxEdges } = centerlessEgo;
    const existingEdges = centerlessEgo.edges.size;

    // If graph is directed, multiply result by 2.
    const directedConst = net.isDirected ? 2 : 1;

    return directedConst * (existingEdges / maxEdges);
  }

  /**
   * Calculates the newtork's average [clustering](https://www.wikiwand.com/en/Clustering_coefficient).
   * @date 10/24/2023 - 6:15:55 PM
   *
   * @public
   * @static
   * @returns {number}
   */
  public static averageClustering(net: Network): number {
    let averageClustering = 0;

    if (net.vertices.size <= 1) return averageClustering;

    const clusteringSum = net.vertexList
      .map((vertex) => NeTS.clustering(net, vertex.id))
      .reduce((prev, curr) => prev + curr);

    averageClustering = clusteringSum / net.vertices.size;

    return averageClustering;
  }

  private static instertComplementEdge(
    net: Network,
    complementNetwork: Network,
    vertexA: Vertex,
    vertexB: Vertex
  ) {
    if (vertexA.id !== vertexB.id) {
      if (!net.hasEdge({ weight: 1, vertices: [vertexA, vertexB] }))
        complementNetwork.addEdge({
          weight: 1,
          vertices: [vertexA, vertexB],
        });
      if (
        complementNetwork.isDirected &&
        !net.hasEdge({ weight: 1, vertices: [vertexA, vertexB] })
      )
        complementNetwork.addEdge({
          weight: 1,
          vertices: [vertexA, vertexB],
        });
    }
  }

  /**
   * Creates a [complement](https://www.wikiwand.com/en/Complement_graph) network.
   * @date 10/24/2023 - 6:26:53 PM
   *
   * @public
   * @static
   * @returns {Network}
   */
  public static complement(net: Network): Network {
    const complementNetwork = new Network({ isDirected: net.isDirected });

    net.vertices.forEach((vertexA) => {
      net.vertices.forEach((vertexB) => {
        NeTS.instertComplementEdge(net, complementNetwork, vertexA, vertexB);
      });
    });

    return complementNetwork;
  }

  /**
   * Average degree of a given vertex
   * @date 10/24/2023 - 6:47:00 PM
   *
   * @param {Network} net
   * @param {string} id
   * @returns {number}
   */
  averageDegree(net: Network, id: string): number {
    let neighborDegreeSum = 0;

    net.neighborsOf(id)?.forEach(({ vertex }) => {
      neighborDegreeSum += net.degreeOf(vertex.id);
    });

    return neighborDegreeSum / net.degreeOf(id);
  }
}

const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const EDGE_PATTERN = /^\s*([A-Za-z][A-Za-z0-9]*)\s*->\s*([A-Za-z][A-Za-z0-9]*)\s*$/;
const FRONTEND_DIR = path.join(__dirname, "..", "frontend");

app.use(cors());
app.use(express.json());
app.use("/app", express.static(FRONTEND_DIR));

function formatUserId() {
  const fullName = (process.env.FULL_NAME || "your_full_name")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const dob = (process.env.DOB_DDMMYYYY || "ddmmyyyy").trim();

  return `${fullName}_${dob}`;
}

function sortByDiscovery(nodes, nodeOrder) {
  return [...nodes].sort((left, right) => {
    const leftOrder = nodeOrder.get(left) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = nodeOrder.get(right) ?? Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.localeCompare(right);
  });
}

function detectCycleFromNode(node, adjacency, visiting, visited) {
  if (visiting.has(node)) {
    return true;
  }

  if (visited.has(node)) {
    return false;
  }

  visiting.add(node);

  for (const child of adjacency.get(node) || []) {
    if (detectCycleFromNode(child, adjacency, visiting, visited)) {
      return true;
    }
  }

  visiting.delete(node);
  visited.add(node);

  return false;
}

function componentHasCycle(startNode, adjacency) {
  return detectCycleFromNode(startNode, adjacency, new Set(), new Set());
}

function buildTree(node, adjacency, nodeOrder) {
  const children = sortByDiscovery(adjacency.get(node) || [], nodeOrder);
  const tree = {};
  let maxChildDepth = 0;
  let totalSize = 1;

  for (const child of children) {
    const childResult = buildTree(child, adjacency, nodeOrder);
    tree[child] = childResult.tree;
    maxChildDepth = Math.max(maxChildDepth, childResult.depth);
    totalSize += childResult.size;
  }

  return {
    tree,
    depth: maxChildDepth + 1,
    size: totalSize,
  };
}

function collectReachableNodes(startNode, adjacency, seen = new Set()) {
  if (seen.has(startNode)) {
    return seen;
  }

  seen.add(startNode);

  for (const child of adjacency.get(startNode) || []) {
    collectReachableNodes(child, adjacency, seen);
  }

  return seen;
}

function collectWeaklyConnectedComponent(startNode, undirectedAdjacency) {
  const queue = [startNode];
  const seen = new Set([startNode]);

  while (queue.length > 0) {
    const current = queue.shift();

    for (const neighbor of undirectedAdjacency.get(current) || []) {
      if (!seen.has(neighbor)) {
        seen.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return seen;
}

function parseHierarchyData(entries) {
  const invalidEntries = [];
  const duplicateEdges = [];
  const uniqueEdges = [];
  const seenEdges = new Set();
  const nodeOrder = new Map();

  for (const entry of entries) {
    if (typeof entry !== "string") {
      invalidEntries.push(String(entry));
      continue;
    }

    const match = entry.match(EDGE_PATTERN);

    if (!match) {
      invalidEntries.push(entry);
      continue;
    }

    const [, source, target] = match;
    const normalizedEdge = `${source}->${target}`;

    if (!nodeOrder.has(source)) {
      nodeOrder.set(source, nodeOrder.size);
    }

    if (!nodeOrder.has(target)) {
      nodeOrder.set(target, nodeOrder.size);
    }

    if (seenEdges.has(normalizedEdge)) {
      duplicateEdges.push(normalizedEdge);
      continue;
    }

    seenEdges.add(normalizedEdge);
    uniqueEdges.push([source, target]);
  }

  const adjacency = new Map();
  const undirectedAdjacency = new Map();
  const indegree = new Map();
  const allNodes = new Set();

  for (const [source, target] of uniqueEdges) {
    allNodes.add(source);
    allNodes.add(target);

    if (!adjacency.has(source)) {
      adjacency.set(source, new Set());
    }

    if (!adjacency.has(target)) {
      adjacency.set(target, new Set());
    }

    if (!undirectedAdjacency.has(source)) {
      undirectedAdjacency.set(source, new Set());
    }

    if (!undirectedAdjacency.has(target)) {
      undirectedAdjacency.set(target, new Set());
    }

    adjacency.get(source).add(target);
    undirectedAdjacency.get(source).add(target);
    undirectedAdjacency.get(target).add(source);
    indegree.set(source, indegree.get(source) || 0);
    indegree.set(target, (indegree.get(target) || 0) + 1);
  }

  for (const node of allNodes) {
    if (!adjacency.has(node)) {
      adjacency.set(node, new Set());
    }

    if (!undirectedAdjacency.has(node)) {
      undirectedAdjacency.set(node, new Set());
    }

    if (!indegree.has(node)) {
      indegree.set(node, 0);
    }
  }

  const roots = sortByDiscovery(
    [...allNodes].filter((node) => indegree.get(node) === 0),
    nodeOrder
  );
  const hierarchies = [];
  const coveredNodes = new Set();

  for (const root of roots) {
    if (coveredNodes.has(root)) {
      continue;
    }

    const reachableNodes = collectReachableNodes(root, adjacency);

    for (const node of reachableNodes) {
      coveredNodes.add(node);
    }

    const hasCycle = componentHasCycle(root, adjacency);

    if (hasCycle) {
      hierarchies.push({
        root,
        tree: {},
        has_cycle: true,
      });
      continue;
    }

    const builtTree = buildTree(root, adjacency, nodeOrder);

    hierarchies.push({
      root,
      tree: builtTree.tree,
      depth: builtTree.depth,
      _size: builtTree.size,
    });
  }

  const remainingNodes = sortByDiscovery(
    [...allNodes].filter((node) => !coveredNodes.has(node)),
    nodeOrder
  );

  for (const node of remainingNodes) {
    if (coveredNodes.has(node)) {
      continue;
    }

    const componentNodes = collectWeaklyConnectedComponent(node, undirectedAdjacency);

    for (const componentNode of componentNodes) {
      coveredNodes.add(componentNode);
    }

    const componentRoot = sortByDiscovery(componentNodes, nodeOrder)[0];

    hierarchies.push({
      root: componentRoot,
      tree: {},
      has_cycle: true,
    });
  }

  const treeHierarchies = hierarchies.filter((item) => !item.has_cycle);
  const largestTree = [...treeHierarchies].sort((left, right) => {
    if ((right._size || 0) !== (left._size || 0)) {
      return (right._size || 0) - (left._size || 0);
    }

    if ((right.depth || 0) !== (left.depth || 0)) {
      return (right.depth || 0) - (left.depth || 0);
    }

    return (nodeOrder.get(left.root) || 0) - (nodeOrder.get(right.root) || 0);
  })[0];

  return {
    hierarchies: hierarchies.map(({ _size, ...item }) => item),
    invalidEntries,
    duplicateEdges,
    summary: {
      total_trees: treeHierarchies.length,
      total_cycles: hierarchies.length - treeHierarchies.length,
      largest_tree_root: largestTree ? largestTree.root : "",
    },
  };
}

app.get("/", (_req, res) => {
  res.json({
    message: "BFHL backend is running",
  });
});

app.get("/app", (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

app.post("/bfhl", (req, res) => {
  if (!req.body || !Array.isArray(req.body.data)) {
    return res.status(400).json({
      error: "Request body must include a data array.",
    });
  }

  const result = parseHierarchyData(req.body.data);

  return res.json({
    user_id: formatUserId(),
    email_id: process.env.EMAIL_ID || "your_email@example.com",
    college_roll_number: process.env.COLLEGE_ROLL_NUMBER || "your_roll_number",
    hierarchies: result.hierarchies,
    invalid_entries: result.invalidEntries,
    duplicate_edges: result.duplicateEdges,
    summary: result.summary,
  });
});

if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  server.on("error", (error) => {
    console.error("Server failed to start:", error.message);
  });

  server.on("close", () => {
    console.log("Server stopped");
  });

  // Keep the terminal session attached until you stop it with Ctrl+C.
  process.stdin.resume();
}

module.exports = {
  app,
  parseHierarchyData,
  formatUserId,
};

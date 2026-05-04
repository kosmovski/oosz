import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import { useEffect, useMemo, useRef } from "react";

type GraphViewProps = {
  elements: ElementDefinition[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  layoutName?: "cose" | "breadthfirst" | "grid";
};

export default function GraphView({
  elements,
  selectedId,
  onSelect,
  layoutName = "cose",
}: GraphViewProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);

  const layout = useMemo(() => {
    if (layoutName === "breadthfirst") return { name: "breadthfirst", directed: true, padding: 24 };
    if (layoutName === "grid") return { name: "grid", padding: 24 };
    return { name: "cose", animate: false, padding: 24 };
  }, [layoutName]);

  useEffect(() => {
    if (!hostRef.current) return;
    cyRef.current = cytoscape({
      container: hostRef.current,
      elements,
      layout,
      style: [
        {
          selector: "node",
          style: {
            "background-color": "#0ea5e9",
            "border-color": "#22c55e",
            "border-width": 1,
            label: "data(label)",
            color: "#e5e7eb",
            "text-outline-color": "#09090b",
            "text-outline-width": 3,
            "font-size": 10,
            "text-max-width": 120,
            "text-wrap": "ellipsis",
          },
        },
        {
          selector: "edge",
          style: {
            width: 1,
            "line-color": "#334155",
            "target-arrow-color": "#334155",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: "data(label)",
            color: "#93c5fd",
            "font-size": 8,
            "text-background-color": "#09090b",
            "text-background-opacity": 0.85,
            "text-background-padding": 2,
          },
        },
        {
          selector: "node:selected",
          style: {
            "background-color": "#a855f7",
            "border-width": 2,
            "border-color": "#f97316",
          },
        },
        {
          selector: ".muted",
          style: {
            opacity: 0.25,
          },
        },
        {
          selector: ".focus",
          style: {
            opacity: 1,
          },
        },
      ] as any,
    });

    const cy = cyRef.current;
    cy.on("tap", "node", (evt) => {
      const id = evt.target.id();
      onSelect?.(id);
    });
    cy.on("tap", (evt) => {
      if (evt.target === cy) onSelect?.(null);
    });

    return () => {
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, []);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().remove();
    cy.add(elements);
    cy.layout(layout).run();
  }, [elements, layout]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().unselect();
    cy.elements().removeClass("muted focus");
    if (!selectedId) return;

    const node = cy.getElementById(selectedId);
    if (!node || node.empty()) return;
    node.select();
    const neighborhood = node.closedNeighborhood();
    cy.elements().not(neighborhood).addClass("muted");
    neighborhood.addClass("focus");
    cy.animate({ center: { eles: node }, duration: 200 });
  }, [selectedId]);

  return <div ref={hostRef} className="h-full w-full rounded-xl border border-zinc-800 bg-zinc-950" />;
}

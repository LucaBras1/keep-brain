"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import type { Idea } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ZoomIn, ZoomOut, RotateCcw, Brain, Search } from "lucide-react"

interface MindMapProps {
  ideas: Idea[]
}

interface Node {
  id: string
  title: string
  category: string
  potential: string
  status: string
  x: number
  y: number
  vx: number
  vy: number
  fx: number | null
  fy: number | null
}

interface Link {
  source: string
  target: string
  type: string
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  BUSINESS: { bg: "#3b82f6", border: "#1d4ed8", text: "#1e3a8a", glow: "rgba(59, 130, 246, 0.4)" },
  AI: { bg: "#a855f7", border: "#7e22ce", text: "#581c87", glow: "rgba(168, 85, 247, 0.4)" },
  FINANCE: { bg: "#22c55e", border: "#15803d", text: "#14532d", glow: "rgba(34, 197, 94, 0.4)" },
  THOUGHT: { bg: "#f97316", border: "#c2410c", text: "#7c2d12", glow: "rgba(249, 115, 22, 0.4)" },
}

const POTENTIAL_SIZES: Record<string, number> = {
  HIGH: 24,
  MEDIUM: 18,
  LOW: 14,
}

export function MindMap({ ideas }: MindMapProps) {
  const router = useRouter()
  const svgRef = useRef<SVGSVGElement>(null)

  // Simulation states
  const [nodes, setNodes] = useState<Node[]>([])
  const [links, setLinks] = useState<Link[]>([])
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [searchQuery, setSearchQuery] = useState("")
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  // Drag states
  const isDraggingCanvas = useRef(false)
  const draggedNodeIndex = useRef<number | null>(null)
  const dragStart = useRef({ x: 0, y: 0 })
  const panStart = useRef({ x: 0, y: 0 })

  // Initialize nodes and links from ideas list
  useEffect(() => {
    // Width and height of canvas bounds
    const width = 800
    const height = 500

    // Create unique list of nodes
    const initialNodes = ideas.map((idea, index) => {
      // Place in a circle layout initially
      const angle = (index / ideas.length) * 2 * Math.PI
      const radius = 150 + Math.random() * 50
      return {
        id: idea.id,
        title: idea.title,
        category: idea.category,
        potential: idea.potential,
        status: idea.status,
        x: width / 2 + radius * Math.cos(angle),
        y: height / 2 + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
      }
    })

    // Extract links from ideas relations
    const extractedLinks: Link[] = []
    const nodeIds = new Set(ideas.map((i) => i.id))

    ideas.forEach((idea) => {
      // Outgoing relations
      if (idea.fromRelations) {
        idea.fromRelations.forEach((rel) => {
          if (nodeIds.has(rel.toIdeaId)) {
            extractedLinks.push({
              source: idea.id,
              target: rel.toIdeaId,
              type: rel.type,
            })
          }
        })
      }
      // Incoming relations (to avoid duplicates, we check unique sets if needed, but directional links are fine)
      if (idea.toRelations) {
        idea.toRelations.forEach((rel) => {
          if (nodeIds.has(rel.fromIdeaId)) {
            // Only add if not already added
            const exists = extractedLinks.some(
              (l) => l.source === rel.fromIdeaId && l.target === idea.id
            )
            if (!exists) {
              extractedLinks.push({
                source: rel.fromIdeaId,
                target: idea.id,
                type: rel.type,
              })
            }
          }
        })
      }
    })

    setNodes(initialNodes)
    setLinks(extractedLinks)
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [ideas])

  // Run force-directed simulation in requestAnimationFrame loop
  useEffect(() => {
    if (nodes.length === 0) return

    let animationFrameId: number
    const center = { x: 400, y: 250 }

    // Constants for force calculations
    const kRepulsion = 1200 // Repulsion force strength
    const kAttraction = 0.06 // Link spring tension
    const dAttraction = 120  // Target link distance
    const kGravity = 0.015   // Centering force
    const damping = 0.85     // Friction/damping factor

    const step = () => {
      setNodes((currentNodes) => {
        // Create working copy of nodes
        const nextNodes = currentNodes.map((n) => ({ ...n }))
        const nLen = nextNodes.length

        // 1. Calculate repulsion forces between all pairs of nodes
        for (let i = 0; i < nLen; i++) {
          const n1 = nextNodes[i]
          for (let j = i + 1; j < nLen; j++) {
            const n2 = nextNodes[j]

            const dx = n2.x - n1.x
            const dy = n2.y - n1.y
            const distSq = dx * dx + dy * dy + 0.1
            const dist = Math.sqrt(distSq)

            if (dist < 300) {
              // Node force repulsion
              const force = kRepulsion / distSq
              const fx = force * (dx / dist)
              const fy = force * (dy / dist)

              // Push nodes apart
              if (n1.fx === null) { n1.vx -= fx; n1.vy -= fy }
              if (n2.fx === null) { n2.vx += fx; n2.vy += fy }
            }
          }
        }

        // 2. Calculate spring forces along links
        links.forEach((link) => {
          const sourceNode = nextNodes.find((n) => n.id === link.source)
          const targetNode = nextNodes.find((n) => n.id === link.target)

          if (!sourceNode || !targetNode) return

          const dx = targetNode.x - sourceNode.x
          const dy = targetNode.y - sourceNode.y
          const dist = Math.sqrt(dx * dx + dy * dy) + 0.1

          // Spring force attraction/repulsion towards optimal distance
          const displacement = dist - dAttraction
          const force = displacement * kAttraction
          const fx = force * (dx / dist)
          const fy = force * (dy / dist)

          if (sourceNode.fx === null) { sourceNode.vx += fx; sourceNode.vy += fy }
          if (targetNode.fx === null) { targetNode.vx -= fx; targetNode.vy -= fy }
        })

        // 3. Gravity force pulling towards the center
        nextNodes.forEach((n) => {
          if (n.fx !== null && n.fy !== null) {
            // If node is being dragged, lock position
            n.x = n.fx
            n.y = n.fy
            n.vx = 0
            n.vy = 0
          } else {
            // Apply gravity
            n.vx += (center.x - n.x) * kGravity
            n.vy += (center.y - n.y) * kGravity

            // Apply velocity updates and friction
            n.vx *= damping
            n.vy *= damping
            n.x += n.vx
            n.y += n.vy
          }
        })

        return nextNodes
      })

      animationFrameId = requestAnimationFrame(step)
    }

    animationFrameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animationFrameId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [links])

  // Mouse / Touch handlers for dragging nodes or panning canvas
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    
    // Coordinates relative to SVG canvas
    const clientX = e.clientX - rect.left
    const clientY = e.clientY - rect.top

    // Convert screen coordinate to canvas coordinate taking zoom and pan into account
    const canvasX = (clientX - pan.x) / zoom
    const canvasY = (clientY - pan.y) / zoom

    // Check if clicked a node
    let clickedNodeIndex = -1
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      const size = POTENTIAL_SIZES[node.potential] || 18
      const dist = Math.hypot(node.x - canvasX, node.y - canvasY)
      if (dist <= size + 10) {
        clickedNodeIndex = i
        break
      }
    }

    if (clickedNodeIndex !== -1) {
      // Start dragging node
      draggedNodeIndex.current = clickedNodeIndex
      dragStart.current = { x: canvasX, y: canvasY }
      
      // Fix node position
      const node = nodes[clickedNodeIndex]
      node.fx = node.x
      node.fy = node.y
    } else {
      // Start panning canvas
      isDraggingCanvas.current = true
      dragStart.current = { x: e.clientX, y: e.clientY }
      panStart.current = { ...pan }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return

    if (draggedNodeIndex.current !== null) {
      // Move dragged node
      const rect = svgRef.current.getBoundingClientRect()
      const clientX = e.clientX - rect.left
      const clientY = e.clientY - rect.top
      
      const canvasX = (clientX - pan.x) / zoom
      const canvasY = (clientY - pan.y) / zoom

      setNodes((currentNodes) => {
        const nextNodes = [...currentNodes]
        const node = nextNodes[draggedNodeIndex.current!]
        if (node) {
          node.fx = canvasX
          node.fy = canvasY
        }
        return nextNodes
      })
    } else if (isDraggingCanvas.current) {
      // Pan canvas
      const dx = e.clientX - dragStart.current.x
      const dy = e.clientY - dragStart.current.y
      setPan({
        x: panStart.current.x + dx,
        y: panStart.current.y + dy,
      })
    }
  }

  const handleMouseUp = () => {
    if (draggedNodeIndex.current !== null) {
      // Release dragged node
      setNodes((currentNodes) => {
        const nextNodes = [...currentNodes]
        const node = nextNodes[draggedNodeIndex.current!]
        if (node) {
          node.fx = null
          node.fy = null
        }
        return nextNodes
      })
      draggedNodeIndex.current = null
    }
    isDraggingCanvas.current = false
  }

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9
    setZoom((z) => Math.max(0.3, Math.min(3, z * zoomFactor)))
  }

  // Zoom control helpers
  const zoomIn = () => setZoom((z) => Math.min(3, z * 1.2))
  const zoomOut = () => setZoom((z) => Math.max(0.3, z * 0.8))
  const resetZoom = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  // Highlight search results or hovered nodes
  const filteredNodeIds = useMemo(() => {
    if (!searchQuery) return null
    const query = searchQuery.toLowerCase()
    return new Set(
      nodes.filter((n) => n.title.toLowerCase().includes(query)).map((n) => n.id)
    )
  }, [searchQuery, nodes])

  return (
    <Card className="border-2 border-primary/5 shadow-md">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg border border-border">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-sm">Interaktivní mapa nápadů</h3>
            <span className="text-xs text-muted-foreground hidden md:inline">
              (Přetahujte myšlenky pro uspořádání, kliknutím otevřete detail)
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search bar inside map */}
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Najít myšlenku..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs w-full sm:w-[200px]"
              />
            </div>
            
            <div className="flex border rounded-md overflow-hidden shrink-0 bg-background">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none border-r" onClick={zoomIn} aria-label="Přiblížit">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none border-r" onClick={zoomOut} aria-label="Oddálit">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={resetZoom} aria-label="Resetovat">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* The Mind Map Canvas */}
        <div className="relative border rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/20 h-[500px] cursor-grab active:cursor-grabbing select-none">
          <svg
            ref={svgRef}
            className="w-full h-full"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            {/* Arrowhead markers for links */}
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="20"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
              </marker>
              <marker
                id="arrow-hover"
                viewBox="0 0 10 10"
                refX="20"
                refY="5"
                markerWidth="8"
                markerHeight="8"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#7c3aed" />
              </marker>
            </defs>

            {/* Transform container applying pan & zoom */}
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              
              {/* 1. RENDER LINKS/CONNECTIONS */}
              {links.map((link, idx) => {
                const sourceNode = nodes.find((n) => n.id === link.source)
                const targetNode = nodes.find((n) => n.id === link.target)
                if (!sourceNode || !targetNode) return null

                const isHighlighted =
                  hoveredNode === link.source || hoveredNode === link.target
                
                return (
                  <g key={`link-${idx}`} className="transition-all duration-300">
                    <line
                      x1={sourceNode.x}
                      y1={sourceNode.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      stroke={isHighlighted ? "#7c3aed" : "#cbd5e1"}
                      strokeWidth={isHighlighted ? 2.5 : 1.5}
                      strokeDasharray={link.type === "CONTRADICTS" ? "4 4" : undefined}
                      markerEnd={isHighlighted ? "url(#arrow-hover)" : "url(#arrow)"}
                    />
                    {/* Floating label on link hover */}
                    {isHighlighted && (
                      <text
                        x={(sourceNode.x + targetNode.x) / 2}
                        y={(sourceNode.y + targetNode.y) / 2 - 5}
                        textAnchor="middle"
                        className="fill-primary text-[8px] font-semibold bg-background px-1"
                      >
                        {link.type}
                      </text>
                    )}
                  </g>
                )
              })}

              {/* 2. RENDER NODES */}
              {nodes.map((node) => {
                const colors = CATEGORY_COLORS[node.category] || CATEGORY_COLORS.THOUGHT
                const size = POTENTIAL_SIZES[node.potential] || 18
                const isSearching = filteredNodeIds !== null
                const isFound = filteredNodeIds?.has(node.id)
                const isHovered = hoveredNode === node.id
                
                // Determine opacity based on search status
                let opacity = 1
                if (isSearching) {
                  opacity = isFound ? 1 : 0.25
                }

                return (
                  <g
                    key={node.id}
                    className="cursor-pointer transition-opacity duration-300"
                    style={{ opacity }}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={() => {
                      // Only redirect if they didn't drag
                      if (draggedNodeIndex.current === null) {
                        router.push(`/ideas/${node.id}`)
                      }
                    }}
                  >
                    {/* Shadow/Glow ring */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={size + (isHovered || isFound ? 6 : 0)}
                      fill={isHovered || isFound ? colors.glow : "transparent"}
                      className="transition-all duration-300"
                    />
                    
                    {/* Core node circle */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={size}
                      fill={colors.bg}
                      stroke={isHovered || isFound ? "#7c3aed" : colors.border}
                      strokeWidth={isHovered || isFound ? 3 : 1.5}
                      className="transition-all duration-200"
                    />

                    {/* Text Label */}
                    <text
                      x={node.x}
                      y={node.y + size + 14}
                      textAnchor="middle"
                      className="fill-foreground text-[10px] font-medium pointer-events-none select-none max-w-[120px]"
                    >
                      {node.title.length > 18 ? `${node.title.substring(0, 16)}...` : node.title}
                    </text>
                  </g>
                )
              })}

            </g>
          </svg>

          {/* Simple floating helper legend inside map */}
          <div className="absolute bottom-3 left-3 bg-background/90 dark:bg-background/95 border p-2.5 rounded-lg text-[10px] space-y-1.5 shadow-sm max-w-[200px]">
            <p className="font-semibold border-b pb-1">Kategorie myšlenek</p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: "#3b82f6" }}></span>
                <span>Business</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: "#a855f7" }}></span>
                <span>AI / Autom.</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: "#22c55e" }}></span>
                <span>Finance</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: "#f97316" }}></span>
                <span>Myšlenka</span>
              </div>
            </div>
            <div className="border-t pt-1 mt-1 space-y-1">
              <p className="font-semibold">Velikost uzlu (Potenciál)</p>
              <div className="flex justify-between items-center px-1 text-muted-foreground">
                <span>Malý (Low)</span>
                <span>→</span>
                <span>Velký (High)</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

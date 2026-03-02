import { useState, useEffect, useRef, useCallback } from 'react';

declare global {
    interface Window {
        Sketchfab: any;
    }
}

interface SketchfabNode {
    instanceID: number;
    name: string;
    type: string;
    children?: SketchfabNode[];
    materialID?: string;
    [key: string]: any;
}

export function useSketchfab(
    modelUid: string,
    iframeRef: React.RefObject<HTMLIFrameElement | null>
) {
    const [api, setApi] = useState<any>(null);
    const [isReady, setIsReady] = useState(false);
    const [nodes, setNodes] = useState<Record<number, SketchfabNode>>({});
    const [error, setError] = useState<string | null>(null);
    const [lastClickedNode, setLastClickedNode] = useState<number | null>(null);
    const [materials, setMaterials] = useState<any[]>([]);
    const originalMaterialsRef = useRef<Record<string, any>>({});

    useEffect(() => {
        if (window.Sketchfab) {
            initViewer();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js';
        script.onload = () => initViewer();
        script.onerror = () => setError('Failed to load Sketchfab API script');
        document.body.appendChild(script);
        return () => { };
    }, []);

    const initViewer = useCallback(() => {
        const iframe = iframeRef.current;
        if (!iframe || !window.Sketchfab) return;

        const client = new window.Sketchfab(iframe);
        client.init(modelUid, {
            success: (sketchfabApi: any) => {
                setApi(sketchfabApi);
                sketchfabApi.start();
                sketchfabApi.addEventListener('viewerready', () => {
                    setIsReady(true);

                    sketchfabApi.getAnimations((err: any, animations: any[]) => {
                        if (animations && animations.length > 0) {
                            sketchfabApi.pause();
                            sketchfabApi.seekTo(0);
                        }
                    });

                    // Wrap in try-catch to catch LavaMoat / Webpack proxy errors caused by MetaMask
                    try {
                        sketchfabApi.getNodeMap((err: any, nodesMap: Record<number, SketchfabNode>) => {
                            if (!err && nodesMap) {
                                setNodes(nodesMap);
                                console.log(`📋 ${Object.keys(nodesMap).length} nodes loaded`);
                            } else if (err) {
                                console.error("Sketchfab NodeMap error (MetaMask LavaMoat conflict possible):", err);
                                setError("MetaMask/Web3 wallet is blocking the 3D Viewer. Please disable it or use Incognito Mode.");
                            }
                        });

                        sketchfabApi.getMaterialList((err: any, mats: any[]) => {
                            if (!err && mats) {
                                setMaterials(mats);
                                console.log(`🎨 ${mats.length} materials:`, mats.map(m => m.name));
                                mats.forEach(m => {
                                    originalMaterialsRef.current[m.id] = JSON.parse(JSON.stringify(m));
                                });
                            }
                        });
                    } catch (e: any) {
                        console.error("Sketchfab Webpack/LavaMoat crash:", e);
                        setError("MetaMask/Web3 wallet is blocking the 3D Viewer. Please disable it or use Incognito Mode.");
                    }

                    sketchfabApi.addEventListener('click', (e: any) => {
                        if (e.instanceID) setLastClickedNode(e.instanceID);
                    });
                });
            },
            error: () => setError('Sketchfab API failed to initialize'),
            autostart: 1,
            ui_theme: 'dark',
            transparent: 1,
            ui_animations: 0
        });
    }, [modelUid, iframeRef]);

    // ─── NODE VISIBILITY ─────────────────────────────────────────
    const hideNode = useCallback((nodeId: number) => {
        if (api) api.hide(nodeId);
    }, [api]);

    const showNode = useCallback((nodeId: number) => {
        if (api) api.show(nodeId);
    }, [api]);

    // ─── FIND HELPERS ────────────────────────────────────────────
    const findNodeIdByName = useCallback((name: string): number | null => {
        const lower = name.toLowerCase();
        const exact = Object.values(nodes).find(n => n?.name?.toLowerCase() === lower);
        if (exact) return exact.instanceID;
        const partial = Object.values(nodes).find(n =>
            n?.name && n.name.toLowerCase().includes(lower)
        );
        return partial ? partial.instanceID : null;
    }, [nodes]);

    const findAllNodesByPartialName = useCallback((partial: string): SketchfabNode[] => {
        const lower = partial.toLowerCase();
        return Object.values(nodes).filter(n =>
            n?.name && n.name.toLowerCase().includes(lower)
        );
    }, [nodes]);

    // ─── FORCE HIDE MULTIPLE NODE GROUPS ─────────────────────────
    const forceHideNodeGroups = useCallback((prefixes: string[]) => {
        if (!api) return;
        let count = 0;
        prefixes.forEach(prefix => {
            const matches = findAllNodesByPartialName(prefix);
            matches.forEach(n => {
                api.hide(n.instanceID);
                if (n.children) n.children.forEach((c: SketchfabNode) => api.hide(c.instanceID));
                count++;
            });
        });
        console.log(`👁‍🗨 Force-hid ${count} node groups for: ${prefixes.join(', ')}`);
    }, [api, findAllNodesByPartialName]);

    // ─── HIGHLIGHT WITH MAXIMUM GLOW ─────────────────────────────
    const highlightNodeWithColor = useCallback((nodeId: number, color: [number, number, number], emissiveStrength = 2.0) => {
        if (!api || !nodes[nodeId]) return;
        const node = nodes[nodeId];
        const nodeLower = node.name.toLowerCase().replace(/system|_| /g, '');

        let applied = 0;
        materials.forEach(mat => {
            const matLower = (mat.name || '').toLowerCase().replace(/system|_| /g, '');
            if (matLower.includes(nodeLower) || nodeLower.includes(matLower)) {
                const tinted = JSON.parse(JSON.stringify(mat));

                // MAXIMUM emissive glow — very bright
                if (tinted.channels.EmitColor) {
                    tinted.channels.EmitColor.enable = true;
                    tinted.channels.EmitColor.factor = emissiveStrength;
                    tinted.channels.EmitColor.color = [...color];
                }
                if (tinted.channels.AlbedoPBR) {
                    tinted.channels.AlbedoPBR.factor = 1.0;
                    tinted.channels.AlbedoPBR.color = [...color];
                }
                if (tinted.channels.DiffuseColor) {
                    tinted.channels.DiffuseColor.factor = 1.0;
                    tinted.channels.DiffuseColor.color = [...color];
                }

                api.setMaterial(tinted, () => { });
                applied++;
                console.log(`  ✅ Tinted: ${mat.name} (emissive: ${emissiveStrength})`);
            }
        });

        if (applied === 0) {
            console.warn(`  ❌ No materials matched for: ${node.name}`);
        }
    }, [api, nodes, materials]);

    const highlightNode = useCallback((nodeId: number) => {
        highlightNodeWithColor(nodeId, [0.0, 1.0, 1.0], 1.0);
    }, [highlightNodeWithColor]);

    // ─── MATERIAL TRANSPARENCY ────────────────────────────────────
    const setMaterialTransparency = useCallback((materialName: string, opacity: number) => {
        if (!api) return;
        const lower = materialName.toLowerCase();
        materials.forEach(mat => {
            if ((mat.name || '').toLowerCase().includes(lower)) {
                const t = JSON.parse(JSON.stringify(mat));
                if (t.channels.Opacity) {
                    t.channels.Opacity.enable = true;
                    t.channels.Opacity.factor = opacity;
                }
                if (t.channels.AlbedoPBR) {
                    t.channels.AlbedoPBR.factor = opacity;
                }
                api.setMaterial(t, () => { });
            }
        });
    }, [api, materials]);

    const makeLayersTransparent = useCallback((layerNames: string[], opacity: number) => {
        layerNames.forEach(name => setMaterialTransparency(name, opacity));
    }, [setMaterialTransparency]);

    // ─── RESET ────────────────────────────────────────────────────
    const resetMaterials = useCallback(() => {
        if (!api) return;
        Object.values(originalMaterialsRef.current).forEach(orig => {
            api.setMaterial(JSON.parse(JSON.stringify(orig)), () => { });
        });
    }, [api]);

    return {
        api, isReady, nodes, error, materials,
        findNodeIdByName, findAllNodesByPartialName,
        highlightNode, highlightNodeWithColor,
        hideNode, showNode, resetMaterials,
        setMaterialTransparency, makeLayersTransparent,
        forceHideNodeGroups,
        lastClickedNode
    };
}

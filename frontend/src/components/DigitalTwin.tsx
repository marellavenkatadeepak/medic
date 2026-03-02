import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Maximize2, Minimize2, RotateCcw, Layers, ChevronRight, AlertTriangle, Shield, Activity, Sparkles } from 'lucide-react';
import { useSketchfab } from '../hooks/useSketchfab';
import { analyzeOrgan, updateRecord } from '@/lib/api';

// ─── ANATOMY MAPPING (EXACT node names from model) ───────────────
const ANATOMY_MAPPING: Record<string, string> = {
    "BRAIN": "Brain",
    "HEART": "Heart",
    "LUNGS": "Humanlungs",
    "LIVER": "Liver",
    "GUT": "Digestivesystem",
    "KIDNEYS": "Urinary_system",
    "EYES": "Eye",
    "GALLBLADDER": "Gallbladder",
    "SKULL": "Skull",
    "RIBCAGE": "Ribcage",
    "SPINE": "Spine",
    "SKIN": "HumanSkin",
    "DIAPHRAGM": "Diafragma",
};

// Layer definitions: outer → inner (nodeNames = prefixes to match)
const LAYER_ORDER = [
    { id: 'SKIN', label: 'Skin', icon: '🧬', nodeNames: ['HumanSkin', 'Shorts', 'Eyelash'] },
    { id: 'MUSCLES', label: 'Muscles', icon: '💪', nodeNames: ['Musclespart'] },
    { id: 'CIRCULATORY', label: 'Blood Vessels', icon: '🩸', nodeNames: ['Arteriasmesh', 'Venasmesh'] },
];

const RISK_COLORS: Record<string, [number, number, number]> = {
    risk: [1.0, 0.05, 0.0],       // Bright red
    warning: [1.0, 0.5, 0.0],     // Bright orange
    safe: [0.0, 0.9, 0.4],        // Green
};

interface OrganDef {
    id: string;
    name: string;
    displayName: string;
    keywords: string[];
}

const muscleDefinitions: OrganDef[] = Object.entries(ANATOMY_MAPPING).map(([abbr, name]) => ({
    id: abbr,
    name: name,
    displayName: name,
    keywords: [name.toLowerCase(), name.split(' ')[0].toLowerCase()]
}));

interface DigitalTwinProps {
    analysisData?: any;
    recordId?: string;
}

type Status = 'safe' | 'warning' | 'risk';

interface OrganStatus {
    status: Status;
    muscleId: string;
    score: number;
    details: string;
    aiInsights: string[];
    recommendations: string[];
    markers: { name: string; value: string; status: Status }[];
    normalRange?: string;
    fromAI?: boolean;
}

export default function DigitalTwin({ analysisData, recordId }: DigitalTwinProps) {
    const [selectedMuscle, setSelectedMuscle] = useState<OrganDef | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentLayerIndex, setCurrentLayerIndex] = useState(0); // 0 = all visible
    const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set());
    const [riskHighlighted, setRiskHighlighted] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Initialize analyzed organs from DB if available
    const [analyzedOrgans, setAnalyzedOrgans] = useState<Set<string>>(
        new Set(analysisData?.organ_data ? Object.keys(analysisData.organ_data) : [])
    );

    const containerRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const {
        api, isReady, nodes, error,
        findNodeIdByName, findAllNodesByPartialName,
        highlightNode, highlightNodeWithColor,
        hideNode, showNode, resetMaterials,
        setMaterialTransparency, makeLayersTransparent,
        forceHideNodeGroups,
        lastClickedNode
    } = useSketchfab('9b0b079953b840bc9a13f524b60041e4', iframeRef);

    // ─── SYSTEM STATUS WITH RICH AI ANALYSIS ─────────────────────
    const [systemStatus, setSystemStatus] = useState<Record<string, OrganStatus>>({
        'Brain': {
            status: 'safe', muscleId: 'BRAIN', score: 12,
            details: 'Normal neural activity patterns',
            aiInsights: ['EEG patterns within normal range', 'No signs of neurodegeneration', 'Cognitive function markers stable'],
            recommendations: ['Continue regular sleep schedule', 'Omega-3 supplementation recommended'],
            markers: [
                { name: 'Cortisol', value: '14.2 µg/dL', status: 'safe' },
                { name: 'B12 Level', value: '450 pg/mL', status: 'safe' },
                { name: 'Homocysteine', value: '9.1 µmol/L', status: 'safe' },
            ],
            normalRange: 'Cortisol: 6-23 µg/dL'
        },
        'Lungs': {
            status: 'warning', muscleId: 'LUNGS', score: 52,
            details: 'Elevated inflammatory markers in respiratory pathway',
            aiInsights: ['SpO2 trending downward (96% → 94%)', 'Mild bronchial inflammation detected', 'FEV1/FVC ratio slightly reduced'],
            recommendations: ['Pulmonary function test recommended', 'Avoid polluted environments', 'Consider inhaler prescription review'],
            markers: [
                { name: 'SpO2', value: '94%', status: 'warning' },
                { name: 'CRP', value: '4.2 mg/L', status: 'warning' },
                { name: 'FEV1', value: '78%', status: 'warning' },
                { name: 'IgE', value: '180 IU/mL', status: 'safe' },
            ],
            normalRange: 'SpO2: 95-100%'
        },
        'Heart': {
            status: 'risk', muscleId: 'HEART', score: 82,
            details: 'Critical: Elevated cardiac troponin and irregular rhythm',
            aiInsights: ['Troponin I elevated — possible myocardial stress', 'QTc interval prolonged (480ms)', 'LDL cholesterol significantly above target', 'Blood pressure consistently elevated'],
            recommendations: ['URGENT: Cardiology consultation within 48 hours', 'ECG monitoring recommended', 'Start statin therapy if not contraindicated', 'Reduce sodium intake immediately'],
            markers: [
                { name: 'Troponin I', value: '0.08 ng/mL', status: 'risk' },
                { name: 'BNP', value: '450 pg/mL', status: 'risk' },
                { name: 'LDL', value: '185 mg/dL', status: 'risk' },
                { name: 'BP', value: '155/95', status: 'risk' },
                { name: 'Heart Rate', value: '92 bpm', status: 'warning' },
            ],
            normalRange: 'Troponin I: <0.04 ng/mL'
        },
        'Liver': {
            status: 'warning', muscleId: 'LIVER', score: 44,
            details: 'Mild hepatic enzyme elevation',
            aiInsights: ['ALT slightly above reference range', 'Possible fatty liver grade I', 'Albumin production adequate'],
            recommendations: ['Reduce alcohol consumption', 'Liver ultrasound in 3 months', 'Mediterranean diet recommended'],
            markers: [
                { name: 'ALT', value: '52 U/L', status: 'warning' },
                { name: 'AST', value: '38 U/L', status: 'safe' },
                { name: 'GGT', value: '65 U/L', status: 'warning' },
                { name: 'Albumin', value: '4.1 g/dL', status: 'safe' },
            ],
            normalRange: 'ALT: 7-35 U/L'
        },
        'Gut': {
            status: 'safe', muscleId: 'GUT', score: 15,
            details: 'Normal digestive function',
            aiInsights: ['Microbiome diversity is healthy', 'No inflammatory bowel markers', 'Glucose metabolism stable'],
            recommendations: ['Maintain fiber-rich diet', 'Continue probiotic supplementation'],
            markers: [
                { name: 'Glucose', value: '92 mg/dL', status: 'safe' },
                { name: 'HbA1c', value: '5.2%', status: 'safe' },
                { name: 'Calprotectin', value: '35 µg/g', status: 'safe' },
            ],
            normalRange: 'Fasting glucose: 70-100 mg/dL'
        },
        'Kidneys': {
            status: 'safe', muscleId: 'KIDNEYS', score: 9,
            details: 'Adequate renal filtration',
            aiInsights: ['eGFR within normal range', 'No proteinuria detected', 'Electrolyte balance stable'],
            recommendations: ['Stay well hydrated', 'Annual renal panel recommended'],
            markers: [
                { name: 'Creatinine', value: '0.9 mg/dL', status: 'safe' },
                { name: 'eGFR', value: '95 mL/min', status: 'safe' },
                { name: 'BUN', value: '14 mg/dL', status: 'safe' },
            ],
            normalRange: 'eGFR: >90 mL/min'
        },
    });

    // ─── PARSE ANALYSIS DATA → RISK SCORES ─────────────────────
    useEffect(() => {
        if (!analysisData) return;
        const text = JSON.stringify(analysisData).toLowerCase();

        const evaluateRisk = (keywords: string[], organName: string): Omit<OrganStatus, 'muscleId'> => {
            const matches = keywords.filter(k => text.includes(k));
            const base = { aiInsights: [] as string[], recommendations: [] as string[], markers: [] as { name: string; value: string; status: Status }[] };

            if (matches.length === 0) return { ...base, status: 'safe', score: Math.floor(Math.random() * 15) + 5, details: 'No anomalies detected' };

            const hasCritical = ['critical', 'high', 'severe', 'danger', 'emergency', 'abnormal'].some(c => text.includes(c));
            const hasModerate = ['elevated', 'borderline', 'moderate', 'mild', 'low'].some(c => text.includes(c));

            if (hasCritical && matches.length > 0) {
                return {
                    ...base,
                    status: 'risk', score: 70 + Math.floor(Math.random() * 25),
                    details: `Critical: ${matches.slice(0, 2).join(', ')} detected`,
                    aiInsights: [`Critical markers detected in ${organName}`, `Keywords matched: ${matches.join(', ')}`],
                    recommendations: [`Urgent medical review for ${organName}`, 'Consult specialist immediately'],
                };
            }
            if (hasModerate || matches.length > 0) {
                return {
                    ...base,
                    status: 'warning', score: 35 + Math.floor(Math.random() * 30),
                    details: `Monitoring: ${matches[0]} markers found`,
                    aiInsights: [`Elevated markers in ${organName}`, `Tracking: ${matches.join(', ')}`],
                    recommendations: [`Schedule follow-up for ${organName}`, 'Monitor changes over next 30 days'],
                };
            }
            return { ...base, status: 'safe', score: 10 + Math.floor(Math.random() * 20), details: 'Within normal range' };
        };

        setSystemStatus(prev => ({
            'Brain': { ...prev['Brain'], ...evaluateRisk(['brain', 'head', 'mental', 'stroke', 'neuro', 'cognitive'], 'Brain'), muscleId: 'BRAIN' },
            'Lungs': { ...prev['Lungs'], ...evaluateRisk(['lung', 'respiratory', 'breath', 'asthma', 'copd', 'oxygen'], 'Lungs'), muscleId: 'LUNGS' },
            'Heart': { ...prev['Heart'], ...evaluateRisk(['heart', 'cardio', 'pulse', 'bp', 'hypertension', 'cholesterol'], 'Heart'), muscleId: 'HEART' },
            'Liver': { ...prev['Liver'], ...evaluateRisk(['liver', 'hepatic', 'alcohol', 'fatty', 'bilirubin'], 'Liver'), muscleId: 'LIVER' },
            'Gut': { ...prev['Gut'], ...evaluateRisk(['stomach', 'gut', 'digestive', 'diabetes', 'sugar', 'glucose', 'bowel'], 'Gut'), muscleId: 'GUT' },
            'Kidneys': { ...prev['Kidneys'], ...evaluateRisk(['kidney', 'renal', 'urine', 'creatinine'], 'Kidneys'), muscleId: 'KIDNEYS' },
        }));
    }, [analysisData]);

    // ─── AUTO-HIGHLIGHT RISK ORGANS + FORCE-HIDE LAYERS ─────────
    useEffect(() => {
        if (!isReady || riskHighlighted) return;
        if (Object.keys(nodes).length === 0) return;

        const riskyOrgans = Object.entries(systemStatus).filter(([_, d]) => d.status === 'risk' || d.status === 'warning');
        if (riskyOrgans.length === 0) return;

        console.log(`🔍 Found ${riskyOrgans.length} risky organs to highlight`);

        const timer = setTimeout(() => {
            // Step 1: FORCE-HIDE skin and muscle layers so organs are fully visible
            forceHideNodeGroups(['HumanSkin', 'Shorts', 'Eyelash', 'Musclespart']);
            setHiddenLayers(new Set(['SKIN', 'MUSCLES']));
            setCurrentLayerIndex(2);

            // Step 2: Apply bright glow to each risky organ
            riskyOrgans.forEach(([organName, data]) => {
                const nodeName = ANATOMY_MAPPING[data.muscleId];
                if (!nodeName) return;

                const nodeId = findNodeIdByName(nodeName);
                if (nodeId) {
                    const color = RISK_COLORS[data.status];
                    const emissive = data.status === 'risk' ? 2.5 : 1.5;
                    highlightNodeWithColor(nodeId, color, emissive);
                    console.log(`🔴 Risk highlight: ${organName} → ${nodeName} (${data.status}, emissive: ${emissive})`);
                } else {
                    console.warn(`⚠ Could not find node: ${nodeName}`);
                }
            });

            setRiskHighlighted(true);
        }, 3000);

        return () => clearTimeout(timer);
    }, [isReady, systemStatus, nodes, findNodeIdByName, highlightNodeWithColor, forceHideNodeGroups]);

    // ─── LAYER PEELING (TRANSPARENCY + HIDE) ───────────────────
    const peelLayer = useCallback(() => {
        if (currentLayerIndex >= LAYER_ORDER.length) return;

        const layer = LAYER_ORDER[currentLayerIndex];
        let totalHidden = 0;

        // For each nodeName prefix in this layer
        layer.nodeNames.forEach(prefix => {
            // Fade material
            setMaterialTransparency(prefix, 0.05);

            // Hide nodes
            const layerNodes = findAllNodesByPartialName(prefix);
            layerNodes.forEach(n => {
                hideNode(n.instanceID);
                if (n.children) n.children.forEach(child => hideNode(child.instanceID));
            });
            totalHidden += layerNodes.length;
        });

        setHiddenLayers(prev => new Set([...prev, layer.id]));
        setCurrentLayerIndex(prev => prev + 1);
        console.log(`🧅 Peeled layer: ${layer.label} (${totalHidden} nodes hidden)`);
    }, [currentLayerIndex, findAllNodesByPartialName, hideNode, setMaterialTransparency]);

    const restoreAllLayers = useCallback(() => {
        LAYER_ORDER.forEach(layer => {
            layer.nodeNames.forEach(prefix => {
                const layerNodes = findAllNodesByPartialName(prefix);
                layerNodes.forEach(n => {
                    showNode(n.instanceID);
                    if (n.children) n.children.forEach(child => showNode(child.instanceID));
                });
            });
        });
        setHiddenLayers(new Set());
        setCurrentLayerIndex(0);
        resetMaterials();
        setRiskHighlighted(false);
    }, [findAllNodesByPartialName, showNode, resetMaterials]);

    // ─── CLICK HANDLERS ──────────────────────────────────────────
    const handleOrganClick = useCallback((muscleId: string) => {
        const nodeName = ANATOMY_MAPPING[muscleId];
        if (!nodeName) return;

        const nodeId = findNodeIdByName(nodeName);
        if (nodeId) {
            highlightNode(nodeId);
            const def = muscleDefinitions.find(m => m.id === muscleId);
            if (def) {
                setSelectedMuscle(def);
                setIsPanelOpen(true);
            }
        }
    }, [findNodeIdByName, highlightNode]);

    const handleSystemClick = useCallback((organ: string) => {
        const data = systemStatus[organ];
        if (data) {
            handleOrganClick(data.muscleId);

            // If organ is deep and skin is blocking, auto-peel
            if (['HEART', 'LUNGS', 'LIVER', 'GUT', 'KIDNEYS'].includes(data.muscleId) && currentLayerIndex === 0) {
                peelLayer();
            }
        }
    }, [systemStatus, handleOrganClick, currentLayerIndex, peelLayer]);

    // 3D click → UI selection
    useEffect(() => {
        if (!lastClickedNode || !nodes[lastClickedNode]) return;
        const node = nodes[lastClickedNode];
        const found = muscleDefinitions.find(m =>
            node.name?.includes(m.name) || m.keywords.some(k => node.name?.toLowerCase().includes(k))
        );
        if (found) {
            setSelectedMuscle(found);
            setIsPanelOpen(true);
        }
    }, [lastClickedNode, nodes]);

    const resetView = () => {
        if (api) api.recenterCamera();
        setSelectedMuscle(null);
        restoreAllLayers();
    };

    // ─── AI ORGAN ANALYSIS ───────────────────────────────────────
    useEffect(() => {
        if (!selectedMuscle || !analysisData) return;

        const organName = selectedMuscle.displayName;

        const fetchAnalysis = async () => {
            // Already analyzed? Simulate 3 sec "AI crunch" then display
            if (analyzedOrgans.has(organName)) {
                setIsAnalyzing(true);
                await new Promise(resolve => setTimeout(resolve, 3000));
                setIsAnalyzing(false);
                return;
            }

            // New organ? Actually hit the Edge Function
            setIsAnalyzing(true);
            try {
                const data = await analyzeOrgan({
                    organName, analysisText: analysisData
                });

                if (data?.organAnalysis) {
                    const newAnalysis = data.organAnalysis;
                    setSystemStatus(prev => {
                        const updatedStatus = {
                            ...prev,
                            [organName]: {
                                ...prev[organName],
                                ...newAnalysis,
                                fromAI: true
                            }
                        };

                        // Persist to database if we have a recordId
                        if (recordId) {
                            // Extract just the AI generated organs to save
                            const organDataToSave = Object.keys(updatedStatus)
                                .filter(key => updatedStatus[key].fromAI)
                                .reduce((obj, key) => {
                                    //@ts-ignore
                                    obj[key] = updatedStatus[key];
                                    return obj;
                                }, {});

                            updateRecord(recordId, { organ_data: organDataToSave })
                                .catch((error) => {
                                    console.error("Failed to save organ data:", error);
                                });
                        }

                        return updatedStatus;
                    });
                    setAnalyzedOrgans(prev => new Set(prev).add(organName));
                }
            } catch (err) {
                console.error('Failed to analyze organ:', err);
                setAnalyzedOrgans(prev => new Set(prev).add(organName)); // skip analyzing again on error
            } finally {
                setIsAnalyzing(false);
            }
        };

        fetchAnalysis();
    }, [selectedMuscle, analysisData, analyzedOrgans]);

    // ─── FULLSCREEN HANDLING ─────────────────────────────────────
    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // ─── COMPUTED VALUES ─────────────────────────────────────────
    const riskCount = Object.values(systemStatus).filter(d => d.status === 'risk').length;
    const warningCount = Object.values(systemStatus).filter(d => d.status === 'warning').length;
    const overallScore = Math.round(Object.values(systemStatus).reduce((sum, d) => sum + d.score, 0) / Object.keys(systemStatus).length);

    const getStatusColor = (status: Status) => {
        if (status === 'risk') return 'text-red-400';
        if (status === 'warning') return 'text-orange-400';
        return 'text-green-400';
    };

    const getStatusBg = (status: Status) => {
        if (status === 'risk') return 'bg-red-500/20 border-red-500/50';
        if (status === 'warning') return 'bg-orange-500/20 border-orange-500/50';
        return 'bg-green-500/10 border-green-500/30';
    };

    const getScoreBarColor = (score: number) => {
        if (score >= 70) return 'bg-red-500 shadow-[0_0_8px_#ef4444]';
        if (score >= 35) return 'bg-orange-500 shadow-[0_0_6px_#f97316]';
        return 'bg-green-500/60';
    };

    // ─── RENDER ──────────────────────────────────────────────────
    return (
        <div ref={containerRef} className={`relative bg-gray-950 overflow-hidden border-2 border-cyan-500/60 shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col md:flex-row transition-all duration-300 ${isFullscreen ? 'w-full h-full rounded-none border-0' : 'h-[700px] w-full rounded-xl'}`}>

            {/* ═══ LEFT: 3D Viewer ═══ */}
            <div className={`relative flex-1 h-full min-h-[400px] bg-black ${!isPanelOpen ? 'md:w-full' : ''}`}>

                {/* Top Bar */}
                <div className="absolute top-3 left-3 right-3 z-20 flex justify-between items-start pointer-events-none">
                    <div className="pointer-events-auto bg-black/80 backdrop-blur-sm border border-cyan-500/60 px-3 py-1.5 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                        <h3 className="text-cyan-400 font-mono text-[10px] font-bold uppercase tracking-widest">
                            Neural Body Scanner
                        </h3>
                    </div>

                    {/* Risk Summary Badge */}
                    {(riskCount > 0 || warningCount > 0) && (
                        <div className="pointer-events-auto bg-black/90 backdrop-blur-sm border border-red-500/50 px-3 py-1.5 rounded-lg animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={12} className="text-red-400" />
                                <span className="text-red-300 font-mono text-[10px] font-bold uppercase">
                                    {riskCount > 0 ? `${riskCount} Critical` : ''}{riskCount > 0 && warningCount > 0 ? ' · ' : ''}{warningCount > 0 ? `${warningCount} Warning` : ''}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Control Buttons */}
                <div className="absolute top-3 right-3 z-30 flex gap-1.5">
                    <button onClick={toggleFullscreen} className="bg-black/60 hover:bg-cyan-900/40 border border-cyan-500/30 text-cyan-400 p-1.5 rounded-lg transition-all hover:shadow-[0_0_10px_rgba(6,182,212,0.3)]" title="Toggle Fullscreen">
                        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                    <button onClick={() => setIsPanelOpen(!isPanelOpen)} className="bg-black/60 hover:bg-cyan-900/40 border border-cyan-500/30 text-cyan-400 p-1.5 rounded-lg transition-all" title="Toggle Panel">
                        <ChevronRight size={14} className={`transition-transform ${isPanelOpen ? 'rotate-0' : 'rotate-180'}`} />
                    </button>
                </div>

                {/* Layer Peel Controls */}
                <div className="absolute bottom-3 left-3 z-20 flex flex-col gap-1.5">
                    <button
                        onClick={peelLayer}
                        disabled={currentLayerIndex >= LAYER_ORDER.length}
                        className="group flex items-center gap-2 bg-black/80 backdrop-blur-sm border border-cyan-500/40 hover:border-cyan-400 px-3 py-2 rounded-lg transition-all hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Layers size={14} className="text-cyan-400" />
                        <span className="text-cyan-300 font-mono text-[10px] font-bold uppercase">
                            {currentLayerIndex >= LAYER_ORDER.length ? 'All Layers Peeled' : `Peel: ${LAYER_ORDER[currentLayerIndex]?.label}`}
                        </span>
                    </button>

                    {currentLayerIndex > 0 && (
                        <button onClick={restoreAllLayers} className="flex items-center gap-2 bg-black/80 backdrop-blur-sm border border-gray-600/40 hover:border-gray-400 px-3 py-1.5 rounded-lg transition-all">
                            <RotateCcw size={12} className="text-gray-400" />
                            <span className="text-gray-400 font-mono text-[9px] uppercase">Restore Layers</span>
                        </button>
                    )}

                    {/* Layer Dots */}
                    <div className="flex gap-1 pl-1">
                        {LAYER_ORDER.map((layer, i) => (
                            <div key={layer.id} className="flex items-center gap-1" title={layer.label}>
                                <div className={`w-2 h-2 rounded-full transition-all ${hiddenLayers.has(layer.id) ? 'bg-gray-600 scale-75' : 'bg-cyan-400 shadow-[0_0_4px_#06b6d4]'}`} />
                                <span className={`text-[8px] font-mono ${hiddenLayers.has(layer.id) ? 'text-gray-600 line-through' : 'text-cyan-500'}`}>{layer.icon}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Reset Button */}
                <div className="absolute bottom-3 right-3 z-20">
                    <button onClick={resetView} className="bg-black/60 hover:bg-cyan-900/40 border border-cyan-500/30 text-cyan-400 p-1.5 rounded-lg transition-all" title="Reset View">
                        <RotateCcw size={14} />
                    </button>
                </div>

                {/* Iframe */}
                <div className="w-full h-full">
                    <iframe
                        ref={iframeRef}
                        id="sketchfab-iframe"
                        title="Digital Body Scanner"
                        allow="autoplay; fullscreen; xr-spatial-tracking"
                        className="w-full h-full border-0"
                    />
                </div>

                {/* Loading Overlay */}
                {!isReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-10">
                        <div className="text-center">
                            {error ? (
                                <>
                                    <div className="text-red-500 font-mono text-sm mb-2">⚠ Neural Link Error</div>
                                    <div className="text-gray-400 font-mono text-xs">{error}</div>
                                    <div className="mt-4 text-[10px] text-gray-500 max-w-[200px] mx-auto">Please check your internet connection or disable ad-blockers for Sketchfab.</div>
                                </>
                            ) : (
                                <>
                                    <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-3" />
                                    <div className="text-cyan-500 font-mono text-xs animate-pulse">Initializing Neural Link...</div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ═══ RIGHT: Analysis Panel ═══ */}
            <div className={`bg-gray-950 border-l border-cyan-500/20 overflow-hidden transition-all duration-300 flex flex-col ${isPanelOpen ? 'w-full md:w-96 opacity-100' : 'w-0 opacity-0 p-0 border-0'}`}>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4">

                    {/* Overall Risk Header */}
                    <div className="mb-4 p-3 bg-gradient-to-r from-gray-900/80 to-gray-800/40 rounded-lg border border-cyan-500/20">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Activity size={14} className="text-cyan-400" />
                                <span className="text-cyan-400 font-mono text-[10px] font-bold uppercase tracking-widest">Risk Assessment</span>
                            </div>
                            <div className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${overallScore >= 50 ? 'bg-red-500/20 text-red-400' : overallScore >= 25 ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'}`}>
                                {overallScore}% AVG
                            </div>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-1000 ${getScoreBarColor(overallScore)}`} style={{ width: `${overallScore}%` }} />
                        </div>
                    </div>

                    {selectedMuscle ? (
                        /* ─── Selected Organ Detail with AI Analysis ─── */
                        <div className="animate-fade-in-up space-y-3">
                            <div className="flex justify-between items-start">
                                <h2 className="text-lg font-black font-mono text-white uppercase tracking-tight">{selectedMuscle.displayName}</h2>
                                <button onClick={() => setSelectedMuscle(null)} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
                            </div>

                            {(() => {
                                const organEntry = Object.entries(systemStatus).find(([_, d]) => d.muscleId === selectedMuscle.id);
                                if (!organEntry) return <div className="text-gray-500 text-xs font-mono">No data available</div>;
                                const [, data] = organEntry;
                                return (
                                    <div className="relative">
                                        {/* AI Loading State Overlay */}
                                        {isAnalyzing && (
                                            <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-lg border border-cyan-500/30 overflow-hidden">
                                                <div className="absolute inset-0 bg-cyan-500/10 animate-pulse"></div>
                                                <Sparkles className="text-cyan-400 w-8 h-8 mb-3 animate-[spin_3s_linear_infinite]" />
                                                <h3 className="text-cyan-400 font-mono text-xs font-bold uppercase tracking-widest mb-1 shadow-cyan-500/50 drop-shadow-md">Generating AI Insights</h3>
                                                <p className="text-gray-400 font-mono text-[9px]">Deep analyzing {selectedMuscle.displayName}...</p>
                                            </div>
                                        )}

                                        {/* Risk Score Card */}
                                        <div className={`p-3 rounded-lg border ${getStatusBg(data.status)}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`text-xs font-bold uppercase ${getStatusColor(data.status)}`}>
                                                    {data.status === 'risk' ? '⚠ CRITICAL RISK' : data.status === 'warning' ? '⚡ ELEVATED RISK' : '✓ WITHIN NORMAL'}
                                                </span>
                                                <span className={`text-2xl font-black font-mono ${getStatusColor(data.status)}`}>{data.score}%</span>
                                            </div>
                                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
                                                <div className={`h-full rounded-full transition-all duration-1000 ${getScoreBarColor(data.score)}`} style={{ width: `${data.score}%` }} />
                                            </div>
                                            <div className="text-gray-400 text-[11px] font-mono">{data.details}</div>
                                        </div>

                                        {/* AI Insights */}
                                        {data.aiInsights && data.aiInsights.length > 0 && (
                                            <div className="p-3 bg-gradient-to-br from-blue-950/40 to-cyan-950/30 border border-cyan-500/20 rounded-lg">
                                                <div className="flex items-center gap-1.5 mb-2">
                                                    <span className="text-cyan-400 text-sm">🧠</span>
                                                    <span className="text-cyan-400 font-mono text-[10px] font-bold uppercase tracking-wider">AI Analysis</span>
                                                </div>
                                                <ul className="space-y-1.5">
                                                    {data.aiInsights.map((insight, i) => (
                                                        <li key={i} className="flex items-start gap-2 text-[11px] text-gray-300">
                                                            <span className="text-cyan-500 mt-0.5 text-[8px]">●</span>
                                                            <span>{insight}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Biomarkers Table */}
                                        {data.markers && data.markers.length > 0 && (
                                            <div className="p-3 bg-gray-900/80 border border-gray-700/50 rounded-lg">
                                                <div className="flex items-center gap-1.5 mb-2">
                                                    <span className="text-purple-400 text-sm">🔬</span>
                                                    <span className="text-purple-400 font-mono text-[10px] font-bold uppercase tracking-wider">Biomarkers</span>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {data.markers.map((marker, i) => (
                                                        <div key={i} className="flex items-center justify-between py-1 border-b border-gray-800/50 last:border-0">
                                                            <span className="text-gray-400 text-[11px] font-mono">{marker.name}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-[11px] font-mono font-bold ${marker.status === 'risk' ? 'text-red-400' : marker.status === 'warning' ? 'text-orange-400' : 'text-green-400'}`}>
                                                                    {marker.value}
                                                                </span>
                                                                <div className={`w-1.5 h-1.5 rounded-full ${marker.status === 'risk' ? 'bg-red-400 shadow-[0_0_4px_#f87171]' : marker.status === 'warning' ? 'bg-orange-400 shadow-[0_0_4px_#fb923c]' : 'bg-green-400 shadow-[0_0_4px_#4ade80]'}`} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {data.normalRange && (
                                                    <div className="mt-2 text-[9px] text-gray-600 font-mono">Reference: {data.normalRange}</div>
                                                )}
                                            </div>
                                        )}

                                        {/* Recommendations */}
                                        {data.recommendations && data.recommendations.length > 0 && (
                                            <div className={`p-3 rounded-lg border ${data.status === 'risk' ? 'bg-red-950/30 border-red-500/30' : data.status === 'warning' ? 'bg-orange-950/20 border-orange-500/20' : 'bg-green-950/20 border-green-500/20'}`}>
                                                <div className="flex items-center gap-1.5 mb-2">
                                                    <span className="text-sm">{data.status === 'risk' ? '🚨' : '💡'}</span>
                                                    <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${data.status === 'risk' ? 'text-red-400' : data.status === 'warning' ? 'text-orange-400' : 'text-green-400'}`}>
                                                        {data.status === 'risk' ? 'Urgent Actions' : 'Recommendations'}
                                                    </span>
                                                </div>
                                                <ul className="space-y-1.5">
                                                    {data.recommendations.map((rec, i) => (
                                                        <li key={i} className={`flex items-start gap-2 text-[11px] ${data.status === 'risk' ? 'text-red-300' : 'text-gray-300'}`}>
                                                            <span className={`mt-0.5 text-[8px] ${data.status === 'risk' ? 'text-red-500' : 'text-gray-500'}`}>▸</span>
                                                            <span>{rec}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        <div className="text-[9px] text-gray-600 font-mono pt-1 border-t border-gray-800">
                                            {data.fromAI ? '✨ AI Enhanced Deep Analysis' : '3D Node System Status'} · {ANATOMY_MAPPING[selectedMuscle.id] || 'N/A'}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    ) : (
                        /* ─── System Overview ─── */
                        <div className="space-y-3">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Shield size={14} className="text-cyan-400" />
                                    <span className="text-cyan-400 font-mono text-[10px] font-bold uppercase tracking-widest">System Overview</span>
                                </div>
                                <span className="text-gray-600 font-mono text-[9px] animate-pulse">● LIVE</span>
                            </div>

                            {Object.entries(systemStatus).map(([organ, data]) => (
                                <div
                                    key={organ}
                                    onClick={() => handleSystemClick(organ)}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${getStatusBg(data.status)} ${data.status === 'risk' ? 'animate-pulse' : ''}`}
                                >
                                    <div className="flex justify-between items-center mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${data.status === 'safe' ? 'bg-green-400 shadow-[0_0_4px_#4ade80]' : data.status === 'warning' ? 'bg-orange-400 shadow-[0_0_6px_#fb923c]' : 'bg-red-400 shadow-[0_0_8px_#f87171] animate-ping'}`} />
                                            <span className="text-sm font-bold text-white">{organ}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-mono font-bold ${getStatusColor(data.status)}`}>{data.score}%</span>
                                            {data.status === 'risk' && <AlertTriangle size={12} className="text-red-400" />}
                                        </div>
                                    </div>

                                    {/* Risk Bar */}
                                    <div className="h-1 bg-gray-800 rounded-full overflow-hidden mb-1">
                                        <div className={`h-full rounded-full transition-all duration-1000 ${getScoreBarColor(data.score)}`} style={{ width: `${data.score}%` }} />
                                    </div>

                                    <div className="text-[10px] text-gray-500 font-mono truncate">{data.details}</div>
                                </div>
                            ))}

                            <div className="text-[9px] text-gray-600 text-center font-mono mt-3 border-t border-gray-800 pt-3">
                                Click organ → 3D highlight · Peel layers to see internal risks
                            </div>
                        </div>
                    )}

                    {/* Debug section (collapsed by default) */}
                    <details className="mt-6 text-xs text-gray-600 cursor-pointer">
                        <summary className="hover:text-cyan-400 text-[9px] uppercase font-mono">Debug: 3D Nodes & Analysis</summary>
                        <div className="mt-2 space-y-2">
                            <div className="p-2 bg-gray-900 rounded text-[9px]">
                                <strong className="text-cyan-400">Analysis Data:</strong>
                                <pre className="text-gray-500 mt-1 whitespace-pre-wrap max-h-24 overflow-y-auto">
                                    {analysisData ? JSON.stringify(analysisData, null, 2) : "No data"}
                                </pre>
                            </div>
                            <div className="max-h-32 overflow-y-auto space-y-0.5">
                                {Object.values(nodes).slice(0, 50).map((node) => (
                                    <div key={node.instanceID} className="flex gap-1 text-[8px]">
                                        <span className="text-cyan-700">[{node.instanceID}]</span>
                                        <span className="text-gray-500">{node.name}</span>
                                        <span className="text-gray-700">({node.type})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </details>
                </div>
            </div>
        </div>
    );
}

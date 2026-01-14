/**
 * Layer Import Service
 *
 * Handles selective importing of layers and features from library layouts
 * into the current keyboard configuration.
 */

import type { KeyboardInfo, MacroEntry, ComboEntry, TapdanceEntry } from '@/types/vial.types';
import type { ViableFileContent, LayerExport } from '@/types/layout-library';

/**
 * Options for importing a full layout
 */
export interface FullImportOptions {
    includeMacros: boolean;
    includeCombos: boolean;
    includeTapdances: boolean;
}

/**
 * Options for importing specific layers
 */
export interface LayerImportOptions {
    /** Source layout content */
    source: ViableFileContent;
    /** Target keyboard info (will be mutated) */
    target: KeyboardInfo;
    /** Mapping of source layer index to target layer index */
    layerMapping: Map<number, number>;
    /** Whether to include macros from source */
    includeMacros: boolean;
    /** Whether to include combos from source */
    includeCombos: boolean;
    /** Whether to include tap dances from source */
    includeTapdances: boolean;
}

/**
 * Result of a layer import operation
 */
export interface ImportResult {
    success: boolean;
    layersImported: number;
    macrosImported: number;
    combosImported: number;
    tapdancesImported: number;
    warnings: string[];
}

class LayerImportService {
    /**
     * Import entire layout, replacing the current keymap
     */
    importFullLayout(
        source: ViableFileContent,
        target: KeyboardInfo,
        options: FullImportOptions
    ): ImportResult {
        const result: ImportResult = {
            success: false,
            layersImported: 0,
            macrosImported: 0,
            combosImported: 0,
            tapdancesImported: 0,
            warnings: [],
        };

        // Validate compatibility
        const sourceKeyCount = source.keymap?.[0]?.length ?? 0;
        const targetKeyCount = target.keymap?.[0]?.length ?? 0;

        if (sourceKeyCount !== targetKeyCount) {
            result.warnings.push(
                `Key count mismatch: source has ${sourceKeyCount} keys, target has ${targetKeyCount}. ` +
                `Import may produce unexpected results.`
            );
        }

        // Import keymap layers
        if (source.keymap) {
            const maxLayers = Math.min(
                source.keymap.length,
                target.layers ?? source.keymap.length
            );

            // Create a new keymap array
            const newKeymap: number[][] = [];
            for (let i = 0; i < maxLayers; i++) {
                const sourceLayer = source.keymap[i];
                if (sourceLayer) {
                    // Copy layer, handling potential key count differences
                    const newLayer = this.copyLayerWithResize(
                        sourceLayer,
                        targetKeyCount
                    );
                    newKeymap.push(newLayer);
                    result.layersImported++;
                }
            }

            // Preserve any remaining layers from target (if target has more layers)
            if (target.keymap && target.keymap.length > maxLayers) {
                for (let i = maxLayers; i < target.keymap.length; i++) {
                    newKeymap.push([...target.keymap[i]]);
                }
            }

            target.keymap = newKeymap;
        }

        // Import macros
        if (options.includeMacros && source.macros && source.macros.length > 0) {
            result.macrosImported = this.mergeMacros(source.macros, target);
        }

        // Import combos
        if (options.includeCombos && source.combos && source.combos.length > 0) {
            result.combosImported = this.mergeCombos(source.combos, target);
        }

        // Import tap dances
        if (options.includeTapdances && source.tapdances && source.tapdances.length > 0) {
            result.tapdancesImported = this.mergeTapdances(source.tapdances, target);
        }

        // Import cosmetic data
        if (source.cosmetic) {
            target.cosmetic = {
                ...target.cosmetic,
                ...source.cosmetic,
            };
        }

        result.success = true;
        return result;
    }

    /**
     * Import specific layers from source to target
     */
    importLayers(options: LayerImportOptions): ImportResult {
        const { source, target, layerMapping, includeMacros, includeCombos, includeTapdances } = options;

        const result: ImportResult = {
            success: false,
            layersImported: 0,
            macrosImported: 0,
            combosImported: 0,
            tapdancesImported: 0,
            warnings: [],
        };

        // Validate
        if (!source.keymap || !target.keymap) {
            result.warnings.push('Source or target keymap is missing');
            return result;
        }

        const targetKeyCount = target.keymap[0]?.length ?? 0;

        // Import each mapped layer
        for (const [sourceLayerIdx, targetLayerIdx] of layerMapping) {
            if (sourceLayerIdx < 0 || sourceLayerIdx >= source.keymap.length) {
                result.warnings.push(`Source layer ${sourceLayerIdx} out of bounds`);
                continue;
            }

            if (targetLayerIdx < 0 || targetLayerIdx >= target.keymap.length) {
                result.warnings.push(`Target layer ${targetLayerIdx} out of bounds`);
                continue;
            }

            const sourceLayer = source.keymap[sourceLayerIdx];
            target.keymap[targetLayerIdx] = this.copyLayerWithResize(
                sourceLayer,
                targetKeyCount
            );
            result.layersImported++;
        }

        // Import features if requested
        if (includeMacros && source.macros && source.macros.length > 0) {
            result.macrosImported = this.mergeMacros(source.macros, target);
        }

        if (includeCombos && source.combos && source.combos.length > 0) {
            result.combosImported = this.mergeCombos(source.combos, target);
        }

        if (includeTapdances && source.tapdances && source.tapdances.length > 0) {
            result.tapdancesImported = this.mergeTapdances(source.tapdances, target);
        }

        // Update cosmetic layer names for imported layers
        if (source.cosmetic?.layer) {
            if (!target.cosmetic) {
                target.cosmetic = {};
            }
            if (!target.cosmetic.layer) {
                target.cosmetic.layer = {};
            }

            for (const [sourceLayerIdx, targetLayerIdx] of layerMapping) {
                const sourceName = source.cosmetic.layer[sourceLayerIdx.toString()];
                if (sourceName) {
                    target.cosmetic.layer[targetLayerIdx.toString()] = sourceName;
                }
            }
        }

        result.success = true;
        return result;
    }

    /**
     * Export a single layer from a keymap
     */
    exportLayer(
        source: KeyboardInfo,
        layerIndex: number
    ): LayerExport | null {
        if (!source.keymap || layerIndex < 0 || layerIndex >= source.keymap.length) {
            return null;
        }

        const layerName = source.cosmetic?.layer?.[layerIndex.toString()] ?? `Layer ${layerIndex}`;

        return {
            sourceLayoutId: source.kbid ?? 'unknown',
            sourceLayoutName: source.name ?? source.cosmetic?.name ?? 'Unknown Layout',
            layerIndex,
            layerName,
            keymap: [...source.keymap[layerIndex]],
        };
    }

    /**
     * Copy a layer, resizing if necessary to match target key count
     */
    private copyLayerWithResize(sourceLayer: number[], targetKeyCount: number): number[] {
        const newLayer: number[] = new Array(targetKeyCount);

        for (let i = 0; i < targetKeyCount; i++) {
            if (i < sourceLayer.length) {
                newLayer[i] = sourceLayer[i];
            } else {
                // Fill with KC_NO (0) for extra keys
                newLayer[i] = 0;
            }
        }

        return newLayer;
    }

    /**
     * Merge macros from source into target
     * Returns number of macros merged
     */
    private mergeMacros(sourceMacros: MacroEntry[], target: KeyboardInfo): number {
        if (!target.macros) {
            target.macros = [];
        }

        const maxMacros = target.macro_count ?? 16; // Default max
        let imported = 0;

        for (const sourceMacro of sourceMacros) {
            // Find first empty slot or add to end
            let targetSlot = target.macros.findIndex(m => !m.actions || m.actions.length === 0);

            if (targetSlot === -1 && target.macros.length < maxMacros) {
                targetSlot = target.macros.length;
            }

            if (targetSlot >= 0 && targetSlot < maxMacros) {
                target.macros[targetSlot] = {
                    mid: targetSlot,
                    actions: [...sourceMacro.actions],
                };
                imported++;
            }
        }

        return imported;
    }

    /**
     * Merge combos from source into target
     * Returns number of combos merged
     */
    private mergeCombos(sourceCombos: ComboEntry[], target: KeyboardInfo): number {
        if (!target.combos) {
            target.combos = [];
        }

        const maxCombos = target.combo_count ?? 32; // Default max
        let imported = 0;

        for (const sourceCombo of sourceCombos) {
            // Find first empty slot or add to end
            let targetSlot = target.combos.findIndex(c => !c.keys || c.keys.length === 0);

            if (targetSlot === -1 && target.combos.length < maxCombos) {
                targetSlot = target.combos.length;
            }

            if (targetSlot >= 0 && targetSlot < maxCombos) {
                target.combos[targetSlot] = {
                    cmbid: targetSlot,
                    keys: [...sourceCombo.keys],
                    output: sourceCombo.output,
                };
                imported++;
            }
        }

        return imported;
    }

    /**
     * Merge tap dances from source into target
     * Returns number of tap dances merged
     */
    private mergeTapdances(sourceTapdances: TapdanceEntry[], target: KeyboardInfo): number {
        if (!target.tapdances) {
            target.tapdances = [];
        }

        const maxTapdances = target.tapdance_count ?? 16; // Default max
        let imported = 0;

        for (const sourceTd of sourceTapdances) {
            // Find first empty slot or add to end
            let targetSlot = target.tapdances.findIndex(td =>
                (!td.tap || td.tap === 'KC_NO') &&
                (!td.hold || td.hold === 'KC_NO') &&
                (!td.doubletap || td.doubletap === 'KC_NO') &&
                (!td.taphold || td.taphold === 'KC_NO')
            );

            if (targetSlot === -1 && target.tapdances.length < maxTapdances) {
                targetSlot = target.tapdances.length;
            }

            if (targetSlot >= 0 && targetSlot < maxTapdances) {
                target.tapdances[targetSlot] = {
                    idx: targetSlot,
                    tap: sourceTd.tap,
                    hold: sourceTd.hold,
                    doubletap: sourceTd.doubletap,
                    taphold: sourceTd.taphold,
                    tapping_term: sourceTd.tapping_term,
                    enabled: sourceTd.enabled,
                };
                imported++;
            }
        }

        return imported;
    }

    /**
     * Check if two layouts are compatible for importing
     */
    checkCompatibility(
        source: ViableFileContent,
        target: KeyboardInfo
    ): { compatible: boolean; warnings: string[] } {
        const warnings: string[] = [];

        const sourceKeyCount = source.keymap?.[0]?.length ?? 0;
        const targetKeyCount = target.keymap?.[0]?.length ?? 0;

        if (sourceKeyCount !== targetKeyCount) {
            warnings.push(
                `Key count differs: source has ${sourceKeyCount}, target has ${targetKeyCount}`
            );
        }

        const sourceLayerCount = source.keymap?.length ?? 0;
        const targetLayerCount = target.layers ?? target.keymap?.length ?? 0;

        if (sourceLayerCount > targetLayerCount) {
            warnings.push(
                `Source has more layers (${sourceLayerCount}) than target supports (${targetLayerCount})`
            );
        }

        return {
            compatible: warnings.length === 0,
            warnings,
        };
    }
}

export const layerImportService = new LayerImportService();

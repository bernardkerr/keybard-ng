import { describe, it, expect } from 'vitest';
import { fileService } from '../../src/services/file.service';
import { keyService } from '../../src/services/key.service';
import type { KeyboardInfo } from '../../src/types/vial.types';
import { createTestKeyboardInfo } from '../fixtures/keyboard-info.fixture';
import { createTestFragments, createFragmentState, FRAGMENT_NAMES, FRAGMENT_IDS } from '../fixtures/fragments.fixture';
import { generateComplexKeymap } from '../utils/keymap-helpers';

// Helper to create kbinfo with numeric hex kbid for export testing
const createExportableKeyboardInfo = (overrides?: Partial<KeyboardInfo>): KeyboardInfo => {
    return createTestKeyboardInfo({
        kbid: '1234567890ABCDEF', // Valid hex for BigInt conversion
        ...overrides,
    });
};

// Helper function to create mock files
const createMockFile = (content: string, filename = 'test.kbi'): File => {
  const blob = new Blob([content], { type: 'application/json' });
  return new File([blob], filename, { type: 'application/json' });
};

// Helper to create a large file
const createLargeFile = (): File => {
  const largeContent = 'x'.repeat(1048577); // 1MB + 1 byte
  const blob = new Blob([largeContent], { type: 'application/json' });
  return new File([blob], 'large.kbi', { type: 'application/json' });
};

describe('FileService', () => {
  describe('loadFile', () => {
    it('successfully loads valid .kbi file with all required fields', async () => {
      const validData: KeyboardInfo = {
        rows: 6,
        cols: 14,
        layers: 4,
        kbid: 'test-keyboard',
      };

      const file = createMockFile(JSON.stringify(validData));
      const result = await fileService.loadFile(file);

      expect(result).toEqual(validData);
      expect(result.rows).toBe(6);
      expect(result.cols).toBe(14);
    });

    it('successfully parses .kbi file with kbid field', async () => {
      const minimalData: KeyboardInfo = {
        kbid: 'test-kb',
        rows: 5,
        cols: 12,
      };

      const file = createMockFile(JSON.stringify(minimalData));
      const result = await fileService.loadFile(file);

      expect(result.kbid).toBe('test-kb');
      expect(result.rows).toBe(5);
      expect(result.cols).toBe(12);
    });

    it('successfully parses .kbi file with optional fields', async () => {
      const dataWithOptionals: KeyboardInfo = {
        kbid: 'test-kb-optional',
        rows: 6,
        cols: 14,
        layers: 8,
        keymap: [[1, 2, 3], [4, 5, 6]],
        via_proto: 9,
        vial_proto: 6,
      };

      const file = createMockFile(JSON.stringify(dataWithOptionals));
      const result = await fileService.loadFile(file);

      expect(result.kbid).toBe('test-kb-optional');
      expect(result.layers).toBe(8);
      expect(result.keymap).toEqual([[1, 2, 3], [4, 5, 6]]);
    });

    it('throws "File too large" error for files > 1MB', async () => {
      const largeFile = createLargeFile();

      await expect(fileService.loadFile(largeFile)).rejects.toThrow('File too large');
    });

    it('throws error for malformed JSON', async () => {
      const invalidJson = '{ invalid json content }';
      const file = createMockFile(invalidJson);

      // JSON.parse throws SyntaxError for malformed JSON
      await expect(fileService.loadFile(file)).rejects.toThrow();
    });

    it('throws "Unknown json type" when file has no kbid or uid', async () => {
      // parseContent requires kbid (for .kbi) or uid (for .vil/.viable) to detect format
      const missingIdentifier = { rows: 6, cols: 14, layers: 4 };
      const file = createMockFile(JSON.stringify(missingIdentifier));

      await expect(fileService.loadFile(file)).rejects.toThrow('Unknown json type');
    });

    it('throws error for non-object JSON (array)', async () => {
      const arrayData = '[1, 2, 3]';
      const file = createMockFile(arrayData);

      // Arrays don't have kbid or uid properties
      await expect(fileService.loadFile(file)).rejects.toThrow('Unknown json type');
    });

    it('throws error for null JSON', async () => {
      const nullData = 'null';
      const file = createMockFile(nullData);

      // null.kbid throws TypeError
      await expect(fileService.loadFile(file)).rejects.toThrow();
    });

    it('converts string keycodes to numbers in keymap', async () => {
      const dataWithStringKeycodes: KeyboardInfo = {
        kbid: 'test-kb-keycodes',
        rows: 6,
        cols: 14,
        layers: 2,
        keymap: [
          ['KC_A', 'KC_B', 'KC_C'] as unknown as number[],
          ['KC_LCTRL', 'KC_LSHIFT', 'KC_ENTER'] as unknown as number[],
        ],
      };

      const file = createMockFile(JSON.stringify(dataWithStringKeycodes));
      const result = await fileService.loadFile(file);

      // Verify keymap was converted to numbers
      expect(result.keymap).toBeDefined();
      expect(result.keymap?.[0]).toBeDefined();
      expect(result.keymap?.[0][0]).toBeTypeOf('number');
      expect(result.keymap?.[0][1]).toBeTypeOf('number');
      expect(result.keymap?.[1][0]).toBeTypeOf('number');

      // KC_A should be 0x0004
      expect(result.keymap?.[0][0]).toBe(0x0004);
    });

    it('keeps numeric keycodes unchanged', async () => {
      const dataWithNumericKeycodes: KeyboardInfo = {
        kbid: 'test-kb-numeric',
        rows: 6,
        cols: 14,
        keymap: [
          [0x0004, 0x0005, 0x0006], // KC_A, KC_B, KC_C
        ],
      };

      const file = createMockFile(JSON.stringify(dataWithNumericKeycodes));
      const result = await fileService.loadFile(file);

      expect(result.keymap?.[0][0]).toBe(0x0004);
      expect(result.keymap?.[0][1]).toBe(0x0005);
      expect(result.keymap?.[0][2]).toBe(0x0006);
    });
  });

  describe('kbinfoToViable', () => {
    it('exports keymap as layout[layer][row][col] format', () => {
      const rows = 3;
      const cols = 4;
      const layers = 2;

      const kbinfo = createExportableKeyboardInfo({
        rows,
        cols,
        layers,
        keymap: [
          [0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F],
          [0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B],
        ],
      });

      const viableJson = (fileService as any).kbinfoToViable(kbinfo, true);
      const viable = JSON.parse(viableJson);

      expect(viable.layout).toBeDefined();
      expect(viable.layout.length).toBe(layers);
      expect(viable.layout[0].length).toBe(rows);
      expect(viable.layout[0][0].length).toBe(cols);
    });

    it('converts numeric keycodes to strings', () => {
      const kbinfo = createExportableKeyboardInfo({
        rows: 2,
        cols: 2,
        layers: 1,
        keymap: [[0x04, 0x05, 0x06, 0x07]], // KC_A, KC_B, KC_C, KC_D
      });

      const viableJson = (fileService as any).kbinfoToViable(kbinfo, true);
      const viable = JSON.parse(viableJson);

      // All values should be strings
      expect(typeof viable.layout[0][0][0]).toBe('string');
      expect(viable.layout[0][0][0]).toBe('KC_A');
    });

    it('preserves fragment selections in export', () => {
      const kbinfo = createExportableKeyboardInfo({
        rows: 4,
        cols: 4,
        layers: 1,
        keymap: [Array(16).fill(0x04)],
      });

      // Add fragments
      kbinfo.fragments = createTestFragments();
      kbinfo.composition = {
        instances: [
          {
            id: 'test_instance',
            fragment_options: [
              { fragment: FRAGMENT_NAMES.FINGER_5KEY, placement: { x: 0, y: 0 }, matrix_map: [[0, 0]], default: true },
              { fragment: FRAGMENT_NAMES.FINGER_6KEY, placement: { x: 0, y: 0 }, matrix_map: [[0, 0]] },
            ],
          },
        ],
      };
      kbinfo.fragmentState = createFragmentState({
        userSelections: [['test_instance', FRAGMENT_NAMES.FINGER_6KEY]],
      });

      const viableJson = (fileService as any).kbinfoToViable(kbinfo, true);
      const viable = JSON.parse(viableJson);

      expect(viable.fragment_selections).toBeDefined();
      expect(viable.fragment_selections['test_instance']).toBe(FRAGMENT_NAMES.FINGER_6KEY);
    });

    it('exports UID as unquoted large integer in JSON', () => {
      const kbinfo = createTestKeyboardInfo({
        rows: 2,
        cols: 2,
        layers: 1,
        keymap: [Array(4).fill(0x04)],
        kbid: 'FFFFFFFFFFFFFFFF', // Max 64-bit hex value
      });

      const viableJson = (fileService as any).kbinfoToViable(kbinfo, true);

      // UID should be an unquoted number (BigInt serialized as numeric literal)
      expect(viableJson).toContain('"uid":');
      // The BigInt value 0xFFFFFFFFFFFFFFFF = 18446744073709551615
      // Should be present as a numeric literal (not quoted string)
      expect(viableJson).toContain('18446744073709551615');
      // Verify it's not a quoted string
      expect(viableJson).not.toContain('"18446744073709551615"');
    });

    it('excludes macros when includeMacros=false', () => {
      const kbinfo = createExportableKeyboardInfo({
        rows: 2,
        cols: 2,
        layers: 1,
        keymap: [Array(4).fill(0x04)],
        macro_count: 5,
        macros: [
          { mid: 0, actions: [['text', 'hello']] },
          { mid: 1, actions: [['text', 'world']] },
        ] as any,
      });

      const viableJson = (fileService as any).kbinfoToViable(kbinfo, false);
      const viable = JSON.parse(viableJson);

      // Macros should be empty arrays
      expect(viable.macro.every((m: any[]) => m.length === 0)).toBe(true);
    });

    it('sanitizes non-ASCII in macro text', () => {
      const kbinfo = createExportableKeyboardInfo({
        rows: 2,
        cols: 2,
        layers: 1,
        keymap: [Array(4).fill(0x04)],
        macros: [
          { mid: 0, actions: [['text', 'hello\u00A0world\u2019s']] }, // Non-breaking space and smart quote
        ] as any,
      });

      const viableJson = (fileService as any).kbinfoToViable(kbinfo, true);
      const viable = JSON.parse(viableJson);

      // Non-ASCII should be removed
      const macroText = viable.macro[0]?.[0]?.[1];
      expect(macroText).toBe('helloworlds'); // Non-ASCII removed
    });

    it('exports fragment definitions and composition', () => {
      const kbinfo = createExportableKeyboardInfo({
        rows: 4,
        cols: 4,
        layers: 1,
        keymap: [Array(16).fill(0x04)],
      });

      kbinfo.fragments = createTestFragments();
      kbinfo.composition = {
        instances: [
          { id: 'test', fragment: FRAGMENT_NAMES.FINGER_5KEY, placement: { x: 0, y: 0 }, matrix_map: [[0, 0]] },
        ],
      };

      const viableJson = (fileService as any).kbinfoToViable(kbinfo, true);
      const viable = JSON.parse(viableJson);

      expect(viable.fragments).toBeDefined();
      expect(Object.keys(viable.fragments).length).toBe(Object.keys(kbinfo.fragments).length);
      expect(viable.composition).toBeDefined();
      expect(viable.composition.instances.length).toBe(1);
    });
  });

  describe('viableToKBINFO', () => {
    it('imports layout[l][r][c] to flat keymap[l][r*cols+c]', () => {
      const viable = {
        version: 1,
        uid: 12345,
        layout: [
          [
            ['KC_A', 'KC_B', 'KC_C', 'KC_D'],
            ['KC_E', 'KC_F', 'KC_G', 'KC_H'],
          ],
        ],
        macro: [],
        tap_dance: [],
        combo: [],
        key_override: [],
      };

      const kbinfo = (fileService as any).viableToKBINFO(viable);

      expect(kbinfo.keymap.length).toBe(1); // 1 layer
      expect(kbinfo.keymap[0].length).toBe(8); // 2 rows * 4 cols
      expect(kbinfo.rows).toBe(2);
      expect(kbinfo.cols).toBe(4);
    });

    it('parses string keycodes to numeric', () => {
      const viable = {
        version: 1,
        uid: 12345,
        layout: [[['KC_A', 'KC_B']]],
        macro: [],
        tap_dance: [],
        combo: [],
        key_override: [],
      };

      const kbinfo = (fileService as any).viableToKBINFO(viable);

      expect(kbinfo.keymap[0][0]).toBe(0x04); // KC_A
      expect(kbinfo.keymap[0][1]).toBe(0x05); // KC_B
    });

    it('handles -1 as KC_NO', () => {
      const viable = {
        version: 1,
        uid: 12345,
        layout: [[[-1, 'KC_A', -1]]],
        macro: [],
        tap_dance: [],
        combo: [],
        key_override: [],
      };

      const kbinfo = (fileService as any).viableToKBINFO(viable);

      expect(kbinfo.keymap[0][0]).toBe(0); // KC_NO
      expect(kbinfo.keymap[0][1]).toBe(0x04); // KC_A
      expect(kbinfo.keymap[0][2]).toBe(0); // KC_NO
    });

    it('restores fragment selections from file', () => {
      const viable = {
        version: 1,
        uid: 12345,
        layout: [[['KC_A']]],
        macro: [],
        tap_dance: [],
        combo: [],
        key_override: [],
        fragment_selections: {
          'left_finger': FRAGMENT_NAMES.FINGER_5KEY,
          'right_finger': FRAGMENT_NAMES.FINGER_6KEY,
        },
      };

      const kbinfo = (fileService as any).viableToKBINFO(viable);

      expect(kbinfo.fragmentState).toBeDefined();
      expect(kbinfo.fragmentState.userSelections.get('left_finger')).toBe(FRAGMENT_NAMES.FINGER_5KEY);
      expect(kbinfo.fragmentState.userSelections.get('right_finger')).toBe(FRAGMENT_NAMES.FINGER_6KEY);
    });

    it('restores fragment definitions and composition', () => {
      const fragments = createTestFragments();
      const composition = {
        instances: [
          { id: 'test', fragment: FRAGMENT_NAMES.FINGER_5KEY, placement: { x: 0, y: 0 }, matrix_map: [[0, 0] as [number, number]] },
        ],
      };

      const viable = {
        version: 1,
        uid: 12345,
        layout: [[['KC_A']]],
        macro: [],
        tap_dance: [],
        combo: [],
        key_override: [],
        fragments,
        composition,
      };

      const kbinfo = (fileService as any).viableToKBINFO(viable);

      expect(kbinfo.fragments).toBeDefined();
      expect(Object.keys(kbinfo.fragments).length).toBe(Object.keys(fragments).length);
      expect(kbinfo.composition).toBeDefined();
      expect(kbinfo.composition.instances.length).toBe(1);
    });

    it('converts tap dance dict format correctly', () => {
      const viable = {
        version: 1,
        uid: 12345,
        layout: [[['KC_A']]],
        macro: [],
        tap_dance: [
          {
            on: true,
            on_tap: 'KC_A',
            on_hold: 'KC_B',
            on_double_tap: 'KC_C',
            on_tap_hold: 'KC_D',
            tapping_term: 200,
          },
        ],
        combo: [],
        key_override: [],
      };

      const kbinfo = (fileService as any).viableToKBINFO(viable);

      expect(kbinfo.tapdances).toBeDefined();
      expect(kbinfo.tapdances[0].tap).toBe('KC_A');
      expect(kbinfo.tapdances[0].hold).toBe('KC_B');
      expect(kbinfo.tapdances[0].doubletap).toBe('KC_C');
      expect(kbinfo.tapdances[0].taphold).toBe('KC_D');
      expect(kbinfo.tapdances[0].tapping_term).toBe(200);
    });

    it('converts combo dict format correctly', () => {
      const viable = {
        version: 1,
        uid: 12345,
        layout: [[['KC_A']]],
        macro: [],
        tap_dance: [],
        combo: [
          {
            on: true,
            keys: ['KC_A', 'KC_B'],
            output: 'KC_C',
            combo_term: 50,
          },
        ],
        key_override: [],
      };

      const kbinfo = (fileService as any).viableToKBINFO(viable);

      expect(kbinfo.combos).toBeDefined();
      expect(kbinfo.combos[0].keys).toEqual(['KC_A', 'KC_B']);
      expect(kbinfo.combos[0].output).toBe('KC_C');
      expect(kbinfo.combos[0].enabled).toBe(true);
    });

    it('converts key override dict format correctly', () => {
      const viable = {
        version: 1,
        uid: 12345,
        layout: [[['KC_A']]],
        macro: [],
        tap_dance: [],
        combo: [],
        key_override: [
          {
            on: true,
            trigger: 'KC_A',
            replacement: 'KC_B',
            layers: 0xFFFF,
            trigger_mods: 1,
            options: 0,
          },
        ],
      };

      const kbinfo = (fileService as any).viableToKBINFO(viable);

      expect(kbinfo.key_overrides).toBeDefined();
      expect(kbinfo.key_overrides[0].trigger).toBe('KC_A');
      expect(kbinfo.key_overrides[0].replacement).toBe('KC_B');
      expect(kbinfo.key_overrides[0].enabled).toBe(true);
    });
  });

  describe('Round-trip Tests', () => {
    it('preserves all keymap data through viable export/import', () => {
      const rows = 5;
      const cols = 14;
      const layers = 4;
      const originalKeymap = generateComplexKeymap(rows, cols, layers);

      const kbinfo = createExportableKeyboardInfo({
        rows,
        cols,
        layers,
        keymap: originalKeymap,
      });

      const viableJson = (fileService as any).kbinfoToViable(kbinfo, true);
      const viable = JSON.parse(viableJson);
      const imported = (fileService as any).viableToKBINFO(viable);

      const importedKeymap = imported.keymap.map((layer: any[]) =>
        layer.map((k: any) => typeof k === 'string' ? keyService.parse(k) : k)
      );

      expect(importedKeymap.length).toBe(originalKeymap.length);
      for (let l = 0; l < originalKeymap.length; l++) {
        expect(importedKeymap[l].length).toBe(originalKeymap[l].length);
        for (let pos = 0; pos < originalKeymap[l].length; pos++) {
          expect(importedKeymap[l][pos]).toBe(originalKeymap[l][pos]);
        }
      }
    });

    it('preserves tap dance data through export/import', () => {
      const kbinfo = createExportableKeyboardInfo({
        rows: 2,
        cols: 2,
        layers: 1,
        keymap: [Array(4).fill(0x5740)], // TD(0)
        tapdance_count: 2,
        tapdances: [
          { idx: 0, tap: 'KC_A', hold: 'KC_B', doubletap: 'KC_C', taphold: 'KC_D', tapping_term: 200 },
          { idx: 1, tap: 'KC_E', hold: 'KC_F', doubletap: 'KC_G', taphold: 'KC_H', tapping_term: 150 },
        ] as any,
      });

      const viableJson = (fileService as any).kbinfoToViable(kbinfo, true);
      const viable = JSON.parse(viableJson);
      const imported = (fileService as any).viableToKBINFO(viable);

      expect(imported.tapdances.length).toBe(2);
      expect(imported.tapdances[0].tap).toBe('KC_A');
      expect(imported.tapdances[1].tap).toBe('KC_E');
    });

    it('preserves combo data through export/import', () => {
      const kbinfo = createExportableKeyboardInfo({
        rows: 2,
        cols: 2,
        layers: 1,
        keymap: [Array(4).fill(0x04)],
        combo_count: 2,
        combos: [
          { cmbid: 0, enabled: true, keys: ['KC_A', 'KC_B'], output: 'KC_C', combo_term: 50 },
          { cmbid: 1, enabled: false, keys: ['KC_D', 'KC_E'], output: 'KC_F', combo_term: 75 },
        ] as any,
      });

      const viableJson = (fileService as any).kbinfoToViable(kbinfo, true);
      const viable = JSON.parse(viableJson);
      const imported = (fileService as any).viableToKBINFO(viable);

      expect(imported.combos.length).toBe(2);
      expect(imported.combos[0].output).toBe('KC_C');
      expect(imported.combos[1].enabled).toBe(false);
    });
  });

  describe('parseContent', () => {
    it('detects .kbi format by kbid field', () => {
      const kbiContent = JSON.stringify({
        kbid: 'test_keyboard',
        rows: 4,
        cols: 4,
        layers: 1,
        keymap: [Array(16).fill(0x04)],
      });

      const kbinfo = (fileService as any).parseContent(kbiContent);

      expect(kbinfo.kbid).toBe('test_keyboard');
    });

    it('detects .viable format by uid + version', () => {
      const viableContent = JSON.stringify({
        version: 1,
        uid: 12345,
        layout: [[['KC_A', 'KC_B'], ['KC_C', 'KC_D']]],
        macro: [],
        tap_dance: [],
        combo: [],
        key_override: [],
      });

      const kbinfo = (fileService as any).parseContent(viableContent);

      expect(kbinfo.kbid).toBe('12345');
      expect(kbinfo.rows).toBe(2);
      expect(kbinfo.cols).toBe(2);
    });

    it('detects .vil format by uid only', () => {
      const vilContent = JSON.stringify({
        uid: 12345,
        layout: [[['KC_A', 'KC_B'], ['KC_C', 'KC_D']]],
        macro: [],
        tap_dance: [],
        combo: [],
        key_override: [],
        settings: {},
      });

      const kbinfo = (fileService as any).parseContent(vilContent);

      expect(kbinfo.kbid).toBe('12345');
    });

    it('throws for unknown format', () => {
      const unknownContent = JSON.stringify({
        something: 'else',
        without: 'kbid or uid',
      });

      expect(() => (fileService as any).parseContent(unknownContent)).toThrow('Unknown json type');
    });
  });
});

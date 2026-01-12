import type { KeyboardInfo } from "../types/vial.types";
import { keyService } from "./key.service";
import { ViableUSB } from "./usb.service";

export class TapdanceService {
    constructor(private usb: ViableUSB) { }

    async get(kbinfo: KeyboardInfo): Promise<void> {
        const tapdance_count = kbinfo.tapdance_count || 0;
        if (tapdance_count === 0) return;

        kbinfo.tapdances = [];

        // Use Viable protocol: direct tap dance get command
        for (let i = 0; i < tapdance_count; i++) {
            const data = await this.usb.sendViable(
                ViableUSB.CMD_VIABLE_TAP_DANCE_GET,
                [i],
                { uint8: true }
            ) as Uint8Array;

            // Response: [index][tap:2][hold:2][doubletap:2][taphold:2][tapping_term]
            const dv = new DataView(data.buffer);
            kbinfo.tapdances.push({
                idx: i,
                tap: keyService.stringify(dv.getUint16(1, true)),
                hold: keyService.stringify(dv.getUint16(3, true)),
                doubletap: keyService.stringify(dv.getUint16(5, true)),
                taphold: keyService.stringify(dv.getUint16(7, true)),
                tapping_term: data[9],
            });
        }
    }

    async push(kbinfo: KeyboardInfo, tdid?: number): Promise<void> {
        if (!kbinfo.tapdances) return;

        const toPush = tdid !== undefined
            ? kbinfo.tapdances.filter(td => td.idx === tdid)
            : kbinfo.tapdances;

        for (const td of toPush) {
            // Use Viable protocol: direct tap dance set command
            await this.usb.sendViable(ViableUSB.CMD_VIABLE_TAP_DANCE_SET, [
                td.idx,
                ...this.LE16(keyService.parse(td.tap)),
                ...this.LE16(keyService.parse(td.hold)),
                ...this.LE16(keyService.parse(td.doubletap)),
                ...this.LE16(keyService.parse(td.taphold)),
                td.tapping_term,
            ], {});
        }
    }

    private LE16(val: number): [number, number] {
        return [val & 0xFF, (val >> 8) & 0xFF];
    }
}

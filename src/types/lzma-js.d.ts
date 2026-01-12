declare module "js-lzma" {
    interface LZMAInStream {
        readByte(): number;
    }

    interface LZMAOutStream {
        writeByte(byte: number): void;
    }

    const LZMA: {
        decompress(properties: LZMAInStream, inStream: LZMAInStream, outStream: LZMAOutStream, outSize: number): boolean;
        decompressFile(inStream: LZMAInStream, outStream: LZMAOutStream): boolean;
    };
    export = LZMA;
}

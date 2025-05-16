/* eslint-disable @typescript-eslint/no-explicit-any */
import { Buffer } from 'buffer';

declare global {
    interface Window {
        Buffer: typeof Buffer;
        phantom?: {
            solana?: any;
        };
    }
}

export {};

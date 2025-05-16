/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { Buffer } from 'buffer';

(window as any).global = window;
(window as any).Buffer = Buffer;
(window as any).process = {
    env: { NODE_DEBUG: undefined },
    version: '',
    nextTick: function (fn: Function) {
        setTimeout(fn, 0);
    }
} as any;

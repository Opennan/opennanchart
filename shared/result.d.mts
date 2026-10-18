/** Runtime validation lives in result.mjs and runs outside the user-script realm. */
export function validateScriptResult(result:unknown,candles:readonly {time:number}[]):any;

export function validateScriptSnapshot(result:unknown,candles:readonly {time:number}[]):any;

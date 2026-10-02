// Globals shared between the new code and the old app.js / live.js during the migration.
interface Window {
  TIMIRTBET_MODE?: string;
  TBNext: {
    register(view: string, Screen: import("preact").ComponentType<any>): void;
    messages: { en: Record<string, string>; am: Record<string, string> };
    setLang(lang: string): void;
    api(method: string, path: string, body?: unknown): Promise<any>;
    state: typeof import("./state.js").state;
    refresh(): Promise<void>;
    bridge<T extends object>(obj: T): T & Record<string, any>;
    has(view: string): boolean;
    render(view: string, el: HTMLElement, route?: Route): void;
    unmount(el: HTMLElement): void;
    /** Set by live.js: clears this browser's session state after signing out or deleting the account. */
    afterSignOut?: (deleted: boolean) => void;
  };
}

/** The old router's state (app.js `V`): which screen, and its parameters. */
interface Route { view: string; login?: string; [k: string]: any }

interface Window {
  /** From app.js during the migration; use it through src/next/legacy.js. */
  TBOld: {
    go(view: string, extra?: Record<string, unknown>): void;
    copyBtn(el: Element, id: string): void;
    modNum(m: any): number;
    BANK: any[];
    MODULES: { id: string; lang: string; title: string; exercises: string[] }[];
    LANGN: Record<string, string>;
    ROUTED: boolean;
  };
}

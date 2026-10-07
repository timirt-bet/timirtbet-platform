// Globals shared between the screens (src/next) and the router (src/app.js) and loader (src/live.js).
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
    render(view: string, el: HTMLElement, route?: Route): void;
    setView(v: string): void;
    toast(n: any): void;
    celebrate(id: string): void;
    /** Set by live.js: clears this browser's session state after signing out or deleting the account. */
    afterSignOut?: (deleted: boolean) => void;
  };
}

/** The old router's state (app.js `V`): which screen, and its parameters. */
interface Route { view: string; login?: string; [k: string]: any }

interface Window {
  /** From app.js (the router); use it through src/next/legacy.js. */
  TBOld: {
    go(view: string, extra?: Record<string, unknown>): void;
    copyBtn(el: Element, id: string): void;
    modNum(m: any): number;
    BANK: any[];
    MODULES: { id: string; lang: string; title: string; exercises: string[] }[];
    LANGN: Record<string, string>;
    ROUTED: boolean;
    openEx(id: string): void;
    TRACKS: Record<string, { tag: string; blurb: string; code: string }>;
    TRACK_IMG: Record<string, string>;
    ptsOf(ex: any): number;
    diffOf(ex: any): string;
    /** The old app state, kept in this browser: chosen track and track-page filters. */
    readonly S: { track?: string; diff?: string; statusF?: string; modOpen?: Record<string, boolean>; [k: string]: any };
    save(): void;
    setLang(lang: string): void;
  };
}

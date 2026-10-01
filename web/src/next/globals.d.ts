// Globals shared between the new code and the old app.js / live.js during the migration.
interface Window {
  TBNext: {
    register(view: string, Screen: import("preact").ComponentType<any>): void;
    messages: { en: Record<string, string>; am: Record<string, string> };
    setLang(lang: string): void;
    api(method: string, path: string, body?: unknown): Promise<any>;
    state: typeof import("./state.js").state;
    refresh(): Promise<void>;
    bridge<T extends object>(obj: T): T & Record<string, any>;
    has(view: string): boolean;
    render(view: string, el: HTMLElement): void;
    unmount(el: HTMLElement): void;
  };
}

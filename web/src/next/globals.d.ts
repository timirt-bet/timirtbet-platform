// Globals shared between the new code and the old app.js / live.js during the migration.
interface Window {
  TBNext: {
    register(view: string, Screen: import("preact").ComponentType<any>): void;
    has(view: string): boolean;
    render(view: string, el: HTMLElement): void;
    unmount(el: HTMLElement): void;
  };
}

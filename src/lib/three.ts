/*
 * The offline data pack vendors Three.js r128 as a classic script.
 * @types/three is not installed because the demo must build without network
 * access. Keep the untyped vendor boundary in this one module so the rest of
 * the app can stay under TypeScript strict mode.
 */
interface VendorWindow {
  THREE?: unknown;
}

const vendor = window as unknown as VendorWindow;

export const THREE = vendor.THREE as any;

export function assertThreeLoaded(): void {
  if (!THREE || !THREE.OrbitControls) {
    throw new Error(
      "Three.js vendor scripts did not load. Serve the app with Vite or python -m http.server.",
    );
  }
}

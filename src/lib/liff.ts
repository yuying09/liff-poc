import { Liff } from "@line/liff";


let liff: Liff | null = null;

export async function getLiff(): Promise<Liff> {
  if (liff) return liff;
  const { default: liffModule } = await import("@line/liff");
  liff = liffModule;
  return liff;
}

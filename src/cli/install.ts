/**
 * shy install — detect shell and install preexec/precmd hooks
 *
 * Flags:
 *   --full   also wrap session in script(1) for output capture (Tier 2)
 */

// TODO: implement shell detection and hook installation
export async function install(args: string[]): Promise<void> {
  const full = args.includes('--full');
  console.log(`shy install${full ? ' --full' : ''} — not yet implemented`);
  process.exit(1);
}

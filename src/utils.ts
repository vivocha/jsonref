const TILDE_RE: RegExp = /~/g;
const SLASH_RE: RegExp = /\//g;
const TILDE_0_RE: RegExp = /~0/g;
const TILDE_1_RE: RegExp = /~1/g;

export function escape(frag: string): string {
  return frag.replace(TILDE_RE, '~0').replace(SLASH_RE, '~1');
}
export function unescape(frag: string): string {
  return frag.replace(TILDE_1_RE, '/').replace(TILDE_0_RE, '~');
}

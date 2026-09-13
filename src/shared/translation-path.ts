export function translationPathFor(pathname: string): string {
  return '/translations' + pathname.replace(/\.html$/, '.yaml');
}

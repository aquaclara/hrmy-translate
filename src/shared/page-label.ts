export function pageLabelFor(pagePath: string): string {
  const horimiya = pagePath.match(/^hm\d+_\d+\/pict_com_0*(\d+)\.html$/);
  if (horimiya) return `호리씨와 미야무라군 ${horimiya[1]}화`;
  const aco = pagePath.match(/^aco\/0*(\d+)\/c\.html$/);
  if (aco) return `아코와 밤비 ${aco[1]}화`;
  if (pagePath === 'aco/c.html') return '아코와 밤비';
  if (pagePath === 't_c.html') return '메인';
  return pagePath.replace(/\.html$/, '');
}

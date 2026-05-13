export function negotiateAlpn(
  clientList: readonly string[],
  serverSet: readonly string[],
): { selected: string } | { fatalAlert: 'no_application_protocol' } {
  for (const proto of clientList) {
    if (serverSet.includes(proto)) return { selected: proto };
  }
  return { fatalAlert: 'no_application_protocol' };
}

/** The company behind a model, with the labs and the joint credits folded into their parent. */
export function companyOf(organization: string): string | undefined {
  const names = organization.split(',').map((name) => name.trim());
  if (names.some((name) => /^(Google|DeepMind)/.test(name))) return 'Google';
  if (names.some((name) => /^(Meta AI|Facebook)/.test(name))) return 'Meta';
  if (names.some((name) => /^OpenAI$/.test(name))) return 'OpenAI';
  if (names.some((name) => /^Microsoft/.test(name))) return 'Microsoft';
  if (names.some((name) => /^Nvidia$/.test(name))) return 'Nvidia';
  if (names.some((name) => /^DeepSeek$/.test(name))) return 'DeepSeek';
  if (names.some((name) => /^Alibaba$/.test(name))) return 'Alibaba';
  if (names.some((name) => /^Amazon$/.test(name))) return 'Amazon';
  if (names.some((name) => /^xAI$/.test(name))) return 'xAI';
  return undefined;
}

type SomeObject = { [k: string]: string; };
export default function deDoubleEscape<T extends SomeObject, K extends keyof T>(obj: T, propName: K) {
  return (obj[propName] || '').split('\\n').join("\n");
}
declare const brand: unique symbol;

export type Brand<Value, Name extends string> = Value & {
  readonly [brand]: Name;
};

export type SourceId = Brand<string, "SourceId">;
export type ObjectId = Brand<string, "ObjectId">;

export function sourceId(value: string): SourceId {
  return value as SourceId;
}

export function objectId(value: string): ObjectId {
  return value as ObjectId;
}

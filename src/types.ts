export type Annotation = {
  filePath: string;
  entire: Range;
  point: Range;
};
type Range = {
  start: number;
  end: number;
};

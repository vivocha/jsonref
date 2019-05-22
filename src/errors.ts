export class RetrieverError extends Error {
  constructor(public uri: string, public originalError: Error) {
    super(uri);
    this.name = 'RetrieverError';
  }
}
export class ParserError extends Error {
  constructor(public scope: string, type: string, public errors?: Error[]) {
    super(type);
    this.name = 'ParserError';
  }
}
export class RebaserError extends Error {
  constructor(public scope: string, type: string, public errors?: Error[]) {
    super(type);
    this.name = 'RebaserError';
  }
}

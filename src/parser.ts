import { Offset, Source } from "./parser/source.ts";
import {
  ConstSyntax,
  ModuleSyntax,
  ShapeSyntax,
  Syntax,
} from "./parser/syntax.ts";
export * from "./parser/syntax.ts";
export * from "./parser/source.ts";

const isAlphaRegex = /[a-zA-Z]+/;
const isDigitRegex = /[0-9]+/;
const isSpaceRegex = /\s+/;

export function isAlpha(str: string): boolean {
  return isAlphaRegex.test(str);
}

export function isDigit(str: string): boolean {
  return isDigitRegex.test(str);
}

export function isSpace(str: string): boolean {
  return isSpaceRegex.test(str);
}

export class Parser {
  source: Source;

  constructor(source: Source) {
    this.source = source;
  }

  get offset(): Offset {
    return this.source.offset.clone();
  }

  private skipSpace() {
    while (true) {
      const maybeChar = this.source.peek();
      if (maybeChar != undefined && isSpace(maybeChar)) {
        this.source.consume();
      } else {
        break;
      }
    }
  }

  parse(): Syntax[] {
    const syntaxes = [];
    this.skipSpace();
    while (!this.isEof()) {
      syntaxes.push(this.parseSyntax());
    }
    return syntaxes;
  }

  isEof(): boolean {
    this.skipSpace();
    return this.source.peek() == undefined;
  }

  parseSyntax(): Syntax {
    const keyword = this.parseKeyword();
    switch (keyword) {
      case "as":
        return { type: "module", syntax: this.parseModuleSyntax() };
      case "const":
        return { type: "const", syntax: this.parseConstSyntax() };
      default:
        return { type: "shape", syntax: this.parseShapeSyntax(keyword) };
    }
  }

  parseModuleSyntax(): ModuleSyntax {
    const offset = this.offset;
    const name = this.parseKeyword();

    const params = [];
    if (this.startWithSymbol("(")) {
      this.parseSymbol("(");
      while (!this.startWithSymbol(")")) {
        params.push(this.parseKeyword());
      }
      this.parseSymbol(")");
    }

    const syntaxes: Syntax[] = [];
    if (this.startWithSymbol("{")) {
      this.parseSymbol("{");
      while (!this.startWithSymbol("}")) {
        syntaxes.push(this.parseSyntax());
      }
      this.parseSymbol("}");
    } else {
      this.parseSymbol(";");
    }

    return new ModuleSyntax(offset, name, params, syntaxes);
  }

  parseConstSyntax(): ConstSyntax {
    const offset = this.offset;
    const name = this.parseKeyword();
    this.parseSymbol("=");
    const value = this.parseKeyword();
    this.parseSymbol(";");
    return new ConstSyntax(offset, name, value);
  }

  parseShapeSyntax(name: string): ShapeSyntax {
    const offset = this.offset;

    const params: string[] = [];
    if (this.startWithSymbol("(")) {
      this.parseSymbol("(");
      while (!this.startWithSymbol(")")) {
        params.push(this.parseKeyword());
        if (this.startWithSymbol(")")) {
          break;
        }
        this.parseSymbol(",");
      }
      this.parseSymbol(")");
    }

    const syntaxes: Syntax[] = [];
    if (this.startWithSymbol("{")) {
      this.parseSymbol("{");
      while (!this.startWithSymbol("}")) {
        syntaxes.push(this.parseSyntax());
      }
      this.parseSymbol("}");
    } else {
      this.parseSymbol(";");
    }

    return new ShapeSyntax(offset, name, params, syntaxes);
  }

  parseKeyword(): string {
    this.skipSpace();

    let keyword = "";
    while (true) {
      const maybeChar = this.source.peek();
      if (
        maybeChar != undefined &&
        (maybeChar == "_" || maybeChar == "." || maybeChar == "-" ||
          isAlpha(maybeChar) || isDigit(maybeChar))
      ) {
        keyword += maybeChar;
        this.source.consume();
      } else {
        break;
      }
    }

    if (keyword.length == 0) {
      throw new ParseError(this.offset, "expected keyword");
    }
    return keyword;
  }

  startWithSymbol(symbol: string): boolean {
    this.skipSpace();
    return this.source.peek(symbol.length) == symbol;
  }

  parseSymbol(symbol: string): string {
    this.skipSpace();
    if (this.source.peek(symbol.length) == symbol) {
      this.source.consume(symbol.length);
      return symbol;
    } else {
      throw new ParseError(this.offset, `expected symbol "${symbol}"`);
    }
  }
}

export class ParseError {
  offset: Offset;
  msg: string;

  constructor(offset: Offset, msg: string) {
    this.offset = offset;
    this.msg = msg;
  }
}

export class Formatter extends Parser {
  constructor(source: Source) {
    super(source);
  }

  format(): string {
    let string = "";
    for (const syntax of this.parse()) {
      string += syntax.syntax.format();
    }
    return string;
  }
}

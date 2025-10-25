import { Offset, Source } from "./parser/source.ts";
import {
  CommentSyntax,
  ConstSyntax,
  ForSyntax,
  LinkSyntax,
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
    if (this.startWithSymbol("//") || this.startWithSymbol("/*")) {
      return { type: "comment", syntax: this.parseCommentSyntax() };
    }
    const keyword = this.parseKeyword();
    switch (keyword) {
      case "as":
        return { type: "module", syntax: this.parseModuleSyntax() };
      case "const":
        return { type: "const", syntax: this.parseConstSyntax() };
      case "for":
        return { type: "for", syntax: this.parseForSyntax() };
      case "link":
        return { type: "link", syntax: this.parseLinkSyntax() };
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

  parseForSyntax(): ForSyntax {
    const offset = this.offset;
    const params: string[] = [];
    this.parseSymbol("(");
    for (let i = 0; i < 4; i++) {
      params.push(this.parseKeyword());
      if (this.startWithSymbol(")")) {
        break;
      }
      this.parseSymbol(",");
    }
    this.parseSymbol(")");
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
    const constant = params[0];
    const start = params[1];
    const end = params[2];
    const delta = params[3];
    return new ForSyntax(offset, constant, start, end, delta, syntaxes);
  }

  parseLinkSyntax(): LinkSyntax {
    const offset = this.offset;
    const url = new URL(this.parseString());
    this.parseSymbol(";");
    return new LinkSyntax(offset, url);
  }

  parseCommentSyntax(): CommentSyntax {
    let comment = "";
    if (this.startWithSymbol("/*")) {
      this.parseSymbol("/*");
      while (this.source.peek(2) != "*/") {
        const maybeChar = this.source.consume();
        if (maybeChar == undefined) {
          break;
        }
        comment += maybeChar;
      }
      this.parseSymbol("*/");
    } else {
      this.parseSymbol("//");
      while (true) {
        const maybeChar = this.source.consume();
        if (maybeChar == undefined || maybeChar == "\n") {
          break;
        }
        comment += maybeChar;
      }
    }
    return new CommentSyntax(comment.trim());
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

  parseString(): string {
    let string = "";
    this.parseSymbol('"');
    while (this.source.peek() != '"') {
      const maybeChar = this.source.consume();
      if (maybeChar == undefined) {
        throw new ParseError(this.offset, `expected symbol "\""`);
      }
      string += maybeChar;
    }
    this.source.consume();
    return string;
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

export class Source {
  offset: Offset;
  text: string;
  cursor: number;

  constructor(name: string, text: string) {
    this.offset = new Offset(name);
    this.text = text;
    this.cursor = 0;
  }

  consume(length: number = 1): string | undefined {
    const maybeStr = this.peek(length);
    if (maybeStr != undefined) {
      this.offset.seek(maybeStr);
      this.cursor += maybeStr.length;
    }
    return maybeStr;
  }

  peek(length: number = 1): string | undefined {
    return this.cursor + length <= this.text.length
      ? this.text.substring(this.cursor, this.cursor + length)
      : undefined;
  }
}

export class Offset {
  name: string;
  line: number;
  column: number;

  constructor(name: string, line: number = 1, column: number = 1) {
    this.name = name;
    this.line = line;
    this.column = column;
  }

  static root(): Offset {
    return new Offset("__root__");
  }

  clone(): Offset {
    return new Offset(this.name, this.line, this.column);
  }

  seek(str: string) {
    for (const char of str) {
      switch (char) {
        case "\n":
          this.column = 1;
          this.line++;
          break;
        case "\r":
          this.column = 1;
          break;
        default:
          this.column++;
          break;
      }
    }
  }
}

import { Offset } from "./source.ts";

export interface Format {
  format(): string;
}

export type Syntax =
  | { type: "module"; syntax: ModuleSyntax }
  | { type: "const"; syntax: ConstSyntax }
  | { type: "shape"; syntax: ShapeSyntax }
  | { type: "for"; syntax: ForSyntax }
  | { type: "comment"; syntax: CommentSyntax };

export class ModuleSyntax implements Format {
  offset: Offset;
  name: string;
  params: string[];
  syntaxes: Syntax[];

  constructor(
    offset: Offset,
    name: string,
    params: string[],
    syntaxes: Syntax[],
  ) {
    this.offset = offset;
    this.name = name;
    this.params = params;
    this.syntaxes = syntaxes;
  }

  format(): string {
    let string = `as ${this.name}(`;
    for (let i = 0; i < this.params.length; i++) {
      if (i != 0) {
        string += ", ";
      }
      string += this.params[i];
    }
    string += ") {\n";
    for (const syntax of this.syntaxes) {
      string += "  " +
        syntax.syntax.format().replaceAll("\n", "\n  ").trimEnd() + "\n";
    }
    string += "}\n";
    return string;
  }
}

export class ConstSyntax implements Format {
  name: string;
  value: string;
  offset: Offset;

  constructor(offset: Offset, name: string, value: string) {
    this.offset = offset;
    this.name = name;
    this.value = value;
  }

  format(): string {
    return `const ${this.name} = ${this.value};\n`;
  }
}

export class ShapeSyntax implements Format {
  offset: Offset;
  name: string;
  params: string[];
  syntaxes: Syntax[];

  constructor(
    offset: Offset,
    name: string,
    params: string[],
    syntaxes: Syntax[],
  ) {
    this.offset = offset;
    this.name = name;
    this.params = params;
    this.syntaxes = syntaxes;
  }

  format(): string {
    let string = `${this.name}`;
    if (this.params.length != 0 || this.syntaxes.length == 0) {
      string += "(";
      for (let i = 0; i < this.params.length; i++) {
        if (i != 0) {
          string += ", ";
        }
        string += this.params[i];
      }
      string += ")";
    }

    if (this.syntaxes.length == 0) {
      string += ";\n";
    } else {
      string += " {\n";
      for (const syntax of this.syntaxes) {
        string += "  " +
          syntax.syntax.format().replaceAll("\n", "\n  ").trimEnd() + "\n";
      }
      string += "}\n";
    }
    return string;
  }
}

// for(i, 0, 10, 1) {..}
export class ForSyntax implements Format {
  offset: Offset;
  constant: string;
  start: string;
  end: string;
  delta: string;
  syntaxes: Syntax[];

  constructor(
    offset: Offset,
    constant: string,
    start: string,
    end: string,
    delta: string,
    syntaxes: Syntax[],
  ) {
    this.offset = offset;
    this.constant = constant;
    this.start = start;
    this.end = end;
    this.delta = delta;
    this.syntaxes = syntaxes;
  }

  format(): string {
    let string =
      `for(${this.constant}, ${this.start}, ${this.end}, ${this.delta})`;
    if (this.syntaxes.length == 0) {
      string += ";\n";
    } else {
      string += " {\n";
      for (const syntax of this.syntaxes) {
        string += "  " +
          syntax.syntax.format().replaceAll("\n", "\n  ").trimEnd() + "\n";
      }
      string += "}\n";
    }
    return string;
  }
}

export class CommentSyntax implements Format {
  msg: string;

  constructor(msg: string) {
    this.msg = msg;
  }

  format(): string {
    console.log(this.msg);
    if (this.msg.includes("\n")) {
      return `/*\n${this.msg}\n*/\n`;
    } else {
      return `// ${this.msg}\n`;
    }
  }
}

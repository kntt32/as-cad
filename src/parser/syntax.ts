import { Offset } from "./source.ts";

export interface Format {
  format(): string;
}

export type Syntax =
  | { type: "module"; syntax: ModuleSyntax }
  | {
    type: "const";
    syntax: ConstSyntax;
  }
  | { type: "shape"; syntax: ShapeSyntax };

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
    let string = `as ${name}(`;
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

// no longer unused
export class ImportSyntax {
  offset: Offset;
  name: string;

  constructor(offset: Offset, name: string) {
    this.offset = offset;
    this.name = name;
  }
}

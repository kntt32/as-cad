import {
  booleans,
  extrusions,
  geometries,
  primitives,
  transforms,
} from "jscad-modeling";
import * as stlSerializer from "jscad-stl-serializer";
import {
  ConstSyntax,
  ForSyntax,
  LinkSyntax,
  ModuleSyntax,
  Offset,
  ParseError,
  Parser,
  ShapeSyntax,
  Source,
  Syntax,
} from "./parser.ts";

type Geom3 = geometries.geom3.Geom3;
type Geom2 = geometries.geom2.Geom2;

export class Shape {
  offset: Offset;
  params: number[];
  shapes: Shape[];
  name: string;
  static defaultSegments: number = 32;

  static supportedNames: string[] = [
    "cube",
    "sphere",
    "cylinder",
    "union",
    "subtract",
    "intersect",
    "translate",
    "assemble",
    "rotate",
    "scale",
    "circle",
    "rect",
    "triangle",
    "extrude",
    "extrude_helical",
  ] as const;

  constructor(offset: Offset, name: string, params: number[], shapes: Shape[]) {
    if (!Shape.supportedNames.includes(name)) {
      throw Error("unexpected name");
    }
    this.name = name;
    this.offset = offset;
    this.params = params;
    this.shapes = shapes;
  }

  getParam(index: number): number {
    if (this.params.length <= index) {
      throw new ParseError(this.offset, `expected argument of $${index}`);
    }
    return this.params[index];
  }

  getUParam(index: number): number {
    const param = this.getParam(index);
    if (param < 0) {
      throw new ParseError(
        this.offset,
        `argument of $${index} must not be less than zero`,
      );
    }
    return param;
  }

  getOptionalParam(index: number, def: number): number {
    return this.params[index] ?? def;
  }

  getOptionalUParam(index: number, def: number): number {
    const param = this.getOptionalParam(index, def);
    if (param < 0) {
      throw new ParseError(
        this.offset,
        `argument of $${index} must not be less than zero`,
      );
    }
    return param;
  }

  private cubeSolid(): Solid[] {
    const width = this.getUParam(0);
    const height = this.getOptionalUParam(1, width);
    const depth = this.getOptionalUParam(2, height);
    const center = this.getOptionalParam(3, 0) != 0;

    const geometry = primitives.cuboid({
      size: [width, height, depth],
      center: center ? [0, 0, 0] : [width / 2, height / 2, depth / 2],
    });
    return [new Solid(geometry)];
  }

  private sphereSolid(): Solid[] {
    const radius = this.getUParam(0);
    const segments = this.getOptionalUParam(1, Shape.defaultSegments);
    const geometry = primitives.sphere({ radius, segments });
    return [new Solid(geometry)];
  }

  private cylinderSolid(): Solid[] {
    const radius = this.getUParam(0);
    const height = this.getUParam(1);
    const segments = this.getOptionalUParam(2, Shape.defaultSegments);
    return [new Solid(primitives.cylinder({ radius, height, segments }))];
  }

  private translateSolid(): Solid[] {
    const translateX = this.getParam(0);
    const translateY = this.getParam(1);
    const translateZ = this.getParam(2);
    const solids = [];
    for (const shapes of this.shapes) {
      solids.push(...shapes.solid());
    }
    const translatedSolids = solids.map((solid) =>
      new Solid(
        transforms.translate(
          [translateX, translateY, translateZ],
          solid.geometry,
        ),
      )
    );
    return translatedSolids;
  }

  private unionSolid(): Solid[] {
    if (this.shapes.length == 0) {
      return [new Solid()];
    }
    const solids: Solid[] = this.shapes[0].solid();
    const otherSolids: Solid[] = [];
    for (const shape of this.shapes.slice(1)) {
      otherSolids.push(...shape.solid());
    }
    const otherGeometries: Geom3[] = otherSolids.map((solid) => solid.geometry);
    return solids.map((solid) =>
      new Solid(booleans.union(solid.geometry, ...otherGeometries))
    );
  }

  private intersectSolid(): Solid[] {
    if (this.shapes.length == 0) {
      return [new Solid()];
    }
    const solids: Solid[] = this.shapes[0].solid();
    const otherSolids: Solid[] = [];
    for (const shape of this.shapes.slice(1)) {
      otherSolids.push(...shape.solid());
    }
    const otherGeometries: Geom3[] = otherSolids.map((solid) => solid.geometry);
    return solids.map((solid) =>
      new Solid(booleans.intersect(solid.geometry, ...otherGeometries))
    );
  }

  private subtractSolid(): Solid[] {
    if (this.shapes.length == 0) {
      return [new Solid()];
    }
    const solids: Solid[] = this.shapes[0].solid();
    const otherSolids: Solid[] = [];
    for (const shape of this.shapes.slice(1)) {
      otherSolids.push(...shape.solid());
    }
    const otherGeometries: Geom3[] = otherSolids.map((solid) => solid.geometry);
    return solids.map((solid) =>
      new Solid(booleans.subtract(solid.geometry, ...otherGeometries))
    );
  }

  private assembleSolid(): Solid[] {
    const solids = [];
    for (const shape of this.shapes) {
      solids.push(...shape.solid());
    }
    return solids;
  }

  private extrudeSketch(): Solid[] {
    const height = this.getUParam(0);
    const solids: Solid[] = [];
    for (const shape of this.shapes) {
      const geom2s: Geom2[] = shape.sketch().map((sketch) => sketch.geometry);
      const geom3s: Geom3 = extrusions.extrudeLinear({ height }, ...geom2s);
      solids.push(new Solid(geom3s));
    }
    return solids;
  }

  private extrudeHelicalSketch(): Solid[] {
    const angle = this.getUParam(0);
    const pitch = this.getUParam(1);
    const segmentsPerRotation = this.getOptionalUParam(
      2,
      Shape.defaultSegments,
    );
    const solids: Solid[] = [];
    for (const shape of this.shapes) {
      const geom2s: Geom2[] = shape.sketch().map((sketch) => sketch.geometry);
      const geom3s: Geom3[] = geom2s.map((geom) =>
        extrusions.extrudeHelical({ angle, pitch, segmentsPerRotation }, geom)
      );
      solids.push(...geom3s.map((geom) => new Solid(geom)));
    }
    return solids;
  }

  private rotateSolid(): Solid[] {
    const angleX = this.getParam(0);
    const angleY = this.getParam(1);
    const angleZ = this.getParam(2);
    const solids: Solid[] = [];
    for (const shape of this.shapes) {
      const geometries = shape.solid().map((solid) => solid.geometry);
      const rotateGeometries = geometries.map((geom) =>
        transforms.rotate([angleX, angleY, angleZ], geom)
      );
      solids.push(...rotateGeometries.map((geom) => new Solid(geom)));
    }
    return solids;
  }

  private scaleSolid(): Solid[] {
    const scaleX = this.getUParam(0);
    const scaleY = this.getOptionalUParam(1, scaleX);
    const scaleZ = this.getOptionalUParam(2, scaleY);
    const solids = [];
    for (const shape of this.shapes) {
      const geometries = shape.solid().map((solid) => solid.geometry);
      const scaleGeometries = geometries.map((geom) =>
        transforms.scale([scaleX, scaleY, scaleZ], geom)
      );
      solids.push(...scaleGeometries.map((geom) => new Solid(geom)));
    }
    return solids;
  }

  solid(): Solid[] {
    switch (this.name) {
      case "cube":
        return this.cubeSolid();
      case "sphere":
        return this.sphereSolid();
      case "cylinder":
        return this.cylinderSolid();
      case "union":
        return this.unionSolid();
      case "intersect":
        return this.intersectSolid();
      case "subtract":
        return this.subtractSolid();
      case "translate":
        return this.translateSolid();
      case "scale":
        return this.scaleSolid();
      case "rotate":
        return this.rotateSolid();
      case "assemble":
        return this.assembleSolid();
      case "extrude":
        return this.extrudeSketch();
      case "extrude_helical":
        return this.extrudeHelicalSketch();
      default:
        return [new Solid()];
    }
  }

  private rotateSketch(): Sketch[] {
    const angleX = this.getParam(0);
    const angleY = this.getParam(1);
    const angleZ = this.getParam(2);
    const sketches = [];
    for (const shape of this.shapes) {
      const geometries = shape.sketch().map((solid) => solid.geometry);
      const rotateGeometries = geometries.map((geom) =>
        transforms.rotate([angleX, angleY, angleZ], geom)
      );
      sketches.push(...rotateGeometries.map((geom) => new Sketch(geom)));
    }
    return sketches;
  }

  private scaleSketch(): Sketch[] {
    const scaleX = this.getUParam(0);
    const scaleY = this.getOptionalUParam(1, scaleX);
    const scaleZ = this.getOptionalUParam(2, scaleY);
    const sketches = [];
    for (const shape of this.shapes) {
      const geometries = shape.sketch().map((solid) => solid.geometry);
      const scaleGeometries = geometries.map((geom) =>
        transforms.scale([scaleX, scaleY, scaleZ], geom)
      );
      sketches.push(...scaleGeometries.map((geom) => new Sketch(geom)));
    }
    return sketches;
  }

  private circleSketch(): Sketch[] {
    const radius = this.getUParam(0);
    const segments = this.getOptionalUParam(1, Shape.defaultSegments);
    return [new Sketch(primitives.circle({ radius, segments }))];
  }

  private rectSketch(): Sketch[] {
    const width = this.getUParam(0);
    const height = this.getOptionalUParam(1, width);
    return [new Sketch(primitives.rectangle({ size: [width, height] }))];
  }

  private triangleSketch(): Sketch[] {
    const len1 = this.getUParam(0);
    const len2 = this.getOptionalUParam(1, len1);
    const len3 = this.getOptionalUParam(2, len2);
    return [
      new Sketch(
        primitives.triangle({ type: "SSS", values: [len1, len2, len3] }),
      ),
    ];
  }

  private translateSketch(): Sketch[] {
    const translateX = this.getParam(0);
    const translateY = this.getParam(1);
    const translateZ = this.getParam(2);
    const sketches: Sketch[] = [];
    for (const shapes of this.shapes) {
      sketches.push(...shapes.sketch());
    }
    const translatedSketches = sketches.map((sketch) =>
      new Sketch(
        transforms.translate(
          [translateX, translateY, translateZ],
          sketch.geometry,
        ),
      )
    );
    return translatedSketches;
  }

  private assembleSketch(): Sketch[] {
    const sketches: Sketch[] = [];
    for (const shape of this.shapes) {
      sketches.push(...shape.sketch());
    }
    return sketches;
  }

  sketch(): Sketch[] {
    switch (this.name) {
      case "circle":
        return this.circleSketch();
      case "rect":
        return this.rectSketch();
      case "triangle":
        return this.triangleSketch();
      case "assemble":
        return this.assembleSketch();
      case "rotate":
        return this.rotateSketch();
      case "translate":
        return this.translateSketch();
      case "scale":
        return this.scaleSketch();
      default:
        return [new Sketch()];
    }
  }

  toStl(): Uint8Array {
    const stlData: Uint8Array[] = stlSerializer.serialize(
      { binary: true },
      geometries.geom3.create([]),
      ...this.solid().map((solid) => solid.geometry),
    ).map((array: ArrayBuffer) => new Uint8Array(array));
    const stlBinaryLength = stlData.reduce(
      (sum: number, array: Uint8Array) => sum + array.length,
      0,
    );
    const stlBinary = new Uint8Array(stlBinaryLength);
    let index = 0;
    for (const array of stlData) {
      stlBinary.set(array, index);
      index += array.length;
    }
    return stlBinary;
  }
}

export class ShapeBuilder {
  syntaxes: Syntax[];
  constants: Map<string, number>;
  modules: Map<string, ModuleSyntax>;
  parent: ShapeBuilder | undefined;
  currentModule: string | undefined;
  static links: Map<
    string,
    { modules: Map<string, ModuleSyntax>; constants: Map<string, number> }
  > = new Map();

  constructor(
    syntaxes: Syntax[],
    parent: ShapeBuilder | undefined = undefined,
    constants: Map<string, number> = new Map(),
    currentModule: string | undefined = undefined,
  ) {
    this.syntaxes = syntaxes;
    this.constants = constants;
    this.modules = new Map();
    this.parent = parent;
    this.currentModule = currentModule;
  }

  getValue(value: string): number | undefined {
    const num = Number.parseFloat(value);
    return Number.isNaN(num) ? this.getConst(value) : num;
  }

  getConst(name: string): number | undefined {
    switch (name) {
      case "false":
        return 0;
      case "true":
        return 1;
      default: {
        const value = this.constants.get(name);
        return value == undefined && this.parent != undefined
          ? this.parent.getConst(name)
          : value;
      }
    }
  }

  getModule(name: string): ModuleSyntax | undefined | "recursion" {
    if (this.currentModule == name) {
      return "recursion";
    }
    const module = this.modules.get(name);
    return module == undefined && this.parent != undefined
      ? this.parent.getModule(name)
      : module;
  }

  enumerateModules(): Map<string, ModuleSyntax> {
    const modules = new Map();
    for (const syntax of this.syntaxes) {
      if (syntax.type == "module") {
        const moduleSyntax = syntax.syntax;
        if (modules.has(moduleSyntax.name)) {
          throw new ParseError(
            moduleSyntax.offset,
            `duplicating module "${moduleSyntax.name}"`,
          );
        }
        modules.set(moduleSyntax.name, moduleSyntax);
      }
    }
    return modules;
  }

  inherit(
    syntaxes: Syntax[],
    constants: Map<string, number> = new Map(),
    moduleName: string | undefined = this.currentModule,
  ): ShapeBuilder {
    return new ShapeBuilder(syntaxes, this, constants, moduleName);
  }

  private buildConst(constSyntax: ConstSyntax) {
    const value = this.getValue(constSyntax.value);
    if (value == undefined) {
      throw new ParseError(
        constSyntax.offset,
        `constant "${constSyntax.name}" is undefined`,
      );
    }
    this.constants.set(constSyntax.name, value);
  }

  private async buildModuleShape(
    moduleSyntax: ModuleSyntax,
    params: number[],
  ): Promise<Shape[]> {
    const moduleConstants: Map<string, number> = new Map();
    if (params.length != moduleSyntax.params.length) {
      throw new ParseError(
        moduleSyntax.offset,
        `${moduleSyntax.params.length} parameters was expected, found ${params.length}`,
      );
    }
    for (let i = 0; i < params.length; i++) {
      moduleConstants.set(moduleSyntax.params[i], params[i]);
    }
    return await this.inherit(
      moduleSyntax.syntaxes,
      moduleConstants,
      moduleSyntax.name,
    ).build();
  }

  private async buildShape(shapeSyntax: ShapeSyntax): Promise<Shape[]> {
    const name = shapeSyntax.name;
    const params = shapeSyntax.params.map((value) => {
      const num = this.getValue(value);
      if (num == undefined) {
        throw new ParseError(
          shapeSyntax.offset,
          `constant "${value}" is undefined`,
        );
      }
      return num;
    });
    const shapes = await this.inherit(shapeSyntax.syntaxes).build();

    if (Shape.supportedNames.includes(name)) {
      return [new Shape(shapeSyntax.offset, name, params, shapes)];
    } else {
      const moduleSyntax = this.getModule(name);
      if (moduleSyntax == undefined) {
        throw new ParseError(
          shapeSyntax.offset,
          `module "${name}" is undefined`,
        );
      }
      if (moduleSyntax == "recursion") {
        throw new ParseError(
          shapeSyntax.offset,
          `module "${name} has infinite size`,
        );
      }
      return await this.buildModuleShape(moduleSyntax, params);
    }
  }

  async buildFor(forSyntax: ForSyntax): Promise<Shape[]> {
    const shapes: Shape[] = [];
    const constants = new Map(this.constants);
    const start = this.getValue(forSyntax.start);
    const end = this.getValue(forSyntax.end);
    const delta = this.getValue(forSyntax.delta);
    if (start == undefined) {
      throw new ParseError(
        forSyntax.offset,
        `constant ${forSyntax.start} is undefined`,
      );
    }
    if (end == undefined) {
      throw new ParseError(
        forSyntax.offset,
        `constant ${forSyntax.end} is undefined`,
      );
    }
    if (delta == undefined) {
      throw new ParseError(
        forSyntax.offset,
        `constant ${forSyntax.delta} is undefined`,
      );
    }
    if (0 < delta) {
      for (let i = start; i < end; i += delta) {
        constants.set(forSyntax.constant, i);
        const builder = this.inherit(forSyntax.syntaxes, constants);
        shapes.push(...await builder.build());
      }
    } else if (delta < 0) {
      for (let i = start; end < i; i += delta) {
        constants.set(forSyntax.constant, i);
        const builder = this.inherit(forSyntax.syntaxes, constants);
        shapes.push(...await builder.build());
      }
    }
    return shapes;
  }

  async buildLink(syntax: LinkSyntax) {
    if (!ShapeBuilder.links.has(syntax.url.href)) {
      let response;
      try {
        response = await fetch(syntax.url);
      } catch {
        throw new ParseError(syntax.offset, "network error");
      }
      const text = await response.text();
      const source = new Source(syntax.url.href, text);
      const parser = new Parser(source);
      const builder = this.inherit(parser.parse());
      builder.build();
      ShapeBuilder.links.set(syntax.url.href, {
        modules: builder.modules,
        constants: builder.constants,
      });
    }
    const {modules, constants} = ShapeBuilder.links.get(syntax.url.href)!;
    for (const [name, value] of constants.entries()) {
      this.constants.set(name, value);
    }
    for (const [name, module] of modules.entries()) {
      if (this.modules.has(name)) {
        throw new ParseError(
          syntax.offset,
          `duplicating module "${name}"`,
        );
      }
      this.modules.set(name, module);
    }
  }

  async assemble(): Promise<Shape> {
    const shapes = await this.build();
    return new Shape(Offset.root(), "assemble", [], shapes);
  }

  async build(): Promise<Shape[]> {
    this.modules = this.enumerateModules();
    const shapes: Shape[] = [];
    for (const syntax of this.syntaxes) {
      switch (syntax.type) {
        case "module":
          break;
        case "const":
          this.buildConst(syntax.syntax);
          break;
        case "shape":
          shapes.push(...await this.buildShape(syntax.syntax));
          break;
        case "for":
          shapes.push(...await this.buildFor(syntax.syntax));
          break;
        case "link":
          await this.buildLink(syntax.syntax);
          break;
      }
    }
    return shapes;
  }
}

export class Solid {
  geometry: Geom3;

  constructor(geometry: Geom3 = geometries.geom3.create([])) {
    this.geometry = geometry;
  }
}

export class Sketch {
  geometry: Geom2;

  constructor(geometry: Geom2 = geometries.geom2.create([])) {
    this.geometry = geometry;
  }
}

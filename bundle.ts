const { stdout, stderr, success } = await new Deno.Command("deno", {
  args: ["bundle", "--platform=browser", "--check", "./src/main.ts"],
}).output();
const decoder = new TextDecoder();
const script = decoder.decode(stdout);
const stderrText = decoder.decode(stderr);
console.log(stderrText);

const style = await Deno.readTextFile("./src/style.css");

if (success) {
  const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>as-cad</title>
    <style>
      ${style}
      body {
        margin: 0;
        padding: 0;
        height: 100%;
        width: 100%;
      }
    </style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.43.3/ace.js" integrity="sha512-T2otaV2NuxAJAOCoj8ijyy+eAAadZlpvdLmakrIGVFbBkthgIFqLTXd+T8Z+S+kf4V7Ib5+6f6r4D4IdS9Ey4A==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
  </head>
  <body>
    <noscript>
      <div style="background: red; color: white;">PLEASE ENABLE JAVASCRIPT</div>
      <h1>as-cad</h1>
        as-cad is a web-based declarative CAD.
        <h2>Example</h2>
        <pre>
<code>translate(-20, 0, 0) {
  subtract {
    cube(10, 10, 10, true);
    sphere(6);
  }
}
intersect {
  cube(10, 10, 10, true);
  sphere(6);
}
translate(20, 0, 0) {
  extrude_helical(6.28, 6) {
    translate(3, 2.5, 0) {
      circle(2);
    }
  }
}</code>
        </pre>
        <h2>Primitive</h2>
        <ul>
          <li><code>cube(<i>width</i>, <i>height (optional)</i>, <i>depth (optional)</i>, <i>center (optional)</i>);</code></li>
          <li><code>sphere(<i>radius</i>, <i>segments (optional)</i>);</code></li>
          <li><code>cylinder(<i>radius</i>, <i>height</i>, <i>segments (optional)</i>);</code></li>
          <li><code>union {..<i>Solid</i>}</code></li>
          <li><code>subtract {..<i>Solid</i>}</code></li>
          <li><code>intersect {..<i>Solid</i>}</code></li>
          <li><code>translate(<i>x</i>, <i>y</i>, <i>z</i>) {..<i>Solid/Sketch</i>}</code></li>
          <li><code>rotate(<i>angle_x</i>, <i>angle_y</i>, <i>angle_z</i>) {..<i>Solid/Sketch</i>}</code></li>
          <li><code>scale(<i>x</i>, <i>y (optional)</i>, <i>z (optional)</i>) {..<i>Solid/Sketch</i>}</code></li>
          <li><code>assemble {..<i>Solid</i>}</code></li>
          <li><code>extrude(<i>height</i>) {..<i>Sketch</i>}</code></li>
          <li><code>extrude_helical(<i>angle</i>, <i>pitch</i>, <i>segments (optional)</i>) {..<i>Sketch</i>}</code></li>
          <li><code>circle(<i>radius</i>, <i>segments (optional)</i>);</code></li>
          <li><code>rect(<i>width</i>, <i>height (optional)</i>);</code></li>
          <li><code>triangle(<i>len1 (optional)</i>, <i>len2 (optional)</i>, <i>len3 (optional)</i>);</code></li>
        </ul>
        <h2>Syntax</h2>
        <h3>Shape</h3>
        <pre><code>cube(10, 10, 10);</code></pre>
        <h3>Module</h3>
        <pre><code>as my_module(x) {
  sphere(x);
}</code></pre>
        <h3>Const</h3>
        <pre><code>const MY_CONST = 123;</code></pre>
        <h3>Loop</h3>
        <pre><code>for(i, 0, 10, 1) {
  translate(i, i, 0) {
    cube(i);
  }
}</code></pre>
        <h3>Comment</h3>
        <pre><code>// This is Comment
/*
This is comment, too!
*/</code></pre>
      <div class="sign">build by <a href="https://github.com/kntt32/">kntt32</a></div>
    </noscript>
    <div id="root"></div>
    <script type="module">${script}</script>
  </body>
</html>
`;
  await Deno.writeTextFile("as-cad.html", html);
}

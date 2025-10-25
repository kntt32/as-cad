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
      <div class="sign">build by <a href="https://github.com/kntt32/">kntt32</a></div>
    </noscript>
    <div id="root"></div>
    <script type="module">${script}</script>
  </body>
</html>
`;
  await Deno.writeTextFile("as-cad.html", html);
}

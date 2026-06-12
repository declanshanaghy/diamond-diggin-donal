// Diamond Diggin' Donal — placeholder boot screen (replaced as the port lands).

const canvas = document.getElementById('screen') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// CGA palette 1 (high intensity): black, cyan, magenta, white
const CGA = ['#000000', '#55ffff', '#ff55ff', '#ffffff'];

ctx.fillStyle = CGA[0];
ctx.fillRect(0, 0, 320, 200);
ctx.fillStyle = CGA[1];
ctx.font = '16px monospace';
ctx.textAlign = 'center';
ctx.fillText("DIAMOND DIGGIN' DONAL", 160, 90);
ctx.fillStyle = CGA[3];
ctx.font = '8px monospace';
ctx.fillText('under construction — dig in soon', 160, 110);

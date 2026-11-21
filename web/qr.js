import QRCode from 'qrcode';
export async function makeQR(canvas, value) {
  await QRCode.toCanvas(canvas,value,{width:640,margin:4,errorCorrectionLevel:'M',color:{dark:'#14111d',light:'#ffffff'}});
}

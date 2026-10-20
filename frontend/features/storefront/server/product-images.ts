export const productImageFiles = [
  "aa.jpg",
  "amarongiii.jpg",
  "amashaza.jpg",
  "amashu.jpg",
  "amashui.jpeg",
  "avoka.jpg",
  "avoka2.jpg",
  "avoka3.jpg",
  "beterave.jpg",
  "beterave1.jpg",
  "beterave2.jpg",
  "biringanya.jpg",
  "brokoli.jpg",
  "brokoli1.jpg",
  "chou  fluer.jpg",
  "chou  fluer1.jpg",
  "cocomble.jpg",
  "crogete.jpg",
  "crogete1.jpg",
  "dodo.jpg",
  "dodo1.jpg",
  "fruits.jpg",
  "ibijumba.jpg",
  "ibinyomoro.jpg",
  "ibinyomoro1.jpg",
  "ibinyomoro2.jpg",
  "ibirayi.jpg",
  "ibirayiii.jpg",
  "ibirayiiiiiiii.jpg",
  "ibitokii.jpg",
  "ibitokiiiii.jpg",
  "ibitonore.jpg",
  "ibitonore11.jpg",
  "imitejaaaa.jpg",
  "imitejaaaaaaaaa.jpg",
  "inanasi.jpg",
  "inanasi1.jpg",
  "inanasi2.jpg",
  "indimuu.jpg",
  "inidimuu.jpg",
  "inidmuuuuuuuuuuuu.jpg",
  "inyanya.jpg",
  "inyanyaq.jpg",
  "isombeee.jpg",
  "karoriii.jpg",
  "karoti.jpg",
  "manderena.webp",
  "mangoo.jpg",
  "orangee.jpg",
  "pavillooo.jpg",
  "pavulo.jpg",
  "pavuloo 2.jpg",
  "pavuloo red.jpg",
  "pome.jpg",
  "pomee.jpg",
  "sereli1.jpg",
  "serelii.jpg"
] as const;

export function productImageLabel(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[0-9]+/g, " ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function imageLayout(images) {
  if (!images.length || images.length > 2 || images.some(i => !Number.isInteger(i.width) || !Number.isInteger(i.height) || i.width < 1 || i.height < 1)) throw Error('Chọn 1 hoặc 2 ảnh hợp lệ.');
  const width = Math.max(...images.map(i => i.width));
  const height = images.reduce((n,i) => n+i.height,0)+(images.length-1)*24;
  if (width*height > 24000000 || height > 20000) throw Error('Ảnh ghép quá lớn. Hãy khoanh vùng nhỏ hơn.');
  return {width,height};
}
export async function joinImages(files) {
  const images=[];
  try {
    for (const file of files) images.push(await createImageBitmap(file));
    const {width,height}=imageLayout(images);
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('Không ghép được ảnh.');
    ctx.fillStyle='white';ctx.fillRect(0,0,width,height);
    let y=0;for(const image of images){ctx.drawImage(image,0,y);y+=image.height+24;}
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.95));
    if(!blob || blob.size>25*1024*1024)throw Error('Ảnh ghép vượt 25 MB hoặc không mã hóa được.');
    return new File([blob],'listening-pages.jpg',{type:'image/jpeg'});
  } finally {images.forEach(image=>image.close());}
}

const MAX=8*1024*1024;
function decodeMedia(media){
 if(!media||typeof media.data!=='string'||media.data.length>Math.ceil(MAX/3)*4||!(/^[A-Za-z0-9+/]*={0,2}$/).test(media.data))throw Error('Invalid attachment. Maximum size is 8 MB.');
 const data=Buffer.from(media.data,'base64');if(!data.length||data.length>MAX)throw Error('Maximum attachment size is 8 MB.');
 const type=String(media.type||'').split(';')[0];
 const valid=(type==='image/jpeg'&&data[0]===255&&data[1]===216&&data[2]===255)||(type==='image/png'&&data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))||(['audio/webm','video/webm'].includes(type)&&data.subarray(0,4).equals(Buffer.from([26,69,223,163])))||(['video/mp4','audio/mp4'].includes(type)&&data.subarray(4,8).toString()==='ftyp')||(type==='audio/ogg'&&data.subarray(0,4).toString()==='OggS');
 if(!valid)throw Error('Use a PNG/JPEG photo, MP4/WebM video, or supported recorded audio.');
 return {data,type,name:String(media.name||'Attachment').replace(/[\r\n\\/]/g,'_').slice(0,120)};
}
module.exports={decodeMedia};

function linkedinUrl(value){
    if(typeof value!=='string'||value.length>500)throw new Error('Enter a LinkedIn profile URL.');
    if(!value.trim())return '';
    let url;try{url=new URL(value.trim());}catch{throw new Error('Use a full LinkedIn profile URL, such as https://www.linkedin.com/in/your-name.');}
    if(url.protocol!=='https:'||!['linkedin.com','www.linkedin.com'].includes(url.hostname.toLowerCase())||url.username||url.password||url.port||!/^\/in\/[a-zA-Z0-9_%\-]+\/?$/.test(url.pathname))throw new Error('Use an https://www.linkedin.com/in/ profile link.');
    return 'https://www.linkedin.com'+url.pathname.replace(/\/$/,'');
}
module.exports={linkedinUrl};

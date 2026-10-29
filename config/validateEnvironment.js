module.exports = (env=process.env) => {
    if(env.NODE_ENV!=='production')return;
    const missing=['DB_HOST','DB_PORT','DB_NAME','DB_USER','DB_PASSWORD'].filter(k=>!env[k]?.trim());
    if(missing.length)throw new Error(`Missing production configuration: ${missing.join(', ')}`);
    if(!env.JWT_SECRET || env.JWT_SECRET.length<32)throw new Error('Production JWT_SECRET must be at least 32 characters.');
};

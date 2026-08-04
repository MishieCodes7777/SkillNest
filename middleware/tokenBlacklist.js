// Token Blacklist - invalidates tokens on logout
const blacklist = new Set();

function addToBlacklist(token) {
    blacklist.add(token);
}

function isBlacklisted(token) {
    return blacklist.has(token);
}

// Cleanup every hour to prevent memory growth
setInterval(() => {
    blacklist.clear();
}, 60 * 60 * 1000);

module.exports = { addToBlacklist, isBlacklisted };

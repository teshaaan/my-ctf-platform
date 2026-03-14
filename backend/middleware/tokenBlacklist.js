const blacklistedTokens = new Map();

const blacklistToken = (token, exp) => {
    if (!token) return;

    // If no expiry is provided, keep token blocked for one hour by default.
    const expiresAtMs = exp ? exp * 1000 : Date.now() + 60 * 60 * 1000;
    blacklistedTokens.set(token, expiresAtMs);
};

const isBlacklisted = (token) => {
    if (!token) return false;

    const expiresAtMs = blacklistedTokens.get(token);
    if (!expiresAtMs) return false;

    if (Date.now() > expiresAtMs) {
        blacklistedTokens.delete(token);
        return false;
    }

    return true;
};

module.exports = { blacklistToken, isBlacklisted };

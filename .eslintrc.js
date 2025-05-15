module.exports = {
    "env": {
        "browser": true,
        "es2021": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:node/recommended"
    ],
    "overrides": [
    ],
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module"
    },
    "plugins": [
        "node"
    ],
    "rules": {
        "node/exports-style": ["error", "module.exports"],
        "node/file-extension-in-import": ["error", "always"],
        "node/prefer-global/buffer": ["error", "always"],
        "node/prefer-global/console": ["error", "always"],
        "node/prefer-global/process": ["error", "always"],
        "node/prefer-global/url-search-params": ["error", "always"],
        "node/prefer-global/url": ["error", "always"],
        "node/prefer-promises/dns": "error",
        "node/prefer-promises/fs": "error",
        "no-unused-vars": ["error", { "argsIgnorePattern": "next" }],
        "node/no-unsupported-features/es-syntax": [
            "error",
            {
                "version": ">=14.0.0",
                "ignores": ["modules"]
            }
        ]
    }
}

# Document for anyone who maintains this module (mostly myself)

## Release + publishing steps

1. Run `npm run release`, which will update the changelog and add a tagged git commit with the relevant version number
2. Run `git push` and `git push --tags [TAG_NAME]` to update remote
3. Run `npm publish` to update npm registry  

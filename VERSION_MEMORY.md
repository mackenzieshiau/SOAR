Deployment memory:

- The homepage footer version is sourced from `package.json`.
- Before each deployment, increment only the rightmost version number unless there is a deliberate major or minor release.
- Confirm the homepage footer still reads `Version x.y.z` after the build.

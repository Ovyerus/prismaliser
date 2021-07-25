<p align="center">
  <a href="https://prismaliser.ovy.cloud">
    <img src=".resources/readme-banner.svg" alt="Visualise your Prisma schema - Prismaliser">
  </a>
</p>

---

**Prismaliser** is a visualisation webapp for [Prisma](https://prisma.io)
schemas. It allows you to visually explore your schema and the relations between
your models, by showing links between the different types of relations in the
schema (many-to-many, one-to-many, one-to-one), similar to an
[Entity-relationship model](https://en.wikipedia.org/wiki/Entity-relationship_model).

Prisma is a fully open-source Next.js application and is easily self-hostable if
you wish to, but a hosted version is also available at
[primaliser.ovy.cloud](https://primaliser.ovy.cloud) if you just want to use it
instead.

## Installation

Prismaliser is a Next.js application, and as such it requires
[Node.js](https://nodejs.org) to be installed in order to run.
[Yarn](https://yarnpkg.com) is also recommended as it has a (subjectively) nicer
CLI interface.

With Node installed, and the repository cloned, you can simply run the following
commands to get it running:

```bash
yarn install  # or `npm install`
yarn build  # or `npm run build`
yarn start  # or `npm start`
```

The latter command can be run in anything like PM2, systemd or any other process
daemon of your choice (I may include a Dockerfile if there's enough demand for
it for some reason).

Or if you're looking to run it for development purposes, you can use the
following commands instead:

```bash
yarn install  # or `npm install`
yarn dev  # or `npm run dev`
```

## Roadmap

This is a list of what I've currently got planned for the future. I'm open to
accepting PRs for any of these, but I'd prefer it if you could first open an
issue regarding it so we can discuss it/make sure there's not multiple people
working on the same thing.

I'm also open to PRs for other features not listed here, but also please open a
corresponding issue to discuss it, just like above.

- [ ] Multi-history support (user defined saves).
- [ ] Sharing a schema with other users via a generated link (similar to
      TypeScript's [playground](https://www.typescriptlang.org/play/)).
- [ ] Saving node positions across page resets.
- [ ] Autocomplete for the editor (very big, Monaco is a bit fiddly at times,
      would probably need to do some looking at the VSCode plugin for Prisma to
      figure out some stuff).

## License

Prismaliser is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.

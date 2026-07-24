<p align="center">
  <a href="https://prismaliser.app">
    <img src=".resources/readme-banner.svg" alt="Visualise your Prisma schema - Prismaliser">
  </a>
</p>

---

**Prismaliser** is a visualisation webapp for [Prisma](https://prisma.io)
schemas. It allows you to visually explore your schema and the relations between
your models, by showing links between the different types of relations in the
schema (many-to-many, one-to-many, one-to-one), similar to an
[Entity-relationship model](https://en.wikipedia.org/wiki/Entity-relationship_model).

Prismaliser is a fully open-source, fully client-side web application — parsing
and rendering all happen in your browser via Prisma's schema WASM module. It's
easily self-hostable as plain static files if you wish to, but a hosted version
is also available at [prismaliser.app](https://prismaliser.app) if you just want
to use it instead.

## Installation

Prismaliser is a Vite single-page application, and as such it requires
[Node.js](https://nodejs.org) (24+) to be installed in order to build it.
[Yarn](https://yarnpkg.com) is also recommended as it has a (subjectively) nicer
CLI interface.

With Node installed, and the repository cloned, you can simply run the following
commands to get it running:

```bash
yarn install  # or `npm install`
yarn build    # or `npm run build`
yarn start    # or `npm start`
```

The build outputs plain static files to `dist/`, so you can also serve that
directory with any static file server of your choice instead of `yarn start`
(which uses `vite preview`).

Or if you're looking to run it for development purposes, you can use the
following commands instead:

```bash
yarn install  # or `npm install`
yarn dev      # or `npm run dev`
```

### Docker

A
[Docker image](https://github.com/Ovyerus/prismaliser/pkgs/container/prismaliser)
is also available if that's more your thing. Set the public HTTPS origin so the
container can serve valid AT Protocol OAuth metadata:

```bash
$ docker run -p 3000:80 \
    -e PRISMALISER_ORIGIN=https://your-public-origin.example \
    ghcr.io/ovyerus/prismaliser
```

The value must be the exact public HTTPS origin without a trailing slash. If it
is omitted or invalid, account connection is disabled; local editing,
schema-only links, and legacy links remain available.

### AT Protocol sharing

When you publish a diagram, Prismaliser creates a public immutable record in
your own AT Protocol repository and uploads the Prisma schema as a public
`text/plain` blob. Shared records contain the blob reference and node
positions, so anyone with the link can view the same diagram. Both the record
and schema blob are public; check for passwords, connection strings, and other
secrets first.

Schema-only links require no account and remain supported for old links. To
self-host on plain static hosting, replace `oauth-client-metadata.json` with the
same metadata values using your exact HTTPS origin for `client_id`,
`client_uri`, and `redirect_uris`. Docker hosts should use `PRISMALISER_ORIGIN`
as shown above.

Prismaliser never asks for a password or an app password. Account connection
uses the AT Protocol browser OAuth flow and the provider's own authorisation
page.

## Roadmap

This is a list of what I've currently got planned for the future. I'm open to
accepting PRs for any of these, but I'd prefer it if you could first open an
issue regarding it so we can discuss it/make sure there's not multiple people
working on the same thing.

I'm also open to PRs for other features not listed here, but also please open a
corresponding issue to discuss it, just like above.

- [x] Multi-history support through the My shares manager.
- [x] Sharing schema-only links and immutable public AT Protocol snapshots.
- [x] Saving and restoring node positions in shared snapshots.
- [ ] Autocomplete for the editor (very big, Monaco is a bit fiddly at times,
      would probably need to do some looking at the VSCode plugin for Prisma to
      figure out some stuff).

## License

Prismaliser is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.
